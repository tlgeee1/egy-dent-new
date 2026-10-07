import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

async function buildSystemPrompt(): Promise<string> {
  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} ج`)
    .join("\n");

  return `تعليماتك كمساعد ذكي لمتجر إيجي دنت:
1. أنت طبيب أسنان خبير، تجاوب بالعامية المصرية باختصار شديد.
2. اشرح الأسئلة الطبية (كافيتي، حشو) بدقة علمية.
3. يمنع منعاً باتاً ذكر أي أسعار من خارج القائمة أدناه.
4. للتواصل: واتساب 01151605515.

[قائمة المنتجات والأسعار]:
${productLines}
--------------------
`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!apiKey) {
    return res.status(200).json({ reply: "🚨 الكود مش شايف المفتاح في Vercel!" });
  }
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  try {
    const systemPrompt = await buildSystemPrompt();
    
    // 🚀 بناء سياق المحادثة المدمج (عشان gemini-pro يفهمه)
    const contents: any[] = [];
    
    // دمج التعليمات في أول رسالة خالص لتفادي رفض الموديل القديم
    let isFirstMessage = true;

    if (Array.isArray(history)) {
      let lastRole = "";
      for (const h of history) {
        if (h?.text?.trim()) {
          const role = h.role === "user" ? "user" : "model";
          
          let textToPush = h.text.trim();
          if (isFirstMessage && role === "user") {
            textToPush = `${systemPrompt}\nسؤال العميل: ${textToPush}`;
            isFirstMessage = false;
          }

          if (role === lastRole && contents.length > 0) {
            contents[contents.length - 1].parts[0].text += `\n${textToPush}`;
          } else {
            contents.push({ role, parts: [{ text: textToPush }] });
            lastRole = role;
          }
        }
      }
    }
    
    // لو دي أول رسالة خالص في الشات ومفيش history
    let finalMessage = message.trim();
    if (isFirstMessage) {
      finalMessage = `${systemPrompt}\nسؤال العميل: ${finalMessage}`;
    }

    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      contents[contents.length - 1].parts[0].text += `\n${finalMessage}`;
    } else {
      contents.push({ role: "user", parts: [{ text: finalMessage }] });
    }

    // 🚀 توجيه الطلب للموديل القديم المضمون (gemini-pro)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      })
    });

    const data = await response.json();

    if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ reply: data.candidates[0].content.parts[0].text.trim() });
    } else {
      // 🚨 طباعة أي إيرور جديد (وإن شاء الله مفيش)
      const errorDetails = data?.error?.message || JSON.stringify(data);
      return res.status(200).json({ reply: `🚨 إيرور جوجل: ${errorDetails}` });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: `💥 خطأ في سيرفر Vercel: ${err.message}` });
  }
}
