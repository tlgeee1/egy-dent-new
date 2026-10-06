import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; expiresAt: number } | null = null;
const TTL = 180_000;

async function buildSystemPrompt(): Promise<string> {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache.prompt;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const catSnap = await getDocs(collection(liteDb, "categories"));
  const categories = catSnap.empty ? DEFAULT_CATEGORIES : catSnap.docs.map((d) => d.data() as Category);
  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name} (${catNames[p.cat] ?? "أخرى"}): ${p.price} جنيه`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي" لمتجر مستلزمات طب الأسنان في مصر.
تعليماتك الصارمة:
1. أنت طبيب ذكي جداً، تفهم الأسئلة المركبة، وترد بالعامية المصرية بوضوح واختصار.
2. إذا سألك العميل عن أنواع أخرى، اعرض له كل الأنواع المتاحة في القائمة أدناه من نفس الفئة.
3. يمنع منعاً باتاً تأليف أي سعر أو منتج من خارج القائمة.
4. إذا لم يكن المنتج متوفراً، قل: "عذراً يا دكتور، الصنف ده مش متاح حالياً، تواصل مع المبيعات على واتساب 01151605515".
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

المنتجات والأسعار المتاحة لدينا اليوم:
${productLines}`;

  storeCache = { prompt, expiresAt: Date.now() + TTL };
  return storeCache.prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    // تجهيز المحادثة بالكامل (بما فيها الأسئلة السابقة عشان يفهم السياق)
    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) { // زودنا الذاكرة عشان يفتكر أنت سألته في إيه قبلها
        if (h?.text?.trim()) {
          messages.push({
            role: h.role === "user" ? "user" : "assistant",
            content: h.text.trim()
          });
        }
      }
    }
    messages.push({ role: "user", content: message.trim() });

    // 🚀 الاتصال المباشر والمجاني بسيرفرات OpenAI عبر Pollinations (بدون API Key)
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        model: "openai", // يستخدم GPT-4o-mini
        temperature: 0.2 // دقيق جداً
      }),
    });

    if (response.ok) {
      // السيرفر ده بيرجع النص مباشرة (Plain Text)
      const replyText = await response.text(); 
      return res.status(200).json({ reply: replyText.trim() });
    } else {
      console.error("AI Server Error:", response.status);
      return res.status(200).json({ reply: "عذراً يا دكتور، في تحديث لحظي للأسعار. ثواني وحاول تسألني تاني 🦷" });
    }
  } catch (err: any) {
    console.error("Chat Error:", err.message);
    return res.status(200).json({ reply: "حصلت مشكلة تقنية بسيطة، كلمنا واتساب 01151605515 وهنرد عليك فوراً 🦷" });
  }
}
