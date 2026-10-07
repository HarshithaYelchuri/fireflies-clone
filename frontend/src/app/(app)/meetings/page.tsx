import { Suspense } from "react";

import { MeetingsLibrary } from "@/components/meetings/meetings-library";

export const metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return (
    <Suspense>
      <MeetingsLibrary />
    </Suspense>
  );
}
