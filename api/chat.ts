import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; expiresAt: number } | null = null;
let workingModelCache: string | null = null; // كاش لاسم الموديل عشان نسأله مرة واحدة بس
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
    // 🚀 1. اكتشاف الموديل الشغال على المفتاح بتاعك (لو مش محفوظ في الكاش)
    if (!workingModelCache) {
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const modelsData = await modelsRes.json();
      
      if (modelsRes.ok && modelsData.models) {
        // بنجيب الموديلات اللي بتدعم الشات
        const validModels = modelsData.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name); // بيرجع بصيغة models/gemini-pro مثلاً

        // بنختار أحسن موديل متاح في مفتاحك (لو مفيش 1.5 هننزل للـ pro العادي)
        workingModelCache = 
          validModels.find((m: string) => m.includes("1.5-flash")) || 
          validModels.find((m: string) => m.includes("gemini-pro")) || 
          validModels[0];
      }
      
      if (!workingModelCache) {
        return res.status(200).json({ reply: `🚨 إيرور: المفتاح بتاعك مفيش عليه أي موديلات شغالة!` });
      }
    }

    const systemPrompt = await buildSystemPrompt();

    // 2. تظبيط الرسايل عشان جوجل متعملش إيرور تكرار
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        if (h?.text?.trim()) {
          const role = h.role === "user" ? "user" : "model";
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts[0].text += `\n${h.text.trim()}`;
          } else {
            contents.push({ role, parts: [{ text: h.text.trim() }] });
          }
        }
      }
    }
    
    const lastContent = contents.length > 0 ? contents[contents.length - 1].parts[0].text : "";
    if (!lastContent.includes(message.trim())) {
      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts[0].text += `\n${message.trim()}`;
      } else {
        contents.push({ role: "user", parts: [{ text: message.trim() }] });
      }
    }

    // 🚀 3. الاتصال بالموديل اللي اكتشفناه من حسابك
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${workingModelCache}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 }, // ذكاء مضبوط
      })
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      // لو الموديل ده جاب إيرور (زي مثلاً إنه قديم ومبيفهمش SystemInstruction) هنمسح الكاش ونرد بالإيرور
      workingModelCache = null; 
      return res.status(200).json({ reply: `🚨 إيرور جوجل: ${data?.error?.message}` });
    }
  } catch (err: any) {
    workingModelCache = null;
    return res.status(200).json({ reply: `💥 خطأ تقني: ${err.message}` });
  }
}
