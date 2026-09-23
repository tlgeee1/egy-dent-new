import { ArrowLeft } from "lucide-react";
import { categories } from "@/data/data";
import { Reveal, SectionHead } from "./ui";
import { useStore } from "@/context/StoreContext";

export default function Categories() {
  const { products } = useStore();
  const countFor = (id: string) => products.filter((p) => p.cat === id && !p.showcaseOnly).length;

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
            desc={`أكتر من ${products.length.toLocaleString("en-US")} منتج في ${categories.length} فئات رئيسية — من أول كرسي العيادة لآخر لفة الجفاز.`}
          />
          <Reveal delay={0.15}>
            <a
              href="#products"
              onClick={() => window.dispatchEvent(new CustomEvent("set-product-filter", { detail: "all" }))}
              className="group inline-flex items-center gap-2 rounded-full border border-[var(--line-3)] px-6 py-3 text-sm font-bold text-frost-300 transition-all hover:border-volt-500/40 hover:text-volt-300"
            >
              كل المنتجات
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </a>
          </Reveal>
        </div>

        <div className="mt-10 grid auto-rows-[148px] grid-cols-2 gap-3 sm:mt-14 sm:auto-rows-[190px] sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:auto-rows-[220px]">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.05}>
              <a
                href="#products"
                onClick={() => window.dispatchEvent(new CustomEvent("set-product-filter", { detail: c.id }))}
                className="group relative block h-full w-full overflow-hidden rounded-2xl border border-[var(--line-2)] bg-ink-900 transition-colors duration-500 hover:border-volt-500/40 sm:rounded-[1.75rem]"
              >
                <img
                  src={c.img}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-80 transition-all duration-[1.2s] ease-out group-hover:scale-110 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
                <div className="absolute inset-0 bg-volt-600/0 transition-colors duration-500 group-hover:bg-volt-600/10" />

                {/* count chip */}
                <span className="absolute right-2.5 top-2.5 rounded-full border border-[var(--line-4)] bg-ink-950/60 px-2 py-1 text-[10px] font-bold leading-none text-volt-200 backdrop-blur-md sm:right-5 sm:top-5 sm:px-3.5 sm:py-1.5 sm:text-xs">
                  +{countFor(c.id).toLocaleString("en-US")}
                </span>

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:gap-4 sm:p-6">
                  <div className="min-w-0">
                    <span
                      className="hidden font-display text-[11px] font-bold tracking-widest text-volt-400 sm:inline"
                      dir="ltr"
                    >
                      {String(i + 1).padStart(2, "0")} /
                    </span>
                    <h3 className="font-display text-[13px] font-extrabold leading-snug line-clamp-2 sm:mt-1 sm:text-2xl md:text-[1.7rem]">
                      {c.name}
                    </h3>
                    <p className="mt-1.5 hidden max-w-xs text-sm leading-relaxed text-frost-400 opacity-0 transition-all duration-500 [transform:translateY(8px)] group-hover:opacity-100 group-hover:[transform:translateY(0)] sm:block">
                      {c.desc}
                    </p>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--line-4)] bg-[var(--fill-4)] text-[var(--text-primary)] backdrop-blur-md transition-all duration-500 group-hover:border-volt-400 group-hover:bg-volt-500 group-hover:text-[var(--onaccent)] sm:size-12">
                    <ArrowLeft className="size-3.5 transition-transform duration-500 group-hover:-rotate-45 sm:size-5" />
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
