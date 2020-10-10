import { omnimatch } from "../matching";
import { most_guessable_match_sequence } from "../scoring";
import { IMatch } from "./support";

export interface IRepeatMatch extends IMatch {
  pattern: "repeat";
  base_token: string;
  base_guesses: number;
  base_matches: IMatch[];
  repeat_count: number;
}

//-------------------------------------------------------------------------------
// repeats (aaa, abcabcabc) and sequences (abcdef) ------------------------------
//-------------------------------------------------------------------------------
export function repeat_match(password: string): IRepeatMatch[] {
  const matches: IRepeatMatch[] = [];
  const greedy = /(.+)\1+/g;
  const lazy = /(.+?)\1+/g;
  const lazy_anchored = /^(.+?)\1+$/;
  let lastIndex = 0;
  while (lastIndex < password.length) {
    let base_token: string;
    let match: RegExpExecArray;
    greedy.lastIndex = lastIndex;
    lazy.lastIndex = lastIndex;
    const greedy_match = greedy.exec(password);
    const lazy_match = lazy.exec(password);
    if (!greedy_match || !lazy_match) {
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
    const i = match.index;
    const j = match.index + match[0].length - 1;
    // recursively match and score the base string
    const base_analysis = most_guessable_match_sequence(
      base_token,
      omnimatch(base_token)
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
}
