import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; products: Product[]; expiresAt: number } | null = null;
const TTL = 180_000;

async function getStoreData() {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache;

  const snap = await getDocs(collection(liteDb, "products"));
  const products = snap.empty ? DEFAULT_PRODUCTS : snap.docs.map((d) => d.data() as Product);

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name}: ${p.price} جنيه`)
    .join("\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي" لمتجر مستلزمات طب الأسنان في مصر.
1. رد بالعامية المصرية بوضوح واختصار.
2. يمنع منعاً باتاً ذكر أي سعر لمنتج من خارج القائمة.
3. للتواصل: واتساب 01151605515.
المنتجات:
${productLines}`;

  storeCache = { prompt, products, expiresAt: Date.now() + TTL };
  return storeCache;
}

// 🧠 المحرك الذكي المحلي (متبرمج يفهم كلام البشر)
function smartContextFallback(currentMsg: string, history: any[], products: Product[]): string {
  const q = currentMsg.toLowerCase().trim();

  // 1. الرد على التحية
  if (/(سلام|أهلا|اهلا|ازيك|مرحبا|صباح|مساء)/.test(q) && q.length < 20) {
    return `وعليكم السلام يا دكتور! أهلاً بك في إيجي دنت 🦷\nأقدر أساعدك في أسعار الخامات، طرق الاستخدام، أو تفاصيل الشحن. اسألني عن أي حاجة!`;
  }

  // 2. الأسئلة الطبية وطرق الاستخدام (مثل الألجينات والبوند)
  if ((q.includes("جينيت") || q.includes("الجات")) && (q.includes("طريق") || q.includes("عجين") || q.includes("مقادير") || q.includes("عمل"))) {
    return `يا دكتور، مقادير وطريقة خلط الألجينات (Alginate) المظبوطة:
1. المقاس القياسي: مكيال بودرة واحد (Scoop) قصاده مكيال مياه واحد (وفقاً للعبوة).
2. الخلط (Spatulation): اخلط بسرعة وبقوة في اتجاه جدار المطاط (Rubber bowl) لمدة 30-45 ثانية لحد ما العجينة تبقى ناعمة جداً (Creamy) ومفيهاش فقاعات.
3. حطها في التراي وخد المقاس فوراً.

لو محتاج تعرف أسعار الألجينات المتاحة عندنا، اكتب "أسعار الألجينات" 🦷`;
  }

  if (q.includes("بوند") && (q.includes("طريق") || q.includes("استخدام"))) {
    return `طريقة استخدام البوند الصح يا دكتور:
1. اغسل وجفف السِنة (خلي العاج Moist وماتنشفوش للآخر).
2. حط طبقة البوند ووزعها بالهوا برفق لمدة 5 ثواني عشان تطير المذيبات.
3. اعمل Light Cure لمدة 10-20 ثانية.`;
  }

  // 3. تحليل سياق "إيه تاني؟"
  let searchTarget = q;
  const moreKeywords = ["تاني", "انواع", "غيره", "مفيش", "ايه كمان"];
  const isAskingForMore = moreKeywords.some(w => q.includes(w)) && q.split(" ").length <= 5;

  if (isAskingForMore && history.length > 0) {
    // لو قال "إيه تاني"، هنجيب آخر سؤال سأله الدكتور بس وندور بيه
    const lastUserMsg = history.reverse().find(h => h.role === "user");
    if (lastUserMsg) searchTarget = lastUserMsg.text.toLowerCase();
  }

  // 4. محرك البحث في المنتجات
  const stopWords = ["عايز", "بكام", "عندكم", "سعر", "لو", "سمحت", "فيه", "تاني", "انواع", "مفيش"];
  const searchWords = searchTarget.split(" ").filter(w => w.length > 2 && !stopWords.includes(w));

  if (searchWords.length > 0) {
    const matched = products.filter(p => {
      if (p.showcaseOnly) return false;
      const pName = p.name.toLowerCase();
      // بيبحث عن أي كلمة مهمة في اسم المنتج
      return searchWords.some(w => pName.includes(w));
    });

    if (matched.length > 0) {
      const limit = isAskingForMore ? 10 : 4; // لو سأل "إيه تاني" نعرضله 10 منتجات بدل 4
      const list = matched.slice(0, limit).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
      const intro = isAskingForMore ? "بناءً على طلبك، دي كل الأنواع المتاحة عندنا من الصنف ده:" : "دي أسعار الأصناف المتاحة عندنا فوراً بناءً على سؤالك:";
      return `${intro}\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
    }
  }

  // 5. الرد الافتراضي لو مفهمش خالص
  return `أهلاً بك يا دكتور! عشان أقدر أفيدك بدقة، يرجى كتابة اسم الصنف بوضوح (مثل: كمبوزيت شوفو، أو الجينيت)، أو التواصل مع المبيعات على واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  const { prompt: systemPrompt, products } = await getStoreData();
  const safeHistory = Array.isArray(history) ? history : [];

  if (!apiKey) {
    return res.status(200).json({ reply: smartContextFallback(message, safeHistory, products) });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); 

  try {
    const contents: any[] = [];
    for (const h of safeHistory.slice(-4)) {
      if (h?.text?.trim()) {
        contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text.trim() }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: message.trim() }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok) {
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return res.status(200).json({ reply: reply || "أهلاً بك يا دكتور! كيف يمكنني مساعدتك؟ 🦷" });
    } else {
      return res.status(200).json({ reply: smartContextFallback(message, safeHistory, products) });
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    return res.status(200).json({ reply: smartContextFallback(message, safeHistory, products) });
  }
}
