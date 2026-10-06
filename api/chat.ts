import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 180_000;

async function buildSystemPrompt(): Promise<string> {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache.prompt;

  // جلب المنتجات والأقسام
  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const catSnap = await getDocs(collection(liteDb, "categories"));
  const categories = catSnap.empty ? DEFAULT_CATEGORIES : catSnap.docs.map((d) => d.data() as Category);
  
  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  // 🚀 دمج اسم القسم مع اسم المنتج عشان الذكاء الاصطناعي يفهمهم
  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- [قسم ${catNames[p.cat] ?? "أخرى"}]: ${p.name} — السعر: ${p.price} جنيه`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان محترف ومندوب مبيعات لمتجر إيجي دنت في مصر.
تعليماتك:
1. تحدث بالعامية المصرية الراقية والواضحة.
2. للأسئلة الطبية (كافيتي، حشو، ألجينات)، اشرح الخطوات الطبية بدقة واختصار.
3. إذا سألك العميل عن منتجات أو "أنواع"، ابحث في القائمة أدناه، واعرض جميع المنتجات التي تنتمي لنفس القسم.
4. يمنع منعاً باتاً ذكر أي سعر أو منتج غير موجود في القائمة أدناه.
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

[المنتجات المتاحة وأقسامها وأسعارها]:
${productLines}`;

  storeCache = { prompt, expiresAt: Date.now() + TTL };
  return storeCache.prompt;
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

    // 🚀 تصليح خطأ تكرار الرسائل اللي كان بيخلي جوجل ترفض الطلب
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        if (h?.text?.trim()) {
          const role = h.role === "user" ? "user" : "model";
          // دمج الرسائل المتتالية لنفس الشخص عشان جوجل مترفضش الطلب
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts[0].text += `\n${h.text.trim()}`;
          } else {
            contents.push({ role, parts: [{ text: h.text.trim() }] });
          }
        }
      }
    }
    
    // التأكد من إضافة الرسالة الحالية لو مش موجودة
    const lastContent = contents.length > 0 ? contents[contents.length - 1].parts[0].text : "";
    if (!lastContent.includes(message.trim())) {
      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts[0].text += `\n${message.trim()}`;
      } else {
        contents.push({ role: "user", parts: [{ text: message.trim() }] });
      }
    }

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
      // 🚨 هنا هنطبع الخطأ الحقيقي اللي جاي من جوجل للمستخدم عشان نفهمه
      return res.status(200).json({ reply: `🚨 إيرور جوجل: ${data?.error?.message}` });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: `💥 خطأ تقني: ${err.message}` });
  }
}
