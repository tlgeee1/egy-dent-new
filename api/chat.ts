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

  // 🚀 السر هنا: دمجنا "اسم القسم" مع "اسم المنتج" عشان يفهم إن الشوفو ده كمبوزيت
  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- قسم (${catNames[p.cat] ?? "أخرى"}): ${p.name} — السعر: ${p.price} جنيه`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان محترف ومندوب مبيعات لمتجر إيجي دنت في مصر.
تعليماتك:
1. أنت لست روبوتاً آلياً، بل طبيب تدردش مع الأطباء بأسلوب بشري، وودود، وبالعامية المصرية.
2. إذا سألك العميل عن فئة معينة (مثل: كمبوزيت، بوند، سيليكون)، اعرض له كل المنتجات التي تنتمي لهذا القسم من القائمة أدناه.
3. اشرح الأسئلة الطبية (كافيتي، حشو، خلط) بأسلوب علمي دقيق.
4. يمنع منعاً باتاً ذكر أي سعر أو منتج غير موجود في القائمة أدناه. إذا لم تجده قل: "عذراً يا دكتور، الصنف ده مش متاح حالياً".
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

[دليل المنتجات والأسعار المتاحة لديك]:
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
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // 🚀 دمج الأوامر في أول رسالة لتجنب أخطاء الإصدارات
    const contents: any[] = [];
    
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
        }
      }
      contents.push({ role: "user", parts: [{ text: message.trim() }] });
      // حقن الأوامر في الخلفية
      contents[0].parts[0].text = `[تعليمات النظام الدائمة]:\n${systemPrompt}\n\n[سؤال العميل]:\n${contents[0].parts[0].text}`;
    } else {
      contents.push({ role: "user", parts: [{ text: `[تعليمات النظام الدائمة]:\n${systemPrompt}\n\n[سؤال العميل]:\n${message.trim()}` }] });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { 
          temperature: 0.4, // 👈 درجة ذكاء بشرية ممتازة (بتفهم ومبتهلوسش)
          maxOutputTokens: 600 
        },
      })
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      console.error("Gemini API Error:", data?.error?.message);
      return res.status(200).json({ reply: "عذراً يا دكتور، السيرفر عليه ضغط خفيف. حاول تاني ثواني، أو كلمنا واتساب 01151605515 🦷" });
    }
  } catch (err: any) {
    console.error("Server Error:", err.message);
    return res.status(200).json({ reply: "حدث خطأ تقني، يرجى المحاولة لاحقاً أو التواصل واتساب 01151605515 🦷" });
  }
}
