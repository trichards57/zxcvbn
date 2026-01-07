import { date_match, type IDateMatch } from "./date_match";
import type { IDictionaryMatch } from "./dictionary_match";
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

export async function omnimatch(password: string): Promise<IAnyMatch[]> {
  let matches: IAnyMatch[] = [];
  const { dictionary_match, reverse_dictionary_match, l33t_match } =
    await import("./dictionary_match_async");
  const matchers: ((password: string) => Promise<IAnyMatch[]>)[] = [
    dictionary_match,
    reverse_dictionary_match,
    l33t_match,
    (p) => Promise.resolve(spatial_match(p)),
    (p) => Promise.resolve(repeat_match(p)),
    (p) => Promise.resolve(sequence_match(p)),
    (p) => Promise.resolve(regex_match(p)),
    (p) => Promise.resolve(date_match(p)),
  ];
  for (const matcher of matchers) {
    matches = [...matches, ...(await matcher(password))];
  }
  return sorted(matches);
}
