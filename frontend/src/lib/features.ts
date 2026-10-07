import {
  AudioLines,
  BarChart3,
  Bell,
  CreditCard,
  CalendarDays,
  Headset,
  Mic,
  Plug,
  Share2,
  Sparkles,
  Upload,
  UserPlus,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

/** Out-of-scope Fireflies features, shown as polished "Coming soon" pages and dialogs. */
export interface ComingSoonFeature {
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
}

export const COMING_SOON = {
  askfred: {
    title: "AskFred",
    description: "Ask questions about any meeting and get answers grounded in your transcripts.",
    icon: Sparkles,
    highlights: ["Ask questions in plain language", "Answers cite the moment they came from", "Drafts follow-up emails for you"],
  },
  "ai-skills": {
    title: "AI Skills",
    description: "Run ready-made AI workflows on your meetings, from sales scorecards to interview feedback.",
    icon: WandSparkles,
    highlights: ["200+ prebuilt skills", "Build your own prompts", "Run them automatically after every meeting"],
  },
  analytics: {
    title: "Conversation Intelligence",
    description: "Track talk time, sentiment, questions and topics across all of your team's meetings.",
    icon: BarChart3,
    highlights: ["Speaker talk-to-listen ratio", "Sentiment and topic trends", "Team-wide dashboards"],
  },
  "voice-agents": {
    title: "Voice Agents",
    description: "AI agents that can join calls, answer questions and take notes for you.",
    icon: Headset,
    highlights: ["Joins calls for you", "Answers questions from your knowledge base", "Hands off to a person when needed"],
  },
  integrations: {
    title: "Integrations",
    description: "Sync meeting notes and action items to your CRM, project tracker and chat tools.",
    icon: Plug,
    highlights: ["Slack, Asana, Jira, Notion", "Salesforce and HubSpot sync", "Zapier and API access"],
  },
  uploads: {
    title: "Uploads",
    description:
      "Upload audio or video files and get a full transcript, summary and action items. Transcript files (.txt, .vtt, .srt) can already be imported from Meetings → Upload.",
    icon: Upload,
    highlights: ["MP3, MP4, M4A, WAV and WEBM", "Transcription in 100+ languages", "Speaker detection"],
  },
  capture: {
    title: "Capture a live meeting",
    description: "Invite Fred, the AI notetaker, to a live Zoom, Google Meet or Teams call.",
    icon: Mic,
    highlights: ["Paste a meeting link to start", "Records and transcribes in real time", "Notes ready minutes after the call"],
  },
  team: {
    title: "Invite your team",
    description: "Share meetings, collaborate on notes and manage your workspace together.",
    icon: UserPlus,
    highlights: ["Shared channels and playlists", "Comments and soundbites", "Admin and permission controls"],
  },
  share: {
    title: "Share meeting",
    description: "Share a meeting recap by link or email, with fine-grained privacy controls.",
    icon: Share2,
    highlights: ["Public or workspace-only links", "Send recap emails", "Share selected clips only"],
  },
  notifications: {
    title: "Notifications",
    description: "Get notified when meeting notes are ready or someone mentions you.",
    icon: Bell,
    highlights: ["Notes-ready alerts", "Mentions and comments", "Weekly digest"],
  },
  calendar: {
    title: "Calendar sync",
    description: "Connect Google or Outlook Calendar to see upcoming meetings and auto-join them.",
    icon: CalendarDays,
    highlights: ["Google and Outlook calendars", "Auto-join rules", "Meeting prep briefs"],
  },
  "meeting-prep": {
    title: "Meeting Prep",
    description: "Get a briefing before each meeting, based on your past conversations with the attendees.",
    icon: AudioLines,
    highlights: ["Context from past meetings", "Open action items", "Suggested talking points"],
  },
  billing: {
    title: "Plans & billing",
    description: "Upgrade to unlimited transcription and manage invoices and seats for your workspace.",
    icon: CreditCard,
    highlights: ["Unlimited transcription and AI notes", "Seat management for teams", "Invoices and receipts"],
  },
} satisfies Record<string, ComingSoonFeature>;

export type ComingSoonKey = keyof typeof COMING_SOON;

export function isComingSoonKey(value: string): value is ComingSoonKey {
  return value in COMING_SOON;
}
