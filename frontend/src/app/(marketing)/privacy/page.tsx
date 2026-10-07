import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 7, 2026">
      <p>
        Hersheys.ai is a demonstration product. This page explains, in plain language, what the app stores when you use it.
      </p>
      <h2>What we store</h2>
      <p>
        Your account (name, email, job title and preferences), a hashed password if you sign up with email, and your Google
        account identifier if you continue with Google. Meeting titles, transcripts, AI notes and action items you add are
        stored in the workspace database.
      </p>
      <h2>How it&apos;s used</h2>
      <p>Only to run the product: signing you in, showing your meetings and tasks, and generating exports you request.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile at any time in Settings, and delete any meeting or action item you created.</p>
    </LegalPage>
  );
}
