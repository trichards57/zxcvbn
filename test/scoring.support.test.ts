import { log10, log2, nCk } from "../src/scoring";

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

  describe("log2", () => {
    it("calculates correctly", () => {
      for (const [n, expected] of [
        [1, 0],
        [2, 1],
        [4, 2],
        [32, 5],
      ]) {
        const actual = log2(n);
        expect(actual).toEqual(expected);
      }
    });
  });

  describe("log10", () => {
    it("calculates correctly", () => {
      for (const [n, expected] of [
        [1, 0],
        [10, 1],
        [100, 2],
      ]) {
        const actual = log10(n);
        expect(actual).toEqual(expected);
      }
    });

    it("is correct for the product rule", () => {
      const n = 17;
      const p = 4;
      const actual1 = log10(n * p);
      const actual2 = log10(n) + log10(p);
      expect(actual1).toBeCloseTo(actual2, 10);
    });

    it("is correct for the quotient rule", () => {
      const n = 17;
      const p = 4;
      const actual1 = log10(n / p);
      const actual2 = log10(n) - log10(p);
      expect(actual1).toBeCloseTo(actual2, 10);
    });

    it("is correct for the base switch rule", () => {
      const actual1 = log10(Math.E);
      const actual2 = 1 / Math.log(10);
      expect(actual1).toBeCloseTo(actual2, 10);
    });

    it("is correct for the power rule", () => {
      const n = 17;
      const p = 4;

      const actual1 = log10(Math.pow(n, p));
      const actual2 = p * log10(n);
      expect(actual1).toBeCloseTo(actual2, 10);
    });

    it("is correct for the base change rule", () => {
      const n = 17;

      const actual1 = log10(n);
      const actual2 = Math.log(n) / Math.log(10);
      expect(actual1).toBeCloseTo(actual2, 10);
    });
  });
});
