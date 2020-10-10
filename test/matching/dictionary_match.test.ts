import {
  dictionary_match,
  IDictionaryMatch,
  reverse_dictionary_match,
  set_user_input_dictionary,
} from "../../src/matching/dictionary_match";
import { generatePasswords } from "../test-support";

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

    it("matches multiple overlapping words", () => {
      const password = "abcdef";

      const expected: IDictionaryMatch[] = [
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 0,
          j: 3,
          matched_word: "abcd",
          rank: 4,
          reversed: false,
          l33t: false,
          token: "abcd",
        },
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 2,
          j: 5,
          matched_word: "cdef",
          rank: 5,
          reversed: false,
          l33t: false,
          token: "cdef",
        },
      ];

      const actual = dictionary_match(password, test_dicts);

      expect(actual).toStrictEqual(expected);
    });

    it("ignores uppercasing", () => {
      const password = "BoaRdZ";

      const expected: IDictionaryMatch[] = [
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 0,
          j: 4,
          matched_word: "board",
          rank: 3,
          reversed: false,
          l33t: false,
          token: "BoaRd",
        },
        {
          pattern: "dictionary",
          dictionary_name: "d2",
          i: 5,
          j: 5,
          matched_word: "z",
          rank: 1,
          reversed: false,
          l33t: false,
          token: "Z",
        },
      ];

      const actual = dictionary_match(password, test_dicts);

      expect(actual).toStrictEqual(expected);
    });

    it("identifies words surrounded by non-words", () => {
      const prefixes = ["q", "%%"];
      const suffixes = ["%", "qq"];
      const word = "asdf1234&*";

      for (const { password, i, j } of generatePasswords(
        word,
        prefixes,
        suffixes
      )) {
        const expected: IDictionaryMatch[] = [
          {
            pattern: "dictionary",
            dictionary_name: "d2",
            i,
            j,
            matched_word: word,
            rank: 5,
            reversed: false,
            l33t: false,
            token: word,
          },
        ];

        const actual = dictionary_match(password, test_dicts);
        expect(actual).toStrictEqual(expected);
      }
    });

    it("matches against all words in provided dictionaries", () => {
      for (const name in test_dicts) {
        const dict = test_dicts[name];
        for (const word in dict) {
          const rank = dict[word];
          if (word === "motherboard") {
            continue;
          } // skip words that contain others

          const expected: IDictionaryMatch[] = [
            {
              pattern: "dictionary",
              dictionary_name: name,
              i: 0,
              j: word.length - 1,
              matched_word: word,
              rank,
              reversed: false,
              l33t: false,
              token: word,
            },
          ];

          const actual = dictionary_match(word, test_dicts);
          expect(actual).toStrictEqual(expected);
        }
      }
    });

    it("uses the default dictionaries", () => {
      const word = "wow";

      const expected: IDictionaryMatch[] = [
        {
          pattern: "dictionary",
          dictionary_name: "us_tv_and_film",
          i: 0,
          j: 2,
          matched_word: word,
          rank: 322,
          reversed: false,
          l33t: false,
          token: word,
        },
      ];

      const actual = dictionary_match(word);
      expect(actual).toStrictEqual(expected);
    });

    it("uses the user input dictionary", () => {
      const word = "foobar";

      const expected: IDictionaryMatch[] = [
        {
          pattern: "dictionary",
          dictionary_name: "user_inputs",
          i: 0,
          j: 2,
          matched_word: "foo",
          rank: 1,
          reversed: false,
          l33t: false,
          token: "foo",
        },
        {
          pattern: "dictionary",
          dictionary_name: "user_inputs",
          i: 3,
          j: 5,
          matched_word: "bar",
          rank: 2,
          reversed: false,
          l33t: false,
          token: "bar",
        },
      ];

      set_user_input_dictionary(["foo", "bar"]);

      const actual = dictionary_match(word);
      const filtered = actual.filter(
        (m) => m.dictionary_name === "user_inputs"
      );

      expect(filtered).toStrictEqual(expected);
    });
  });
  describe("reverse_dictionary_match", () => {
    it("matches against reversed words", () => {
      const password = "0123456789";
      const test_dicts = {
        d1: {
          123: 1,
          321: 2,
          456: 3,
          654: 4,
        },
      };

      const expected: IDictionaryMatch[] = [
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 1,
          j: 3,
          matched_word: "321",
          rank: 2,
          reversed: true,
          l33t: false,
          token: "123",
        },
        {
          pattern: "dictionary",
          dictionary_name: "d1",
          i: 4,
          j: 6,
          matched_word: "654",
          rank: 4,
          reversed: true,
          l33t: false,
          token: "456",
        },
      ];

      const actual = reverse_dictionary_match(password, test_dicts);
      expect(actual).toStrictEqual(expected);
    });
  });
});
