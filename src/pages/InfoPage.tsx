import { ArrowRight } from "lucide-react";
import { ToothMark } from "@/components/ui";
import { policyPages } from "@/data/policies";

export default function InfoPage({ slug }: { slug: string }) {
  const page = policyPages[slug];

  if (!page) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 text-center text-frost-300">
        <div>
          <p className="mb-4 text-lg font-bold">الصفحة غير موجودة</p>
          <a href="#hero" className="text-volt-400 hover:underline">
            الرجوع للصفحة الرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="noise min-h-screen bg-ink-950 font-sans text-[var(--text-primary)] antialiased">
      <header className="border-b border-[var(--line-2)] px-5 py-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="#hero" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-volt-400 to-volt-700">
              <ToothMark className="size-5 text-[var(--onaccent)]" />
            </span>
            <span className="font-display text-lg font-black">
              إيجي <span className="text-volt-400">دنت</span>
            </span>
          </a>
          <a href="#hero" className="flex items-center gap-1.5 text-sm font-semibold text-frost-300 hover:text-volt-300">
            الرئيسية <ArrowRight className="size-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
        <h1 className="font-display text-3xl font-black md:text-4xl">{page.title}</h1>

        <div className="mt-8 space-y-8">
          {page.sections.map((s, i) => (
            <div key={i}>
              {s.heading && <h2 className="mb-2 font-display text-lg font-extrabold text-volt-300">{s.heading}</h2>}
              {s.body && <p className="leading-loose text-frost-300">{s.body}</p>}
              {s.bullets && (
                <ul className="mt-3 space-y-3">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2.5 leading-loose text-frost-300">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-volt-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
