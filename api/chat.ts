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

  const prompt = `أنت "مساعد إيجي دنت الذكي" — مستشار وخبير مستلزمات طب الأسنان لمتجر "إيجي دنت" (EgyDent) في مصر.

تعليمات صارمة جداً:
1. ابدأ ردك مباشرة بالعامية المصرية الراقية والطبية، وممنوع نهائياً كتابة أي كلام إنجليزي أو شرح لخطوات تفكيرك أو ذكر لكلمة Role أو Prompt.
2. أنت طبيب وصيدلي خبير في خامات الأسنان (Composites, Bonding, Rubber base, Alginate, etc.).
3. اشرح خطوات الاستخدام والمقارنات بدقة ووضوح.
4. التزم فقط بقائمة المنتجات والأسعار المذكورة بالأسفل.
5. للتواصل مع المبيعات: واتساب 01151605515.

قائمة المنتجات والأسعار المتاحة:
${productLines}

سياسات المتجر وفروعه:
${policyText}
فروعنا: مدينة نصر، القصر العيني، 6 أكتوبر. الشحن متاح لكل مصر.`;

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS, products };
  return { prompt, products };
}

// شبكة الأمان الذكية (الرد الفوري الاحترافي لو جوجل فيه أي مشكلة)
function getSmartFallbackReply(userMessage: string, products: Product[]): string {
  const q = userMessage.toLowerCase().trim();

  // طرق الاستخدام
  if ((q.includes("طريقة") || q.includes("كيف") || q.includes("ازاي") || q.includes("خطوات")) && 
      (q.includes("بوند") || q.includes("bond") || q.includes("ادهيسيف"))) {
    return "📝 طريقة استخدام وتطبيق البوند 🦷:\n\n🔹 بوند الجيل الخامس (Total-Etch):\n1️⃣ ضع حمض التخريش (Etch 37%) لمدة 15 ثانية على المينا و 10 ثواني على العاج.\n2️⃣ اغسل بالماء 20 ثانية وجفف بلطف مع إبقاء العاج رطباً قليلاً (Moist).\n3️⃣ ضع طبقتين بوند وافرك بلطف 15 ثانية ثم تجفيف هواء خفيف و Light cure لمدة 20 ثانية.\n\n🔸 بوند الجيل الثامن / Universal:\n• يفرك مباشرة على العاج 20 ثانية ثم تجفيف خفيف ثم Light cure 20 ثانية (لا يسبب حساسية).";
  }

  if ((q.includes("طريقة") || q.includes("كيف") || q.includes("ازاي") || q.includes("خلط")) && 
      (q.includes("رابر") || q.includes("بيز") || q.includes("طبعة") || q.includes("سيليكون"))) {
    return "📝 طريقة خلط الرابر بيز (السيليكون) 🦷:\n\n1️⃣ الـ Putty: خذ مقدار متساوي بالملعقة من Base و Catalyst واخلطهم بأطراف أصابعك حتى يتوحد اللون.\n⚠️ تنبيه: لا تخلط بجوانتي لاتكس نهائياً لأن الكبريت يمنع تصلب السيليكون، استخدم جوانتيات نترايل.\n2️⃣ الـ Light Body: يحقن بالمسدس والتيب مباشرة حول التحضير لتسجيل أدق التفاصيل تحت اللثة.";
  }

  // المقارنات
  if (q.includes("بوند") && (q.includes("خامس") || q.includes("ثامن") || q.includes("يونيفرسال") || q.includes("الفرق"))) {
    return "الفرق الطبي بين بوند الجيل الخامس والثامن (Universal) 🧪:\n\n🔹 الجيل الخامس: يحتاج خطوة تخريش منفصلة بالحمض (Total-Etch)، ربط قوي جداً ولكن حساس للرطوبة.\n🔸 الجيل الثامن (Universal): ذاتي التخريش (Self-Etch)، لا يسبب حساسية بعد الحشو نهائياً ويمسك بكفاءة في الزركونيا والمعادن.";
  }

  if ((q.includes("رابر") || q.includes("بيز")) && (q.includes("ادشن") || q.includes("سيليكون") || q.includes("عادي") || q.includes("الفرق"))) {
    return "الفرق بين الرابر بيز العادي والادشن سيليكون 🦷:\n\n🔹 العادي (C-Silicone زي زيتا بلس وسيلكسيل من 490ج لـ 1980ج): اقتصادي وممتاز لمقاسات الدراسة، ينكمش تدريجياً ويجب صبه سريعاً في المعمل.\n🔸 الادشن سيليكون (A-Silicone زي Elite HD وكروموبان من 1400ج لـ 2980ج): دقة ميكرونية متناهية وثبات أبعاد لأيام دون أي انكماش، مثالي للتيجان والجسور والفينير.";
  }

  if ((q.includes("روبي") || q.includes("ruby")) && (q.includes("شوفو") || q.includes("shofu"))) {
    return "المقارنة بين كمبوزيت روبي وشوفو الياباني 💎:\n\n• روبي (180ج): اقتصادي جداً وممتاز للحشوات الخلفية العادية وتكلفة تشغيل بسيطة.\n• شوفو Shofu الياباني (950ج): بريميوم تجميلي بتقنية Giomer، لمعان طبيعي وثبات فائق للأسنان الأمامية ومقاومة للتآكل.";
  }

  // الكمبوزيت
  if (q.includes("كمبوزيت") || q.includes("كومبوزيت") || q.includes("حشو")) {
    return "متوفر عندنا تشكيلة واسعة من الكمبوزيت 🦷:\n\n• روبي: 180 ج | برايم: 200 ج | ميتا: 280 ج\n• شارم: 285 ج | هندي: 350 ج | برازيلي: 350 ج\n• نوفا: 500 ج | دي فيل: 500 ج | كير: 600 ج\n• زركون فيل: 650 ج | زد فيل: 800 ج | ايتينا: 800 ج\n• شوفو ياباني: 950 ج | تكوياما: 950 ج | دنت سبلاي: 1250 ج\n• تكوياما اومنيكروما: 1600 ج | اكسترا فيل: 1750 ج | جراندو فوكو: 2050 ج";
  }

  // الجوانتيات والماسكات
  if (q.includes("جوانت") || q.includes("نترايل") || q.includes("لاتكس") || q.includes("ماسك")) {
    return "أسعار الجوانتيات والماسكات الطبية 🧤:\n\n• نترايل أسود فيت برو: 170 ج\n• نترايل أزرق فيت برو: 160 ج\n• نترايل أزرق سوبر كير: 160 ج\n• لاتكس أبيض ماليزي: 165 ج\n• ماسك مصري: 50 ج | ماسك صيني: 65 ج | ماسك ابيك أسود: 140 ج";
  }

  // الرابر بيز
  if (q.includes("رابر") || q.includes("بيز") || q.includes("سيليكون") || q.includes("طبعة")) {
    return "أسعار خامات الطبعات والسيليكون 🦷:\n\n🔹 عادي: زيتا بلس كبير (1980ج)، سيلكسيل كبير (1900ج)، لايت زرماخ (550ج)، كتاليست (490ج).\n🔸 ادشن: كيت Elite HD (2980ج)، كيت كروموبان ادشن (2800ج)، كيت هندي (2500ج)، لايت ادشن (650ج).";
  }

  // البحث بالاسم
  const words = q.replace(/سعر|بكام|ثمن|عندكم|عايز|محتاج/g, "").trim().split(" ").filter((w) => w.length > 1);
  for (const word of words) {
    const found = products.find((p) => p.name && p.name.toLowerCase().includes(word));
    if (found) {
      return `✅ ${found.name}\n💰 السعر: ${found.price} جنيه${found.oldPrice ? ` (قبل الخصم: ${found.oldPrice} ج)` : ""}\n\nتقدر تطلبه مباشرة من الموقع أو عن طريق الواتساب!`;
    }
  }

  // ترحيب واستفسارات عامة
  if (q.includes("سلام") || q.includes("صباح") || q.includes("مساء") || q.includes("هاي") || q.includes("ازيك")) {
    return "وعليكم السلام ورحمة الله وبركاته يا دكتور! 🦷 أهلاً بك في إيجي دنت.\nأنا هنا لمساعدتك في أي استفسار عن خامات الأسنان، الأسعار، المقارنات، أو طريقة الاستخدام. تحب تسأل عن إيه النهاردة؟";
  }

  if (q.includes("شحن") || q.includes("توصيل")) {
    return "🚚 الشحن والتوصيل:\n• متاح الشحن لجميع محافظات مصر.\n• مدة التوصيل: خلال 24-48 ساعة للقاهرة والجيزة، و 2-4 أيام لباقي المحافظات.\n• شحن مجاني للطلبات المؤهلة.";
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
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // لو المفتاح موجود، نجرب الاتصال بجوجل أولاً
  if (apiKey) {
    const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];

    for (const model of candidateModels) {
      try {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\n---\nسؤال الطبيب:\n${message.trim()}` }]
              }
            ],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 600,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim();
          
          if (reply && !reply.includes("Role:") && !reply.includes("Persona:")) {
            return res.status(200).json({ reply });
          }
        }
      } catch (e) {
        console.error(`Gemini fetch error on model ${model}:`, e);
      }
    }
  }

  // لو جوجل فيه أي عطل أو تأخير، شبكة الأمان بترد فوراً برد طبي وتجاري كامل بدون أي أخطاء!
  const safeReply = getSmartFallbackReply(message, products);
  return res.status(200).json({ reply: safeReply });
}
