import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/** Public pages: landing, privacy, terms. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-white">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
