import { Reveal } from "./reveal";

const STEPS = [
  {
    step: "01",
    title: "Capture",
    text: "Bring in a meeting by inviting the notetaker, uploading a transcript, or adding it by hand. Every word is timestamped and attributed.",
  },
  {
    step: "02",
    title: "Understand",
    text: "AI pulls out the overview, key decisions, topics and highlights, so you can skim a meeting in seconds or jump to the exact moment.",
  },
  {
    step: "03",
    title: "Act",
    text: "Follow-ups become tasks with owners and due dates, tracked in one place across every meeting your team has.",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 border-y border-gray-100 bg-gray-50/70 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
        <Reveal>
          <p className="text-sm font-semibold text-brand-600">About Hersheys.ai</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-[2.75rem] sm:leading-tight">
            Built for teams who do their best thinking out loud.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-600">
            Teams make their most important decisions in conversation, and then lose them. Hersheys.ai is a meeting workspace
            that remembers everything, explains what changed, and makes sure someone owns what happens next.
          </p>
        </Reveal>

        <ol className="grid gap-4">
          {STEPS.map(({ step, title, text }, i) => (
            <Reveal key={step} delay={i * 100}>
              <li className="flex gap-5 rounded-3xl border border-gray-200/80 bg-white p-6 transition hover:shadow-[0_20px_50px_-30px_rgba(11,33,73,0.35)]">
                <span className="font-heading text-sm font-bold text-brand-coral tabular-nums">{step}</span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{text}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
