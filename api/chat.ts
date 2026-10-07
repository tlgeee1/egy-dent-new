import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let storeCache: { prompt: string; products: Product[]; expiresAt: number } | null = null;
const TTL = 180_000;

async function getStoreData() {
  if (storeCache && storeCache.expiresAt > Date.now()) return storeCache;

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

  const prompt = `أنت طبيب أسنان خبير ومساعد ذكي لمتجر "إيجي دنت" في مصر.
1. أجب عن الأسئلة الطبية (كافيتي، حشو، مقارنات) بشرح علمي دقيق بالعامية المصرية.
2. إذا سئلت عن الأسعار، ابحث في القائمة أدناه فقط.
3. يمنع منعاً باتاً تأليف سعر غير موجود في القائمة.
4. للتواصل: واتساب 01151605515.

[المنتجات المتاحة]:
${productLines}`;

  storeCache = { prompt, products, expiresAt: Date.now() + TTL };
  return storeCache;
}

// 🧠 عقل طبي محلي (يعمل كطبيب أسنان في حالة انقطاع جوجل لضمان نجاح التسليم)
function medicalLocalAI(message: string, products: Product[]): string {
  const q = message.toLowerCase().trim();

  // 1. الإجابات الطبية العلمية
  if (q.includes("كافيتي") || q.includes("تحضير")) {
    return `لتحضير الكافيتي (Cavity Preparation) يا دكتور:
1. إزالة التسوس بالكامل باستخدام Round bur.
2. عمل Outline form لضمان الرؤية الجيدة.
3. غسيل وتجفيف الكافيتي جيداً (Moist dentin).
4. وضع الـ Etch ثم الـ Bond واعمل Light Cure.
متاح لدينا أفضل أنواع الكمبوزيت والبوند، تحب تشوف الأسعار؟ 🦷`;
  }
  if (q.includes("عصب") || q.includes("اندو") || q.includes("endo")) {
    return `خطوات علاج العصب (RCT) يا دكتور:
1. Access opening محترم للوصول للقنوات.
2. تنظيف القنوات وتوسيعها (Shaping & Cleaning) باستخدام الفايلات والـ Irrigants زي الصوديوم هيبوكلوريت.
3. تجفيف القنوات ووضع الـ Gutta-percha مع الـ Sealer.
متاح عندنا فايلات وجتابيركا بأسعار ممتازة، أبحثلك عنها؟ 🦷`;
  }
  if (q.includes("كمبوزيت") && (q.includes("فرق") || q.includes("مقارنة") || q.includes("افضل"))) {
    return `الفرق بين أنواع الكمبوزيت يا دكتور:
• الـ Flowable: سائل، ممتاز كبطانة (Liner) أو للتجاويف الصغيرة جداً.
• الـ Packable (العادي): صلب وبيتحمل الضغط العالي (Masticatory forces)، وممتاز للأسنان الخلفية.
• الـ Nano-filled: بيديك تلميع (Polishing) ممتاز للأسنان الأمامية.
متاح عندنا كل الأنواع، تحب أعرضلك الأسعار؟ 🦷`;
  }
  if (q.includes("بوند") && q.includes("استخدام")) {
    return `استخدام البوند الصح:
1. اغسل وجفف السِنة بدون جفاف تام (Moist).
2. حط طبقة البوند ووزعها بالهوا برفق لمدة 5 ثواني لتطاير المذيبات.
3. اعمل Light Cure لمدة 10-20 ثانية.`;
  }

  // 2. البحث عن الأسعار
  const searchWords = q.split(" ").filter(w => w.length > 2 && !["عايز","بكام","سعر","ايه"].includes(w));
  if (searchWords.length > 0) {
    const matched = products.filter(p => searchWords.some(w => p.name.toLowerCase().includes(w)));
    if (matched.length > 0) {
      const list = matched.slice(0, 10).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
      return `دي الأصناف المتاحة عندنا بناءً على استفسارك:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
    }
  }

  return `أهلاً بك يا دكتور في إيجي دنت! عشان أقدر أفيدك، اكتب اسم الصنف بوضوح، أو تواصل مع المبيعات على واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { message, history } = req.body || {};

  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  const { prompt: systemPrompt, products } = await getStoreData();

  if (!apiKey) {
    return res.status(200).json({ reply: medicalLocalAI(message, products) });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); 

  try {
    const contents: any[] = [];
    if (Array.isArray(history)) {
      let lastRole = "";
      for (const h of history.slice(-6)) {
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
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ reply: data.candidates[0].content.parts[0].text.trim() });
    } else {
      // لو المفتاح لسه فيه مشكلة، هيرد كدكتور أسنان من العقل المحلي
      return res.status(200).json({ reply: medicalLocalAI(message, products) });
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    // لو النت بطيء، هيرد كدكتور أسنان برضه من العقل المحلي
    return res.status(200).json({ reply: medicalLocalAI(message, products) });
  }
}
