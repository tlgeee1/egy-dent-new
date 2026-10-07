import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

async function buildSystemPrompt(): Promise<string> {
  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} ج`)
    .join("\n");

  return `أنت طبيب أسنان ومساعد ذكي لمتجر إيجي دنت.
1. أجب عن الأسئلة الطبية بشرح علمي.
2. إذا سئلت عن الأسعار، ابحث في القائمة أدناه فقط.
[المنتجات المتاحة]:
${productLines}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!apiKey) {
    return res.status(200).json({ reply: "🚨 الكود مش شايف المفتاح! تأكد إنك حطيته في Vercel باسم GEMINI_API_KEY وعملت Redeploy." });
  }
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  try {
    const systemPrompt = await buildSystemPrompt();
    const contents: any[] = [];
    
    if (Array.isArray(history)) {
      let lastRole = "";
      for (const h of history.slice(-4)) {
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
    
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += `\n${message.trim()}`;
    } else {
      contents.push({ role: "user", parts: [{ text: message.trim() }] });
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

    if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ reply: data.candidates[0].content.parts[0].text.trim() });
    } else {
      // 🚨 هنا هنكشف كذبة جوجل بالنص:
      const errorDetails = data?.error?.message || JSON.stringify(data);
      return res.status(200).json({ reply: `🚨 جوجل رفضت الطلب والسبب الحقيقي هو:\n${errorDetails}` });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: `💥 خطأ في سيرفر Vercel نفسه:\n${err.message}` });
  }
}
