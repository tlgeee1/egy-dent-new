import { BadgeCheck, FileCheck2, MapPinned, ShieldCheck, Wallet } from "lucide-react";
import { SectionHead, Reveal } from "./ui";

const guarantees = [
  {
    icon: ShieldCheck,
    title: "ضمان استرجاع واستبدال 14 يوم",
    desc: "لو المنتج مش مطابق أو فيه أي مشكلة، تقدر تسترجعه أو تستبدله خلال 14 يوم من الاستلام من غير تعقيد.",
  },
  {
    icon: FileCheck2,
    title: "فاتورة رسمية مع كل طلب",
    desc: "كل طلب بيوصلك بفاتورة رسمية موضح فيها كل التفاصيل — للتوثيق ولسجلات عيادتك أو معملك.",
  },
  {
    icon: BadgeCheck,
    title: "منتجات أصلية بضمان الوكيل",
    desc: "كل الأجهزة والمستلزمات أصلية 100% ومستوردة من موردين معتمدين، بضمان حقيقي على الأجهزة يصل لسنتين.",
  },
  {
    icon: Wallet,
    title: "دفع آمن أو عند الاستلام",
    desc: "ادفع إلكترونيًا بأي وسيلة تفضلها (فودافون كاش، إنستاباي، فيزا...) أو كاش عند استلام الطلب — الاختيار ليك.",
  },
  {
    icon: MapPinned,
    title: "3 فروع تقدر تزورها وتعاين بنفسك",
    desc: "مش لازم تشتري أونلاين لو مش مرتاح — عدّي على أقرب فرع (مدينة نصر، القصر العيني، 6 أكتوبر) واطلب من هناك مباشرة.",
  },
];

export default function Guarantees() {
  return (
    <section id="guarantees" className="relative overflow-hidden bg-ink-900/50 py-24 md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-l from-transparent via-volt-500/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead
          center
          kicker="ضماناتنا ليك"
          title={
            <>
              تعامل مضمون <span className="text-volt-400">من أول طلب</span>
            </>
          }
          desc="مش بس بنبيعلك منتج — بنضمنلك تجربة شراء مريحة وآمنة من الألف للياء."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guarantees.map((g, i) => (
            <Reveal key={g.title} delay={i * 0.07}>
              <div className="group h-full rounded-[1.5rem] border border-[var(--line-3)] bg-ink-800 p-6 shadow-sm transition-colors hover:border-volt-500/40 md:p-7">
                <span className="grid size-14 place-items-center rounded-2xl border border-volt-500/25 bg-volt-500/[0.08] text-volt-300 transition-all duration-500 group-hover:bg-volt-500 group-hover:text-[var(--onaccent)] group-hover:shadow-[0_12px_30px_rgba(34,211,238,0.4)]">
                  <g.icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-extrabold md:text-xl">{g.title}</h3>
                <p className="mt-2 leading-relaxed text-frost-400">{g.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
