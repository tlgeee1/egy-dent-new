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
    .map((p) => `- ${p.name}: ${p.price} جنيه مصرى`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي" لمتجر مستلزمات طب الأسنان في مصر.
تعليماتك العسكرية والصارمة:
1. أنت طبيب أسنان خبير، تجيب بالعامية المصرية بوضوح واختصار.
2. ⚠️ تحذير: يمنع منعاً باتاً ذكر أي سعر لأي منتج من خارج القائمة التالية.
3. إذا سألك المستخدم عن منتج غير موجود في القائمة، قل حرفياً: "عذراً يا دكتور، الصنف ده مش متوفر في الداتا بتاعتي حالياً، يرجى التواصل مع المبيعات على واتساب 01151605515".
4. لا تقم بالتقريب، اذكر السعر كما هو مكتوب بالضبط.
5. إذا كان السؤال عن طرق الاستخدام، اشرحها طبياً بشكل صحيح ومختصر.

قائمة المنتجات والأسعار المتاحة في المتجر اليوم:
${productLines}

سياسة الشحن: التوصيل للقاهرة والجيزة خلال 48 ساعة، وباقي المحافظات 4 أيام.`;

  storeCache = { prompt, expiresAt: Date.now() + TTL };
  return storeCache.prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "خدمة المساعد الذكي بتتجهز حالياً. تواصل معنا واتساب 01151605515 🦷" });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    // وضعنا مؤقت زمني 8 ثواني لجوجل لضمان عدم الاستعجال والخطأ
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 }, // دقة متناهية
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok) {
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
      } else {
        console.error("Gemini API Error:", data?.error?.message);
        return res.status(200).json({ reply: "عذراً يا دكتور، السيرفر عليه ضغط حالياً. ثواني وحاول تاني، أو كلمنا واتساب 01151605515 🦷" });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error("Fetch Error:", fetchError.message);
      return res.status(200).json({ reply: "عذراً يا دكتور، السيرفر مشغول لحظياً. يرجى إعادة إرسال رسالتك 🦷" });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: "حصلت مشكلة تقنية بسيطة، من فضلك حاول تاني أو كلمنا واتساب 01151605515 🦷" });
  }
}
