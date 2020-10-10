import frequency_lists from "../frequency_lists";
//-------------------------------------------------------------------------------
// dictionary match (common passwords, english, last names, etc) ----------------
//-------------------------------------------------------------------------------

import { empty, IMatch, sorted, translate } from "./support";

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

const RANKED_DICTIONARIES: Record<string, Record<string, number>> = {};

function build_ranked_dictionary(ordered_list: string[]) {
  const result: Record<string, number> = {};
  let i = 1; // rank starts at 1, not 0
  for (const word of ordered_list) {
    result[word] = i;
    i += 1;
  }
  return result;
}

for (const name in frequency_lists) {
  const lst = frequency_lists[name];
  RANKED_DICTIONARIES[name] = build_ranked_dictionary(lst);
}

/**
 * Attempts to match a string with a ranked dictionary of words.
 *
 * @param password - The string to examine
 * @param _ranked_dictionaries - For unit testing only: allows overriding the available dictionaries
 */
export function dictionary_match(
  password: string,
  _ranked_dictionaries = RANKED_DICTIONARIES
): IDictionaryMatch[] {
  const matches: IDictionaryMatch[] = [];
  const password_lower = password.toLowerCase();
  for (const dictionary_name in _ranked_dictionaries) {
    const ranked_dictionary = _ranked_dictionaries[dictionary_name];
    for (let i = 0; i < password.length; i++) {
      for (let j = i; j < password.length; j++) {
        if (password_lower.slice(i, j + 1) in ranked_dictionary) {
          const word = password_lower.slice(i, j + 1);
          const rank = ranked_dictionary[word];
          matches.push({
            pattern: "dictionary",
            i,
            j,
            token: password.slice(i, j + 1),
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
  return sorted(matches);
}

/**
 * Attempts to match a string with a ranked dictionary of words after it is reversed.
 *
 * @param password - The string to examine
 * @param _ranked_dictionaries - For unit testing only: allows overriding the available dictionaries
 */
export function reverse_dictionary_match(
  password: string,
  _ranked_dictionaries = RANKED_DICTIONARIES
): IDictionaryMatch[] {
  const reversed_password = password.split("").reverse().join("");
  return dictionary_match(reversed_password, _ranked_dictionaries)
    .map((m) => {
      const newM = { ...m };
      newM.i = password.length - 1 - m.j;
      newM.j = password.length - 1 - m.i;
      newM.token = m.token.split("").reverse().join(""); // reverse back
      newM.reversed = true;
      return newM;
    })
    .sort((m1, m2) => m1.i - m2.i || m1.j - m2.j);
}

/**
 * Adds a user provided dictionary as a user_inputs dictionary.
 * @param ordered_list The list to add as a dictionary.
 */
export function set_user_input_dictionary(ordered_list: string[]): void {
  RANKED_DICTIONARIES["user_inputs"] = build_ranked_dictionary([
    ...ordered_list,
  ]);
}

/**
 * Prunes a copy of a l33t_table to only include the substitutions of interest.
 * @param password The password to consider
 * @param table The table to prune.
 */
export function relevant_l33t_subtable(
  password: string,
  table: Record<string, string[]>
): Record<string, string[]> {
  const password_chars = new Set(password.split(""));
  const subtable: Record<string, string[]> = {};

  for (const letter in table) {
    const relevant_subs = table[letter].filter((sub) =>
      password_chars.has(sub)
    );
    if (relevant_subs.length > 0) {
      subtable[letter] = relevant_subs;
    }
  }
  return subtable;
}

function dedup(subs: [string, string][][]) {
  const deduped: [string, string][][] = [];
  const members = new Set<string>();
  for (const sub of subs) {
    const label = sub
      .map((k, v) => [k, v] as [[string, string], number])
      .sort()
      .map((k, v) => k + "," + v)
      .join("-");
    if (!members.has(label)) {
      members.add(label);
      deduped.push(sub);
    }
  }
  return deduped;
}

function helper(
  keys: string[],
  table: Record<string, string[]>,
  subs: [string, string][][] = [[]]
): [string, string][][] {
  if (!keys.length) return subs;

  const [first_key, ...rest_keys] = keys;
  const next_subs: [string, string][][] = [];
  for (const l33t_chr of table[first_key]) {
    for (const sub of subs) {
      const dup_l33t_index = sub.findIndex((s) => s[0] === l33t_chr);

      if (dup_l33t_index !== -1) next_subs.push(sub);
      next_subs.push([...sub, [l33t_chr, first_key]]);
    }
  }

  subs = dedup(next_subs);
  return helper(rest_keys, table, subs);
}

/**
 * Returns the list of possible l33t replacement dictionaries for a given password.
 * @param table The table to create l33t substitutions for.
 */
export function enumerate_l33t_subs(
  table: Record<string, string[]>
): Record<string, string>[] {
  return helper(Object.keys(table), table).map((s) => {
    const sub_dictionary: Record<string, string> = {};
    for (const [l33t_chr, chr] of s) {
      sub_dictionary[l33t_chr] = chr;
    }
    return sub_dictionary;
  });
}

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

//-------------------------------------------------------------------------------
// dictionary match with common l33t substitutions ------------------------------
//-------------------------------------------------------------------------------
export function l33t_match(
  password: string,
  _ranked_dictionaries = RANKED_DICTIONARIES,
  _l33t_table: Record<string, string[]> = L33T_TABLE
): IDictionaryMatch[] {
  const matches: IDictionaryMatch[] = [];
  for (const sub of enumerate_l33t_subs(
    relevant_l33t_subtable(password, _l33t_table)
  )) {
    if (empty(sub)) {
      break; // corner case: password has no relevant subs.
    }
    const subbed_password = translate(password, sub);
    for (const match of dictionary_match(
      subbed_password,
      _ranked_dictionaries
    )) {
      const token = password.slice(match.i, match.j + 1);
      if (token.toLowerCase() === match.matched_word) {
        continue; // only return the matches that contain an actual substitution
      }
      const match_sub: Record<string, string> = {}; // subset of mappings in sub that are in use for this match
      for (const subbed_chr in sub) {
        const chr = sub[subbed_chr];
        if (token.indexOf(subbed_chr) !== -1) {
          match_sub[subbed_chr] = chr;
        }
      }
      match.l33t = true;
      match.token = token;
      match.sub = match_sub;
      match.sub_display = Object.keys(match_sub)
        .map((k) => `${k} -> ${match_sub[k]}`)
        .join(", ");
      matches.push(match);
    }
  }
  return sorted(
    matches.filter(
      (
        match // filter single-character l33t matches to reduce noise.
      ) =>
        // otherwise '1' matches 'i', '4' matches 'a', both very common English words
        // with low dictionary rank.
        match.token.length > 1
    )
  );
}
