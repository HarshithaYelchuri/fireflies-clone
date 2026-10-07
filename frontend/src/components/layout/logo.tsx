import Image from "next/image";

import { cn } from "@/lib/utils";

/** Hersheys.ai brand: the illustrated mark (public/brand/hersheys-mark.png) plus the "hersheys.ai" wordmark. */
export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image src="/brand/hersheys-mark.png" alt="" width={36} height={36} priority className="size-9 shrink-0" />
      {!collapsed && (
        <span className="font-heading text-[17px] font-bold tracking-tight text-[#0b2149]">
          hersheys<span className="text-brand-pink">.ai</span>
        </span>
      )}
    </span>
  );
}
