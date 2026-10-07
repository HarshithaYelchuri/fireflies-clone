"use client";

import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { COMING_SOON, type ComingSoonKey } from "@/lib/features";
import { cn } from "@/lib/utils";

function FeatureIcon({ feature, compact }: { feature: ComingSoonKey; compact?: boolean }) {
  const { icon: Icon } = COMING_SOON[feature];
  return (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-magenta text-white shadow-lg shadow-brand-500/30",
        compact ? "size-14" : "size-20",
      )}
    >
      <Icon className={compact ? "size-6" : "size-9"} />
      <span className="absolute -top-2 -right-3 rounded-full bg-brand-pink px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase shadow">
        Soon
      </span>
    </div>
  );
}

function FeatureHighlights({ feature }: { feature: ComingSoonKey }) {
  return (
    <ul className="mx-auto grid w-fit max-w-sm gap-2 text-left text-sm text-gray-600">
      {COMING_SOON[feature].highlights.map((item) => (
        <li key={item} className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-50">
            <Check className="size-3 text-brand-600" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function notifyMe(feature: ComingSoonKey) {
  toast.success("You're on the list", {
    description: `We'll let you know as soon as ${COMING_SOON[feature].title} is available.`,
  });
}

/** Full-page placeholder for an out-of-scope section (e.g. /analytics). */
export function ComingSoonPage({ feature }: { feature: ComingSoonKey }) {
  const { title, description } = COMING_SOON[feature];
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
      <div className="w-full rounded-2xl border bg-white px-8 py-12 shadow-xs">
        <FeatureIcon feature={feature} />
        <h1 className="mt-8 text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-gray-500">{description}</p>
        <div className="mt-6">
          <FeatureHighlights feature={feature} />
        </div>
        <Button className="mt-6 h-10 px-5" onClick={() => notifyMe(feature)}>
          Notify me when it&apos;s ready
        </Button>
      </div>
    </div>
  );
}

const ComingSoonContext = createContext<(feature: ComingSoonKey) => void>(() => {});

/** Opens the "Coming soon" dialog for an out-of-scope action, e.g. `showComingSoon("capture")`. */
export function useComingSoon() {
  return useContext(ComingSoonContext);
}

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [feature, setFeature] = useState<ComingSoonKey | null>(null);
  const [open, setOpen] = useState(false);
  const show = useCallback((key: ComingSoonKey) => {
    setFeature(key);
    setOpen(true);
  }, []);

  return (
    <ComingSoonContext.Provider value={show}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="px-6 pt-8 pb-6 text-center sm:max-w-md">
          {feature && (
            <>
              <FeatureIcon feature={feature} compact />
              <DialogTitle className="mt-2 text-lg font-semibold">{COMING_SOON[feature].title}</DialogTitle>
              <DialogDescription>{COMING_SOON[feature].description}</DialogDescription>
              <FeatureHighlights feature={feature} />
              <div className="mt-2 flex justify-center gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Maybe later
                </Button>
                <Button
                  onClick={() => {
                    notifyMe(feature);
                    setOpen(false);
                  }}
                >
                  Notify me
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ComingSoonContext.Provider>
  );
}
