import {
  IAnyMatch,
  IBruteForceMatch,
  IDateMatch,
  IDictionaryList,
  IDictionaryMatch,
  IMatch,
  INullableStringTable,
  IRegexMatch,
  IRepeatMatch,
  ISequenceMatch,
  ISpatialMatch,
  IStringTable,
} from "./matching";
import adjacency_graphs from "./adjacency_graphs";

/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let k, v;

// on qwerty, 'g' has degree 6, being adjacent to 'ftyhbv'. '\' has degree 1.
// this calculates the average over all keys.
const calc_average_degree = function (graph: INullableStringTable) {
  let average = 0;
  for (let key in graph) {
    const neighbors = graph[key];
    average += Array.from(neighbors).filter((n) => n).length;
  }
  average /= (() => {
    const result: string[] = [];
    for (k in graph) {
      v = graph[k];
      result.push(k);
    }
    return result;
  })().length;
  return average;
};

const BRUTEFORCE_CARDINALITY = 10;
const MIN_GUESSES_BEFORE_GROWING_SEQUENCE = 10000;
const MIN_SUBMATCH_GUESSES_SINGLE_CHAR = 10;
const MIN_SUBMATCH_GUESSES_MULTI_CHAR = 50;

const scoring = {
  nCk(n: number, k: number) {
    // http://blog.plover.com/math/choose.html
    if (k > n) {
      return 0;
    }
    if (k === 0) {
      return 1;
    }
    let r = 1;
    for (
      let d = 1, end = k, asc = 1 <= end;
      asc ? d <= end : d >= end;
      asc ? d++ : d--
    ) {
      r *= n;
      r /= d;
      n -= 1;
    }
    return r;
  },

  log10(n: number) {
    return Math.log(n) / Math.log(10);
  }, // IE doesn't support Math.log10 :(
  log2(n: number) {
    return Math.log(n) / Math.log(2);
  },

  factorial(n: number) {
    // unoptimized, called only on small n
    if (n < 2) {
      return 1;
    }
    let f = 1;
    for (
      let i = 2, end = n, asc = 2 <= end;
      asc ? i <= end : i >= end;
      asc ? i++ : i--
    ) {
      f *= i;
    }
    return f;
  },

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

  most_guessable_match_sequence(
    password: string,
    matches: IAnyMatch[],
    _exclude_additive?: boolean
  ): {
    sequence: IAnyMatch[];
    guesses: number;
    guesses_log10: number;
    password: string;
    score: number;
  } {
    let guesses, m;
    let asc4, end4;
    let _;
    if (_exclude_additive == undefined) {
      _exclude_additive = false;
    }
    const n = password.length;

    // partition matches into sublists according to ending index j
    const matches_by_j = (() => {
      let asc, end;
      const result: IAnyMatch[][] = [];
      for (
        _ = 0, end = n, asc = 0 <= end;
        asc ? _ < end : _ > end;
        asc ? _++ : _--
      ) {
        result.push([]);
      }
      return result;
    })();
    for (m of Array.from(matches)) {
      matches_by_j[m.j].push(m);
    }
    // small detail: for deterministic output, sort each sublist by i.
    for (let lst of Array.from(matches_by_j)) {
      lst.sort((m1, m2) => m1.i - m2.i);
    }

    const optimal = {
      // optimal.m[k][l] holds final match in the best length-l match sequence covering the
      // password prefix up to k, inclusive.
      // if there is no length-l sequence that scores better (fewer guesses) than
      // a shorter match sequence spanning the same prefix, optimal.m[k][l] is undefined.
      m: (() => {
        let asc1, end1;
        const result1: { [index: number]: IAnyMatch }[] = [];
        for (
          _ = 0, end1 = n, asc1 = 0 <= end1;
          asc1 ? _ < end1 : _ > end1;
          asc1 ? _++ : _--
        ) {
          result1.push({});
        }
        return result1;
      })(),

      // same structure as optimal.m -- holds the product term Prod(m.guesses for m in sequence).
      // optimal.pi allows for fast (non-looping) updates to the minimization function.
      pi: (() => {
        let asc2, end2;
        const result2: { [index: number]: number }[] = [];
        for (
          _ = 0, end2 = n, asc2 = 0 <= end2;
          asc2 ? _ < end2 : _ > end2;
          asc2 ? _++ : _--
        ) {
          result2.push({});
        }
        return result2;
      })(),

      // same structure as optimal.m -- holds the overall metric.
      g: (() => {
        let asc3, end3;
        const result3: { [index: number]: number }[] = [];
        for (
          _ = 0, end3 = n, asc3 = 0 <= end3;
          asc3 ? _ < end3 : _ > end3;
          asc3 ? _++ : _--
        ) {
          result3.push({});
        }
        return result3;
      })(),
    };

    // helper: considers whether a length-l sequence ending at match m is better (fewer guesses)
    // than previously encountered sequences, updating state if so.
    const update = (m: IAnyMatch, l: number): number | undefined => {
      k = m.j;
      let pi = this.estimate_guesses(m, password);
      if (l > 1) {
        // we're considering a length-l sequence ending with match m:
        // obtain the product term in the minimization function by multiplying m's guesses
        // by the product of the length-(l-1) sequence ending just before m, at m.i - 1.
        pi *= optimal.pi[m.i - 1][l - 1];
      }
      // calculate the minimization func
      let g = this.factorial(l) * pi;
      if (!_exclude_additive) {
        g += Math.pow(MIN_GUESSES_BEFORE_GROWING_SEQUENCE, l - 1);
      }
      // update state if new best.
      // first see if any competing sequences covering this prefix, with l or fewer matches,
      // fare better than this sequence. if so, skip it and return.
      for (let competing_l in optimal.g[k]) {
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
    };

    // helper: evaluate bruteforce matches ending at k.
    const bruteforce_update = (k: number) => {
      // see if a single bruteforce match spanning the k-prefix is optimal.
      m = make_bruteforce_match(0, k);
      update(m, 1);
      return (() => {
        const result4: (number | undefined)[][] = [];
        for (
          var i = 1, end4 = k, asc4 = 1 <= end4;
          asc4 ? i <= end4 : i >= end4;
          asc4 ? i++ : i--
        ) {
          // generate k bruteforce matches, spanning from (i=1, j=k) up to (i=k, j=k).
          // see if adding these new matches to any of the sequences in optimal[i-1]
          // leads to new bests.
          m = make_bruteforce_match(i, k);
          result4.push(
            (() => {
              const result5: (number | undefined)[] = [];
              const object = optimal.m[i - 1];
              for (let l in object) {
                const last_m = object[l];
                const i = parseInt(l);
                // corner: an optimal sequence will never have two adjacent bruteforce matches.
                // it is strictly better to have a single bruteforce match spanning the same region:
                // same contribution to the guess product with a lower length.
                // --> safe to skip those cases.
                if (last_m.pattern === "bruteforce") {
                  continue;
                }
                // try adding m to this length-l sequence.
                result5.push(update(m, i + 1));
              }
              return result5;
            })()
          );
        }
        return result4;
      })();
    };

    // helper: make bruteforce match objects spanning i to j, inclusive.
    var make_bruteforce_match = (i: number, j: number): IBruteForceMatch => {
      return {
        pattern: "bruteforce",
        token: password.slice(i, +j + 1 || undefined),
        i,
        j,
      };
    };

    // helper: step backwards through optimal.m starting at the end,
    // constructing the final optimal match sequence.
    const unwind = (n: number) => {
      const optimal_match_sequence: any[] = [];
      let k = n - 1;
      // find the final best sequence length and score
      let l = -1;
      let g = Infinity;
      for (let candidate_l in optimal.g[k]) {
        const candidate_g = optimal.g[k][candidate_l];
        if (candidate_g < g) {
          l = parseInt(candidate_l);
          g = candidate_g;
        }
      }

      while (k >= 0) {
        m = optimal.m[k][l];
        optimal_match_sequence.unshift(m);
        k = m.i - 1;
        l--;
      }
      return optimal_match_sequence;
    };

    for (
      k = 0, end4 = n, asc4 = 0 <= end4;
      asc4 ? k < end4 : k > end4;
      asc4 ? k++ : k--
    ) {
      for (m of Array.from(matches_by_j[k])) {
        if (m.i > 0) {
          for (let l in optimal.m[m.i - 1]) {
            const len = parseInt(l);
            update(m, len + 1);
          }
        } else {
          update(m, 1);
        }
      }
      bruteforce_update(k);
    }
    const optimal_match_sequence = unwind(n);
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
      guesses_log10: this.log10(guesses),
      sequence: optimal_match_sequence,
      score: 0,
    };
  },

  // ------------------------------------------------------------------------------
  // guess estimation -- one function per match pattern ---------------------------
  // ------------------------------------------------------------------------------

  estimate_guesses(match: IAnyMatch, password: string) {
    if (match.guesses != null) {
      return match.guesses;
    } // a match's guess estimate doesn't change. cache it.
    let min_guesses = 1;
    if (match.token.length < password.length) {
      min_guesses =
        match.token.length === 1
          ? MIN_SUBMATCH_GUESSES_SINGLE_CHAR
          : MIN_SUBMATCH_GUESSES_MULTI_CHAR;
    }
    const estimation_functions = {
      bruteforce: this.bruteforce_guesses,
      dictionary: this.dictionary_guesses,
      spatial: this.spatial_guesses,
      repeat: this.repeat_guesses,
      sequence: this.sequence_guesses,
      regex: this.regex_guesses,
      date: this.date_guesses,
    };

    let guesses: number;

    switch (match.pattern) {
      case "bruteforce":
        guesses = this.bruteforce_guesses(match);
        break;
      case "date":
        guesses = this.date_guesses(match);
        break;
      case "dictionary":
        guesses = this.dictionary_guesses(match);
        break;
      case "regex":
        guesses = this.regex_guesses(match);
        break;
      case "repeat":
        guesses = this.repeat_guesses(match);
        break;
      case "sequence":
        guesses = this.sequence_guesses(match);
        break;
      case "spatial":
        guesses = this.spatial_guesses(match);
        break;
    }

    match.guesses = Math.max(guesses, min_guesses);
    match.guesses_log10 = this.log10(match.guesses);
    return match.guesses;
  },

  bruteforce_guesses(match: IAnyMatch) {
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
  },

  repeat_guesses(match: IRepeatMatch) {
    return match.base_guesses * match.repeat_count;
  },

  sequence_guesses(match: ISequenceMatch) {
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
  },

  MIN_YEAR_SPACE: 20,
  REFERENCE_YEAR: new Date().getFullYear(),

  regex_guesses(match: IRegexMatch) {
    const char_class_bases: { [index: string]: number } = {
      alpha_lower: 26,
      alpha_upper: 26,
      alpha: 52,
      alphanumeric: 62,
      digits: 10,
      symbols: 33,
    };
    if (match.regex_name in char_class_bases) {
      return Math.pow(char_class_bases[match.regex_name], match.token.length);
    } else {
      switch (match.regex_name) {
        case "recent_year":
          // conservative estimate of year space: num years from REFERENCE_YEAR.
          // if year is close to REFERENCE_YEAR, estimate a year space of MIN_YEAR_SPACE.
          var year_space = Math.abs(
            parseInt(match.regex_match[0]) - this.REFERENCE_YEAR
          );
          year_space = Math.max(year_space, this.MIN_YEAR_SPACE);
          return year_space;
      }
    }
    return 0;
  },

  date_guesses(match: IDateMatch) {
    // base guesses: (year distance from REFERENCE_YEAR) * num_days * num_years
    const year_space = Math.max(
      Math.abs(match.year - this.REFERENCE_YEAR),
      this.MIN_YEAR_SPACE
    );
    let guesses = year_space * 365;
    // add factor of 4 for separator selection (one of ~4 choices)
    if (match.separator) {
      guesses *= 4;
    }
    return guesses;
  },

  KEYBOARD_AVERAGE_DEGREE: calc_average_degree(adjacency_graphs.qwerty),
  // slightly different for keypad/mac keypad, but close enough
  KEYPAD_AVERAGE_DEGREE: calc_average_degree(adjacency_graphs.keypad),

  KEYBOARD_STARTING_POSITIONS: (() => {
    const result: string[] = [];
    for (k in adjacency_graphs.qwerty) {
      v = adjacency_graphs.qwerty[k];
      result.push(k);
    }
    return result;
  })().length,
  KEYPAD_STARTING_POSITIONS: (() => {
    const result1: string[] = [];
    for (k in adjacency_graphs.keypad) {
      v = adjacency_graphs.keypad[k];
      result1.push(k);
    }
    return result1;
  })().length,

  spatial_guesses(match: ISpatialMatch) {
    let d, i, s;
    let asc, end;
    if (["qwerty", "dvorak"].includes(match.graph)) {
      s = this.KEYBOARD_STARTING_POSITIONS;
      d = this.KEYBOARD_AVERAGE_DEGREE;
    } else {
      s = this.KEYPAD_STARTING_POSITIONS;
      d = this.KEYPAD_AVERAGE_DEGREE;
    }
    let guesses = 0;
    const L = match.token.length;
    const t = match.turns;
    // estimate the number of possible patterns w/ length L or less with t turns or less.
    for (
      i = 2, end = L, asc = 2 <= end;
      asc ? i <= end : i >= end;
      asc ? i++ : i--
    ) {
      const possible_turns = Math.min(t, i - 1);
      for (
        let j = 1, end1 = possible_turns, asc1 = 1 <= end1;
        asc1 ? j <= end1 : j >= end1;
        asc1 ? j++ : j--
      ) {
        guesses += this.nCk(i - 1, j - 1) * s * Math.pow(d, j);
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
        let asc2, end2;
        let shifted_variations = 0;
        for (
          i = 1, end2 = Math.min(S, U), asc2 = 1 <= end2;
          asc2 ? i <= end2 : i >= end2;
          asc2 ? i++ : i--
        ) {
          shifted_variations += this.nCk(S + U, i);
        }
        guesses *= shifted_variations;
      }
    }
    return guesses;
  },

  dictionary_guesses(match: IDictionaryMatch) {
    match.base_guesses = match.rank; // keep these as properties for display purposes
    match.uppercase_variations = this.uppercase_variations(match);
    match.l33t_variations = this.l33t_variations(match);
    const reversed_variations = (match.reversed && 2) || 1;
    return (
      match.base_guesses *
      match.uppercase_variations *
      match.l33t_variations *
      reversed_variations
    );
  },

  START_UPPER: /^[A-Z][^A-Z]+$/,
  END_UPPER: /^[^A-Z]+[A-Z]$/,
  ALL_UPPER: /^[^a-z]+$/,
  ALL_LOWER: /^[^A-Z]+$/,

  uppercase_variations(match: { token: string }) {
    let chr;
    const word = match.token;
    if (word.match(this.ALL_LOWER) || word.toLowerCase() === word) {
      return 1;
    }
    // a capitalized word is the most common capitalization scheme,
    // so it only doubles the search space (uncapitalized + capitalized).
    // allcaps and end-capitalized are common enough too, underestimate as 2x factor to be safe.
    for (let regex of [this.START_UPPER, this.END_UPPER, this.ALL_UPPER]) {
      if (word.match(regex)) {
        return 2;
      }
    }
    // otherwise calculate the number of ways to capitalize U+L uppercase+lowercase letters
    // with U uppercase letters or less. or, if there's more uppercase than lower (for eg. PASSwORD),
    // the number of ways to lowercase U+L letters with L lowercase letters or less.
    const U = (() => {
      const result2: string[] = [];
      for (chr of Array.from(word.split(""))) {
        if (chr.match(/[A-Z]/)) {
          result2.push(chr);
        }
      }
      return result2;
    })().length;
    const L = (() => {
      const result3: string[] = [];
      for (chr of Array.from(word.split(""))) {
        if (chr.match(/[a-z]/)) {
          result3.push(chr);
        }
      }
      return result3;
    })().length;
    let variations = 0;
    for (
      let i = 1, end = Math.min(U, L), asc = 1 <= end;
      asc ? i <= end : i >= end;
      asc ? i++ : i--
    ) {
      variations += this.nCk(U + L, i);
    }
    return variations;
  },

  l33t_variations(match: IDictionaryMatch) {
    let chr;
    if (!match.l33t) {
      return 1;
    }
    let variations = 1;
    for (var subbed in match.sub) {
      // lower-case match.token before calculating: capitalization shouldn't affect l33t calc.
      var unsubbed = match.sub[subbed];
      var chrs = match.token.toLowerCase().split("");
      const S = (() => {
        const result2: string[] = [];
        for (chr of Array.from(chrs)) {
          if (chr === subbed) {
            result2.push(chr);
          }
        }
        return result2;
      })().length; // num of subbed chars
      const U = (() => {
        const result3: string[] = [];
        for (chr of Array.from(chrs)) {
          if (chr === unsubbed) {
            result3.push(chr);
          }
        }
        return result3;
      })().length; // num of unsubbed chars
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
        for (
          let i = 1, end = p, asc = 1 <= end;
          asc ? i <= end : i >= end;
          asc ? i++ : i--
        ) {
          possibilities += this.nCk(U + S, i);
        }
        variations *= possibilities;
      }
    }
    return variations;
  },
};

// utilities --------------------------------------------------------------------

export default scoring;
