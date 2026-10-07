import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={<Button nativeButton={false} render={<Link href="/" />}>Go home</Button>}
      className="py-24"
    />
  );
}
