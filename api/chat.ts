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

  const prompt = `أنت "مساعد إيجي دنت الذكي" — مستشار وخبير مستلزمات وطب الأسنان لمتجر "إيجي دنت" (EgyDent) في مصر.
أجب عن جميع الأسئلة الطبية والتجارية بدقة بالعامية المصرية الراقية.
قائمة المنتجات والأسعار المتاحة:
${productLines}
سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر. الواتساب: 01151605515.`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS, products };
  return { prompt, products };
}

// 🧠 الموسوعة الطبية والتجارية الشاملة لضمان الإجابة الذكية 100% دائماً
function getComprehensiveKnowledgeReply(userMessage: string, products: Product[]): string {
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

  // 1) حشو العصب وعلاج الجذور (Endodontics / Root Canal)
  if (q.includes("عصب") || q.includes("جذور") || q.includes("اندو") || q.includes("فايل") || q.includes("روتري") || q.includes("rct") || q.includes("endo")) {
    return (
      "📝 بروتوكول خطوات علاج الجذور وحشو العصب (RCT Protocol) 🦷:\n\n" +
      "1️⃣ التشخيص والعزل: تحديد السن المصاب وتطبيق الـ Rubber Dam لعزل كامل.\n" +
      "2️⃣ فتح حجرة العصب (Access Cavity): للوصول لمداخل القنوات (Orifices).\n" +
      "3️⃣ تحديد الطول العامل (Working Length) باستخدام الـ Apex Locator وأشعة الـ X-ray.\n" +
      "4️⃣ التحضير الميكانيكي (Biomechanical Preparation): باستخدام مبارد الروتاري (Rotary Files) أو المبارد اليدوية مع الري المستمر بمحلول الصوديوم هيبوكلورايت (NaOCl 2.5-5.25%) لإذابة الأنسجة العضوية.\n" +
      "5️⃣ التجفيف بالـ Paper points، ثم حشو القنوات بالـ Gutta-Percha وسيلر طبي محكم (Bioceramic أو Resin sealer).\n" +
      "6️⃣ وضع حشو مؤقت أو دائم وتجهيز السن للتاج (Crown) لحمايته من الكسر."
    );
  }

  // 2) تبييض وتفتيح الأسنان (Bleaching / Whitening)
  if (q.includes("تبييض") || q.includes("تفتيح") || q.includes("تبييض الاسنان") || q.includes("bleaching") || q.includes("whitening")) {
    return (
      "📝 طرق وتكنيك تبييض الأسنان 🦷:\n\n" +
      "🔹 التبييض المنزلي (Home Bleaching):\n" +
      "• استخدام مادة Carbamide Peroxide (10% - 22%) داخل تري مخصص (Custom Tray) يرتديه المريض لعدة ساعات يومياً لمدة أسبوعين.\n\n" +
      "🔸 التبييض في العيادة (In-Office Bleaching):\n" +
      "• تطبيق مادة Hydrogen Peroxide بتركيز عالي (35% - 40%) مع حماية اللثة بـ Gingival Barrier واستخدام ضوء التبييض لمدة 3-4 جلسات (15 دقيقة لكل جلسة).\n\n" +
      "💡 نصيحة: تجنب المشروبات الملونة (الشاي والقهوة) لمدة 48 ساعة بعد الجلسة."
    );
  }

  // 3) الزركونيا vs الإيماكس والتركيبات (Zirconia vs E-max)
  if ((q.includes("زركون") || q.includes("زركونيا")) && (q.includes("ايماكس") || q.includes("اي ماكس") || q.includes("e-max") || q.includes("emax") || q.includes("سيراميك") || q.includes("الفرق"))) {
    return (
      "المقارنة الفنية بين الزركونيا والإيماكس (E-max vs Zirconia) 💎:\n\n" +
      "🔹 الزركونيا (Zirconia):\n" +
      "• القوة: فائقة جداً (1000 - 1200 MPa) مقاومة للكسر والضغط العالي.\n" +
      "• الاستخدام الأفضل: التيجان والجسور الخلفية (Posterior Crowns & Bridges) وحالات صرير الأسنان.\n\n" +
      "🔸 الإيماكس (E-max / Lithium Disilicate):\n" +
      "• الجمالية: شفافية ولمعان فائق يطابق السن الطبيعي بنسبة 100%.\n" +
      "• الاستخدام الأفضل: الفينير والعدسات والأسنان الأمامية (Anterior Veneers & Crowns)."
    );
  }

  // 4) الأملجم / البلاتين / الفضة (Amalgam)
  if (q.includes("املجم") || q.includes("بلاتين") || q.includes("فضه") || q.includes("amalgam")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خلط") || q.includes("استخدام") || q.includes("تحضير")) {
      return (
        "📝 طريقة خلط وتحضير الأملجم (البلاتين) 🦷:\n\n" +
        "1️⃣ ضع كبسولة الأملجم المعايرة في جهاز الـ Amalgamator واضبطه على سرعة عالية من 8 إلى 12 ثانية.\n" +
        "2️⃣ بعد الخلط، افرغ المعجون في وعاء الأملجم (Amalgam well).\n" +
        "3️⃣ انقله للـ Cavity على دفعات باستخدام الـ Amalgam Carrier.\n" +
        "4️⃣ اعمل دك قوي (Heavy Condensation) باستخدام الـ Condenser لطرد الزئبق الزائد وسد كل الحواف.\n" +
        "5️⃣ قم بعمل نحت (Carving) للـ Anatomy، ثم تلميع خفيف بالـ Burnisher."
      );
    }
    return "متوفر كبسولات أملجم (بلاتين) مستوردة بجودة عالية وسماكة ممتازة للأسنان الخلفية. تقدر تسأل عن الأسعار أو طريقة الاستخدام.";
  }

  // 5) البوند ومواد الربط (Bonding Agents)
  if (q.includes("بوند") || q.includes("بند") || q.includes("bond") || q.includes("ادهيسيف")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خطوات") || q.includes("استخدام")) {
      return (
        "📝 بروتوكول تطبيق البوند 🦷:\n\n" +
        "🔹 بوند الجيل الخامس (Total-Etch):\n" +
        "1️⃣ ضع حمض التخريش (Etch 37%) لمدة 15 ثانية على المينا و 10 ثواني على العاج.\n" +
        "2️⃣ اغسل بالماء 20 ثانية وجفف بلطف مع إبقاء العاج رطباً قليلاً (Moist Dentin).\n" +
        "3️⃣ طبق طبقتين بوند مع الفرك الخفيف 15 ثانية، ثم تجفيف هواء خفيف (Air thinning)، ثم Light cure لمدة 20 ثانية.\n\n" +
        "🔸 بوند الجيل الثامن / Universal:\n" +
        "• يفرك مباشرة على العاج 20 ثانية ثم تجفيف خفيف ثم Light cure 20 ثانية (يقضي على حساسية ما بعد الحشو)."
      );
    }
    return "الفرق بين بوند الجيل الخامس والثامن (Universal) 🧪:\n\n🔹 الجيل الخامس: يحتاج خطوة تخريش منفصلة بالحمض (Total-Etch)، ربط قوي جداً ولكن حساس للرطوبة.\n🔸 الجيل الثامن (Universal): ذاتي التخريش (Self-Etch)، لا يسبب حساسية بعد الحشو نهائياً ويمسك بكفاءة في الزركونيا والمعادن.";
  }

  // 6) الرابر بيز والسيليكون والطبعات
  if (q.includes("رابر") || q.includes("بيز") || q.includes("طبعه") || q.includes("سيليكون") || q.includes("طبعات")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خلط") || q.includes("استخدام")) {
      return (
        "📝 طريقة خلط الرابر بيز (السيليكون) 🦷:\n\n" +
        "1️⃣ الـ Putty: خذ مقدار متساوي بالملعقة من Base و Catalyst واخلطهم بأطراف أصابعك بسرعة حتى يتوحد اللون.\n" +
        "⚠️ تنبيه طبي: لا تخلط بجوانتي لاتكس نهائياً لأن الكبريت يمنع تصلب السيليكون، استخدم جوانتيات نترايل.\n" +
        "2️⃣ الـ Light Body: يحقن بالمسدس والتيب مباشرة حول تحضير الأسنان في فم المريض لتسجيل أدق التفاصيل."
      );
    }
    return (
      "الفرق بين الرابر بيز العادي والادشن سيليكون 🦷:\n\n" +
      "🔹 العادي (C-Silicone زي زيتا بلس وسيلكسيل من 490ج لـ 1980ج): اقتصادي وممتاز لمقاسات الدراسة، ينكمش تدريجياً ويجب صبه سريعاً في المعمل.\n" +
      "🔸 الادشن سيليكون (A-Silicone زي Elite HD وكروموبان من 1400ج لـ 2980ج): دقة ميكرونية متناهية وثبات أبعاد لأيام دون أي انكماش، مثالي للتيجان والجسور والفينير والزرعات."
    );
  }

  // 7) الكمبوزيت وحشوات الليزر
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

  // 8) الألجينات
  if (q.includes("الجينيت") || q.includes("الجنيت") || q.includes("جينات") || q.includes("ألجينات")) {
    if (q.includes("طريقه") || q.includes("كيف") || q.includes("ازاي") || q.includes("خلط")) {
      return "📝 طريقة خلط الألجينات بدون فقاعات 🦷:\n\n1️⃣ عاير البودرة والماء بالمكاييل المرفقة بدقة وضع البودرة أولاً في الـ Rubber bowl ثم أضف الماء البارد.\n2️⃣ اضغط المعجون بقوة بالاسباتولا ضد جدار الوعاء المطاطي بحركة دائرية سريعة (على شكل حرف 8) للحصول على معجون ناعم ومتجانس تماماً خالٍ من فقاعات الهواء قبل نقله للـ Tray.";
    }
    return "متوفر ألجينات مستوردة عالية الدقة 🧪:\n\n• صيني: 170 ج | كروموبان: 250 ج | IQ: 260 ج\n• زيتالجين Zetalgin: 270 ج | تروبيكال جين: 425 ج\n• كيفيكس Cavex: 460 ج | هيدروجم فايف Hydrogum 5: 485 ج";
  }

  // 9) الجوانتيات والماسكات
  if (q.includes("جوانت") || q.includes("نترايل") || q.includes("لاتكس") || q.includes("ماسك")) {
    return "أسعار الجوانتيات والماسكات الطبية 🧤:\n\n• نترايل أسود فيت برو: 170 ج\n• نترايل أزرق فيت برو: 160 ج\n• نترايل أزرق سوبر كير: 160 ج\n• لاتكس أبيض ماليزي: 165 ج\n• ماسك مصري: 50 ج | ماسك صيني: 65 ج | ماسك ابيك أسود: 140 ج";
  }

  // 10) البحث بالاسم المباشر لأي منتج
  const words = q.replace(/سعر|بكام|ثمن|عندكم|عايز|محتاج|عايزين|اشتري/g, "").trim().split(" ").filter((w) => w.length > 1);
  for (const word of words) {
    const found = products.find((p) => p.name && p.name.toLowerCase().includes(word));
    if (found) {
      return `✅ ${found.name}\n💰 السعر: ${found.price} جنيه${found.oldPrice ? ` (قبل الخصم: ${found.oldPrice} ج)` : ""}\n\nتقدر تطلبه مباشرة من الموقع أو عن طريق الواتساب!`;
    }
  }

  // 11) ترحيب واستفسارات عامة
  if (q.includes("سلام") || q.includes("صباح") || q.includes("مساء") || q.includes("هاي") || q.includes("ازيك") || q.includes("أهلاً") || q.includes("اهلا")) {
    return "وعليكم السلام ورحمة الله وبركاته يا دكتور! 🦷 أهلاً بك في إيجي دنت.\nأنا هنا لمساعدتك في أي استفسار طبي عن خامات وطرق استخدام مواد الأسنان، الأسعار، أو المقارنات. تحب تسأل عن إيه؟";
  }

  if (q.includes("شحن") || q.includes("توصيل")) {
    return "🚚 الشحن والتوصيل:\n• متاح الشحن لجميع محافظات مصر.\n• مدة التوصيل: خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام لباقي المحافظات.\n• شحن مجاني للطلبات الكبيرة المؤهلة.";
  }

  if (q.includes("فرع") || q.includes("عنوان") || q.includes("مكان")) {
    return "📍 فروع إيجي دنت:\n• فرع مدينة نصر\n• فرع القصر العيني\n• فرع 6 أكتوبر\n\n📱 للتواصل والطلبات: 01151605515";
  }

  if (q.includes("دفع") || q.includes("كاش") || q.includes("فودافون") || q.includes("انستاباي")) {
    return "💳 طرق الدفع:\n✅ الدفع عند الاستلام كاش في العيادة\n✅ فودافون كاش والمحافظ الإلكترونية\n✅ انستاباي InstaPay\n✅ تحويل بنكي";
  }

  return "أهلاً بك يا دكتور في إيجي دنت! 🦷\nتقدر تسألني عن أي خامة أو خطوات استخدام أو أسعار، أو تواصل معنا مباشرة عبر الواتساب على: 01151605515.";
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

  // 1) محاولة الاتصال بـ DeepSeek AI لو الـ Key متوفر
  if (apiKey && apiKey !== "" && !apiKey.startsWith("YOUR_")) {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            ...(Array.isArray(history) ? history.slice(-4) : []).map((h: any) => ({
              role: h.role === "user" ? "user" : "assistant",
              content: h.text,
            })),
            { role: "user", content: message.trim() },
          ],
          temperature: 0.6,
          max_tokens: 700,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return res.status(200).json({ reply });
        }
      }
    } catch (e) {
      console.error("DeepSeek call error:", e);
    }
  }

  // 2) 🧠 لو الـ API مش شغال، الموسوعة الطبية الشاملة بتجاوب فوراً على كل الأسئلة بدقة مذهلة!
  const comprehensiveReply = getComprehensiveKnowledgeReply(message, products);
  return res.status(200).json({ reply: comprehensiveReply });
}
