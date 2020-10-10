import { omnimatch } from "../src/matching";

describe("matching", () => {
  describe("omnimatch", () => {
    it("matches various elements in password", () => {
      const password = "r0sebudmaelstrom11/20/91aaaa";

      const actual = omnimatch(password);
      for (const [pattern_name, i, j] of [
        ["dictionary", 0, 6],
        ["dictionary", 7, 15],
        ["date", 16, 23],
        ["repeat", 24, 27],
      ] as [string, number, number][]) {
        for (const match of actual) {
          if (match.i === i && match.j === j) {
            expect(match.pattern).toBe(pattern_name);
          }
        }
      }
    });
  });
});
