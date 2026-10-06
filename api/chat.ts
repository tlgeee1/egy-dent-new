import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebaseConfig.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

/* ---------------- جلب البيانات من الفايربيس ---------------- */
async function getLiveStoreData() {
  let products = DEFAULT_PRODUCTS;
  let categories = DEFAULT_CATEGORIES;

  try {
    const pSnap = await getDocs(collection(liteDb, "products"));
    if (!pSnap.empty) products = pSnap.docs.map((d) => d.data() as Product);

    const cSnap = await getDocs(collection(liteDb, "categories"));
    if (!cSnap.empty) categories = cSnap.docs.map((d) => d.data() as Category);
  } catch {
    // استخدام البيانات الافتراضية في حالة عدم الاتصال
  }

  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  return { products, categories, catNames };
}

/* ---------------- المحرك الذكي المحلي (Smart NLP Engine) ---------------- */
function generateSmartReply(query: string, products: Product[], catNames: Record<string, string>): string {
  const q = query.toLowerCase().trim();

  // 1. استفسارات استخدام الخامات الطبية
  if (q.includes("بوند") && (q.includes("استخدام") || q.includes("طريقة") || q.includes("إزاي"))) {
    return `يا دكتور، طريقة استخدام بوند الأسنان بالطريقة الصح:
1. اعمل Etching للماينا (Enamel) لمدة 15-20 ثانية، واغسل بالمية جيداً وجفف بدون ما تنشف العاج (Dentin) تماماً (Moist Dentin).
2. حط طبقة البوند ووزعها بالهواء الخفيف (Air dry) لمدة 5 ثواني عشان تفرش وتتبخر المذيبات.
3. اعمل Light Cure لمدة 10 لـ 20 ثانية.
4. ابدأ حط الكمبوزيت طبقات (Increments).

حابب تستفسر عن أنواع البوند المتاحة وأسعارها؟ 🦷`;
  }

  if (q.includes("سيليكون") || q.includes("رابر") || q.includes("طبعة")) {
    if (q.includes("فرق") || q.includes("مقارنة")) {
      return `الفرق بين أنواع خامات الطبعة يا دكتور:
• C-Silicone (زي الـ Zeta Plus): اقتصادي وممتاز للحالات اليومية، بس لازم يتصب خلال ساعات قليلة.
• A-Silicone (Addition): دقة متناهية وثبات أبعادي (Dimensional Stability) عالي جداً، وتقدر تصبه حتى بعد أيام.

متاح عندنا النوعين بأفضل الأسعار! 🦷`;
    }
  }

  // 2. الشحن والتوصيل والسياسات
  if (q.includes("شحن") || q.includes("توصيل") || q.includes("بكام الشحن") || q.includes("وقت")) {
    return `📦 تفاصيل الشحن والتوصيل في إيجي دنت:
• القاهرة والجيزة: التوصيل خلال 24 - 48 ساعة.
• باقي المحافظات: خلال 2 - 4 أيام عمل.
• الشحن مجاني للطلبات الكبيرة اللي بتتعدى الحد الأدنى للمتجر.

تقدر تطلب أونلاين فوراً أو تتواصل مع المبيعات واتساب: 01151605515 🦷`;
  }

  if (q.includes("استرجاع") || q.includes("استبدال") || q.includes("ضمان") || q.includes("أصلي")) {
    return `🛡️ ضمانات إيجي دنت:
• كل منتجاتنا أصلية 100% ومستوردة من الوكلاء المعتمدين.
• متاح الاستبدال أو الاسترجاع خلال 14 يوم من الاستلام طالما المنتج بنفس عبوته الأصلية.

نحن نضمن لك جودة كل خامة في عيادتك! 🦷`;
  }

  if (q.includes("عنوان") || q.includes("فرع") || q.includes("مكان") || q.includes("فين")) {
    return `📍 فروع إيجي دنت في خدمتك:
1. فرع مدينة نصر: 60 شارع الطيران.
2. فرع القصر العيني: 37 شارع بستان الفاضل.
3. فرع 6 أكتوبر.

ومتاح الشحن والسداد عند الاستلام لكل محافظات مصر! 🚛`;
  }

  // 3. البحث عن منتجات وأسعار محددة في المتجر
  const matchedProducts = products.filter((p) => {
    if (p.showcaseOnly) return false;
    const pName = p.name.toLowerCase();
    const words = q.split(" ").filter((w) => w.length > 2);
    return words.some((w) => pName.includes(w));
  });

  if (matchedProducts.length > 0) {
    const list = matchedProducts
      .slice(0, 5)
      .map((p) => `• ${p.name} (${catNames[p.cat] ?? "خامات"}): ${p.price} جنيه`)
      .join("\n");

    return `أهلاً بك يا دكتور! دي الأصناف والأسعار المتاحة عندنا بناءً على سؤالك:\n\n${list}\n\nتقدر تضيف الصنف للسلة فوراً، أو تتواصل مع المبيعات واتساب للطلبيات الكبيرة: 01151605515 🦷`;
  }

  // 4. التحية العامة والرد المباشر
  if (q.includes("سلام") || q.includes("أهلا") || q.includes("ازيك") || q.includes("مرحبا") || q.includes("صباح") || q.includes("مساء")) {
    return `أهلاً بك يا دكتور في متجر إيجي دنت! 🦷
أنا مساعدك الذكي، أقدر أساعدك في معرفة أسعار الخامات، طرق استخدامها، تفاصيل الشحن أو متابعة طلبك.

اكتبلي اسم الصنف أو السؤال اللي محتاجه فوراً!`;
  }

  // 5. رد ذكي افتراضي شامول لأسعار المنتجات الأكثر مبيعاً
  const topProducts = products
    .filter((p) => !p.showcaseOnly)
    .slice(0, 4)
    .map((p) => `• ${p.name}: ${p.price} ج`)
    .join("\n");

  return `أهلاً بك يا دكتور! في إيجي دنت بنوفرلك أصلية خامات الأسنان بأفضل سعر في مصر.

من أكثر الأصناف طلباً اليوم:
${topProducts}

تقدر تسألني عن أي خامة أو سعر بالاسم، أو تتواصل مباشرة مع المبيعات واتساب: 01151605515 🦷`;
}

/* ---------------- API Handler ---------------- */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  try {
    // جلب المنتجات والفئات لايف
    const { products, catNames } = await getLiveStoreData();

    // توليد الرد المحترف والذكي فوراً
    const reply = generateSmartReply(message, products, catNames);

    return res.status(200).json({ reply });
  } catch (err: any) {
    return res.status(200).json({
      reply: "أهلاً بك يا دكتور! متاح لدينا جميع خامات الأسنان بأفضل الأسعار. للتواصل الفوري مع المبيعات: 01151605515 🦷",
    });
  }
}
