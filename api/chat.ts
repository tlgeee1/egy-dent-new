import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_PRODUCTS, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

async function getProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (!snap.empty) return snap.docs.map((d) => d.data() as Product);
  } catch (e) {
    console.error("Firebase Error", e);
  }
  return DEFAULT_PRODUCTS;
}

// 🔧 دالة لتصليح الأخطاء الإملائية واللغة العربية (عشان البحث يكون دقيق)
const normalizeArabic = (text: string) => {
  return text.toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/(الجينيت|الجات|الجنيت)/g, 'الجينات')
    .replace(/(كومبوزيت|كمبوزت)/g, 'كمبوزيت')
    .replace(/(بوندنج)/g, 'بوند');
};

// 🧠 المحرك الذكي (مطور بنظام النقاط)
function localAIEngine(message: string, history: any[], products: Product[]): string {
  const q = message.toLowerCase().trim();

  // 1. الرد على التحية 
  if (/(سلام|السلام|أهلا|اهلا|ازيك|مرحبا|صباح|مساء|مسا|هاي|هلو)/.test(q) && q.length < 35) {
    return `وعليكم السلام يا دكتور! نورت إيجي دنت 🦷
أنا المساعد الذكي، أقدر أشرحلك طرق استخدام الخامات، أو أبحثلك عن أسعار أي صنف متاح عندنا. تأمرني بإيه؟`;
  }

  const isAskingForMethod = /(طريقة|طريقه|استخدام|ازاي|كيف|شرح|عمل|خطوات|مقادير|خلط)/.test(q);
  const isAskingForComparison = /(فرق|مقارنة|احسن|افضل|ايهما|أفضل)/.test(q);

  // 2. الأسئلة الطبية وطرق الاستخدام
  if (isAskingForMethod) {
    if (q.includes("كافيتي") || q.includes("تحضير")) {
      return `يا دكتور، لتحضير الكافيتي (Cavity Preparation) بشكل سليم:
1. إزالة التسوس بالكامل باستخدام Round bur.
2. عمل Outline form لضمان الرؤية الجيدة.
3. غسيل وتجفيف الكافيتي جيداً.
4. وضع الـ Etch ثم الـ Bond واعمل Light Cure.
تحب أعرضلك أسعار الكمبوزيت المتاحة عندنا؟ 🦷`;
    }
    if (q.includes("جينيت") || q.includes("الجات") || q.includes("جينات") || q.includes("عجينة")) {
      return `يا دكتور، طريقة خلط الألجينات المظبوطة:
1. مكيال بودرة قصاده مكيال مياه (حسب العبوة).
2. اخلط بسرعة في اتجاه جدار الـ Rubber bowl لمدة 30-45 ثانية لحد ما العجينة تبقى Creamy.
3. حطها في التراي وخد المقاس فوراً.
محتاج أعرضلك أسعار الألجينات المتاحة عندنا؟ 🦷`;
    }
    if (q.includes("بوند")) {
      return `طريقة استخدام البوند الصح يا دكتور:
1. اغسل وجفف السِنة (خلي العاج Moist وماتنشفوش للآخر).
2. حط طبقة البوند ووزعها بالهوا برفق لمدة 5 ثواني عشان تطير المذيبات.
3. اعمل Light Cure لمدة 10-20 ثانية.`;
    }
  }

  // 3. المقارنات الطبية
  if (isAskingForComparison) {
    if (q.includes("سيليكون") || q.includes("رابر") || q.includes("طبعة")) {
      return `الفرق بين أنواع خامات الطبعة يا دكتور:
• C-Silicone: اقتصادي وممتاز للحالات اليومية، لكن لازم يتصب خلال ساعات.
• A-Silicone: دقة متناهية وثبات أبعادي عالي جداً، وتقدر تصبه حتى بعد أيام.`;
    }
    if (q.includes("كمبوزيت") || q.includes("حشو")) {
      return `بص يا دكتور، الكومبوزيت الـ Flowable ممتاز للتجاويف الصغيرة وكبطانة لأنه بيفرش بسهولة، لكن الـ Packable بيتحمل الضغط العالي وممتاز للأسنان الخلفية.`;
    }
  }

  // 4. محرك البحث الذكي المبني على النقاط (Scoring System)
  let searchTarget = q;
  if (/(تاني|غيره|كمان|انواع|أنواع)/.test(q) && history.length > 0) {
    const lastUserMsg = history.reverse().find((h: any) => h.role === "user");
    if (lastUserMsg) searchTarget = lastUserMsg.text.toLowerCase();
  }

  const normTarget = normalizeArabic(searchTarget);
  const stopWords = ["عايز", "عاوز", "بكام", "سعر", "لو", "سمحت", "فيه", "عندكم", "انواع", "تاني", "ايه", "افضل", "نوع", "ممكن", "محتاج", "الخير", "هات"];
  const searchWords = normTarget.split(" ").filter(w => w.length > 2 && !stopWords.includes(w));

  if (searchWords.length > 0) {
    // 🚀 تطبيق نظام النقاط
    const scoredProducts = products.map(p => {
      let score = 0;
      if (p.showcaseOnly) return { ...p, score };

      const pName = normalizeArabic(p.name);
      
      // لو العميل كتب الاسم بالظبط
      if (pName.includes(searchWords.join(" "))) score += 100;

      searchWords.forEach(w => {
        if (pName.includes(w)) {
          score += 10; // 10 نقط لو الكلمة العادية موجودة
          // 50 نقطة بونص لو الكلمة أساسية طبية عشان متتمسحش في وسط كلمات زي "صيني" أو "عادي"
          if (["الجينات", "كمبوزيت", "بوند", "جتابيركا", "سيليكون", "رابر"].includes(w)) {
            score += 50; 
          }
        }
      });
      return { ...p, score };
    }).filter(p => p.score > 0);

    if (scoredProducts.length > 0) {
      // ترتيب النتايج من الأعلى نقاط (الأكثر دقة) للأقل
      scoredProducts.sort((a, b) => b.score - a.score);

      const list = scoredProducts.slice(0, 8).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
      return `بناءً على استفسارك يا دكتور، دي الأصناف المتاحة عندنا:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
    } else {
      return `عذراً يا دكتور، الصنف ده مش متاح في المتجر حالياً، يرجى التواصل مع المبيعات على واتساب 01151605515 للتأكد من توافره بالمخزن 🦷`;
    }
  }

  // 5. الرد الافتراضي
  return `أهلاً بك يا دكتور! عشان أقدر أفيدك بدقة، يرجى كتابة اسم الصنف بوضوح (مثل: كمبوزيت شوفو، أو ألجينات)، أو التواصل مع المبيعات على واتساب: 01151605515 🦷`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, history } = req.body || {};
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  try {
    const products = await getProducts();
    const safeHistory = Array.isArray(history) ? history : [];
    const reply = localAIEngine(message, safeHistory, products);
    return res.status(200).json({ reply: reply });
  } catch (err: any) {
    return res.status(200).json({ reply: "حدث خطأ بسيط، تواصل معنا واتساب 01151605515 🦷" });
  }
}
