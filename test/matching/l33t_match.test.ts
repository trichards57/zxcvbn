import {
  enumerate_l33t_subs,
  IDictionaryMatch,
  l33t_match,
  relevant_l33t_subtable,
} from "../../src/matching/dictionary_match";

const test_table = {
  a: ["4", "@"],
  c: ["(", "{", "[", "<"],
  g: ["6", "9"],
  o: ["0"],
};

const dicts = {
  words: {
    aac: 1,
    password: 3,
    paassword: 4,
    asdf0: 5,
  },
  words2: {
    cgo: 1,
  },
};

describe("matching", () => {
  describe("relevant_l33t_subtable", () => {
    it("reduces l33t table to only the substitutions that a password might be using", () => {
      for (const [pw, expected] of [
        ["", {}],
        ["abcdefgo123578!#$&*)]}>", {}],
        ["a", {}],
        ["4", { a: ["4"] }],
        ["4@", { a: ["4", "@"] }],
        ["4({60", { a: ["4"], c: ["(", "{"], g: ["6"], o: ["0"] }],
      ] as [string, Record<string, string[]>][]) {
        const actual = relevant_l33t_subtable(pw, test_table);

        expect(actual).toStrictEqual(expected);
      }
    });
  });
  describe("enumerate_l33t_subs", () => {
    it("enumerates the sets of l33t substitutions a password might be using", () => {
      for (const [table, expected] of [
        [{}, [{}]],
        [{ a: ["@"] }, [{ "@": "a" }]],
        [{ a: ["@", "4"] }, [{ "@": "a" }, { "4": "a" }]],
        [
          { a: ["@", "4"], c: ["("] },
          [
            { "@": "a", "(": "c" },
            { "4": "a", "(": "c" },
          ],
        ],
      ] as [Record<string, string[]>, Record<string, string[]>[]][]) {
        const actual = enumerate_l33t_subs(table);

        expect(actual).toStrictEqual(expected);
      }
    });
  });

  describe("l33t_match", () => {
    it("doesn't match empty string", () => {
      const expected: IDictionaryMatch[] = [];
      const actual = l33t_match("", dicts, test_table);

      expect(actual).toEqual(expected);
    });

    it("doesn't match non-l33t words", () => {
      const expected: IDictionaryMatch[] = [];
      const actual = l33t_match("password", dicts, test_table);

      expect(actual).toEqual(expected);
    });

    it("matches common l33t substitutions", () => {
      for (const {
        password,
        pattern,
        word,
        dictionary_name,
        rank,
        ij,
        sub,
      } of [
        {
          password: "p4ssword",
          pattern: "p4ssword",
          word: "password",
          dictionary_name: "words",
          rank: 3,
          ij: [0, 7],
          sub: { "4": "a" } as Record<string, string>,
        },
        {
          password: "p@ssw0rd",
          pattern: "p@ssw0rd",
          word: "password",
          dictionary_name: "words",
          rank: 3,
          ij: [0, 7],
          sub: { "@": "a", "0": "o" } as Record<string, string>,
        },
        {
          password: "aSdfO{G0asDfO",
          pattern: "{G0",
          word: "cgo",
          dictionary_name: "words2",
          rank: 1,
          ij: [5, 7],
          sub: { "{": "c", "0": "o" } as Record<string, string>,
        },
      ]) {
        const expected: IDictionaryMatch[] = [
          {
            pattern: "dictionary",
            dictionary_name: dictionary_name,
            i: ij[0],
            j: ij[1],
            matched_word: word,
            rank: rank,
            reversed: false,
            l33t: true,
            token: pattern,
            sub,
            sub_display: Object.keys(sub)
              .map((k) => `${k} -> ${sub[k]}`)
              .join(", "),
          },
        ];

        const actual = l33t_match(password, dicts, test_table);

        expect(actual).toEqual(expected);
      }
    });

    it("matches overlapping l33t patterns", () => {
      const expected: IDictionaryMatch[] = [
        {
          pattern: "dictionary",
          dictionary_name: "words",
          i: 0,
          j: 2,
          matched_word: "aac",
          rank: 1,
          reversed: false,
          l33t: true,
          token: "@a(",
          sub: { "@": "a", "(": "c" },
          sub_display: "@ -> a, ( -> c",
        },
        {
          pattern: "dictionary",
          dictionary_name: "words2",
          i: 2,
          j: 4,
          matched_word: "cgo",
          rank: 1,
          reversed: false,
          l33t: true,
          token: "(go",
          sub: { "(": "c" },
          sub_display: "( -> c",
        },
        {
          pattern: "dictionary",
          dictionary_name: "words2",
          i: 5,
          j: 7,
          matched_word: "cgo",
          rank: 1,
          reversed: false,
          l33t: true,
          token: "{G0",
          sub: { "{": "c", "0": "o" },
          sub_display: "0 -> o, { -> c",
        },
      ];

      const actual = l33t_match("@a(go{G0", dicts, test_table);

      expect(actual).toEqual(expected);
    });

    it("doesn't match when multiple substitutions are needed for the same letter", () => {
      const expected: IDictionaryMatch[] = [];
      const actual = l33t_match("p4@ssword", dicts, test_table);

      expect(actual).toEqual(expected);
    });

    it("doesn't match single character l33ted words", () => {
      const expected: IDictionaryMatch[] = [];
      const actual = l33t_match("4 1 @", dicts, test_table);

      expect(actual).toEqual(expected);
    });

    it("doesn't match with subsets of possible l33t substitutions", () => {
      const expected: IDictionaryMatch[] = [];
      const actual = l33t_match("4sdf0", dicts, test_table);

      expect(actual).toEqual(expected);
    });
  });
});
