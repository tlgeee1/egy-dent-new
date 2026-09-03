import { BadgeCheck, Headset, ShieldCheck, Truck } from "lucide-react";
import { CountUp, Reveal, SectionHead } from "./ui";

const features = [
  {
    icon: BadgeCheck,
    title: "منتجات أصلية 100%",
    desc: "وكلاء معتمدون لأكبر البراندات — كل منتج بالفاتورة والسيريال نمبر.",
  },
  {
    icon: ShieldCheck,
    title: "ضمان حقيقي على الأجهزة",
    desc: "ضمان استبدال وصيانة يصل لسنتين على كل الأجهزة والمعدات.",
  },
  {
    icon: Truck,
    title: "توصيل لكل المحافظات",
    desc: "24-48 ساعة داخل القاهرة، و3-5 أيام لباقي مصر — وشحن مجاني فوق 500 جنيه.",
  },
  {
    icon: Headset,
    title: "دعم فني أطباء أسنان",
    desc: "فريق من الأطباء بيرد على استشاراتك الفنية قبل وبعد الشراء.",
  },
];

const stats = [
  { to: 2500, suffix: "+", label: "منتج أصلي في المخزون" },
  { to: 950, suffix: "+", label: "عيادة ومعمل بيتعاملوا معانا" },
  { to: 48, suffix: "h", label: "أقصى مدة توصيل داخل القاهرة" },
  { to: 14, suffix: "+", label: "سنة خبرة في السوق المصري" },
];

export default function WhyUs() {
  return (
    <section id="why" className="relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute right-[-15%] top-1/3 size-[500px] rounded-full bg-volt-600/[0.09] blur-[120px]" />

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* stats */}
        <div className="grid grid-cols-2 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-ink-900/70 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="border-white/[0.07] [&:nth-child(odd)]:border-l [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0 lg:[&:not(:last-child)]:border-l">
              <div className="p-7 text-center md:p-10">
                <p className="font-display text-4xl font-black text-transparent bg-gradient-to-l from-volt-300 to-volt-600 bg-clip-text md:text-5xl">
                  <CountUp to={s.to} suffix={s.suffix} />
                </p>
                <p className="mt-3 text-xs leading-relaxed text-frost-400 md:text-sm">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHead
              kicker="ليه إيجي دنت؟"
              title={
                <>
                  مش مجرد مورد…
                  <br />
                  <span className="text-volt-400">شريك نجاح عيادتك</span>
                </>
              }
              desc="من 2011 وإحنا بنجهّز العيادات والمعامل في كل مصر. الفرق عندنا في التفاصيل: أصالة المنتج، سرعة التوصيل، ودعم فاهم شغلك."
            />
          </div>

          <div>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <div className="group flex items-start gap-5 border-b border-white/[0.07] py-8 transition-all duration-500 first:pt-0 hover:pr-3">
                  <span className="font-display text-sm font-black text-frost-500 transition-colors group-hover:text-volt-400" dir="ltr">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-volt-500/25 bg-volt-500/[0.08] text-volt-300 transition-all duration-500 group-hover:bg-volt-500 group-hover:text-ink-950 group-hover:shadow-[0_12px_30px_rgba(34,211,238,0.4)]">
                    <f.icon className="size-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-extrabold md:text-2xl">{f.title}</h3>
                    <p className="mt-2 leading-relaxed text-frost-400">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
