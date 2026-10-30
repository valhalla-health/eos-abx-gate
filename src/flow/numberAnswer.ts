// Number answers are plain decimals: digits with an optional point and more digits, or a point and
// digits on their own (".5" for a 30-minute ROM). Number() on its own would also take "0x26", "1e2"
// or "Infinity" and hand back a value the resident did not mean. This is input validation, not a
// clinical rule; the range comes from the question.
const PLAIN_DECIMAL = /^(\d+(\.\d+)?|\.\d+)$/;

export function parseNumberAnswer(raw: string, min: number, max: number): number | null {
  const text = raw.trim();
  if (!PLAIN_DECIMAL.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}
