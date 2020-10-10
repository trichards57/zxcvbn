import { IAnyMatch } from "../matching";

const BRUTEFORCE_CARDINALITY = 10;
export const MIN_SUBMATCH_GUESSES_SINGLE_CHAR = 10;
export const MIN_SUBMATCH_GUESSES_MULTI_CHAR = 50;

export function bruteforce_guesses(match: IAnyMatch): number {
  let guesses = Math.pow(BRUTEFORCE_CARDINALITY, match.token.length);
  if (guesses === Number.POSITIVE_INFINITY) {
    guesses = Number.MAX_VALUE;
  }
  // small detail: make bruteforce matches at minimum one guess bigger than smallest allowed
  // submatch guesses, such that non-bruteforce submatches over the same [i..j] take precedence.
  const min_guesses =
    match.token.length === 1
      ? MIN_SUBMATCH_GUESSES_SINGLE_CHAR + 1
      : MIN_SUBMATCH_GUESSES_MULTI_CHAR + 1;
  return Math.max(guesses, min_guesses);
}
