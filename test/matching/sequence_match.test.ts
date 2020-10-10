import { ISequenceMatch, sequence_match } from "../../src/matching/sequence_match";
import { generatePasswords } from "../test-support";

describe("matching", () => {
  describe("sequence_match", () => {
    it("doesn't match very empty or 1 length sequences", () => {
      for (const password of ["", "a", "1"]) {
        const expected: ISequenceMatch[] = [];
        const actual = sequence_match(password);

        expect(actual).toEqual(expected);
      }
    });

    it("matches overlapping patterns", () => {
      const expected: ISequenceMatch[] = [
        {
          ascending: true,
          i: 0,
          j: 2,
          pattern: "sequence",
          sequence_name: "lower",
          sequence_space: 26,
          token: "abc",
        },
        {
          ascending: false,
          i: 2,
          j: 4,
          pattern: "sequence",
          sequence_name: "lower",
          sequence_space: 26,
          token: "cba",
        },
        {
          ascending: true,
          i: 4,
          j: 6,
          pattern: "sequence",
          sequence_name: "lower",
          sequence_space: 26,
          token: "abc",
        },
      ];

      const actual = sequence_match("abcbabc");
      expect(actual).toStrictEqual(expected);
    });

    it("matches embedded sequence patterns", () => {
      const prefixes = ["!", "22"];
      const suffixes = ["!", "22"];
      const pattern = "jihg";
      for (const { password, i, j } of generatePasswords(
        pattern,
        prefixes,
        suffixes
      )) {
        const expected: ISequenceMatch[] = [
          {
            ascending: false,
            i,
            j,
            pattern: "sequence",
            sequence_name: "lower",
            sequence_space: 26,
            token: pattern,
          },
        ];

        const actual = sequence_match(password);
        expect(actual).toStrictEqual(expected);
      }
    });

    it("matches general sequences", () => {
      for (const [pattern, name, is_ascending, space] of [
        ["ABC", "upper", true, 26],
        ["CBA", "upper", false, 26],
        ["PQR", "upper", true, 26],
        ["RQP", "upper", false, 26],
        ["XYZ", "upper", true, 26],
        ["ZYX", "upper", false, 26],
        ["abcd", "lower", true, 26],
        ["dcba", "lower", false, 26],
        ["jihg", "lower", false, 26],
        ["wxyz", "lower", true, 26],
        ["zxvt", "lower", false, 26],
        ["0369", "digits", true, 10],
        ["97531", "digits", false, 10],
      ] as [string, string, boolean, number][]) {
        const expected: ISequenceMatch[] = [
          {
            ascending: is_ascending,
            i: 0,
            j: pattern.length - 1,
            pattern: "sequence",
            sequence_name: name,
            sequence_space: space,
            token: pattern,
          },
        ];

        const actual = sequence_match(pattern);
        expect(actual).toStrictEqual(expected);
      }
    });
  });
});
