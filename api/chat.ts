import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from "../src/data/data";
import { policyPages } from "../src/data/policies";

// نبني برومبت ثابت مرة واحدة من بيانات الموقع الحقيقية (المنتجات + السياسات)
function buildSystemPrompt(): string {
  const catNames: Record<string, string> = {};
  DEFAULT_CATEGORIES.forEach((c) => (catNames[c.id] = c.name));

  const productLines = DEFAULT_PRODUCTS.filter((p) => !p.showcaseOnly)
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

  return `إنت "مساعد إيجي دنت" — شات بوت خدمة عملاء لموقع إيجي دنت، متجر بيع مستلزمات طب الأسنان بالجملة في مصر (3 فروع: مدينة نصر، القصر العيني، 6 أكتوبر).

تعليمات مهمة:
- رد دايمًا بالعامية المصرية، بشكل ودود ومختصر ومباشر.
- استخدم فقط المعلومات الموجودة تحت (المنتجات والسياسات). لو السؤال عن حاجة مش موجودة عندك، قول بصراحة إنك مش متأكد ووجّه العميل للتواصل على واتساب 0115 160 5515.
- متخترعش أسعار أو منتجات مش موجودة في القائمة.
- لو العميل عايز يأكد طلب فعلي أو يتكلم مع حد حقيقي، وجّهه لواتساب على نفس الرقم.
- خلي ردودك قصيرة (2-4 جمل) إلا لو السؤال محتاج تفصيل أكتر.

قائمة المنتجات والأسعار:
${productLines}

سياسات المتجر:
${policyText}`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

export default async function handler(req: { method?: string; body?: unknown }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY غير موجود في إعدادات Vercel" });
    return;
  }

  const { message, history } = req.body as {
    message?: string;
    history?: { role: "user" | "model"; text: string }[];
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }

  try {
    const contents = [
      ...(history ?? []).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: "user", parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      res.status(502).json({ error: "حصلت مشكلة في التواصل مع الذكاء الاصطناعي" });
      return;
    }

    const data = await geminiRes.json();
    const reply: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
      "معلش، مقدرتش أفهم سؤالك. ممكن تجرب تاني أو تكلم فريقنا على واتساب؟";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "حصل خطأ غير متوقع" });
  }
}
