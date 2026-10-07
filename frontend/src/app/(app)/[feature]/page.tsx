import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComingSoonPage } from "@/components/common/coming-soon";
import { PRIMARY_NAV } from "@/components/layout/nav-items";
import { COMING_SOON, isComingSoonKey } from "@/lib/features";

/** Out-of-scope sidebar sections (AskFred, Uploads, AI Skills, …) render a "Coming soon" page. */
const SLUGS = PRIMARY_NAV.filter((item) => item.soon).map((item) => item.href.slice(1));

export const dynamicParams = false;

export function generateStaticParams() {
  return SLUGS.map((feature) => ({ feature }));
}

interface FeaturePageProps {
  params: Promise<{ feature: string }>;
}

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
  const { feature } = await params;
  return { title: isComingSoonKey(feature) ? COMING_SOON[feature].title : "Coming soon" };
}

export default async function FeaturePage({ params }: FeaturePageProps) {
  const { feature } = await params;
  if (!isComingSoonKey(feature)) notFound();
  return <ComingSoonPage feature={feature} />;
}
