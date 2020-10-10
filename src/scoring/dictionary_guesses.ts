import { IDictionaryMatch } from "../matching/dictionary_match";
import { nCk } from "./support";

export const START_UPPER = /^[A-Z][^A-Z]+$/;
const END_UPPER = /^[^A-Z]+[A-Z]$/;
export const ALL_UPPER = /^[^a-z]+$/;
const ALL_LOWER = /^[^A-Z]+$/;

export function uppercase_variations(match: { token: string }): number {
  const word = match.token;
  if (word.match(ALL_LOWER) || word.toLowerCase() === word) {
    return 1;
  }
  // a capitalized word is the most common capitalization scheme,
  // so it only doubles the search space (uncapitalized + capitalized).
  // allcaps and end-capitalized are common enough too, underestimate as 2x factor to be safe.
  for (const regex of [START_UPPER, END_UPPER, ALL_UPPER]) {
    if (word.match(regex)) {
      return 2;
    }
  }
  // otherwise calculate the number of ways to capitalize U+L uppercase+lowercase letters
  // with U uppercase letters or less. or, if there's more uppercase than lower (for eg. PASSwORD),
  // the number of ways to lowercase U+L letters with L lowercase letters or less.
  const U = word.split("").filter((c) => c.match(/[A-Z]/)).length;
  const L = word.split("").filter((c) => c.match(/[a-z]/)).length;
  let variations = 0;
  for (let i = 1; i <= Math.min(U, L); i++) {
    variations += nCk(U + L, i);
  }
  return variations;
}

export function l33t_variations(match: IDictionaryMatch): number {
  if (!match.l33t) {
    return 1;
  }
  let variations = 1;
  for (const subbed in match.sub) {
    // lower-case match.token before calculating: capitalization shouldn't affect l33t calc.
    const unsubbed = match.sub[subbed];
    const chrs = match.token.toLowerCase().split("");
    const S = chrs.filter((c) => c === subbed).length;
    const U = chrs.filter((c) => c === unsubbed).length;

    if (S === 0 || U === 0) {
      // for this sub, password is either fully subbed (444) or fully unsubbed (aaa)
      // treat that as doubling the space (attacker needs to try fully subbed chars in addition to
      // unsubbed.)
      variations *= 2;
    } else {
      // this case is similar to capitalization:
      // with aa44a, U = 3, S = 2, attacker needs to try unsubbed + one sub + two subs
      const p = Math.min(U, S);
      let possibilities = 0;
      for (let i = 1; i <= p; i++) {
        possibilities += nCk(U + S, i);
      }
      variations *= possibilities;
    }
  }
  return variations;
}

export function dictionary_guesses(match: IDictionaryMatch): number {
  match.base_guesses = match.rank; // keep these as properties for display purposes
  match.uppercase_variations = uppercase_variations(match);
  match.l33t_variations = l33t_variations(match);
  const reversed_variations = (match.reversed && 2) || 1;
  return (
    match.base_guesses *
    match.uppercase_variations *
    match.l33t_variations *
    reversed_variations
  );
}
