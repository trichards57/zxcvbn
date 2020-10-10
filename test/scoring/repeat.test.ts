import { omnimatch } from "../../src/matching";
import { IRepeatMatch } from "../../src/matching/repeat_match";
import {
  estimate_guesses,
  most_guessable_match_sequence,
} from "../../src/scoring";
import { repeat_guesses } from "../../src/scoring/repeat_guesses";

describe("scoring", () => {
  describe("repeat_guesses", () => {
    it("calculates the right number of guesses", () => {
      for (const [token, base_token, repeat_count] of [
        ["aa", "a", 2],
        ["999", "9", 3],
        ["$$$$", "$", 4],
        ["abab", "ab", 2],
        ["batterystaplebatterystaplebatterystaple", "batterystaple", 3],
      ] as [string, string, number][]) {
        const base_guesses = most_guessable_match_sequence(
          base_token,
          omnimatch(base_token)
        ).guesses;
        const match: IRepeatMatch = {
          token,
          base_token,
          base_guesses,
          repeat_count,
          pattern: "repeat",
          base_matches: [],
          i: 1,
          j: 2,
        };
        const expected = base_guesses * repeat_count;

        const actual = repeat_guesses(match);
        expect(actual).toBe(expected);
      }
    });

    it("is delegated to by estimate_guesses", () => {
      const token = "aa";
      const baseToken = "a";
      const repeat_count = 2;
      const base_guesses = most_guessable_match_sequence(
        baseToken,
        omnimatch(baseToken)
      ).guesses;
      const match: IRepeatMatch = {
        token,
        base_token: baseToken,
        base_guesses,
        repeat_count,
        pattern: "repeat",
        base_matches: [],
        i: 1,
        j: 2,
      };

      const expected = repeat_guesses(match);
      const actual = estimate_guesses(match, token);
      expect(actual).toBe(expected);
    });
  });
});
