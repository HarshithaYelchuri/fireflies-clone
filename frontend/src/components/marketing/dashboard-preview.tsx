"use client";

import { useEffect, useRef, useState } from "react";

import { DashboardContent } from "@/components/home/home-dashboard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SAMPLE_MEETINGS, SAMPLE_STATS, SAMPLE_TASKS } from "@/lib/sample-dashboard";

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 780;
const noop = () => {};

/**
 * The real dashboard (sidebar, top bar and <DashboardContent>) rendered with sample data at desktop size,
 * then scaled to fit its frame. It's a picture of the product, so it's inert (not focusable or clickable).
 */
export default function DashboardPreview() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / BASE_WIDTH)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="relative overflow-hidden" style={{ height: BASE_HEIGHT * scale }}>
      <div
        inert
        className="pointer-events-none flex origin-top-left bg-gray-50 select-none"
        style={{ width: BASE_WIDTH, height: BASE_HEIGHT, transform: `scale(${scale})` }}
      >
        <Sidebar collapsed={false} onToggleCollapsed={noop} activeHref="/dashboard" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={noop} shortcuts={false} />
          <div className="min-h-0 flex-1 overflow-hidden">
            <DashboardContent
              heading="Welcome back, Priya"
              meetings={SAMPLE_MEETINGS}
              stats={SAMPLE_STATS}
              tasks={SAMPLE_TASKS}
              people={[]}
              onTaskChanged={noop}
              onTaskRemoved={noop}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
