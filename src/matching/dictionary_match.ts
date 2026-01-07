import frequency_lists from "../frequency_lists";
import {
  build_ranked_dictionary,
  dictionary_match as dictionary_match_core,
  type IDictionaryMatch,
  l33t_match as l33t_match_core,
  reverse_dictionary_match as reverse_dictionary_match_core,
} from "./dictionary_match_core";

const RANKED_DICTIONARIES: Record<string, Record<string, number>> = {};

for (const name in frequency_lists) {
  const lst = frequency_lists[name];
  RANKED_DICTIONARIES[name] = build_ranked_dictionary(lst);
}

export function dictionary_match(password: string): IDictionaryMatch[] {
  return dictionary_match_core(password, RANKED_DICTIONARIES);
}

export function reverse_dictionary_match(password: string): IDictionaryMatch[] {
  return reverse_dictionary_match_core(password, RANKED_DICTIONARIES);
}

export function set_user_input_dictionary(ordered_list: string[]): void {
  RANKED_DICTIONARIES.user_inputs = build_ranked_dictionary([...ordered_list]);
}

export function l33t_match(password: string): IDictionaryMatch[] {
  return l33t_match_core(password, RANKED_DICTIONARIES);
}

export type { IDictionaryMatch } from "./dictionary_match_core";
