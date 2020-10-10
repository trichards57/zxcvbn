import { IMatch, sorted } from "./support";
import {
  dictionary_match,
  IDictionaryMatch,
  l33t_match,
  reverse_dictionary_match,
} from "./dictionary_match";
import { ISpatialMatch, spatial_match } from "./spatial_match";
import { IRepeatMatch, repeat_match } from "./repeat_match";
import { ISequenceMatch, sequence_match } from "./sequence_match";
import { IRegexMatch, regex_match } from "./regex_match";
import { date_match, IDateMatch } from "./date_match";

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
