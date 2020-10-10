import { ISequenceMatch } from "../matching/sequence_match";

export function sequence_guesses(match: ISequenceMatch): number {
  let base_guesses;
  const first_chr = match.token.charAt(0);
  // lower guesses for obvious starting points
  if (["a", "A", "z", "Z", "0", "1", "9"].includes(first_chr)) {
    base_guesses = 4;
  } else {
    if (first_chr.match(/\d/)) {
      base_guesses = 10; // digits
    } else {
      // could give a higher base for uppercase,
      // assigning 26 to both upper and lower sequences is more conservative.
      base_guesses = 26;
    }
  }
  if (!match.ascending) {
    // need to try a descending sequence in addition to every ascending sequence ->
    // 2x guesses
    base_guesses *= 2;
  }
  return base_guesses * match.token.length;
}
