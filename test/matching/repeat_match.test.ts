import { IRepeatMatch, repeat_match } from "../../src/matching/repeat_match";
import { generatePasswords } from "../test-support";

describe("matching", () => {
  describe("repeat_match", () => {
    it("doesn't matching empty or 1-character repeat patterns", () => {
      for (const password of ["", "#"]) {
        const expected: IRepeatMatch[] = [];
        const actual = repeat_match(password);

        expect(actual).toEqual(expected);
      }
    });

    it("matches embedded repeat patterns", () => {
      const prefixes = ["@", "y4@"];
      const suffixes = ["u", "u%7"];
      const pattern = "&&&&&";
      for (const { password, i, j } of generatePasswords(
        pattern,
        prefixes,
        suffixes
      )) {
        const expected: IRepeatMatch[] = [
          {
            base_token: "&",
            i,
            j,
            base_guesses: 12,
            base_matches: [
              {
                guesses: 11,
                guesses_log10: Math.log10(11),
                i: 0,
                j: 0,
                pattern: "bruteforce",
                token: "&",
              },
            ],
            pattern: "repeat",
            repeat_count: 5,
            token: pattern,
          },
        ];
        const actual = repeat_match(password);
        expect(actual).toStrictEqual(expected);
      }
    });

    it("matches repeats with base characters", () => {
      for (const length of [3, 12]) {
        for (const chr of ["a", "Z", "4", "&"]) {
          const pattern = chr.repeat(length);
          const expected: IRepeatMatch[] = [
            {
              base_token: chr,
              i: 0,
              j: pattern.length - 1,
              base_guesses: 12,
              base_matches: [
                {
                  guesses: 11,
                  guesses_log10: Math.log10(11),
                  i: 0,
                  j: 0,
                  pattern: "bruteforce",
                  token: chr,
                },
              ],
              pattern: "repeat",
              repeat_count: length,
              token: pattern,
            },
          ];
          const actual = repeat_match(pattern);
          expect(actual).toStrictEqual(expected);
        }
      }
    });

    it("matches multiple adjacent repeats", () => {
      const expected: IRepeatMatch[] = [
        {
          base_token: "B",
          i: 0,
          j: 2,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "B",
            },
          ],
          pattern: "repeat",
          repeat_count: 3,
          token: "BBB",
        },
        {
          base_token: "1",
          i: 3,
          j: 6,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "1",
            },
          ],
          pattern: "repeat",
          repeat_count: 4,
          token: "1111",
        },
        {
          base_token: "a",
          i: 7,
          j: 11,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "a",
            },
          ],
          pattern: "repeat",
          repeat_count: 5,
          token: "aaaaa",
        },
        {
          base_token: "@",
          i: 12,
          j: 17,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "@",
            },
          ],
          pattern: "repeat",
          repeat_count: 6,
          token: "@@@@@@",
        },
      ];

      const actual = repeat_match("BBB1111aaaaa@@@@@@");
      expect(actual).toStrictEqual(expected);
    });

    it("matches multiple repeats with non-repeats in between", () => {
      const expected: IRepeatMatch[] = [
        {
          base_token: "B",
          i: 4,
          j: 6,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "B",
            },
          ],
          pattern: "repeat",
          repeat_count: 3,
          token: "BBB",
        },
        {
          base_token: "1",
          i: 12,
          j: 15,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "1",
            },
          ],
          pattern: "repeat",
          repeat_count: 4,
          token: "1111",
        },
        {
          base_token: "a",
          i: 21,
          j: 25,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "a",
            },
          ],
          pattern: "repeat",
          repeat_count: 5,
          token: "aaaaa",
        },
        {
          base_token: "@",
          i: 30,
          j: 35,
          base_guesses: 12,
          base_matches: [
            {
              guesses: 11,
              guesses_log10: Math.log10(11),
              i: 0,
              j: 0,
              pattern: "bruteforce",
              token: "@",
            },
          ],
          pattern: "repeat",
          repeat_count: 6,
          token: "@@@@@@",
        },
      ];

      const actual = repeat_match("2818BBBbzsdf1111@*&@!aaaaaEUDA@@@@@@1729");
      expect(actual).toStrictEqual(expected);
    });

    it("matches multi-character repeat patterns", () => {
      const expected: IRepeatMatch[] = [
        {
          base_token: "ab",
          i: 0,
          j: 3,
          base_guesses: 9,
          base_matches: [
            {
              guesses: 8,
              guesses_log10: Math.log10(8),
              i: 0,
              j: 1,
              pattern: "sequence",
              token: "ab",
              ascending: true,
              sequence_name: "lower",
              sequence_space: 26,
            },
          ],
          pattern: "repeat",
          repeat_count: 2,
          token: "abab",
        },
      ];
      const actual = repeat_match("abab");
      expect(actual).toStrictEqual(expected);
    });

    it("matches 'aab' repeat in 'aabaab'", () => {
      const expected: IRepeatMatch[] = [
        {
          base_token: "aab",
          i: 0,
          j: 5,
          base_guesses: 1001,
          base_matches: [
            {
              guesses: 1000,
              guesses_log10: Math.log10(1000),
              i: 0,
              j: 2,
              pattern: "bruteforce",
              token: "aab",
            },
          ],
          pattern: "repeat",
          repeat_count: 2,
          token: "aabaab",
        },
      ];
      const actual = repeat_match("aabaab");
      expect(actual).toStrictEqual(expected);
    });

    it("matches 'ab' in 'abababab'", () => {
      const expected: IRepeatMatch[] = [
        {
          base_token: "ab",
          i: 0,
          j: 7,
          base_guesses: 9,
          base_matches: [
            {
              guesses: 8,
              guesses_log10: Math.log10(8),
              i: 0,
              j: 1,
              pattern: "sequence",
              token: "ab",
              ascending: true,
              sequence_name: "lower",
              sequence_space: 26,
            },
          ],
          pattern: "repeat",
          repeat_count: 4,
          token: "abababab",
        },
      ];
      const actual = repeat_match("abababab");
      expect(actual).toStrictEqual(expected);
    });
  });
});
