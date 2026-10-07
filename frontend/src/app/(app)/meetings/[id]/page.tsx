import { notFound } from "next/navigation";

import { MeetingView } from "@/components/meeting/meeting-view";

export const metadata = { title: "Meeting" };

interface MeetingPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; q?: string }>;
}

export default async function MeetingPage({ params, searchParams }: MeetingPageProps) {
  const [{ id }, { t, q }] = await Promise.all([params, searchParams]);
  const meetingId = Number(id);
  if (!Number.isInteger(meetingId) || meetingId <= 0) notFound();

  return <MeetingView key={meetingId} id={meetingId} initialTime={Number(t) || 0} initialQuery={q ?? ""} />;
}
