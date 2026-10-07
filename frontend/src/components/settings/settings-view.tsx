"use client";

import { Bot, CreditCard, Plug, SlidersHorizontal, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { ComingSoonPage } from "@/components/common/coming-soon";
import { ParticipantAvatar } from "@/components/common/participant-avatar";
import { SelectField } from "@/components/common/select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Language, Profile, ProfileInput } from "@/types/api";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "notetaker", label: "Fred notetaker", icon: Bot },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Plans & billing", icon: CreditCard },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-xs">
      <div className="border-b px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
];

/** Saves through the profile context and reports the outcome with a toast. */
function useSave() {
  const { saveProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const save = async (input: ProfileInput, message: string) => {
    setSaving(true);
    try {
      await saveProfile(input);
      toast.success(message);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return { saving, save };
}

function ProfileSettings({ profile }: { profile: Profile }) {
  const initial = { name: profile.name, email: profile.email, job_title: profile.job_title };
  const [form, setForm] = useState(initial);
  const { saving, save } = useSave();
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((key) => form[key] !== initial[key]);
  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <Panel title="Profile" description="How you appear to teammates in meeting notes.">
      <form
        className="grid max-w-lg gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save({ name: form.name.trim(), email: form.email.trim(), job_title: form.job_title.trim() }, "Profile saved");
        }}
      >
        <div className="flex items-center gap-4">
          <ParticipantAvatar participant={{ id: 0, name: form.name || "?" }} size="xl" className="bg-brand-500 text-white" />
          <div>
            <p className="font-semibold text-gray-900">{form.name || "Your name"}</p>
            <p className="text-sm text-gray-500">
              {profile.workspace} · {profile.plan} plan
            </p>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-name">Full name</Label>
          <Input id="p-name" required maxLength={120} className="h-9" {...field("name")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" type="email" required className="h-9" {...field("email")} />
          <p className="text-xs text-gray-500">Your tasks are the action items assigned to the participant with this email.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-title">Job title</Label>
          <Input id="p-title" maxLength={120} className="h-9" {...field("job_title")} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={!dirty || saving || !form.name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {dirty && (
            <Button type="button" variant="outline" onClick={() => setForm(initial)} disabled={saving}>
              Discard
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}

const NOTIFICATION_OPTIONS = [
  { key: "email_recap", label: "Email me the meeting recap", hint: "Summary and action items after every meeting." },
  { key: "task_notifications", label: "Notify me when I'm assigned a task", hint: "Sent when an action item is assigned to you." },
  { key: "weekly_digest", label: "Weekly digest", hint: "A Monday overview of last week's meetings." },
] as const;

function PreferenceSettings({ profile }: { profile: Profile }) {
  const initial = {
    email_recap: profile.email_recap,
    task_notifications: profile.task_notifications,
    weekly_digest: profile.weekly_digest,
    language: profile.language,
  };
  const [prefs, setPrefs] = useState(initial);
  const { saving, save } = useSave();
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((key) => prefs[key] !== initial[key]);

  return (
    <Panel title="Preferences" description="Notifications and transcription defaults.">
      <div className="grid max-w-lg gap-5">
        {NOTIFICATION_OPTIONS.map(({ key, label, hint }) => (
          <Label key={key} className="items-start gap-3 font-normal">
            <Checkbox className="mt-0.5" checked={prefs[key]} onCheckedChange={(checked) => setPrefs({ ...prefs, [key]: checked })} />
            <span>
              <span className="block font-medium text-gray-900">{label}</span>
              <span className="mt-1 block text-gray-500">{hint}</span>
            </span>
          </Label>
        ))}
        <div className="grid gap-1.5">
          <Label htmlFor="pref-lang">Transcription language</Label>
          <SelectField
            id="pref-lang"
            value={prefs.language}
            onChange={(language) => setPrefs({ ...prefs, language: language as Language })}
            options={LANGUAGES}
            className="w-48"
          />
        </div>
        <div>
          <Button onClick={() => save(prefs, "Preferences saved")} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function SettingsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab");
  const tab: TabId = TABS.some((t) => t.id === requested) ? (requested as TabId) : "profile";
  const { user: profile } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your account and workspace.</p>

      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col" aria-label="Settings">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => router.replace(`${pathname}?tab=${id}`, { scroll: false })}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                tab === id ? "bg-white text-brand-700 shadow-xs ring-1 ring-gray-200" : "text-gray-600 hover:bg-white/70 hover:text-gray-900",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {(tab === "profile" || tab === "preferences") && !profile && <Skeleton className="h-96 rounded-xl" />}
          {/* Keyed by updated_at so the forms reset to the saved values after each save. */}
          {tab === "profile" && profile && <ProfileSettings key={profile.updated_at} profile={profile} />}
          {tab === "preferences" && profile && <PreferenceSettings key={profile.updated_at} profile={profile} />}
          {tab === "notetaker" && <ComingSoonPage feature="capture" />}
          {tab === "integrations" && <ComingSoonPage feature="integrations" />}
          {tab === "billing" && <ComingSoonPage feature="billing" />}
        </div>
      </div>
    </div>
  );
}
