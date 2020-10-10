import { IDictionaryMatch } from "../../src/matching/dictionary_match";
import { estimate_guesses } from "../../src/scoring";
import { dictionary_guesses, l33t_variations, uppercase_variations } from "../../src/scoring/dictionary_guesses";
import { nCk } from "../../src/scoring/support";

describe("scoring", () => {
  describe("dictionary_guesses", () => {
    it("makes base guesses equal the rank", () => {
      const match: IDictionaryMatch = {
        token: "aaaaa",
        rank: 32,
        pattern: "dictionary",
        dictionary_name: "dic",
        i: 1,
        j: 2,
        l33t: false,
        matched_word: "a",
        reversed: false,
      };

      const actual = dictionary_guesses(match);
      expect(actual).toBe(32);
    });

    it("is delegated to by estimate_guesses", () => {
      const match: IDictionaryMatch = {
        token: "aaaaa",
        rank: 32,
        pattern: "dictionary",
        dictionary_name: "dic",
        i: 1,
        j: 2,
        l33t: false,
        matched_word: "a",
        reversed: false,
      };

      const actual = estimate_guesses(match, match.token);
      expect(actual).toBe(32);
    });

    it("adds extra guesses for capitilization", () => {
      const match: IDictionaryMatch = {
        token: "AAAaaa",
        rank: 32,
        pattern: "dictionary",
        dictionary_name: "dic",
        i: 1,
        j: 2,
        l33t: false,
        matched_word: "a",
        reversed: false,
      };

      const actual = dictionary_guesses(match);
      expect(actual).toBe(32 * uppercase_variations(match));
    });

    it("adds doubles guesses for reversed words", () => {
      const match: IDictionaryMatch = {
        token: "aaa",
        rank: 32,
        pattern: "dictionary",
        dictionary_name: "dic",
        i: 1,
        j: 2,
        l33t: false,
        matched_word: "a",
        reversed: true,
      };

      const actual = dictionary_guesses(match);
      expect(actual).toBe(32 * 2);
    });

    it("adds extra guesses for common l33t substitutions", () => {
      const match: IDictionaryMatch = {
        token: "aaa@@@",
        rank: 32,
        pattern: "dictionary",
        dictionary_name: "dic",
        i: 1,
        j: 2,
        l33t: true,
        matched_word: "a",
        reversed: false,
        sub: { "@": "a" },
      };

      const actual = dictionary_guesses(match);
      expect(actual).toBe(32 * l33t_variations(match));
    });

    it("adds extra guesses for capitilization and common l33t substitutions", () => {
      const match: IDictionaryMatch = {
        token: "AaA@@@",
        rank: 32,
        pattern: "dictionary",
        dictionary_name: "dic",
        i: 1,
        j: 2,
        l33t: true,
        matched_word: "a",
        reversed: false,
        sub: { "@": "a" },
      };

      const actual = dictionary_guesses(match);
      expect(actual).toBe(
        32 * l33t_variations(match) * uppercase_variations(match)
      );
    });
  });

  describe("dictionary-support", () => {
    it("gets correct uppercase variants multiplier for word", () => {
      for (const [word, expected] of [
        ["", 1],
        ["a", 1],
        ["A", 2],
        ["abcdef", 1],
        ["Abcdef", 2],
        ["abcdeF", 2],
        ["ABCDEF", 2],
        ["aBcdef", nCk(6, 1)],
        ["aBcDef", nCk(6, 1) + nCk(6, 2)],
        ["ABCDEf", nCk(6, 1)],
        ["aBCDEf", nCk(6, 1) + nCk(6, 2)],
        ["ABCdef", nCk(6, 1) + nCk(6, 2) + nCk(6, 3)],
      ] as [string, number][]) {
        const actual = uppercase_variations({ token: word });

        expect(actual).toBe(expected);
      }
    });

    it("gets correct l33t variants for word", () => {
      for (const [word, expected, sub, l33t] of [
        ["", 1, {}, false],
        ["a", 1, {}, false],
        ["4", 2, { "4": "a" }, true],
        ["4pple", 2, { "4": "a" }, true],
        ["abcet", 1, {}, false],
        ["4bcet", 2, { "4": "a" }, true],
        ["a8cet", 2, { "8": "b" }, true],
        ["abce+", 2, { "+": "t" }, true],
        ["48cet", 4, { "4": "a", "8": "b" }, true],
        ["a4a4aa", nCk(6, 2) + nCk(6, 1), { "4": "a" }, true],
        ["4a4a44", nCk(6, 2) + nCk(6, 1), { "4": "a" }, true],
        [
          "a44att+",
          (nCk(4, 2) + nCk(4, 1)) * nCk(3, 1),
          { "4": "a", "+": "t" },
          true,
        ],
      ] as [string, number, Record<string, string>, boolean][]) {
        const match: IDictionaryMatch = {
          token: word,
          rank: 32,
          pattern: "dictionary",
          dictionary_name: "dic",
          i: 1,
          j: 2,
          l33t,
          matched_word: "a",
          reversed: false,
          sub,
        };
        const actual = l33t_variations(match);

        expect(actual).toBe(expected);
      }
    });

    it("ignores capitilzation for l33t variations", () => {
      const match: IDictionaryMatch = {
        token: "Aa44aA",
        rank: 32,
        pattern: "dictionary",
        dictionary_name: "dic",
        i: 1,
        j: 2,
        l33t: true,
        matched_word: "a",
        reversed: false,
        sub: { "4": "a" },
      };

      const expected = nCk(6, 2) + nCk(6, 1);
      const actual = l33t_variations(match);

      expect(actual).toBe(expected);
    });
  });
});
