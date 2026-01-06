import type { IRegexMatch } from "../../src/matching/regex_match";
import { estimate_guesses } from "../../src/scoring";
import { regex_guesses } from "../../src/scoring/regex_guesses";
import { REFERENCE_YEAR } from "../../src/scoring/support";

describe("scoring", () => {
  describe("regex guesses", () => {
    it("is delegated to by estimate_guesses", () => {
      const match: IRegexMatch = {
        token: "1972",
        regex_name: "recent_year",
        regex_match: ["1972"] as RegExpExecArray,
        i: 1,
        j: 2,
        pattern: "regex",
      };

      const result = estimate_guesses(match, match.token);
      expect(result).toBe(REFERENCE_YEAR - 1972);
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
