import { Reveal } from "@/components/marketing/Reveal";

export function FaqList({ groups }: { groups: { group: string; items: { q: string; a: string }[] }[] }) {
  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <section key={group.group}>
          <Reveal>
            <h2 className="text-3xl tracking-tight text-white">{group.group}</h2>
          </Reveal>
          <div className="mt-4 divide-y divide-white/8 border-y border-white/8">
            {group.items.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.03}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 pr-2 text-[16px] text-white">
                    {item.q}
                    <span className="text-white/35 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/45">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
