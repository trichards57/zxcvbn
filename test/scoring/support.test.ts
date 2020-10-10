import { nCk } from "../../src/scoring/support";

describe("scoring support", () => {
  describe("nCk", () => {
    it("calculates nCk correctly", () => {
      for (const [n, k, expected] of [
        [0, 0, 1],
        [1, 0, 1],
        [5, 0, 1],
        [0, 1, 0],
        [0, 5, 0],
        [2, 1, 2],
        [4, 2, 6],
        [33, 7, 4272048],
      ]) {
        const actual = nCk(n, k);
        expect(actual).toEqual(expected);
      }
    });

    it("calculates the mirror identity correctly", () => {
      const n = 49;
      const k = 12;
      const actual1 = nCk(n, k);
      const actual2 = nCk(n, n - k);
      expect(actual1).toEqual(actual2);
    });

    it("calculates pascal's triangle identity correctly", () => {
      const n = 49;
      const k = 12;
      const actual1 = nCk(n, k);
      const actual2 = nCk(n - 1, k - 1) + nCk(n - 1, k);
      expect(actual1).toEqual(actual2);
    });
  });
});
