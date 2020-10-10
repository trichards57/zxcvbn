import { IRegexMatch } from "../../src/matching/regex_match";
import { estimate_guesses } from "../../src/scoring";
import { regex_guesses } from "../../src/scoring/regex_guesses";
import { REFERENCE_YEAR } from "../../src/scoring/support";

describe("scoring", () => {
  describe("regex guesses", () => {
    it("calculates 26^n for an n-char lowercase string", () => {
      const match: IRegexMatch = {
        token: "aizocdk",
        regex_name: "alpha_lower",
        regex_match: ["aizocdk"] as RegExpExecArray,
        i: 1,
        j: 2,
        pattern: "regex",
      };

      const result = regex_guesses(match);
      expect(result).toBe(Math.pow(26, 7));
    });

    it("is delegated to by estimate_guesses", () => {
      const match: IRegexMatch = {
        token: "aizocdk",
        regex_name: "alpha_lower",
        regex_match: ["aizocdk"] as RegExpExecArray,
        i: 1,
        j: 2,
        pattern: "regex",
      };

      const result = estimate_guesses(match, match.token);
      expect(result).toBe(Math.pow(26, 7));
    });

    it("calculates (2 * 26 + 10)^n for an n-char alphanumeric string", () => {
      const match: IRegexMatch = {
        token: "ag7C8",
        regex_name: "alphanumeric",
        regex_match: ["ag7C8"] as RegExpExecArray,
        i: 1,
        j: 2,
        pattern: "regex",
      };

      const result = regex_guesses(match);
      expect(result).toBe(Math.pow(2 * 26 + 10, 5));
    });

    it("calculates |year-REFERENCE_YEAR| for a distant year string", () => {
      const match: IRegexMatch = {
        token: "1972",
        regex_name: "recent_year",
        regex_match: ["1972"] as RegExpExecArray,
        i: 1,
        j: 2,
        pattern: "regex",
      };

      const result = regex_guesses(match);
      expect(result).toBe(REFERENCE_YEAR - 1972);
    });
  });
});
