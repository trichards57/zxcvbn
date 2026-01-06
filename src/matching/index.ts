import { date_match, type IDateMatch } from "./date_match";
import {
  dictionary_match,
  type IDictionaryMatch,
  l33t_match,
  reverse_dictionary_match,
} from "./dictionary_match";
import { type IRegexMatch, regex_match } from "./regex_match";
import { type IRepeatMatch, repeat_match } from "./repeat_match";
import { type ISequenceMatch, sequence_match } from "./sequence_match";
import { type ISpatialMatch, spatial_match } from "./spatial_match";
import { type IMatch, sorted } from "./support";

export interface IBruteForceMatch extends IMatch {
  pattern: "bruteforce";
}

export type IAnyMatch =
  | IRepeatMatch
  | IDictionaryMatch
  | ISpatialMatch
  | ISequenceMatch
  | IRegexMatch
  | IDateMatch
  | IBruteForceMatch;

// ------------------------------------------------------------------------------
// omnimatch -- combine everything ----------------------------------------------
// ------------------------------------------------------------------------------

export function omnimatch(password: string): IAnyMatch[] {
  let matches: IAnyMatch[] = [];
  const matchers: ((password: string) => IAnyMatch[])[] = [
    dictionary_match,
    reverse_dictionary_match,
    l33t_match,
    spatial_match,
    repeat_match,
    sequence_match,
    regex_match,
    date_match,
  ];
  for (const matcher of matchers) {
    matches = [...matches, ...matcher(password)];
  }
  return sorted(matches);
}
