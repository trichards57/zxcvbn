import { dvorak, keypad, mac_keypad, qwerty } from "../../src/adjacency_graphs";
import { ISpatialMatch, spatial_match } from "../../src/matching/spatial_match";

const testGraphs = {
  qwerty: qwerty,
};

describe("matching", () => {
  describe("spatial_match", () => {
    it("doesn't match 1- and 2-character spatial patterns", () => {
      const expected: ISpatialMatch[] = [];
      for (const password of ["", "/", "qw", "*/"]) {
        const actual = spatial_match(password);
        expect(actual).toEqual(expected);
      }
    });

    it("matches spatial patterns surrounded by non-spatial patterns", () => {
      const pattern = "6tfGHJ";
      const expected: ISpatialMatch[] = [
        {
          graph: "qwerty",
          turns: 2,
          shifted_count: 3,
          i: 3,
          j: 3 + pattern.length - 1,
          token: pattern,
          pattern: "spatial",
        },
      ];

      const actual = spatial_match(`rz!${pattern}%z`, testGraphs);

      expect(actual).toStrictEqual(expected);
    });

    it("matches general patterns", () => {
      for (const [pattern, keyboard, graph, turns, shifts] of [
        ["12345", "qwerty", qwerty, 1, 0],
        ["@WSX", "qwerty", qwerty, 1, 4],
        ["6tfGHJ", "qwerty", qwerty, 2, 3],
        ["hGFd", "qwerty", qwerty, 1, 2],
        ["/;p09876yhn", "qwerty", qwerty, 3, 0],
        ["Xdr%", "qwerty", qwerty, 1, 2],
        ["159-", "keypad", keypad, 1, 0],
        ["*84", "keypad", keypad, 1, 0],
        ["/8520", "keypad", keypad, 1, 0],
        ["369", "keypad", keypad, 1, 0],
        ["/963.", "mac_keypad", mac_keypad, 1, 0],
        ["*-632.0214", "mac_keypad", mac_keypad, 9, 0],
        ["aoEP%yIxkjq:", "dvorak", dvorak, 4, 5],
        [";qoaOQ:Aoq;a", "dvorak", dvorak, 11, 4],
      ] as [string, string, Record<string, string[]>, number, number][]) {
        const testGraphs = {
          [keyboard]: graph,
        };

        const expected: ISpatialMatch[] = [
          {
            pattern: "spatial",
            token: pattern,
            i: 0,
            j: pattern.length - 1,
            graph: keyboard,
            turns,
            shifted_count: shifts,
          },
        ];

        const actual = spatial_match(pattern, testGraphs);
        expect(actual).toStrictEqual(expected);
      }
    });
  });
});
