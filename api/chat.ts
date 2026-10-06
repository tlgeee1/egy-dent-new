import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; expiresAt: number } | null = null;
let workingModelCache: string | null = null;
const TTL = 180_000;

async function buildSystemPrompt(): Promise<string> {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache.prompt;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} جنيه`)
    .join("\n");

  const prompt = `أنت طبيب أسنان خبير ومندوب مبيعات لمتجر إيجي دنت في مصر.
تعليماتك الصارمة جداً:
1. رد بالعامية المصرية بوضوح واختصار.
2. إذا سألك المريض عن أسئلة طبية (عمل كافيتي، حشو)، اشرح الخطوات الطبية بدقة كطبيب أسنان.
3. إذا سأل عن المنتجات، ابحث في القائمة أدناه فقط. يمنع ذكر أي سعر من خارجها.
4. إذا لم تجد المنتج، قل: "عذراً يا دكتور، الصنف مش متوفر حالياً، تواصل مع المبيعات على 01151605515".
5. للتواصل وحجز الأوردرات: واتساب 01151605515.

قائمة المنتجات والأسعار المتاحة:
${productLines}`;

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
    const systemPrompt = await buildSystemPrompt();

    // 🚀 الخدعة هنا: هنحط الأوامر في أول رسالة كأنها محادثة سابقة، عشان تشتغل على كل إصدارات جوجل القديمة والجديدة بدون أخطاء.
    const contents: any[] = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "علم، سألتزم بالتعليمات والأسعار المذكورة فقط ولن أذكر أي منتج خارج القائمة." }] }
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        if (h?.text?.trim()) {
          contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    // 🚀 قائمة الموديلات (بما فيها الموديلات التجريبية اللي جوجل طلبتها منك)
    const modelsToTry = workingModelCache ? [workingModelCache] : [
      "gemini-1.5-flash",
      "gemini-3.8-flash",  // الموديل اللي جوجل طلبته في الإيرور بتاعك!
      "gemini-2.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-2.0-flash",
      "gemini-pro"
    ];

    let finalReply = null;
    let lastErrorMsg = "";

    // هيجرب الموديلات واحد واحد في أجزاء من الثانية
    for (const model of modelsToTry) {
      try {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contents,
            generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
          })
        });

        const data = await response.json();

        if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          workingModelCache = model; // هيحفظ الموديل اللي اشتغل عشان يستخدمه على طول بعد كده
          finalReply = data.candidates[0].content.parts[0].text.trim();
          break; // نجح! اخرج من اللوب
        } else {
          lastErrorMsg = data?.error?.message || "خطأ مجهول";
        }
      } catch (err: any) {
        lastErrorMsg = err.message;
      }
    }

    if (finalReply) {
      return res.status(200).json({ reply: finalReply });
    } else {
      // لو كل الموديلات فشلت (ودي مستحيلة)، هيطبعلك آخر رسالة خطأ
      workingModelCache = null;
      return res.status(200).json({ reply: `⚠️ جوجل رفضت كل الموديلات. آخر خطأ: ${lastErrorMsg}` });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: `حدث خطأ تقني: ${err.message}` });
  }
}
