import { IAnyMatch, IBruteForceMatch } from "../matching";
import {
  bruteforce_guesses,
  MIN_SUBMATCH_GUESSES_MULTI_CHAR,
} from "./bruteforce_guesses";
import { date_guesses } from "./date_guesses";
import { dictionary_guesses } from "./dictionary_guesses";
import { regex_guesses } from "./regex_guesses";
import { repeat_guesses } from "./repeat_guesses";
import { sequence_guesses } from "./sequence_guesses";
import { spatial_guesses } from "./spatial_guesses";
import { factorial } from "./support";

const MIN_GUESSES_BEFORE_GROWING_SEQUENCE = 10000;

// helper: considers whether a length-l sequence ending at match m is better (fewer guesses)
// than previously encountered sequences, updating state if so.
function update(
  password: string,
  optimal: {
    m: IAnyMatch[][];
    pi: Record<number, number>[];
    g: Record<number, number>[];
  },
  m: IAnyMatch,
  l: number,
  exclude_additive: boolean
) {
  const k = m.j;
  let pi = estimate_guesses(m, password);
  if (l > 1) {
    // we're considering a length-l sequence ending with match m:
    // obtain the product term in the minimization function by multiplying m's guesses
    // by the product of the length-(l-1) sequence ending just before m, at m.i - 1.
    pi *= optimal.pi[m.i - 1][l - 1];
  }
  // calculate the minimization func
  let g = factorial(l) * pi;
  if (!exclude_additive) {
    g += Math.pow(MIN_GUESSES_BEFORE_GROWING_SEQUENCE, l - 1);
  }
  // update state if new best.
  // first see if any competing sequences covering this prefix, with l or fewer matches,
  // fare better than this sequence. if so, skip it and return.
  for (const competing_l in optimal.g[k]) {
    const competing_g = optimal.g[k][competing_l];
    if (((competing_l as unknown) as number) > l) {
      continue;
    }
    if (competing_g <= g) {
      return;
    }
  }
  // this sequence might be part of the final optimal sequence.
  optimal.g[k][l] = g;
  optimal.m[k][l] = m;
  return (optimal.pi[k][l] = pi);
}

// helper: step backwards through optimal.m starting at the end,
// constructing the final optimal match sequence.
function unwind(
  optimal: {
    m: IAnyMatch[][];
    pi: Record<number, number>[];
    g: Record<number, number>[];
  },
  n: number
) {
  const optimal_match_sequence: IAnyMatch[] = [];
  let k = n - 1;
  // find the final best sequence length and score
  let l = -1;
  let g = Infinity;
  for (const candidate_l in optimal.g[k]) {
    const candidate_g = optimal.g[k][candidate_l];
    if (candidate_g < g) {
      l = parseInt(candidate_l);
      g = candidate_g;
    }
  }

  while (k >= 0) {
    const m = optimal.m[k][l];
    optimal_match_sequence.unshift(m);
    k = m.i - 1;
    l--;
  }
  return optimal_match_sequence;
}

// helper: evaluate bruteforce matches ending at k.
function bruteforce_update(
  password: string,
  optimal: {
    m: IAnyMatch[][];
    pi: Record<number, number>[];
    g: Record<number, number>[];
  },
  k: number,
  exclude_additive: boolean
) {
  // see if a single bruteforce match spanning the k-prefix is optimal.
  const m = make_bruteforce_match(password, 0, k);
  update(password, optimal, m, 1, exclude_additive);
  for (let i = 1; i <= k; i++) {
    // generate k bruteforce matches, spanning from (i=1, j=k) up to (i=k, j=k).
    // see if adding these new matches to any of the sequences in optimal[i-1]
    // leads to new bests.
    const m = make_bruteforce_match(password, i, k);
    const object = optimal.m[i - 1];

    for (const l in object) {
      const i = parseInt(l);
      const last_m = object[i];
      if (last_m.pattern === "bruteforce") continue;
      return update(password, optimal, m, i + 1, exclude_additive);
    }
  }
  return;
}

// helper: make bruteforce match objects spanning i to j, inclusive.
function make_bruteforce_match(
  password: string,
  i: number,
  j: number
): IBruteForceMatch {
  return {
    pattern: "bruteforce",
    token: password.slice(i, j + 1),
    i,
    j,
  };
}

// ------------------------------------------------------------------------------
// search --- most guessable match sequence -------------------------------------
// ------------------------------------------------------------------------------
//
// takes a sequence of overlapping matches, returns the non-overlapping sequence with
// minimum guesses. the following is a O(l_max * (n + m)) dynamic programming algorithm
// for a length-n password with m candidate matches. l_max is the maximum optimal
// sequence length spanning each prefix of the password. In practice it rarely exceeds 5 and the
// search terminates rapidly.
//
// the optimal "minimum guesses" sequence is here defined to be the sequence that
// minimizes the following function:
//
//    g = l! * Product(m.guesses for m in sequence) + D^(l - 1)
//
// where l is the length of the sequence.
//
// the factorial term is the number of ways to order l patterns.
//
// the D^(l-1) term is another length penalty, roughly capturing the idea that an
// attacker will try lower-length sequences first before trying length-l sequences.
//
// for example, consider a sequence that is date-repeat-dictionary.
//  - an attacker would need to try other date-repeat-dictionary combinations,
//    hence the product term.
//  - an attacker would need to try repeat-date-dictionary, dictionary-repeat-date,
//    ..., hence the factorial term.
//  - an attacker would also likely try length-1 (dictionary) and length-2 (dictionary-date)
//    sequences before length-3. assuming at minimum D guesses per pattern type,
//    D^(l-1) approximates Sum(D^i for i in [1..l-1]
//
// ------------------------------------------------------------------------------

export function most_guessable_match_sequence(
  password: string,
  matches: IAnyMatch[],
  _exclude_additive = false
): {
  sequence: IAnyMatch[];
  guesses: number;
  guesses_log10: number;
  password: string;
  score: number;
} {
  let guesses, m: IAnyMatch;
  if (_exclude_additive == undefined) {
    _exclude_additive = false;
  }
  const n = password.length;

  // partition matches into sublists according to ending index j
  const matches_by_j = new Array(password.length).fill([]) as IAnyMatch[][];
  for (m of matches) {
    matches_by_j[m.j].push(m);
  }
  // small detail: for deterministic output, sort each sublist by i.
  for (const lst of matches_by_j) {
    lst.sort((m1, m2) => m1.i - m2.i);
  }

  const optimal = {
    // optimal.m[k][l] holds final match in the best length-l match sequence covering the
    // password prefix up to k, inclusive.
    // if there is no length-l sequence that scores better (fewer guesses) than
    // a shorter match sequence spanning the same prefix, optimal.m[k][l] is undefined.
    m: matches_by_j.map(() => ({})) as IAnyMatch[][],

    // same structure as optimal.m -- holds the product term Prod(m.guesses for m in sequence).
    // optimal.pi allows for fast (non-looping) updates to the minimization function.
    pi: matches_by_j.map(() => ({})) as Record<number, number>[],

    // same structure as optimal.m -- holds the overall metric.
    g: matches_by_j.map(() => ({})) as Record<number, number>[],
  };

  for (let k = 0; k < n; k++) {
    for (m of matches_by_j[k]) {
      if (m.i > 0) {
        for (const l in optimal.m[m.i - 1]) {
          const len = parseInt(l);
          update(password, optimal, m, len + 1, _exclude_additive);
        }
      } else {
        update(password, optimal, m, 1, _exclude_additive);
      }
    }
    bruteforce_update(password, optimal, k, _exclude_additive);
  }

  const optimal_match_sequence = unwind(optimal, n);
  const optimal_l = optimal_match_sequence.length;

  // corner: empty password
  if (password.length === 0) {
    guesses = 1;
  } else {
    guesses = optimal.g[n - 1][optimal_l];
  }

  // final result object
  return {
    password,
    guesses,
    guesses_log10: Math.log10(guesses),
    sequence: optimal_match_sequence,
    score: 0,
  };
}

// ------------------------------------------------------------------------------
// guess estimation -- one function per match pattern ---------------------------
// ------------------------------------------------------------------------------

export function estimate_guesses(match: IAnyMatch, password: string): number {
  if (match.guesses) {
    return match.guesses;
  } // a match's guess estimate doesn't change. cache it.
  let min_guesses = 1;
  if (match.token.length < password.length) {
    min_guesses =
      match.token.length === 1
        ? MIN_SUBMATCH_GUESSES_MULTI_CHAR
        : MIN_SUBMATCH_GUESSES_MULTI_CHAR;
  }

  let guesses: number;

  switch (match.pattern) {
    case "bruteforce":
      guesses = bruteforce_guesses(match);
      break;
    case "date":
      guesses = date_guesses(match);
      break;
    case "dictionary":
      guesses = dictionary_guesses(match);
      break;
    case "regex":
      guesses = regex_guesses(match);
      break;
    case "repeat":
      guesses = repeat_guesses(match);
      break;
    case "sequence":
      guesses = sequence_guesses(match);
      break;
    case "spatial":
      guesses = spatial_guesses(match);
      break;
  }

  match.guesses = Math.max(guesses, min_guesses);
  match.guesses_log10 = Math.log10(match.guesses);
  return match.guesses;
}
