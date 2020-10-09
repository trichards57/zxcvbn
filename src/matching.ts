/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let name;
import frequency_lists from "./frequency_lists";
import adjacency_graphs from "./adjacency_graphs";
import scoring from "./scoring";

export interface ISubstitution {
  [index: string]: string;
}

export interface IDictionary {
  [index: string]: number;
}

export interface IDictionaryList {
  [index: string]: IDictionary;
}

interface IRegexList {
  [index: string]: RegExp;
}

interface IDM {
  day: number;
  month: number;
}

interface IDMY extends IDM {
  day: number;
  month: number;
  year: number;
}

export interface INullableStringTableTable {
  [index: string]: INullableStringTable;
}

export interface INullableStringTable {
  [index: string]: (string | null)[];
}

export interface IStringTable {
  [index: string]: string[];
}

export interface IBoolTable {
  [index: string]: boolean;
}

export interface ISortable {
  i: number;
  j: number;
}

export interface IMatch extends ISortable {
  token: string;
  pattern:
    | "repeat"
    | "sequence"
    | "dictionary"
    | "regex"
    | "date"
    | "spatial"
    | "bruteforce";
  guesses?: number;
  guesses_log10?: number;
  [index: string]: unknown;
}

export interface IRepeatMatch extends IMatch {
  pattern: "repeat";
  base_token: string;
  base_guesses: number;
  base_matches: IMatch[];
  repeat_count: number;
}

export interface ISequenceMatch extends IMatch {
  pattern: "sequence";
  sequence_name: string;
  sequence_space: number;
  ascending: boolean;
}

export interface IDictionaryMatch extends IMatch {
  sub?: { [index: string]: string };
  sub_display?: string;
  pattern: "dictionary";
  matched_word: string;
  reversed: boolean;
  rank: number;
  dictionary_name: string;
  l33t: boolean;
  base_guesses?: number;
  uppercase_variations?: number;
  l33t_variations?: number;
}

export interface IRegexMatch extends IMatch {
  pattern: "regex";
  regex_name: string;
  regex_match: RegExpExecArray;
}

export interface IDateMatch extends IMatch {
  pattern: "date";
  separator: string;
  year: number;
  month: number;
  day: number;
  has_full_year?: boolean;
}

export interface ISpatialMatch extends IMatch {
  pattern: "spatial";
  graph: string;
  turns: number;
  base_token?: string;
  regex_name?: string;
  shifted_count: number;
}

export interface IBruteForceMatch extends IMatch {
  pattern: "bruteforce";
}

type IAnyMatch =
  | IRepeatMatch
  | IDictionaryMatch
  | ISpatialMatch
  | ISequenceMatch
  | IRegexMatch
  | IDateMatch
  | IBruteForceMatch;

export { IAnyMatch };

const build_ranked_dict = function (ordered_list: string[]) {
  const result: IDictionary = {};
  let i = 1; // rank starts at 1, not 0
  for (const word of Array.from(ordered_list)) {
    result[word] = i;
    i += 1;
  }
  return result;
};

const RANKED_DICTIONARIES: IDictionaryList = {};
for (name in frequency_lists) {
  const lst = frequency_lists[name];
  RANKED_DICTIONARIES[name] = build_ranked_dict(lst);
}

const GRAPHS = {
  qwerty: adjacency_graphs.qwerty,
  dvorak: adjacency_graphs.dvorak,
  keypad: adjacency_graphs.keypad,
  mac_keypad: adjacency_graphs.mac_keypad,
};

const L33T_TABLE = {
  a: ["4", "@"],
  b: ["8"],
  c: ["(", "{", "[", "<"],
  e: ["3"],
  g: ["6", "9"],
  i: ["1", "!", "|"],
  l: ["1", "|", "7"],
  o: ["0"],
  s: ["$", "5"],
  t: ["+", "7"],
  x: ["%"],
  z: ["2"],
};

const REGEXEN = { recent_year: /19\d\d|200\d|201\d/g };

const DATE_MAX_YEAR = 2050;
const DATE_MIN_YEAR = 1000;
const DATE_SPLITS: {
  [index: number]: number[][];
} = {
  4: [
    // for length-4 strings, eg 1191 or 9111, two ways to split:
    [1, 2], // 1 1 91 (2nd split starts at index 1, 3rd at index 2)
    [2, 3], // 91 1 1
  ],
  5: [
    [1, 3], // 1 11 91
    [2, 3], // 11 1 91
  ],
  6: [
    [1, 2], // 1 1 1991
    [2, 4], // 11 11 91
    [4, 5], // 1991 1 1
  ],
  7: [
    [1, 3], // 1 11 1991
    [2, 3], // 11 1 1991
    [4, 5], // 1991 1 11
    [4, 6], // 1991 11 1
  ],
  8: [
    [2, 4], // 11 11 1991
    [4, 6], // 1991 11 11
  ],
};

const matching = {
  empty(obj: Record<string, unknown> | unknown[]): boolean {
    return Object.keys(obj).length === 0;
  },
  translate(string: string, chr_map: ISubstitution): string {
    return string
      .split("")
      .map((chr: string) => chr_map[chr] || chr)
      .join("");
  },
  mod(n: number, m: number): number {
    return ((n % m) + m) % m;
  }, // mod impl that works for negative numbers
  sorted<T extends ISortable>(matches: T[]): T[] {
    // sort on i primary, j secondary
    return matches.sort((m1, m2) => m1.i - m2.i || m1.j - m2.j);
  },

  // ------------------------------------------------------------------------------
  // omnimatch -- combine everything ----------------------------------------------
  // ------------------------------------------------------------------------------

  omnimatch(password: string): IAnyMatch[] {
    let matches: IAnyMatch[] = [];
    const matchers: ((password: string) => IAnyMatch[])[] = [
      this.dictionary_match,
      this.reverse_dictionary_match,
      this.l33t_match,
      this.spatial_match,
      this.repeat_match,
      this.sequence_match,
      this.regex_match,
      this.date_match,
    ];
    for (const matcher of Array.from(matchers)) {
      matches = [...matches, ...matcher.call(this, password)];
    }
    return this.sorted(matches);
  },

  //-------------------------------------------------------------------------------
  // dictionary match (common passwords, english, last names, etc) ----------------
  //-------------------------------------------------------------------------------

  dictionary_match(
    password: string,
    _ranked_dictionaries: IDictionaryList | undefined = undefined
  ): IDictionaryMatch[] {
    // _ranked_dictionaries variable is for unit testing purposes
    if (_ranked_dictionaries == undefined) {
      _ranked_dictionaries = RANKED_DICTIONARIES;
    }
    const matches: IDictionaryMatch[] = [];
    const len = password.length;
    const password_lower = password.toLowerCase();
    for (const dictionary_name in _ranked_dictionaries) {
      const ranked_dict = _ranked_dictionaries[dictionary_name];
      for (
        let i = 0, end = len, asc = 0 <= end;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        for (
          let j = i, end1 = len, asc1 = i <= end1;
          asc1 ? j < end1 : j > end1;
          asc1 ? j++ : j--
        ) {
          if (password_lower.slice(i, +j + 1 || undefined) in ranked_dict) {
            const word = password_lower.slice(i, +j + 1 || undefined);
            const rank = ranked_dict[word];
            matches.push({
              pattern: "dictionary",
              i,
              j,
              token: password.slice(i, +j + 1 || undefined),
              matched_word: word,
              rank,
              dictionary_name,
              reversed: false,
              l33t: false,
            });
          }
        }
      }
    }
    return this.sorted(matches);
  },

  reverse_dictionary_match(
    password: string,
    _ranked_dictionaries?: IDictionaryList | undefined
  ): IDictionaryMatch[] {
    if (_ranked_dictionaries == null) {
      _ranked_dictionaries = RANKED_DICTIONARIES;
    }
    const reversed_password = password.split("").reverse().join("");
    const matches = this.dictionary_match(
      reversed_password,
      _ranked_dictionaries
    );
    for (const match of Array.from(matches)) {
      match.token = match.token.split("").reverse().join(""); // reverse back
      match.reversed = true;
      // map coordinates back to original string
      [match.i, match.j] = Array.from([
        password.length - 1 - match.j,
        password.length - 1 - match.i,
      ]);
    }
    return this.sorted(matches);
  },

  set_user_input_dictionary(ordered_list: string[]): IDictionary {
    return (RANKED_DICTIONARIES["user_inputs"] = build_ranked_dict(
      ordered_list.slice()
    ));
  },

  //-------------------------------------------------------------------------------
  // dictionary match with common l33t substitutions ------------------------------
  //-------------------------------------------------------------------------------

  // makes a pruned copy of l33t_table that only includes password's possible substitutions
  relevant_l33t_subtable(password: string, table: IStringTable): IStringTable {
    const password_chars: { [index: string]: boolean } = {};
    for (const chr of Array.from(password.split(""))) {
      password_chars[chr] = true;
    }
    const subtable: IStringTable = {};
    for (const letter in table) {
      const subs = table[letter];
      const relevant_subs = Array.from(subs).filter(
        (sub) => sub != null && sub in password_chars
      );
      if (relevant_subs.length > 0) {
        subtable[letter] = relevant_subs;
      }
    }
    return subtable;
  },

  // returns the list of possible 1337 replacement dictionaries for a given password
  enumerate_l33t_subs(table: IStringTable): ISubstitution[] {
    const keys = (() => {
      const result: string[] = [];
      for (const k in table) {
        result.push(k);
      }
      return result;
    })();
    let subs: [string, string][][] = [[]];

    const dedup = function (subs: [string, string][][]) {
      const deduped: [string, string][][] = [];
      const members: IBoolTable = {};
      for (const sub of Array.from(subs)) {
        const assoc = (() => {
          const result1: [[string, string], number][] = [];
          for (let v = 0; v < sub.length; v++) {
            const k = sub[v];
            result1.push([k, v]);
          }
          return result1;
        })();
        assoc.sort();
        const label = (() => {
          const result2: string[] = [];
          for (let v = 0; v < assoc.length; v++) {
            const k = assoc[v];
            result2.push(k + "," + v);
          }
          return result2;
        })().join("-");
        if (!(label in members)) {
          members[label] = true;
          deduped.push(sub);
        }
      }
      return deduped;
    };

    const helper = function (keys: string[]): void {
      if (!keys.length) {
        return;
      }
      const first_key = keys[0];
      const rest_keys = keys.slice(1);
      const next_subs: [string, string][][] = [];
      for (const l33t_chr of Array.from(table[first_key])) {
        for (const sub of Array.from(subs)) {
          let dup_l33t_index = -1;
          for (
            let i = 0, end = sub.length, asc = 0 <= end;
            asc ? i < end : i > end;
            asc ? i++ : i--
          ) {
            if (sub[i][0] === l33t_chr) {
              dup_l33t_index = i;
              break;
            }
          }
          if (dup_l33t_index === -1) {
            const sub_extension = sub.concat([[l33t_chr, first_key]]);
            next_subs.push(sub_extension);
          } else {
            const sub_alternative = sub.slice(0);
            sub_alternative.splice(dup_l33t_index, 1);
            sub_alternative.push([l33t_chr, first_key]);
            next_subs.push(sub);
            next_subs.push(sub_alternative);
          }
        }
      }
      subs = dedup(next_subs);
      return helper(rest_keys);
    };

    helper(keys);
    const sub_dicts: ISubstitution[] = []; // convert from assoc lists to dicts
    for (const sub of Array.from(subs)) {
      const sub_dict: ISubstitution = {};
      for (const [l33t_chr, chr] of Array.from(sub)) {
        sub_dict[l33t_chr] = chr;
      }
      sub_dicts.push(sub_dict);
    }
    return sub_dicts;
  },

  l33t_match(
    password: string,
    _ranked_dictionaries: IDictionaryList | undefined = undefined,
    _l33t_table: IStringTable | undefined = undefined
  ): IDictionaryMatch[] {
    let token;
    if (_ranked_dictionaries == undefined) {
      _ranked_dictionaries = RANKED_DICTIONARIES;
    }
    if (_l33t_table == undefined) {
      _l33t_table = L33T_TABLE;
    }
    const matches: IDictionaryMatch[] = [];
    for (const sub of Array.from(
      this.enumerate_l33t_subs(
        this.relevant_l33t_subtable(password, _l33t_table)
      )
    )) {
      if (this.empty(sub)) {
        break;
      } // corner case: password has no relevant subs.
      const subbed_password = this.translate(password, sub);
      for (const match of Array.from(
        this.dictionary_match(subbed_password, _ranked_dictionaries)
      )) {
        token = password.slice(match.i, +match.j + 1 || undefined);
        if (token.toLowerCase() === match.matched_word) {
          continue; // only return the matches that contain an actual substitution
        }
        const match_sub: ISubstitution = {}; // subset of mappings in sub that are in use for this match
        for (const subbed_chr in sub) {
          const chr = sub[subbed_chr];
          if (token.indexOf(subbed_chr) !== -1) {
            match_sub[subbed_chr] = chr;
          }
        }
        match.l33t = true;
        match.token = token;
        match.sub = match_sub;
        match.sub_display = (() => {
          const result: string[] = [];
          for (const k in match_sub) {
            const v = match_sub[k];
            result.push(`${k} -> ${v}`);
          }
          return result;
        })().join(", ");
        matches.push(match);
      }
    }
    return this.sorted(
      matches.filter(
        (
          match // filter single-character l33t matches to reduce noise.
        ) =>
          // otherwise '1' matches 'i', '4' matches 'a', both very common English words
          // with low dictionary rank.
          match.token.length > 1
      )
    );
  },

  // ------------------------------------------------------------------------------
  // spatial match (qwerty/dvorak/keypad) -----------------------------------------
  // ------------------------------------------------------------------------------

  spatial_match(
    password: string,
    _graphs?: INullableStringTableTable
  ): ISpatialMatch[] {
    if (_graphs == undefined) {
      _graphs = GRAPHS;
    }
    const matches: ISpatialMatch[] = [];
    for (const graph_name in _graphs) {
      const graph = _graphs[graph_name];
      for (const m of this.spatial_match_helper(password, graph, graph_name))
        matches.push(m);
    }
    return this.sorted(matches);
  },

  SHIFTED_RX: /[~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?]/,
  spatial_match_helper(
    password: string,
    graph: INullableStringTable,
    graph_name: string
  ): ISpatialMatch[] {
    const matches: ISpatialMatch[] = [];
    let i = 0;
    while (i < password.length - 1) {
      let shifted_count: number;
      let j = i + 1;
      let last_direction: number | null = null;
      let turns = 0;
      if (
        ["qwerty", "dvorak"].includes(graph_name) &&
        this.SHIFTED_RX.exec(password.charAt(i))
      ) {
        // initial character is shifted
        shifted_count = 1;
      } else {
        shifted_count = 0;
      }
      for (;;) {
        const prev_char = password.charAt(j - 1);
        let found = false;
        let found_direction = -1;
        let cur_direction = -1;
        const adjacents = graph[prev_char] || [];
        // consider growing pattern by one character if j hasn't gone over the edge.
        if (j < password.length) {
          const cur_char = password.charAt(j);
          for (const adj of Array.from(adjacents)) {
            cur_direction += 1;
            if (adj && adj.indexOf(cur_char) !== -1) {
              found = true;
              found_direction = cur_direction;
              if (adj.indexOf(cur_char) === 1) {
                // index 1 in the adjacency means the key is shifted,
                // 0 means unshifted: A vs a, % vs 5, etc.
                // for example, 'q' is adjacent to the entry '2@'.
                // @ is shifted w/ index 1, 2 is unshifted.
                shifted_count += 1;
              }
              if (last_direction !== found_direction) {
                // adding a turn is correct even in the initial case when last_direction is null:
                // every spatial pattern starts with a turn.
                turns += 1;
                last_direction = found_direction;
              }
              break;
            }
          }
        }
        // if the current pattern continued, extend j and try to grow again
        if (found) {
          j += 1;
          // otherwise push the pattern discovered so far, if any...
        } else {
          if (j - i > 2) {
            // don't consider length 1 or 2 chains.
            matches.push({
              pattern: "spatial",
              i,
              j: j - 1,
              token: password.slice(i, j),
              graph: graph_name,
              turns,
              shifted_count,
            });
          }
          // ...and then start a new search for the rest of the password.
          i = j;
          break;
        }
      }
    }
    return matches;
  },

  //-------------------------------------------------------------------------------
  // repeats (aaa, abcabcabc) and sequences (abcdef) ------------------------------
  //-------------------------------------------------------------------------------

  repeat_match(password: string): IRepeatMatch[] {
    const matches: IRepeatMatch[] = [];
    const greedy = /(.+)\1+/g;
    const lazy = /(.+?)\1+/g;
    const lazy_anchored = /^(.+?)\1+$/;
    let lastIndex = 0;
    while (lastIndex < password.length) {
      let base_token: string;
      let match: RegExpExecArray;
      greedy.lastIndex = lazy.lastIndex = lastIndex;
      const greedy_match = greedy.exec(password);
      const lazy_match = lazy.exec(password);
      if (greedy_match == null || lazy_match == null) {
        break;
      }
      if (greedy_match[0].length > lazy_match[0].length) {
        // greedy beats lazy for 'aabaab'
        //   greedy: [aabaab, aab]
        //   lazy:   [aa,     a]
        match = greedy_match;
        // greedy's repeated string might itself be repeated, eg.
        // aabaab in aabaabaabaab.
        // run an anchored lazy match on greedy's repeated string
        // to find the shortest repeated string
        const anchored = lazy_anchored.exec(match[0]);
        base_token = anchored ? anchored[1] : "";
      } else {
        // lazy beats greedy for 'aaaaa'
        //   greedy: [aaaa,  aa]
        //   lazy:   [aaaaa, a]
        match = lazy_match;
        base_token = match[1];
      }
      const [i, j] = Array.from([
        match.index,
        match.index + match[0].length - 1,
      ]);
      // recursively match and score the base string
      const base_analysis = scoring.most_guessable_match_sequence(
        base_token,
        this.omnimatch(base_token)
      );
      const base_matches = base_analysis.sequence;
      const base_guesses = base_analysis.guesses;
      matches.push({
        pattern: "repeat",
        i,
        j,
        token: match[0],
        base_token,
        base_guesses,
        base_matches,
        repeat_count: match[0].length / base_token.length,
      });
      lastIndex = j + 1;
    }
    return matches;
  },

  MAX_DELTA: 5,
  sequence_match(password: string): ISequenceMatch[] {
    // Identifies sequences by looking for repeated differences in unicode codepoint.
    // this allows skipping, such as 9753, and also matches some extended unicode sequences
    // such as Greek and Cyrillic alphabets.
    //
    // for example, consider the input 'abcdb975zy'
    //
    // password: a   b   c   d   b    9   7   5   z   y
    // index:    0   1   2   3   4    5   6   7   8   9
    // delta:      1   1   1  -2  -41  -2  -2  69   1
    //
    // expected result:
    // [(i, j, delta), ...] = [(0, 3, 1), (5, 7, -2), (8, 9, 1)]

    if (password.length === 1) {
      return [];
    }

    const update = (i: number, j: number, delta: number) => {
      if (j - i > 1 || Math.abs(delta) === 1) {
        let middle;
        if (0 < (middle = Math.abs(delta)) && middle <= this.MAX_DELTA) {
          let sequence_name, sequence_space;
          const token = password.slice(i, +j + 1 || undefined);
          if (/^[a-z]+$/.test(token)) {
            sequence_name = "lower";
            sequence_space = 26;
          } else if (/^[A-Z]+$/.test(token)) {
            sequence_name = "upper";
            sequence_space = 26;
          } else if (/^\d+$/.test(token)) {
            sequence_name = "digits";
            sequence_space = 10;
          } else {
            // conservatively stick with roman alphabet size.
            // (this could be improved)
            sequence_name = "unicode";
            sequence_space = 26;
          }
          return result.push({
            pattern: "sequence",
            i,
            j,
            token: password.slice(i, +j + 1 || undefined),
            sequence_name,
            sequence_space,
            ascending: delta > 0,
          });
        }
      }
    };

    const result: ISequenceMatch[] = [];
    let i = 0;
    let last_delta: null | number = null;

    for (
      let k = 1, end = password.length, asc = 1 <= end;
      asc ? k < end : k > end;
      asc ? k++ : k--
    ) {
      const delta = password.charCodeAt(k) - password.charCodeAt(k - 1);
      if (last_delta == null) {
        last_delta = delta;
      }
      if (delta === last_delta) {
        continue;
      }
      const j = k - 1;
      update(i, j, last_delta);
      i = j;
      last_delta = delta;
    }
    update(i, password.length - 1, last_delta || 0);
    return result;
  },

  //-------------------------------------------------------------------------------
  // regex matching ---------------------------------------------------------------
  //-------------------------------------------------------------------------------

  regex_match(
    password: string,
    _regexen?: IRegexList | undefined
  ): IRegexMatch[] {
    if (_regexen == undefined) {
      _regexen = REGEXEN;
    }
    const matches: IRegexMatch[] = [];
    for (name in _regexen) {
      let rx_match: RegExpExecArray | null;
      const regex = _regexen[name];
      regex.lastIndex = 0; // keeps regex_match stateless
      while ((rx_match = regex.exec(password))) {
        const token = rx_match[0];
        matches.push({
          pattern: "regex",
          token,
          i: rx_match.index,
          j: rx_match.index + rx_match[0].length - 1,
          regex_name: name,
          regex_match: rx_match,
        });
      }
    }
    return this.sorted(matches);
  },

  //-------------------------------------------------------------------------------
  // date matching ----------------------------------------------------------------
  //-------------------------------------------------------------------------------

  date_match(password: string): IDateMatch[] {
    // a "date" is recognized as:
    //   any 3-tuple that starts or ends with a 2- or 4-digit year,
    //   with 2 or 0 separator chars (1.1.91 or 1191),
    //   maybe zero-padded (01-01-91 vs 1-1-91),
    //   a month between 1 and 12,
    //   a day between 1 and 31.
    //
    // note: this isn't true date parsing in that "feb 31st" is allowed,
    // this doesn't check for leap years, etc.
    //
    // recipe:
    // start with regex to find maybe-dates, then attempt to map the integers
    // onto month-day-year to filter the maybe-dates into dates.
    // finally, remove matches that are substrings of other matches to reduce noise.
    //
    // note: instead of using a lazy or greedy regex to find many dates over the full string,
    // this uses a ^...$ regex against every substring of the password -- less performant but leads
    // to every possible date match.
    let dmy: IDMY | undefined, i, j, token: string;
    let asc, end;
    let asc2, end2;
    const matches: IDateMatch[] = [];
    const maybe_date_no_separator = /^\d{4,8}$/;
    const maybe_date_with_separator = new RegExp(`\
^\
(\\d{1,4})\
([\\s/\\\\_.-])\
(\\d{1,2})\
\\2\
(\\d{1,4})\
$\
`);

    // dates without separators are between length 4 '1191' and 8 '11111991'
    for (
      i = 0, end = password.length - 4, asc = 0 <= end;
      asc ? i <= end : i >= end;
      asc ? i++ : i--
    ) {
      let asc1, end1, start;
      for (
        start = i + 3, j = start, end1 = i + 7, asc1 = start <= end1;
        asc1 ? j <= end1 : j >= end1;
        asc1 ? j++ : j--
      ) {
        if (j >= password.length) {
          break;
        }
        token = password.slice(i, +j + 1 || undefined);
        if (!maybe_date_no_separator.exec(token)) {
          continue;
        }
        const candidates: IDMY[] = [];
        for (const [k, l] of DATE_SPLITS[token.length] as number[][]) {
          dmy = this.map_ints_to_dmy([
            parseInt(token.slice(0, k)),
            parseInt(token.slice(k, l)),
            parseInt(token.slice(l)),
          ]);
          if (dmy != undefined) {
            candidates.push(dmy);
          }
        }
        if (!(candidates.length > 0)) {
          continue;
        }
        // at this point: different possible dmy mappings for the same i,j substring.
        // match the candidate date that likely takes the fewest guesses: a year closest to 2000.
        // (scoring.REFERENCE_YEAR).
        //
        // ie, considering '111504', prefer 11-15-04 to 1-1-1504
        // (interpreting '04' as 2004)
        let best_candidate = candidates[0];
        const metric = (candidate: IDMY) =>
          Math.abs(candidate.year - scoring.REFERENCE_YEAR);
        let min_distance = metric(candidates[0]);
        for (const candidate of Array.from(candidates.slice(1))) {
          const distance = metric(candidate);
          if (distance < min_distance) {
            [best_candidate, min_distance] = Array.from([
              candidate,
              distance,
            ]) as [IDMY, number];
          }
        }
        matches.push({
          pattern: "date",
          token,
          i,
          j,
          separator: "",
          year: best_candidate.year,
          month: best_candidate.month,
          day: best_candidate.day,
        });
      }
    }

    // dates with separators are between length 6 '1/1/91' and 10 '11/11/1991'
    for (
      i = 0, end2 = password.length - 6, asc2 = 0 <= end2;
      asc2 ? i <= end2 : i >= end2;
      asc2 ? i++ : i--
    ) {
      let asc3, end3, start1;
      for (
        start1 = i + 5, j = start1, end3 = i + 9, asc3 = start1 <= end3;
        asc3 ? j <= end3 : j >= end3;
        asc3 ? j++ : j--
      ) {
        if (j >= password.length) {
          break;
        }
        token = password.slice(i, +j + 1 || undefined);
        const rx_match = maybe_date_with_separator.exec(token);
        if (rx_match == null) {
          continue;
        }
        dmy = this.map_ints_to_dmy([
          parseInt(rx_match[1]),
          parseInt(rx_match[3]),
          parseInt(rx_match[4]),
        ]);
        if (dmy == null) {
          continue;
        }
        matches.push({
          pattern: "date",
          token,
          i,
          j,
          separator: rx_match[2],
          year: dmy.year,
          month: dmy.month,
          day: dmy.day,
        });
      }
    }

    // matches now contains all valid date strings in a way that is tricky to capture
    // with regexes only. while thorough, it will contain some unintuitive noise:
    //
    // '2015_06_04', in addition to matching 2015_06_04, will also contain
    // 5(!) other date matches: 15_06_04, 5_06_04, ..., even 2015 (matched as 5/1/2020)
    //
    // to reduce noise, remove date matches that are strict substrings of others
    return this.sorted(
      matches.filter(function (match) {
        let is_submatch = false;
        for (const other_match of Array.from(matches)) {
          if (match === other_match) {
            continue;
          }
          if (other_match.i <= match.i && other_match.j >= match.j) {
            is_submatch = true;
            break;
          }
        }
        return !is_submatch;
      })
    );
  },

  map_ints_to_dmy(ints: number[]): IDMY | undefined {
    // given a 3-tuple, discard if:
    //   middle int is over 31 (for all dmy formats, years are never allowed in the middle)
    //   middle int is zero
    //   any int is over the max allowable year
    //   any int is over two digits but under the min allowable year
    //   2 ints are over 31, the max allowable day
    //   2 ints are zero
    //   all ints are over 12, the max allowable month
    let dm, rest, y;
    if (ints[1] > 31 || ints[1] <= 0) {
      return;
    }
    let over_12 = 0;
    let over_31 = 0;
    let under_1 = 0;
    for (const int of Array.from(ints)) {
      if ((99 < int && int < DATE_MIN_YEAR) || int > DATE_MAX_YEAR) {
        return;
      }
      if (int > 31) {
        over_31 += 1;
      }
      if (int > 12) {
        over_12 += 1;
      }
      if (int <= 0) {
        under_1 += 1;
      }
    }
    if (over_31 >= 2 || over_12 === 3 || under_1 >= 2) {
      return;
    }

    // first look for a four digit year: yyyy + daymonth or daymonth + yyyy
    const possible_year_splits = [
      [ints[2], ints.slice(0, 2)], // year last
      [ints[0], ints.slice(1, 3)], // year first
    ] as [number, number[]][];
    for ([y, rest] of Array.from(possible_year_splits)) {
      if (DATE_MIN_YEAR <= y && y <= DATE_MAX_YEAR) {
        dm = this.map_ints_to_dm(rest);
        if (dm != null) {
          return {
            year: y,
            month: dm.month,
            day: dm.day,
          };
        } else {
          // for a candidate that includes a four-digit year,
          // when the remaining ints don't match to a day and month,
          // it is not a date.
          return;
        }
      }
    }

    // given no four-digit year, two digit years are the most flexible int to match, so
    // try to parse a day-month out of ints[0..1] or ints[1..0]
    for ([y, rest] of Array.from(possible_year_splits)) {
      dm = this.map_ints_to_dm(rest);
      if (dm != null) {
        y = this.two_to_four_digit_year(y);
        return {
          year: y,
          month: dm.month,
          day: dm.day,
        };
      }
    }
  },

  map_ints_to_dm(ints: number[]): IDM | undefined {
    for (const [d, m] of [ints, ints.slice().reverse()]) {
      if (1 <= d && d <= 31 && 1 <= m && m <= 12) {
        return {
          day: d,
          month: m,
        };
      }
    }
  },

  two_to_four_digit_year(year: number): number {
    if (year > 99) {
      return year;
    } else if (year > 50) {
      // 87 -> 1987
      return year + 1900;
    } else {
      // 15 -> 2015
      return year + 2000;
    }
  },
};

export default matching;
