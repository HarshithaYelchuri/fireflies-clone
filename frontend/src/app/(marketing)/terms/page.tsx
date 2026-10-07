import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 7, 2026">
      <p>
        Hersheys.ai is provided as a demonstration of an AI meeting workspace. By creating an account you agree to use it
        responsibly and only upload content you have the right to share.
      </p>
      <h2>Your content</h2>
      <p>You own the meetings, transcripts and notes you add. Workspace members can see meetings in the shared workspace.</p>
      <h2>Availability</h2>
      <p>The service is offered as is, without guarantees of availability or fitness for a particular purpose.</p>
      <h2>Contact</h2>
      <p>Questions about these terms can be raised with the workspace administrator.</p>
    </LegalPage>
  );
}
