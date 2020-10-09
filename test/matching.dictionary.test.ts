import { dictionary_match, IDictionaryMatch } from "../src/matching";

const test_dicts: Record<string, Record<string, number>> = {
  d1: {
    motherboard: 1,
    mother: 2,
    board: 3,
    abcd: 4,
    cdef: 5,
  },
  d2: {
    z: 1,
    "8": 2,
    "99": 3,
    $: 4,
    "asdf1234&*": 5,
  },
};

describe("matching", () => {
  describe("dictionary_match", () => {
    it("matches words that contain other words", () => {
      const password = "motherboard";

      const expected: IDictionaryMatch[] = [
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 0,
          j: 5,
          matched_word: "mother",
          rank: 2,
          reversed: false,
          l33t: false,
          token: "mother",
        },
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 0,
          j: 10,
          matched_word: "motherboard",
          rank: 1,
          reversed: false,
          l33t: false,
          token: "motherboard",
        },
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 6,
          j: 10,
          matched_word: "board",
          rank: 3,
          reversed: false,
          l33t: false,
          token: "board",
        },
      ];

      const actual = dictionary_match(password, test_dicts);

      expect(actual).toStrictEqual(expected);
    });
  });
});
