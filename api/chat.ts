import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

// 🔍 1. الماسح الذكي للمفاتيح في Vercel (بيكتشف أي مفتاح بأي اسم)
function findAnyKey(): { type: "cohere" | "gemini" | "openai" | "groq"; key: string } | null {
  for (const [k, v] of Object.entries(process.env)) {
    if (!v || typeof v !== "string") continue;
    const val = v.trim();
    if (!val) continue;
    
    const keyUpper = k.toUpperCase();
    if (keyUpper.includes("COHERE")) return { type: "cohere", key: val };
    if (keyUpper.includes("GEMINI") || val.startsWith("AIzaSy")) return { type: "gemini", key: val };
    if (keyUpper.includes("OPENAI") || val.startsWith("sk-proj-")) return { type: "openai", key: val };
    if (keyUpper.includes("GROQ") || val.startsWith("gsk_")) return { type: "groq", key: val };
  }
  return null;
}

// 2. جلب المنتجات
async function getLiveStoreData() {
  let products = DEFAULT_PRODUCTS;
  let categories = DEFAULT_CATEGORIES;
  try {
    const pSnap = await getDocs(collection(liteDb, "products"));
    if (!pSnap.empty) products = pSnap.docs.map((d) => d.data() as Product);
    const cSnap = await getDocs(collection(liteDb, "categories"));
    if (!cSnap.empty) categories = cSnap.docs.map((d) => d.data() as Category);
  } catch {}

  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- [قسم ${catNames[p.cat] ?? "عام"}]: ${p.name} — السعر: ${p.price} جنيه`)
    .join("\n");

  const policyText = Object.values(policyPages)
    .map((p) => `## ${p.title}\n` + p.sections.map((s) => [s.heading, s.body, ...(s.bullets ?? [])].filter(Boolean).join(" — ")).join("\n"))
    .join("\n\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي"، طبيب أسنان محترف ومستشار مبيعات لمتجر إيجي دنت في مصر.
1. أجب عن الأسئلة الطبية، خطوة بخطوة، والمقارنات بدقة وبنية علمية بالعامية المصرية.
2. اعرض الأسعار من القائمة أدناه فقط ولا تبتكر أي سعر.
3. رقم المبيعات: 01151605515.

[المنتجات المتاحة]:
${productLines}

[السياسات]:
${policyText}`;

  return { prompt, products, catNames };
}

// 3. المحرك الطبي المعزز (في حالة عدم وجود مفاتيح)
function normalizeAr(t: string) {
  return t.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}

function ultraSmartLocalAI(message: string, products: Product[]): string {
  const q = normalizeAr(message.trim());

  // أ. التحية
  if (/^(سلام|السلام|أهلا|اهلا|ازيك|مرحبا|صباح|مساء|مسا|هاي)/.test(q) && q.length < 30) {
    return `وعليكم السلام يا دكتور! أهلاً بك في إيجي دنت 🦷\nأنا المساعد الذكي، أقدر أشرحلك طرق استخدام الخامات، أقارن بينها، أو أبحثلك عن أسعار المنتجات. تأمرني بإيه؟`;
  }

  // ب. الشرح الطبي (الكافيتي، اللاينر، العصب)
  if (q.includes("لاينر") || q.includes("liner") || q.includes("كافيتي") || q.includes("تحضير")) {
    return `يا دكتور، خطوات تطبيق الكافيتي لاينر (Cavity Liner) وتحضير السن:
1. تنظيف الكافيتي جيداً وإزالة التسوس بالكامل.
2. تجفيف المنطقة برفق دون إحداث جفاف تام للعاج (Moist dentin).
3. وضع طبقة رقيقة من اللينر (زي Glass Ionomer أو TheraCal) على قاع الكافيتي لحماية العصب.
4. عمل Curing للينر حسب تعليمات الشركة (عادة 20 ثانية).
5. البدء في تطبيق الـ Etch ثم الـ Bond والحشو.
متاح لدينا أفضل أنواع اللينر والكمبوزيت، تحب تسأل عن أسعارهم؟ 🦷`;
  }

  if (q.includes("عصب") || q.includes("حشو عصب") || q.includes("اندو")) {
    return `خطوات حشو العصب (Endodontic Treatment):
1. عمل Access cavity للوصول للقنوات.
2. تحديد الطول الشغّال (Working length) باستخدام الـ Apex locator.
3. التنظيف والتوسيع (Shaping & Cleaning) باستخدام الفايلات والـ Irrigants.
4. التجفيف بالـ Paper points وحشو القنوات بالـ Gutta-percha والـ Sealer.
متاح عندنا فايلات وجتابيركا بسعر ممتاز، أبحثلك عنها؟ 🦷`;
  }

  // ج. المقارنات الطبية
  if (q.includes("فرق") || q.includes("مقارنه") || q.includes("مقارنة") || q.includes("افضل") || q.includes("احسن")) {
    if (q.includes("كمبوزيت") || q.includes("حشو")) {
      return `الفرق بين أنواع الكمبوزيت يا دكتور:
• Flowable: لزج وسهل التدفق، ممتاز للتجاويف الصغيرة وكبطانة (Liner).
• Packable (عادي): صلب جداً، بيتحمل قوى المضغ في الأسنان الخلفية.
• Nano-filled: ممتاز جداً للأسنان الأمامية بفضل التلميع العالي (Polishing).
متاح لدينا كل الأنواع، تحب تشوف أسعارهم؟ 🦷`;
    }
    if (q.includes("سيليكون") || q.includes("طبعة") || q.includes("رابر")) {
      return `مقارنة خامات الطبعة:
• C-Silicone (زي الـ Zeta Plus): اقتصادي وممتاز، لكن يتطلب الصب السريع خلال ساعات.
• A-Silicone (Addition): أعلى دقة وثبات أبعادي، ويمكن صبه بعد أيام.
متاح لدينا النوعين، تحب تسأل عن أسعارهم؟ 🦷`;
    }
  }

  // د. البحث عن المنتجات والأسعار
  const searchWords = q.split(" ").filter((w) => w.length > 2 && !["عايز", "عاوز", "بكام", "سعر", "عندكم", "انواع", "تاني", "ايه", "افضل"].includes(w));
  if (searchWords.length > 0) {
    const matched = products.filter((p) => {
      if (p.showcaseOnly) return false;
      const pName = normalizeAr(p.name);
      return searchWords.some((w) => pName.includes(w));
    });

    if (matched.length > 0) {
      const list = matched.slice(0, 8).map((p) => `• ${p.name} — ${p.price} ج`).join("\n");
      return `بناءً على استفسارك يا دكتور، دي الأصناف المتاحة عندنا:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
    }
  }

  return `أهلاً بك يا دكتور! عشان أقدر أفيدك بدقة، اكتب اسم الصنف أو السؤال الطبي، أو تواصل مع المبيعات على واتساب: 01151605515 🦷`;
}

// 4. الهاندلر الرئيسي
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "الرسالة مطلوبة" });

  const { prompt: systemPrompt, products } = await getLiveStoreData();
  const found = findAnyKey();

  // لو مفيش أي مفتاح في Vercel، هيشغل المحرك الطبي المعزز فوراً
  if (!found) {
    return res.status(200).json({ reply: ultraSmartLocalAI(message, products) });
  }

  try {
    let replyText = "";

    // أ. الاتصال بـ Cohere لو المفتاح بتاعها موجود
    if (found.type === "cohere") {
      const resp = await fetch("https://api.cohere.com/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${found.key}` },
        body: JSON.stringify({ model: "command-r", preamble: systemPrompt, message: message.trim(), temperature: 0.3 }),
      });
      const data = await resp.json();
      if (resp.ok && data?.text) replyText = data.text.trim();
    }

    // ب. الاتصال بـ Gemini لو المفتاح بتاعها موجود
    if (!replyText && found.type === "gemini") {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${found.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: message.trim() }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
        }),
      });
      const data = await resp.json();
      if (resp.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        replyText = data.candidates[0].content.parts[0].text.trim();
      }
    }

    // جـ. الاتصال بـ OpenAI أو Groq
    if (!replyText && (found.type === "openai" || found.type === "groq")) {
      const url = found.type === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
      const model = found.type === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini";
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${found.key}` },
        body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }], temperature: 0.3 }),
      });
      const data = await resp.json();
      if (resp.ok && data?.choices?.[0]?.message?.content) {
        replyText = data.choices[0].message.content.trim();
      }
    }

    // لو الـ API نجح يرجع الرد، لو فشل يقلب على المحرك الطبي المعزز فوراً
    if (replyText) {
      return res.status(200).json({ reply: replyText });
    } else {
      return res.status(200).json({ reply: ultraSmartLocalAI(message, products) });
    }
  } catch (err: any) {
    return res.status(200).json({ reply: ultraSmartLocalAI(message, products) });
  }
}
