import { empty, mod, sorted, translate } from "../../src/matching/support";

describe("matching support", () => {
  describe("empty", () => {
    it("returns true for an empty array", () => {
      expect(empty([])).toBeTruthy();
    });

    it("returns true for an empty object", () => {
      expect(empty({})).toBeTruthy();
    });

    it("returns false for non-empty objects", () => {
      expect(empty([1])).toBeFalsy();
      expect(empty([1, 2])).toBeFalsy();
      expect(empty([[]])).toBeFalsy();
      expect(empty({ a: 1 })).toBeFalsy();
      expect(empty({ 0: {} })).toBeFalsy();
    });
  });

  describe("translate", () => {
    it("translates strings with character maps", () => {
      const chr_map = { a: "A", b: "B" };
      for (const [string, map, result] of [
        ["a", chr_map, "A"],
        ["c", chr_map, "c"],
        ["ab", chr_map, "AB"],
        ["abc", chr_map, "ABc"],
        ["aa", chr_map, "AA"],
        ["abab", chr_map, "ABAB"],
        ["", chr_map, ""],
        ["", {}, ""],
        ["abc", {}, "abc"],
      ] as [string, Record<string, string>, string][]) {
        expect(translate(string, map)).toBe(result);
      }
    });
  });

  describe("mod", () => {
    it("calculates modulus correctly", () => {
      for (const [[dividend, divisor], expected] of [
        [[0, 1], 0],
        [[1, 1], 0],
        [[-1, 1], 0],
        [[5, 5], 0],
        [[3, 5], 3],
        [[-1, 5], 4],
        [[-5, 5], 0],
        [[6, 5], 1],
      ] as [number[], number][]) {
        expect(mod(dividend, divisor)).toBe(expected);
      }
    });
  });

  describe("sort", () => {
    it("leaves an empty list empty", () => {
      expect(sorted([])).toStrictEqual([]);
    });

    it("sorts items by i then j", () => {
      const m1 = { i: 5, j: 5 };
      const m2 = { i: 6, j: 7 };
      const m3 = { i: 2, j: 5 };
      const m4 = { i: 0, j: 0 };
      const m5 = { i: 2, j: 3 };
      const m6 = { i: 0, j: 3 };

      const expected = [m4, m6, m5, m3, m1, m2];
      const actual = sorted([m1, m2, m3, m4, m5, m6]);
      expect(actual).toStrictEqual(expected);
    });
  });
});
