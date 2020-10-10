import { IDateMatch } from "../../src/matching/date_match";
import { estimate_guesses } from "../../src/scoring";

describe("scoring", () => {
  describe("estimate_guesses", () => {
    it("returns cached guesses if available", () => {
      const match: IDateMatch = {
        guesses: 1,
        pattern: "date",
        token: "1977",
        year: 1977,
        month: 7,
        day: 14,
        separator: "/",
        i: 1,
        j: 2,
      };

      const actual = estimate_guesses(match, "");
      expect(actual).toBe(match.guesses);
    });
  });
});
