import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let promptCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 180_000;

async function buildSystemPrompt(): Promise<string> {
  if (promptCache && promptCache.expiresAt > Date.now()) return promptCache.prompt;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const catSnap = await getDocs(collection(liteDb, "categories"));
  const categories = catSnap.empty ? DEFAULT_CATEGORIES : catSnap.docs.map((d) => d.data() as Category);
  
  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- [قسم ${catNames[p.cat] ?? "أخرى"}]: ${p.name} — السعر: ${p.price} جنيه`)
    .join("\n");

  const policyText = Object.values(policyPages)
    .map((page) =>
      `## ${page.title}\n` +
      page.sections.map((s) => [s.heading, s.body, ...(s.bullets ?? [])].filter(Boolean).join(" — ")).join("\n")
    )
    .join("\n\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان خبير ومندوب مبيعات لمتجر إيجي دنت في مصر.
تعليماتك:
1. تحدث بالعامية المصرية الراقية والواضحة.
2. أجب عن أي سؤال طبي أو مقارنة بين المواد السنية بشكل علمي دقيق كطبيب خبير.
3. إذا سألك العميل عن منتجات أو أسعار، ابحث في القائمة أدناه فقط، واذكر السعر كما هو.
4. يمنع منعاً باتاً تأليف أي سعر أو منتج غير موجود في القائمة أدناه.
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

[قائمة منتجات المتجر وأسعارها]:
${productLines}

[سياسات المتجر]:
${policyText}`;

  promptCache = { prompt, expiresAt: Date.now() + TTL };
  return promptCache.prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "مفتاح API غير متوفر. تواصل واتساب 01151605515 🦷" });
  }

  const { message, history } = req.body || {};
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  try {
    const systemPrompt = await buildSystemPrompt();

    // تنسيق رسائل المحادثة عشان جوجل متطلعش إيرور تكرار
    const contents: any[] = [];
    if (Array.isArray(history)) {
      let lastRole = "";
      for (const h of history.slice(-6)) {
        if (h?.text?.trim()) {
          const role = h.role === "user" ? "user" : "model";
          if (role === lastRole && contents.length > 0) {
            contents[contents.length - 1].parts[0].text += `\n${h.text.trim()}`;
          } else {
            contents.push({ role, parts: [{ text: h.text.trim() }] });
            lastRole = role;
          }
        }
      }
    }
    
    // إضافة الرسالة الجديدة
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += `\n${message.trim()}`;
    } else {
      contents.push({ role: "user", parts: [{ text: message.trim() }] });
    }

    // الاتصال الفوري بالذكاء الاصطناعي
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      })
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      // لو الباقة خلصت أو حصل ضغط من جوجل
      const errorMsg = data?.error?.message?.toLowerCase() || "";
      if (errorMsg.includes("quota") || response.status === 429) {
        return res.status(200).json({ reply: "عذراً يا دكتور، السيرفر عليه ضغط حالياً. يرجى المحاولة بعد قليل أو التواصل واتساب 01151605515 🦷" });
      }
      return res.status(200).json({ reply: `🚨 إيرور جوجل: ${data?.error?.message}` });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: `💥 حدث خطأ تقني، يرجى المحاولة لاحقاً 🦷` });
  }
}
