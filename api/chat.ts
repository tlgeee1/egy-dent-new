import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; products: Product[]; expiresAt: number } | null = null;
let workingModelCache: string | null = null; 
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
    .map((p) => `- [قسم ${catNames[p.cat] ?? "أخرى"}]: ${p.name} — السعر: ${p.price} ج`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان ومندوب مبيعات لمتجر إيجي دنت في مصر.
1. تحدث بالعامية المصرية الراقية والواضحة.
2. للأسئلة الطبية (كافيتي، حشو)، اشرح الخطوات الطبية بدقة.
3. إذا سألك العميل عن منتجات أو "أنواع"، ابحث في القائمة أدناه، واعرض المنتجات التي تنتمي للقسم المطلوب.
4. يمنع منعاً باتاً ذكر أي سعر أو منتج غير موجود في القائمة أدناه.
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

[المنتجات المتاحة وأقسامها وأسعارها]:
${productLines}`;

  storeCache = { prompt, products, expiresAt: Date.now() + TTL };
  return storeCache.prompt;
}

// 🚀 محرك بحث ذكي احتياطي (بيشتغل لو باقة جوجل خلصت عشان العميل ميحسش بحاجة)
function smartContextFallback(currentMsg: string, products: Product[]): string {
  const q = currentMsg.toLowerCase().trim();
  const searchWords = q.split(" ").filter(w => w.length > 2 && w !== "عايز" && w !== "بكام" && w !== "سعر");
  
  const matched = products.filter(p => {
    if (p.showcaseOnly) return false;
    const pName = p.name.toLowerCase();
    return searchWords.some(w => pName.includes(w));
  });

  if (matched.length > 0) {
    const list = matched.slice(0, 8).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
    return `بناءً على استفسارك يا دكتور، دي الأصناف والأسعار المتاحة عندنا:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
  }
  return `أهلاً بك يا دكتور! لمزيد من التفاصيل حول الأسعار، يرجى التواصل مع المبيعات على واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message, history } = req.body || {};
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  const { prompt: systemPrompt, products } = await getStoreData();

  if (!apiKey) return res.status(200).json({ reply: smartContextFallback(message, products) });

  try {
    if (!workingModelCache) {
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const modelsData = await modelsRes.json();
      
      if (modelsRes.ok && modelsData.models) {
        const validModels = modelsData.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name);
        workingModelCache = validModels.find((m: string) => m.includes("1.5-flash")) || validModels[0];
      }
      if (!workingModelCache) workingModelCache = "models/gemini-1.5-flash"; 
    }

    const contents: any[] = [];
    if (Array.isArray(history)) {
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
      contents.push({ role: "user", parts: [{ text: message.trim() }] });
    }

    // إضافة الأوامر في رسالة المستخدم الأولى
    contents[0].parts[0].text = `[تعليمات النظام]:\n${systemPrompt}\n\n[رسالة المستخدم]:\n${contents[0].parts[0].text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${workingModelCache}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 }, 
      })
    });

    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      // 🚨 لو الباقة خلصت (Quota exceeded) هيرد من الداتا بيز كأن مفيش حاجة حصلت
      const errorMsg = data?.error?.message?.toLowerCase() || "";
      if (errorMsg.includes("quota") || errorMsg.includes("exceeded") || response.status === 429) {
        return res.status(200).json({ reply: smartContextFallback(message, products) });
      }
      
      workingModelCache = null; 
      return res.status(200).json({ reply: smartContextFallback(message, products) });
    }
  } catch (err: any) {
    workingModelCache = null;
    return res.status(200).json({ reply: smartContextFallback(message, products) });
  }
}
