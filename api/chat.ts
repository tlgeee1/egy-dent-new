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

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} جنيه`)
    .join("\n");

  // 🧠 السر كله هنا: تقسيم عقل البوت لمهمتين عشان ميتلخبطش
  const prompt = `أنت "مساعد إيجي دنت الذكي"، تعمل كطبيب أسنان محترف ومندوب مبيعات لمتجر إيجي دنت في مصر. رد بالعامية المصرية الراقية.

لديك مهمتان أساسيتان لا تخلط بينهما:

المهمة الأولى (الإجابات الطبية): 
إذا سألك العميل عن كيفية عمل كافيتي، حشو العصب، استخدام البوند، أو أي سؤال طبي/علمي، اشرح له الخطوات الطبية بشكل علمي دقيق، مرتب، ومختصر، دون البحث في المنتجات.

المهمة الثانية (أسعار ومنتجات المتجر): 
إذا سألك العميل عن الأسعار، أو "عندكم منتجات إيه؟"، أو "إيه تاني؟"، ابحث في القائمة أدناه فقط. 
- إذا سأل "عندكم منتجات إيه؟"، اذكر له نبذة سريعة عن أهم 5 منتجات متبوعة بـ "وهناك المزيد، حدد ما تبحث عنه".
- يمنع منعاً باتاً تأليف أي منتج أو سعر غير موجود في القائمة أدناه.
- إذا سأل عن منتج غير موجود، قل: "الصنف ده مش متوفر حالياً، تواصل مع المبيعات للتأكد".

رقم المبيعات وحجز الأوردرات: واتساب 01151605515.

قائمة المنتجات والأسعار المتاحة اليوم:
${productLines}`;

  promptCache = { prompt, expiresAt: Date.now() + TTL };
  return promptCache.prompt;
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

    // تجهيز الذاكرة
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) { // ذاكرة قوية لـ 6 رسائل سابقة
        if (h?.text?.trim()) {
          contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: { 
          temperature: 0.3, // 👈 درجة ذكاء مثالية (لا هي غبية آليا، ولا بتألف أسعار)
          maxOutputTokens: 600 
        },
      })
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      console.error("Gemini Error:", data);
      return res.status(200).json({ reply: "عذراً يا دكتور، السيرفر عليه تحديث لحظي. ثواني وابعت سؤالك تاني، أو كلمنا واتساب 01151605515 🦷" });
    }
  } catch (err: any) {
    console.error("Chat Error:", err.message);
    return res.status(200).json({ reply: "حدث خطأ في الاتصال، من فضلك حاول تاني أو تواصل معنا واتساب 01151605515 🦷" });
  }
}
