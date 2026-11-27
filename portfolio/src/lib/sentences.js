// Splits prose into sentences at a . ! or ? that is followed by a space or
// the end, so numbers such as "286.7M", "$2.45" and "v0.3.0" stay whole.
export const sentences = (text = "") => String(text).trim().split(/(?<=[.!?])\s+/).filter(Boolean);

// The first `n` sentences, or the whole text when it has no sentence break.
export const firstSentences = (text = "", n = 1) => sentences(text).slice(0, n).join(" ") || String(text || "");

// As many opening sentences as fit in `limit` characters, never a rewrite;
// a first sentence longer than that is cut at a word, with an ellipsis.
export function summarize(text = "", limit = 160) {
  let out = "";
  for (const sentence of sentences(text)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > limit) break;
    out = next;
  }
  if (out) return out;
  return String(text).slice(0, limit - 1).replace(/\s+\S*$/, "") + "…";
}
