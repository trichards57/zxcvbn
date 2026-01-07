import {
  build_ranked_dictionary,
  dictionary_match as dictionary_match_core,
  type IDictionaryMatch,
  l33t_match as l33t_match_core,
  reverse_dictionary_match as reverse_dictionary_match_core,
} from "./dictionary_match_core";

const RANKED_DICTIONARIES: Record<string, Record<string, number>> = {};
let has_init = false;

async function init() {
  const { default: frequency_lists } = await import("../frequency_lists");
  for (const name in frequency_lists) {
    const lst = frequency_lists[name];
    RANKED_DICTIONARIES[name] = build_ranked_dictionary(lst);
  }

  has_init = true;
}

export async function dictionary_match(
  password: string
): Promise<IDictionaryMatch[]> {
  if (!has_init) {
    await init();
  }
  return dictionary_match_core(password, RANKED_DICTIONARIES);
}

export async function reverse_dictionary_match(
  password: string
): Promise<IDictionaryMatch[]> {
  if (!has_init) {
    await init();
  }
  return reverse_dictionary_match_core(password, RANKED_DICTIONARIES);
}

export async function set_user_input_dictionary(
  ordered_list: string[]
): Promise<void> {
  if (!has_init) {
    await init();
  }
  RANKED_DICTIONARIES.user_inputs = build_ranked_dictionary([...ordered_list]);
}

export async function l33t_match(
  password: string
): Promise<IDictionaryMatch[]> {
  if (!has_init) {
    await init();
  }
  return l33t_match_core(password, RANKED_DICTIONARIES);
}

export type { IDictionaryMatch } from "./dictionary_match_core";
