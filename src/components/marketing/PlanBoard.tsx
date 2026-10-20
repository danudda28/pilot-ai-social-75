import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PLANS,
  PLAN_KEY,
  TOP_UPS,
  annualBill,
  creditsNeeded,
  lei,
  priceOf,
  recommendPlan,
  savingsPercent,
  yieldOf,
  type BillingCycle,
  type Plan,
} from "@/lib/credits";
import { Reveal } from "@/components/marketing/Reveal";
import { DemoVisual } from "@/components/marketing/DemoVisual";
import { MARKETING_IMAGES } from "@/lib/marketing-images";

export function PlanBoard() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<BillingCycle>("year");
  const [reels, setReels] = useState(4);
  const [images, setImages] = useState(20);
  const saved = savingsPercent(PLANS[0]);
  const suggestion = useMemo(() => recommendPlan(reels, images), [reels, images]);
  const needed = creditsNeeded(reels, images);

  async function choose(plan: Plan) {
    sessionStorage.setItem(PLAN_KEY, JSON.stringify({ id: plan.id, name: plan.name, cycle }));
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      toast.info("Planul e salvat. Mai e un pas: contul.");
      navigate({ to: "/auth" });
      return;
    }
    toast.info(`${plan.name} e notat. Stripe se deschide când cheile sunt puse.`);
  }

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-sm">
          <button
            type="button"
            onClick={() => setCycle("year")}
            className={`rounded-full px-4 py-2 transition ${cycle === "year" ? "bg-white text-black" : "text-white/55 hover:text-white"}`}
          >
            Anual · economisești {saved}%
          </button>
          <button
            type="button"
            onClick={() => setCycle("month")}
            className={`rounded-full px-4 py-2 transition ${cycle === "month" ? "bg-white text-black" : "text-white/55 hover:text-white"}`}
          >
            Lunar
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {PLANS.map((plan, i) => {
          const amount = priceOf(plan, cycle);
          const pack = yieldOf(plan.credits);
          return (
            <Reveal key={plan.id} delay={i * 0.04}>
              <article
                className={`flex h-full flex-col rounded-2xl border p-5 ${
                  plan.featured
                    ? "border-[var(--m-accent)] bg-[var(--m-accent-soft)] shadow-[0_0_60px_-20px_var(--m-glow)]"
                    : "border-white/8 bg-white/[0.02]"
                }`}
              >
                {plan.featured && (
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--m-accent)]">Cel mai ales</p>
                )}
                <h3 className="mt-2 text-2xl tracking-tight text-white">{plan.name}</h3>
                <p className="mt-3 min-h-14 text-[13px] leading-relaxed text-white/45">{plan.summary}</p>
                <div className="mt-6">
                  {cycle === "year" && (
                    <p className="text-sm text-white/30 line-through">{lei(plan.monthly)}</p>
                  )}
                  <p className="text-4xl tracking-tight text-white">{lei(amount)}</p>
                  <p className="mt-1 text-[12px] text-white/40">
                    / lună{cycle === "year" ? ` · ${lei(annualBill(plan))} anual` : ""}
                  </p>
                </div>
                <p className="mt-5 text-[14px] text-white">
                  {plan.credits.toLocaleString("ro-RO")} credite / lună
                </p>
                <p className="mt-1 text-[12px] text-white/40">
                  {pack.reels.toLocaleString("ro-RO")} reels sau {pack.images.toLocaleString("ro-RO")} imagini
                </p>
                <button
                  type="button"
                  onClick={() => choose(plan)}
                  className={`m-pill mt-5 w-full text-sm ${plan.featured ? "m-pill-solid" : "m-pill-ghost"}`}
                >
                  Ia {plan.name}
                </button>
                <ul className="mt-6 space-y-2.5 border-t border-white/8 pt-5 text-[13px] text-white/60">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--m-accent)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                  <li className="flex gap-2 text-white/40">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" />
                    <span>{plan.brands === 1 ? "Un brand" : `Până la ${plan.brands} branduri`}</span>
                  </li>
                </ul>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-16">
        <h3 className="text-3xl tracking-tight text-white">Câte piese vrei într-o lună?</h3>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/45">
          Un reel = 100 credite. O imagine = 10. Corecturile = 0. Calculatorul îți arată planul care acoperă luna.
        </p>
        <div className="mt-8">
          <DemoVisual image={MARKETING_IMAGES.crediteEcommerce} />
        </div>
      </Reveal>

      <Reveal className="m-panel mt-8 grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div>
          <p className="text-[14px] leading-relaxed text-white/45">
            Ajustează reels și imagini — planul recomandat se actualizează live.
          </p>
          <label className="mt-8 block text-[14px] text-white/70">
            Reels · {reels}
            <input
              type="range"
              min={0}
              max={40}
              value={reels}
              onChange={(e) => setReels(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--m-accent)]"
            />
          </label>
          <label className="mt-4 block text-[14px] text-white/70">
            Imagini · {images}
            <input
              type="range"
              min={0}
              max={200}
              step={2}
              value={images}
              onChange={(e) => setImages(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--m-accent)]"
            />
          </label>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-white p-6 text-black">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-black/40">Îți trebuie</p>
            <p className="mt-3 text-5xl tracking-tight">{needed.toLocaleString("ro-RO")}</p>
            <p className="text-sm text-black/50">credite</p>
          </div>
          <div className="mt-8">
            <p className="text-sm text-black/50">Planul care le acoperă</p>
            <p className="text-3xl tracking-tight">{suggestion.name}</p>
            <p className="mt-1 text-sm text-black/50">
              {suggestion.credits.toLocaleString("ro-RO")} credite · {lei(priceOf(suggestion, cycle))} / lună
            </p>
            <button type="button" onClick={() => choose(suggestion)} className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white">
              Alege {suggestion.name}
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-12">
        <h3 className="text-3xl tracking-tight text-white">Când se termină creditele</h3>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-white/45">
          Ce e deja aprobat se publică. Generarea nouă așteaptă un pachet sau un plan mai mare.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {TOP_UPS.map((pack) => (
            <div key={pack.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <p className="text-[13px] text-white/40">{pack.label}</p>
              <p className="mt-2 text-3xl tracking-tight text-white">{pack.credits.toLocaleString("ro-RO")}</p>
              <p className="text-[14px] text-white/50">credite · {lei(pack.price)}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
