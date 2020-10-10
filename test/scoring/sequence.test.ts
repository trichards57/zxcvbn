import { ISequenceMatch } from "../../src/matching/sequence_match";
import { estimate_guesses } from "../../src/scoring";
import { sequence_guesses } from "../../src/scoring/sequence_guesses";

describe("scoring", () => {
  describe("sequence_guesses", () => {
    it("calculates the right number of guesses", () => {
      for (const [token, ascending, expected] of [
        ["ab", true, 4 * 2], // obvious start * len-2
        ["XYZ", true, 26 * 3], // base26 * len-3
        ["4567", true, 10 * 4], // base10 * len-4
        ["7654", false, 10 * 4 * 2], // base10 * len 4 * descending
        ["ZYX", false, 4 * 3 * 2], // obvious start * len-3 * descending
      ] as [string, boolean, number][]) {
        const match: ISequenceMatch = {
          token,
          ascending,
          pattern: "sequence",
          i: 1,
          j: 2,
          sequence_name: "abc",
          sequence_space: 1,
        };

        const actual = sequence_guesses(match);
        expect(actual).toBe(expected);
      }
    });

    it("is delegated to by estimate_guesses", () => {
      const token = "ab";
      const ascending = true;
      const expected = 8;
      const match: ISequenceMatch = {
        token,
        ascending,
        pattern: "sequence",
        i: 1,
        j: 2,
        sequence_name: "abc",
        sequence_space: 1,
      };

      const actual = estimate_guesses(match, token);
      expect(actual).toBe(expected);
    });
  });
});
