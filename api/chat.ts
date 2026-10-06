import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

// كاش عشان منضيعش وقت في جلب البيانات أو اسم الموديل كل شوية
let storeCache: { prompt: string; expiresAt: number } | null = null;
let workingModel: string | null = null;
const TTL = 180_000;

async function buildSystemPrompt(): Promise<string> {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache.prompt;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} جنيه`)
    .join("\n");

  const prompt = `[تعليمات المساعد الذكي لإيجي دنت]:
1. أنت طبيب أسنان ومندوب مبيعات، ترد بالعامية المصرية بوضوح.
2. إذا سألك المريض عن أسئلة طبية (طريقة عمل كافيتي، حشو، خلع)، اشرح الخطوات الطبية بدقة كطبيب أسنان.
3. إذا سأل عن المنتجات، ابحث في القائمة أدناه فقط. لا تذكر أسعاراً من خارجها.
4. إذا لم تجد المنتج، قل: "عذراً يا دكتور، الصنف مش متوفر، تواصل مع المبيعات على 01151605515".
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

[المنتجات والأسعار المتاحة لدينا]:
${productLines}

-----------------
[سؤال الطبيب الآن]:\n`;

  storeCache = { prompt, expiresAt: Date.now() + TTL };
  return storeCache.prompt;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(200).json({ reply: "مفتاح API غير موجود." });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    // 🚀 1. اكتشاف الموديل الشغال تلقائياً من جوجل (Auto-Detect)
    if (!workingModel) {
      const modelListRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const modelListData = await modelListRes.json();
      
      if (!modelListRes.ok) {
        return res.status(200).json({ reply: `⚠️ المفتاح به مشكلة: ${modelListData.error?.message}` });
      }

      // تصفية الموديلات اللي بتدعم الدردشة (generateContent)
      const availableModels = (modelListData.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name);

      if (availableModels.length === 0) {
        return res.status(200).json({ reply: "⚠️ المفتاح لا يحتوي على أي موديلات متاحة." });
      }

      // اختيار أفضل موديل متاح (نفضل 2.0-flash ثم 1.5-flash ثم أي حاجة شغالة)
      workingModel = 
        availableModels.find((m: string) => m.includes("2.0-flash")) ||
        availableModels.find((m: string) => m.includes("1.5-flash")) ||
        availableModels[0]; // لو ملقاش هياخد أول واحد شغال وخلاص
    }

    // 🚀 2. تجهيز الرسالة وإرسالها للموديل اللي اكتشفناه
    const systemPrompt = await buildSystemPrompt();

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
        }
      }
    }
    
    // دمج التعليمات مع السؤال لتجنب أخطاء الإصدارات القديمة
    const finalMessage = `${systemPrompt}${message.trim()}`;
    contents.push({ role: "user", parts: [{ text: finalMessage }] });

    // الاتصال بالموديل الصحيح 100%
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/${workingModel}:generateContent?key=${apiKey}`;

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { 
          temperature: 0.3, 
          maxOutputTokens: 600 
        },
      })
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      // لو حصل خطأ غريب، هنمسح الكاش عشان يكتشف الموديل من جديد المرة الجاية
      workingModel = null; 
      console.error("Google API Error:", data?.error?.message);
      return res.status(200).json({ reply: `⚠️ جوجل رفضت الطلب: ${data?.error?.message}` });
    }
  } catch (err: any) {
    workingModel = null;
    console.error("Chat Error:", err.message);
    return res.status(200).json({ reply: `حدث خطأ تقني: ${err.message}` });
  }
}
