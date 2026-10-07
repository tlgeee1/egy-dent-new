import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_PRODUCTS, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

// جلب المنتجات من الفايربيس
async function getProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (!snap.empty) return snap.docs.map((d) => d.data() as Product);
  } catch (e) {
    console.error("Firebase Error", e);
  }
  return DEFAULT_PRODUCTS;
}

// 🧠 المحرك الذكي المطور
function localAIEngine(message: string, history: any[], products: Product[]): string {
  const q = message.toLowerCase().trim();

  // 1. الرد على التحية (بكل أشكالها المصرية بحمزة ومن غير حمزة)
  if (/(سلام|السلام|أهلا|اهلا|ازيك|مرحبا|صباح|مساء|مسا|هاي|هلو)/.test(q) && q.length < 35) {
    return `أهلاً بك يا دكتور! نورت إيجي دنت 🦷
أنا المساعد الذكي، أقدر أشرحلك طرق استخدام الخامات، أو أبحثلك عن أسعار أي خامة متاحة عندنا. تأمرني بإيه؟`;
  }

  // 2. تحليل نية الدكتور
  const isAskingForMethod = /(طريقة|طريقه|استخدام|ازاي|كيف|شرح|عمل|خطوات|مقادير|خلط)/.test(q);
  const isAskingForComparison = /(فرق|مقارنة|احسن|افضل|ايهما|أفضل)/.test(q);

  // 3. الأسئلة الطبية وطرق الاستخدام
  if (isAskingForMethod) {
    if (q.includes("كافيتي") || q.includes("تحضير")) {
      return `يا دكتور، لتحضير الكافيتي (Cavity Preparation) بشكل سليم:
1. إزالة التسوس بالكامل باستخدام Round bur.
2. عمل Outline form لضمان الرؤية الجيدة.
3. غسيل وتجفيف الكافيتي جيداً.
4. وضع الـ Etch ثم الـ Bond واعمل Light Cure.
تحب أعرضلك أسعار الكمبوزيت أو البوند المتاحة عندنا؟ 🦷`;
    }
    if (q.includes("جينيت") || q.includes("الجات") || q.includes("عجينة")) {
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
3. اعمل Light Cure لمدة 10-20 ثانية.
تحب تشوف أسعار البوند؟ 🦷`;
    }
  }

  // 4. المقارنات الطبية
  if (isAskingForComparison) {
    if (q.includes("سيليكون") || q.includes("رابر") || q.includes("طبعة")) {
      return `الفرق بين أنواع خامات الطبعة يا دكتور:
• C-Silicone: اقتصادي وممتاز للحالات اليومية، لكن لازم يتصب خلال ساعات.
• A-Silicone: دقة متناهية وثبات أبعادي عالي جداً، وتقدر تصبه حتى بعد أيام.
متاح عندنا النوعين بأسعار ممتازة، تحب أعرضهم؟ 🦷`;
    }
    if (q.includes("كمبوزيت") || q.includes("حشو")) {
      return `بص يا دكتور، الكومبوزيت الـ Flowable ممتاز للتجاويف الصغيرة وكبطانة لأنه بيفرش بسهولة، لكن الـ Packable بيتحمل الضغط العالي وممتاز للأسنان الخلفية.
تحب تشوف أسعارهم عندنا بكام؟ 🦷`;
    }
  }

  // 5. محرك البحث الذكي عن المنتجات والأسعار
  let searchTarget = q;
  if (/(تاني|غيره|كمان|انواع|أنواع)/.test(q) && history.length > 0) {
    const lastUserMsg = history.reverse().find((h: any) => h.role === "user");
    if (lastUserMsg) searchTarget = lastUserMsg.text.toLowerCase();
  }

  const stopWords = ["عايز", "عاوز", "بكام", "سعر", "لو", "سمحت", "فيه", "عندكم", "انواع", "تاني", "ايه", "افضل", "نوع", "ممكن", "محتاج", "الخير", "النور", "ياريت", "هات"];
  const searchWords = searchTarget.split(" ").filter(w => w.length > 2 && !stopWords.includes(w));

  if (searchWords.length > 0) {
    const matched = products.filter(p => {
      if (p.showcaseOnly) return false;
      const pName = p.name.toLowerCase();
      return searchWords.some(w => pName.includes(w));
    });

    if (matched.length > 0) {
      matched.sort((a, b) => {
        const aMatch = searchWords.filter(w => a.name.toLowerCase().includes(w)).length;
        const bMatch = searchWords.filter(w => b.name.toLowerCase().includes(w)).length;
        return bMatch - aMatch;
      });

      const list = matched.slice(0, 10).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
      return `بناءً على استفسارك يا دكتور، دي الأصناف المتاحة عندنا:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
    } else {
      return `عذراً يا دكتور، الصنف ده مش متاح في المتجر حالياً، يرجى التواصل مع المبيعات على واتساب 01151605515 للتأكد من توافره بالمخزن 🦷`;
    }
  }

  // 6. الرد الافتراضي
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
