import { IDateMatch } from "../src/matching";
import { date_guesses, MIN_YEAR_SPACE, REFERENCE_YEAR } from "../src/scoring";

describe("scoring", () => {
  describe("date_guesses", () => {
    it("calculates for year 1923 is 365 * (REFERENCE_YEAR-year)", () => {
      const match: IDateMatch = {
        token: "1923",
        separator: "",
        has_full_year: false,
        year: 1923,
        month: 1,
        day: 1,
        i: 1,
        j: 2,
        pattern: "date",
      };

      const actual = date_guesses(match);
      expect(actual).toBe(365 * (REFERENCE_YEAR - match.year));
    });

    it("multiplies by 4 for separators", () => {
      const match: IDateMatch = {
        token: "1923/1/1",
        separator: "/",
        has_full_year: false,
        year: 1923,
        month: 1,
        day: 1,
        i: 1,
        j: 2,
        pattern: "date",
      };

      const actual = date_guesses(match);
      expect(actual).toBe(365 * (REFERENCE_YEAR - match.year) * 4);
    });

    it("assumes MIN_YEAR_SPACE for recent years", () => {
      const match: IDateMatch = {
        token: "2010",
        separator: "",
        has_full_year: false,
        year: 2010,
        month: 1,
        day: 1,
        i: 1,
        j: 2,
        pattern: "date",
      };

      const actual = date_guesses(match);
      expect(actual).toBe(365 * MIN_YEAR_SPACE);
    });
  });
});
