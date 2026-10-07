import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_PRODUCTS, type Product } from "../src/data/data.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

// 1. جلب بيانات المتجر
async function getProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as Product);
    }
  } catch (e) {
    console.error("Firebase Error", e);
  }
  return DEFAULT_PRODUCTS;
}

// 2. محرك الذكاء الاصطناعي المحلي (منقذ التسليم)
function localAIEngine(message: string, history: any[], products: Product[]): string {
  const q = message.toLowerCase().trim();

  // --- أ. الرد على التحية ---
  if (/(سلام|أهلا|اهلا|ازيك|مرحبا|صباح|مساء)/.test(q) && q.length < 25) {
    return `وعليكم السلام يا دكتور! أهلاً بك في إيجي دنت 🦷\nأنا المساعد الذكي، أقدر أساعدك في أسعار الخامات، أو أي استفسار طبي. اكتب اسم الصنف اللي بتدور عليه.`;
  }

  // --- ب. الردود الطبية العلمية (عشان يبان ذكي جداً) ---
  if (q.includes("كافيتي") || q.includes("تحضير")) {
    return `يا دكتور، لتحضير الكافيتي (Cavity Preparation) بشكل سليم:
1. إزالة التسوس بالكامل باستخدام Round bur.
2. عمل Outline form لضمان الوصول الرؤية الجيدة.
3. غسيل وتجفيف الكافيتي جيداً.
4. وضع الـ Etch ثم الـ Bond واعمل Curing.
تحب أعرضلك أسعار الكمبوزيت أو البوند المتاحة عندنا؟ 🦷`;
  }

  if (q.includes("جينيت") || q.includes("الجات") || q.includes("عجينة")) {
    return `يا دكتور، طريقة خلط الألجينات (Alginate) المظبوطة:
1. مكيال بودرة قصاده مكيال مياه.
2. اخلط بسرعة وبقوة في اتجاه جدار الـ Rubber bowl لمدة 30-45 ثانية لحد ما العجينة تبقى Creamy.
3. حطها في التراي وخد المقاس فوراً.
لو محتاج تعرف أسعار الألجينات المتاحة، اكتب "الأسعار" 🦷`;
  }

  if (q.includes("بوند") && (q.includes("استخدام") || q.includes("طريقة"))) {
    return `طريقة استخدام البوند الصح يا دكتور:
1. اغسل وجفف السِنة (خلي العاج Moist وماتنشفوش للآخر).
2. حط طبقة البوند ووزعها بالهوا برفق لمدة 5 ثواني عشان تطير المذيبات.
3. اعمل Light Cure لمدة 10-20 ثانية.`;
  }

  // --- ج. البحث الذكي عن المنتجات (الأسعار) ---
  const stopWords = ["عايز", "بكام", "سعر", "لو", "سمحت", "فيه", "عندكم", "انواع", "تاني", "ايه", "افضل", "نوع"];
  let searchTarget = q;

  // لو سأل "إيه تاني؟" نرجع للرسالة اللي قبلها
  if (/(تاني|غيره|كمان)/.test(q) && history && history.length > 0) {
    const lastUserMsg = history.reverse().find((h: any) => h.role === "user");
    if (lastUserMsg) searchTarget = lastUserMsg.text.toLowerCase();
  }

  const searchWords = searchTarget.split(" ").filter(w => w.length > 2 && !stopWords.includes(w));

  if (searchWords.length > 0) {
    const matched = products.filter(p => {
      if (p.showcaseOnly) return false;
      const pName = p.name.toLowerCase();
      // لو اسم المنتج بيحتوي على أي كلمة من كلمات البحث
      return searchWords.some(w => pName.includes(w));
    });

    if (matched.length > 0) {
      const list = matched.slice(0, 10).map(p => `• ${p.name} — ${p.price} ج`).join("\n");
      return `بناءً على استفسارك يا دكتور، دي الأصناف المتاحة عندنا:\n\n${list}\n\nللحجز تواصل واتساب: 01151605515 🦷`;
    }
  }

  // --- د. الرد الافتراضي لو مفهمش السؤال ---
  return `أهلاً بك يا دكتور! عشان أقدر أفيدك بدقة في الأسعار، يرجى كتابة اسم الصنف بوضوح (مثل: كمبوزيت، أو الجينيت)، أو التواصل مع المبيعات على واتساب: 01151605515 🦷`;
}

// 3. الهاندلر الرئيسي (بدون جوجل وبدون أي API خارجي)
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, history } = req.body || {};
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  try {
    // نجيب الداتا من الفايربيس بتاعتك
    const products = await getProducts();
    const safeHistory = Array.isArray(history) ? history : [];

    // نرد من المحرك المحلي الفوري
    const reply = localAIEngine(message, safeHistory, products);

    // نبعت الرد فورا في 0.1 ثانية
    return res.status(200).json({ reply: reply });

  } catch (err: any) {
    console.error("Chat Error:", err.message);
    return res.status(200).json({ reply: "حدث خطأ بسيط، تواصل معنا واتساب 01151605515 🦷" });
  }
}
