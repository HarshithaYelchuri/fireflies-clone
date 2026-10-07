import type { Metadata } from "next";

import { AboutSection } from "@/components/marketing/about-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { ProductSection } from "@/components/marketing/product-section";

export const metadata: Metadata = {
  title: { absolute: "Hersheys.ai: Turn every meeting into momentum" },
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProductSection />
      <FeaturesSection />
      <AboutSection />
      <FinalCta />
    </>
  );
}
