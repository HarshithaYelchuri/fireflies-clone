import type { ReactNode } from "react";

/** Simple long-form layout for the Privacy and Terms pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-semibold text-brand-600">Legal</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated {updated}</p>
      <div className="mt-10 space-y-6 text-base leading-relaxed text-gray-600 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink">
        {children}
      </div>
    </article>
  );
}
