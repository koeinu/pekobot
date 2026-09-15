/** Relative chance weights for each omikuji result.
 *  Values can be any positive numbers — they are normalized at runtime.
 */
/* eslint-disable no-magic-numbers -- chance table weights */
const OMIKUJI_CHANCES = {
  "大吉(Great fortune)": 8,
  "吉 (fortune)": 18,
  "中吉 (middle fortune)": 25,
  "しけ吉 (Shike fortune)": 22,
  "末吉 (Uncertain luck)": 15,
  "凶（misfortune）": 3,
};
/* eslint-enable no-magic-numbers */

/**
 * Returns a random omikuji result according to the weights in OMIKUJI_CHANCES.
 * Weights are normalized to probabilities automatically.
 */
export function getRandomOmikuji() {
  const entries = Object.entries(OMIKUJI_CHANCES);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

  if (total <= 0) {
    throw new Error(
      "OMIKUJI_CHANCES must contain at least one positive weight"
    );
  }

  let r = Math.random() * total;

  for (const [luck, weight] of entries) {
    r -= weight;
    if (r < 0) {
      return luck;
    }
  }

  // Fallback (should never happen with valid weights)
  return entries[entries.length - 1][0];
}
