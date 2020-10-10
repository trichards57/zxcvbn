import { ISpatialMatch } from "../../src/matching/spatial_match";
import { estimate_guesses } from "../../src/scoring";
import {
  KEYBOARD_AVERAGE_DEGREE,
  KEYBOARD_STARTING_POSITIONS,
  spatial_guesses,
} from "../../src/scoring/spatial_guesses";
import { nCk } from "../../src/scoring/support";

describe("scoring", () => {
  describe("spatial_guesses", () => {
    it("guesses starts * degree * (len-1) when there are no turns or shifts", () => {
      const match: ISpatialMatch = {
        token: "zxcvbn",
        graph: "qwerty",
        turns: 1,
        shifted_count: 0,
        pattern: "spatial",
        i: 1,
        j: 2,
      };

      const expected =
        KEYBOARD_STARTING_POSITIONS *
        KEYBOARD_AVERAGE_DEGREE *
        (match.token.length - 1);
      // -1 term because: not counting spatial patterns of length 1, eg for length==6, multiplier is 5 for needing to try len2,len3,..,len6

      const actual = spatial_guesses(match);

      expect(actual).toBe(expected);
    });

    it("is delegated to by estimate_guesses", () => {
      const match: ISpatialMatch = {
        token: "zxcvbn",
        graph: "qwerty",
        turns: 1,
        shifted_count: 0,
        pattern: "spatial",
        i: 1,
        j: 2,
      };

      const expected =
        KEYBOARD_STARTING_POSITIONS *
        KEYBOARD_AVERAGE_DEGREE *
        (match.token.length - 1);
      // -1 term because: not counting spatial patterns of length 1, eg for length==6, multiplier is 5 for needing to try len2,len3,..,len6

      const actual = estimate_guesses(match, match.token);

      expect(actual).toBe(expected);
    });

    it("adds to the guesses for shifted keys", () => {
      const match: ISpatialMatch = {
        token: "zxcvbn",
        graph: "qwerty",
        turns: 1,
        shifted_count: 2,
        pattern: "spatial",
        i: 1,
        j: 2,
      };

      const expected =
        KEYBOARD_STARTING_POSITIONS *
        KEYBOARD_AVERAGE_DEGREE *
        (match.token.length - 1) *
        (nCk(6, 2) + nCk(6, 1));

      const actual = spatial_guesses(match);

      expect(actual).toBe(expected);
    });

    it("doubles the guesses if everything is shifted", () => {
      const match: ISpatialMatch = {
        token: "ZXCVBN",
        graph: "qwerty",
        turns: 1,
        shifted_count: 6,
        pattern: "spatial",
        i: 1,
        j: 2,
      };

      const expected =
        KEYBOARD_STARTING_POSITIONS *
        KEYBOARD_AVERAGE_DEGREE *
        (match.token.length - 1) *
        2;

      const actual = spatial_guesses(match);

      expect(actual).toBe(expected);
    });

    it("accounts for turn positions, directions and starting key", () => {
      const match: ISpatialMatch = {
        token: "zxcft6yh",
        graph: "qwerty",
        turns: 3,
        shifted_count: 0,
        pattern: "spatial",
        i: 1,
        j: 2,
      };

      const L = match.token.length;
      const s = KEYBOARD_STARTING_POSITIONS;
      const d = KEYBOARD_AVERAGE_DEGREE;
      let expected = 0;

      for (let i = 2; i <= L; i++) {
        for (let j = 1; j <= Math.min(match.turns, i - 1); j++) {
          expected += nCk(i - 1, j - 1) * s * Math.pow(d, j);
        }
      }

      const actual = spatial_guesses(match);

      expect(actual).toBe(expected);
    });
  });
});
