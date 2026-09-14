import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ as native <details>/<summary>: keyboard operable, expandable without
 * JavaScript, and readable by assistive tech with no ARIA of our own.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-10 divide-y divide-base-700 border-y border-base-700">
      {items.map((item) => (
        <details key={item.question} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-100 [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="shrink-0 text-ink-600 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-400">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
