import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { firebaseConfig } from "../src/lib/firebase.js";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS, type Category, type Product } from "../src/data/data.js";
import { policyPages } from "../src/data/policies.js";

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
const liteDb = getFirestore(app);

let cache: { prompt: string; expiresAt: number; products: Product[] } | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchLiveProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(liteDb, "products"));
    if (snap.empty) return DEFAULT_PRODUCTS;
    return snap.docs.map((d) => d.data() as Product);
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

async function fetchLiveCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(liteDb, "categories"));
    if (snap.empty) return DEFAULT_CATEGORIES;
    return snap.docs.map((d) => d.data() as Category);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

async function getStoreContext() {
  if (cache && cache.expiresAt > Date.now()) {
    return { prompt: cache.prompt, products: cache.products };
  }

  const [products, categories] = await Promise.all([fetchLiveProducts(), fetchLiveCategories()]);

  const catNames: Record<string, string> = {};
  categories.forEach((c) => (catNames[c.id] = c.name));

  const productLines = products
    .filter((p) => !p.showcaseOnly)
    .map((p) => `- ${p.name} (${catNames[p.cat] ?? p.cat}): ${p.price} جنيه`)
    .join("\n");

  const policyText = Object.values(policyPages)
    .map((page) => {
      const body = page.sections
        .map((s) => [s.heading, s.body, ...(s.bullets ?? [])].filter(Boolean).join(" — "))
        .join("\n");
      return `## ${page.title}\n${body}`;
    })
    .join("\n\n");

  const prompt = `أنت "مساعد إيجي دنت الذكي" — مستشار وخبير ومستلزمات طب الأسنان لمتجر "إيجي دنت" (EgyDent) في مصر.

تعليمات الرد الصارمة:
1. رد دايمًا بالعامية المصرية الراقية والودودة (كأنت طبيب أسنان خبير ومحترم).
2. أنت طبيب وصيدلي خبير في خامات الأسنان (Composites, Bonding, Amalgam, Rubber base, Alginate, etc.).
3. اشرح الخطوات الطبية السليمة والعملية بدقة واختصار شديد ومباشر (من 2 لـ 4 جمل).
4. التزم فقط بقائمة المنتجات والأسعار والسياسات المذكورة بالأسفل، ولا تخترع منتجات أو أسعار غير موجودة.
5. للتواصل مع المبيعات: واتساب 01151605515.

قائمة منتجات المتجر الحالية وأسعارها:
${productLines}

سياسات المتجر وفروعنا:
${policyText}
فروعنا هي: مدينة نصر، القصر العيني، 6 أكتوبر. الشحن متوفر لكل المحافظات والدفع عند الاستلام.`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS, products };
  return { prompt, products };
}

// 🛡️ قاعدة المعرفة الطبية الشاملة لشبكة الأمان (الـ Fallback) لضمان العمل دائماً
function getSmartFallbackReply(userMessage: string, products: Product[]): string {
  const normalize = (text: string) => {
    return text
      .replace(/[أإآا]/g, "ا")
      .replace(/[ةه]/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const q = normalize(userMessage);

  if (q.includes("املجم") || q.includes("بلاتين") || q.includes("فضه") || q.includes("amalgam")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خلط") || q.includes("استخدام") || q.includes("تحضير")) {
      return (
        "📝 طريقة خلط وتحضير الأملجم (البلاتين/الفضة) طبياً 🦷:\n\n" +
        "1️⃣ استخدام الكبسولات الجاهزة المعايرة مسبقاً (Amalgam Capsules) لضمان النسب الدقيقة.\n" +
        "2️⃣ ضع الكبسولة في جهاز خلط الأملجم (Amalgamator) واضبط الوقت والسرعة (سرعة عالية من 8 لـ 12 ثانية).\n" +
        "3️⃣ بعد انتهاء الخلط، افتح الكبسولة وافرغ معجون الأملجم في الـ Amalgam well.\n" +
        "4️⃣ استخدم الـ Amalgam Carrier لنقله للـ cavity على دفعات.\n" +
        "5️⃣ اعمل Condensation قوي جداً باستخدام الـ Condenser لطرد الزئبق الزائد وسد الفراغات.\n" +
        "6️⃣ قم بعمل Carving لضبط الـ anatomy، ثم Burnishing لتنعيم السطح تماماً."
      );
    }
    return "متوفر عندنا كبسولات أملجم (بلاتين) مستوردة بجودة عالية وسماكة ممتازة للأسنان الخلفية. تحب تسأل عن الأسعار أو طريقة التحضير؟";
  }

  if (q.includes("بوند") || q.includes("بند") || q.includes("bond") || q.includes("ادهيسيف")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خطوات") || q.includes("استخدام")) {
      return (
        "📝 طريقة تطبيق البوند بخطوات طبية دقيقة 🦷:\n\n" +
        "🔹 بوند الجيل الخامس (Total-Etch):\n" +
        "1️⃣ ضع الـ Acid Etch 37% لمدة 15 ثانية على المينا و 10 ثواني على العاج.\n" +
        "2️⃣ اغسل بالماء 20 ثانية، ثم جفف بلطف مع إبقاء العاج رطباً قليلاً (Moist).\n" +
        "3️⃣ ضع طبقتين بوند وافرك بلطف 15 ثانية ثم تجفيف هواء خفيف (Air thinning) و Light cure لمدة 20 ثانية.\n\n" +
        "🔸 بوند الجيل الثامن / Universal:\n" +
        "• يفرك مباشرة على العاج 20 ثانية ثم تجفيف خفيف ثم Light cure 20 ثانية (لا يسبب حساسية بعد الحشو)."
      );
    }
    return "الفرق بين بوند الجيل الخامس والثامن (Universal) 🧪:\n\n🔹 الجيل الخامس: يحتاج خطوة تخريش منفصلة بالحمض (Total-Etch)، ربط قوي جداً ولكن حساس للرطوبة.\n🔸 الجيل الثامن (Universal): ذاتي التخريش (Self-Etch)، لا يسبب حساسية بعد الحشو نهائياً ويمسك بكفاءة في الزركونيا والمعادن.";
  }

  if (q.includes("رابر") || q.includes("بيز") || q.includes("طبعه") || q.includes("سيليكون") || q.includes("طبعات")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خلط") || q.includes("استخدام")) {
      return (
        "📝 طريقة خلط الرابر بيز (السيليكون) 🦷:\n\n" +
        "1️⃣ الـ Putty: خذ مقدار متساوي بالملعقة من Base و Catalyst واخلطهم بأطراف أصابعك بسرعة حتى يتوحد اللون تماماً.\n" +
        "⚠️ تنبيه طبي هام: لا تخلط بجوانتي لاتكس نهائياً لأن الكبريت يمنع تصلب السيليكون، استخدم جوانتيات نترايل أو اخلط بيد نظيفة.\n" +
        "2️⃣ الـ Light Body: يحقن بالمسدس والتيب مباشرة حول تحضير الأسنان فم المريض لتسجيل أدق التفاصيل تحت اللثة."
      );
    }
    return (
      "الفرق بين الرابر بيز العادي والادشن سيليكون 🦷:\n\n" +
      "🔹 العادي (C-Silicone زي زيتا بلس وسيلكسيل من 490ج لـ 1980ج): اقتصادي وممتاز لمقاسات الدراسة، ينكمش تدريجياً ويجب صبه سريعاً في المعمل.\n" +
      "🔸 الادشن سيليكون (A-Silicone زي Elite HD وكروموبان من 1400ج لـ 2980ج): دقة ميكرونية متناهية وثبات أبعاد لأيام دون أي انكماش، مثالي للتيجان والجسور والفينير."
    );
  }

  if (q.includes("كمبوزيت") || q.includes("كومبوزيت") || q.includes("حشو")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خطوات") || q.includes("استخدام")) {
      return (
        "📝 خطوات تطبيق حشو الكمبوزيت التجميلي 🦷:\n\n" +
        "1️⃣ بعد تحضير السن وتطبيق البوند والكيورينج، ابدأ بوضع الكمبوزيت بنظام الطبقات (Incremental Placement).\n" +
        "2️⃣ ضع طبقات رقيقة لا تتجاوز سماكتها 2 مم (Max 2mm layers) لتجنب انكماش البلمرة (Polymerization Shrinkage).\n" +
        "3️⃣ اعمل Light cure لكل طبقة لمدة 20 ثانية بشكل منفصل.\n" +
        "4️⃣ اضبط العضة ببرات التفنيش، ثم لمع الحشو بأقراص وسنابل التلميع للحصول على سطح ناعم كالمينا الطبيعية."
      );
    }
    if (q.includes("روبي") && q.includes("شوفو")) {
      return "المقارنة بين كمبوزيت روبي وشوفو الياباني 💎:\n\n• روبي (180ج): اقتصادي جداً وممتاز للحشوات الخلفية العادية وتكلفة تشغيل بسيطة.\n• شوفو Shofu الياباني (950ج): بريميوم تجميلي بتقنية Giomer، لمعان طبيعي وثبات فائق للأسنان الأمامية ومقاومة للتآكل.";
    }
    return "متوفر عندنا تشكيلة واسعة من الكمبوزيت من الاقتصادي حتى البريميوم 🦷:\n\n• روبي: 180 ج | برايم: 200 ج | ميتا: 280 ج\n• شارم: 285 ج | هندي: 350 ج | برازيلي: 350 ج\n• نوفا: 500 ج | دي فيل: 500 ج | كير: 600 ج\n• زركون فيل: 650 ج | زد فيل: 800 ج | ايتينا: 800 ج\n• شوفو ياباني: 950 ج | تكوياما: 950 ج | دنت سبلاي: 1250 ج\n• تكوياما اومنيكروما: 1600 ج | اكسترا فيل: 1750 ج | جراندو فوكو: 2050 ج";
  }

  if (q.includes("الجينيت") || q.includes("الجنيت") || q.includes("جينات") || q.includes("الserverجين")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خلط")) {
      return "📝 طريقة خلط الألجينات بدون فقاعات 🦷:\n\n1️⃣ عاير البودرة والماء بالمكاييل المرفقة بدقة وضع البودرة أولاً في الـ Rubber bowl ثم أضف الماء البارد.\n2️⃣ اضغط المعجون بقوة بالاسباتولا ضد جدار الوعاء المطاطي بحركة دائرية سريعة (على شكل حرف 8) للحصول على معجون ناعم ومتجانس تماماً خالٍ من فقاعات الهواء قبل نقله للـ Tray.";
    }
    return "متوفر ألجينات مستوردة عالية الدقة 🧪:\n\n• صيني: 170 ج | كروموبان: 250 ج | IQ: 260 ج\n• زيتالجين Zetalgin: 270 ج | تروبيكال جين: 425 ج\n• كيفيكس Cavex: 460 ج | هيدروجم فايف Hydrogum 5: 485 ج";
  }

  if (q.includes("جوانت") || q.includes("نترايل") || q.includes("لاتكس") || q.includes("ماسك")) {
    return "أسعار الجوانتيات والماسكات الطبية 🧤:\n\n• نترايل أسود فيت برو: 170 ج\n• netrail أزرق فيت برو: 160 ج\n• نترايل أزرق سوبر كير: 160 ج\n• لاتكس أبيض ماليزي: 165 ج\n• ماسك مصري: 50 ج | ماسك صيني: 65 ج | ماسك ابيك أسود: 140 ج";
  }

  const words = q.replace(/سعر|بكام|ثمن|عندكم|عايز|محتاج/g, "").trim().split(" ").filter((w) => w.length > 1);
  for (const word of words) {
    const found = products.find((p) => p.name && p.name.toLowerCase().includes(word));
    if (found) {
      return `✅ ${found.name}\n💰 السعر: ${found.price} جنيه${found.oldPrice ? ` (قبل الخصم: ${found.oldPrice} ج)` : ""}\n\nتقدر تطلبه مباشرة من الموقع أو عن طريق الواتساب!`;
    }
  }

  if (q.includes("سلام") || q.includes("صباح") || q.includes("مساء") || q.includes("هاي") || q.includes("ازيك") || q.includes("أهلاً") || q.includes("اهلا")) {
    return "وعليكم السلام ورحمة الله وبركاته يا دكتور! 🦷 أهلاً بك في إيجي دنت.\nأنا هنا لمساعدتك في أي استفسار عن خامات الأسنان، الأسعار، المقارنات، أو طريقة الاستخدام. تحب تسأل عن إيه النهاردة؟";
  }

  if (q.includes("شحن") || q.includes("توصيل")) {
    return "🚚 الشحن والتوصيل:\n• متاح الشحن لجميع محافظات مصر.\n• مدة التوصيل: خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام لباقي المحافظات.\n• شحن مجاني للطلبات الكبيرة المؤهلة.";
  }

  return "أهلاً بك يا دكتور في إيجي دنت! 🦷\nتقدر تسألني عن أسعار أي خامة، المقارنات الطبية، أو طريقة الاستخدام، أو تواصل معنا مباشرة عبر الواتساب على: 01151605515.";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  const { prompt: systemPrompt, products } = await getStoreContext();
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  // 1) لو مفتاح DeepSeek متوفر، نتصل بالـ API الاحترافي فائق الذكاء
  if (apiKey && apiKey !== "") {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat", // DeepSeek-V3 الأحدث والأذكى والأقوى
          messages: [
            { role: "system", content: systemPrompt },
            ...(Array.isArray(history) ? history.slice(-4) : []).map((h: any) => ({
              role: h.role === "user" ? "user" : "assistant",
              content: h.text,
            })),
            { role: "user", content: message.trim() },
          ],
          temperature: 0.5,
          max_tokens: 600,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return res.status(200).json({ reply }); // نجح الرد الذكي المذهل من DeepSeek!
        }
      } else {
        console.error("DeepSeek API responded with error status:", response.status);
      }
    } catch (e) {
      console.error("DeepSeek connection failed:", e);
    }
  }

  // 2) 🛡️ شبكة الأمان بترد فوراً لو الـ API مش شغال أو الـ Key لسه ما اتحطش!
  const safeReply = getSmartFallbackReply(message, products);
  return res.status(200).json({ reply: safeReply });
}
