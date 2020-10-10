import { keypad, qwerty } from "../adjacency_graphs";
import { ISpatialMatch } from "../matching/spatial_match";
import { nCk } from "./support";

export const KEYBOARD_AVERAGE_DEGREE = calc_average_degree(qwerty);
// slightly different for keypad/mac keypad, but close enough
const KEYPAD_AVERAGE_DEGREE = calc_average_degree(keypad);

export const KEYBOARD_STARTING_POSITIONS = Object.keys(qwerty).length;

const KEYPAD_STARTING_POSITIONS = Object.keys(keypad).length;

// on qwerty, 'g' has degree 6, being adjacent to 'ftyhbv'. '\' has degree 1.
// this calculates the average over all keys.
function calc_average_degree(graph: Record<string, (string | null)[]>) {
  let average = 0;
  for (const key in graph) {
    const neighbors = graph[key];
    average += neighbors.filter((n) => n).length;
  }
  average /= Object.keys(graph).length;
  return average;
}

export function spatial_guesses(match: ISpatialMatch): number {
  let d, s;
  if (["qwerty", "dvorak"].includes(match.graph)) {
    s = KEYBOARD_STARTING_POSITIONS;
    d = KEYBOARD_AVERAGE_DEGREE;
  } else {
    s = KEYPAD_STARTING_POSITIONS;
    d = KEYPAD_AVERAGE_DEGREE;
  }
  let guesses = 0;
  const L = match.token.length;
  const t = match.turns;
  // estimate the number of possible patterns w/ length L or less with t turns or less.
  for (let i = 2; i <= L; i++) {
    const possible_turns = Math.min(t, i - 1);
    for (let j = 1; j <= possible_turns; j++) {
      guesses += nCk(i - 1, j - 1) * s * Math.pow(d, j);
    }
  }
  // add extra guesses for shifted keys. (% instead of 5, A instead of a.)
  // math is similar to extra guesses of l33t substitutions in dictionary matches.
  if (match.shifted_count) {
    const S = match.shifted_count;
    const U = match.token.length - match.shifted_count; // unshifted count
    if (S === 0 || U === 0) {
      guesses *= 2;
    } else {
      let shifted_variations = 0;
      for (let i = 1; i <= Math.min(S, U); i++) {
        shifted_variations += nCk(S + U, i);
      }
      guesses *= shifted_variations;
    }
  }
  return guesses;
}
