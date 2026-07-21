import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { FAQS } from "@/lib/faq";

// Native <details>/<summary> accordion, not a client-side toggle — every
// answer still ships in the initial server-rendered HTML (just visually
// collapsed), so it stays readable by any crawler that doesn't execute JS
// and keeps matching the FAQPage JSON-LD in app/page.tsx (both read from
// the same FAQS array). No client component, no JS needed for the toggle.
export function FaqSection() {
  return (
    <section id="faq" className="relative w-full border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <Reveal className="mb-16 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">Before you ask.</h2>
        </Reveal>

        <Reveal className="landing-panel mx-auto max-w-3xl divide-y divide-border/60">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group px-6 py-6 md:px-8">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-[15px] leading-relaxed font-light text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </Reveal>

        {/* Homepage's only in-body link to /guides — otherwise reachable
            just from the footer, which meant neither a crawler nor a
            first-time visitor had a reason to notice the content exists. */}
        <p className="mt-8 text-center text-[15px] text-muted-foreground">
          Want the deeper playbook?{" "}
          <Link href="/guides" className="text-foreground underline underline-offset-4 hover:text-[var(--accent-glow)]">
            Read our guides
          </Link>{" "}
          on finding your first users.
        </p>
      </div>
    </section>
  );
}
