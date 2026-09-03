import { ArrowLeft } from "lucide-react";
import { categories } from "@/data/data";
import { Reveal, SectionHead } from "./ui";
import { cn } from "@/utils/cn";

const spans = [
  "lg:col-span-2 lg:row-span-1",
  "lg:col-span-1 lg:row-span-2",
  "lg:col-span-1 lg:row-span-1",
  "lg:col-span-1 lg:row-span-1",
];

export default function Categories() {
  return (
    <section id="categories" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            kicker="تسوّق حسب الفئة"
            title={
              <>
                كل أقسام عيادتك
                <span className="text-volt-400"> مغطّاة</span>
              </>
            }
            desc="أكتر من 2,500 منتج في 4 فئات رئيسية — من أول كرسي العيادة لآخر لفة الجفاز."
          />
          <Reveal delay={0.15}>
            <a
              href="#products"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-bold text-frost-300 transition-all hover:border-volt-500/40 hover:text-volt-300"
            >
              كل المنتجات
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </a>
          </Reveal>
        </div>

        <div className="mt-14 grid auto-rows-[300px] grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.08} className={cn(spans[i])}>
              <a
                href="#products"
                className="group relative block h-full w-full overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-ink-900 transition-colors duration-500 hover:border-volt-500/40"
              >
                <img
                  src={c.img}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-80 transition-all duration-[1.2s] ease-out group-hover:scale-110 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-transparent" />
                <div className="absolute inset-0 bg-volt-600/0 transition-colors duration-500 group-hover:bg-volt-600/10" />

                {/* count chip */}
                <span className="absolute right-5 top-5 rounded-full border border-white/15 bg-ink-950/60 px-3.5 py-1.5 text-xs font-bold text-volt-200 backdrop-blur-md">
                  {c.count}
                </span>

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                  <div>
                    <span className="font-display text-[11px] font-bold tracking-widest text-volt-400" dir="ltr">
                      {String(i + 1).padStart(2, "0")} /
                    </span>
                    <h3 className="mt-1 font-display text-2xl font-extrabold md:text-[1.7rem]">{c.name}</h3>
                    <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-frost-400 opacity-0 transition-all duration-500 [transform:translateY(8px)] group-hover:opacity-100 group-hover:[transform:translateY(0)]">
                      {c.desc}
                    </p>
                  </div>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-md transition-all duration-500 group-hover:border-volt-400 group-hover:bg-volt-500 group-hover:text-ink-950">
                    <ArrowLeft className="size-5 transition-transform duration-500 group-hover:-rotate-45" />
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
