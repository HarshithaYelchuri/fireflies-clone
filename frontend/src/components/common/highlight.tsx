import { splitByQuery } from "@/lib/transcript";

/** Renders `text` with every case-insensitive occurrence of `query` wrapped in <mark>. */
export function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitByQuery(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="hit">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
