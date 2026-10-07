import Link from "next/link";

import { Logo } from "@/components/layout/logo";

const FOOTER_LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="max-w-xs">
          <Link href="/" aria-label="Hersheys.ai home">
            <Logo />
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Meeting intelligence that turns conversations into decisions, and decisions into work.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-600 transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-gray-100">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-gray-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Hersheys.ai. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
