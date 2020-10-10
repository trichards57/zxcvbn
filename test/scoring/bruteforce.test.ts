import { IAnyMatch, IBruteForceMatch } from "../../src/matching";
import { most_guessable_match_sequence } from "../../src/scoring";

function getTestMatches(i: number, j: number, guesses: number): IAnyMatch {
  return {
    i,
    j,
    guesses,
    token: "abc",
    pattern: "date",
    day: 1,
    month: 2,
    separator: "/",
    year: 3,
  };
}

describe("scoring", () => {
  describe("most_guessable_match_sequence", () => {
    it("returns one bruteforce match for an empty match sequence", () => {
      const password = "0123456789";
      const expectedResult: IBruteForceMatch[] = [
        {
          i: 0,
          j: 9,
          pattern: "bruteforce",
          token: password,
        },
      ];

      const result = most_guessable_match_sequence(password, []);
      expect(result.sequence).toMatchObject(expectedResult);
    });

    it("returns match + bruteforce when match covers a prefix of password", () => {
      const password = "0123456789";
      const matches = [getTestMatches(0, 5, 1)];
      const expectedResult: IAnyMatch[] = [
        ...matches,
        {
          i: 6,
          j: 9,
          pattern: "bruteforce",
          token: "6789",
        },
      ];

      const result = most_guessable_match_sequence(password, matches, true);
      expect(result.sequence).toMatchObject(expectedResult);
    });

    it("returns bruteforce + match when match covers a suffix of password", () => {
      const password = "0123456789";
      const matches = [getTestMatches(3, 9, 1)];
      const expectedResult: IAnyMatch[] = [
        {
          i: 0,
          j: 2,
          pattern: "bruteforce",
          token: "012",
        },
        ...matches,
      ];

      const result = most_guessable_match_sequence(password, matches, true);
      expect(result.sequence).toMatchObject(expectedResult);
    });

    it("returns bruteforce + match + bruteforce when match covers an infix", () => {
      const password = "0123456789";
      const matches = [getTestMatches(1, 8, 1)];
      const expectedResult: IAnyMatch[] = [
        {
          i: 0,
          j: 0,
          pattern: "bruteforce",
          token: "0",
        },
        ...matches,
        {
          i: 9,
          j: 9,
          pattern: "bruteforce",
          token: "9",
        },
      ];

      const result = most_guessable_match_sequence(password, matches, true);
      expect(result.sequence).toMatchObject(expectedResult);
    });

    it("chooses match with the fewest guesses given two matches of the same span", () => {
      const password = "0123456789";
      const worseMatch = getTestMatches(0, 9, 1);
      const bestMatch = getTestMatches(0, 9, 2);

      const result1 = most_guessable_match_sequence(
        password,
        [worseMatch, bestMatch],
        true
      );
      expect(result1.sequence).toMatchObject([worseMatch]);

      const result2 = most_guessable_match_sequence(
        password,
        [bestMatch, worseMatch],
        true
      );
      expect(result2.sequence).toMatchObject([worseMatch]);
    });

    it("chooses m0 when it covers m1 and m2, if m0 < m1 * m2 * 2!", () => {
      const password = "0123456789";
      const m0 = getTestMatches(0, 9, 3);
      const m1 = getTestMatches(0, 3, 2);
      const m2 = getTestMatches(4, 9, 1);

      const result = most_guessable_match_sequence(
        password,
        [m0, m1, m2],
        true
      );

      expect(result.guesses).toBe(3);
      expect(result.sequence).toMatchObject([m0]);
    });

    it("chooses m0 when it covers m1 and m2, if m0 > m1 * m2 * 2!", () => {
      const password = "0123456789";
      const m0 = getTestMatches(0, 9, 5);
      const m1 = getTestMatches(0, 3, 2);
      const m2 = getTestMatches(4, 9, 1);

      const result = most_guessable_match_sequence(
        password,
        [m0, m1, m2],
        true
      );

      expect(result.guesses).toBe(4);
      expect(result.sequence).toMatchObject([m1, m2]);
    });
  });
});
