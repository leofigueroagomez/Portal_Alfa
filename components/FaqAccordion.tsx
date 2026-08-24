"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type FaqItem = {
  question: string;
  answer: string;
};

interface FaqAccordionProps {
  items: FaqItem[];
  title?: string;
  eyebrow?: string;
}

export default function FaqAccordion({
  items,
  title = "Preguntas Frecuentes",
  eyebrow = "Resolviendo dudas",
}: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="border-t border-white/10 bg-[#0F0F0F] px-5 py-20 text-white sm:px-8 lg:px-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl text-white">
            {title}
          </h2>
          <p className="mt-4 text-sm text-zinc-400">
            Todo lo que necesitas saber antes de iniciar tu proyecto con ALFA.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition duration-200 hover:border-white/20"
              >
                <button
                  type="button"
                  onClick={() => toggleIndex(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-white sm:text-lg">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#B84A5A] transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-white/5 px-5 pb-6 pt-2 sm:px-6">
                    <p className="text-sm leading-7 text-zinc-300 sm:text-base sm:leading-8">
                      {item.answer}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
