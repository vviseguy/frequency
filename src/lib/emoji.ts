/** Split a multi-emoji string into individual emojis (ZWJ + VS aware). */
export function splitEmojis(s: string): string[] {
  const re = /\p{Extended_Pictographic}(‍\p{Extended_Pictographic})*️?/gu;
  const m = s.match(re);
  return m && m.length ? m : [s || '\u{1F3B2}'];
}
