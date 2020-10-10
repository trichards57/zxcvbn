/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import test from "tape";
import * as matching from "../src/matching";
import * as adjacency_graphs from "../src/adjacency_graphs";
import { IAnyMatch } from "../src/matching";

// takes a pattern and list of prefixes/suffixes
// returns a bunch of variants of that pattern embedded
// with each possible prefix/suffix combination, including no prefix/suffix
// returns a list of triplets [variant, i, j] where [i,j] is the start/end of the pattern, inclusive
const genpws = function (
  pattern: string,
  prefixes: string[],
  suffixes: string[]
) {
  prefixes = prefixes.slice();
  suffixes = suffixes.slice();
  for (const lst of [prefixes, suffixes]) {
    if (!Array.from(lst).includes("")) {
      lst.unshift("");
    }
  }
  const result: [string, number, number][] = [];
  for (const prefix of Array.from(prefixes)) {
    for (const suffix of Array.from(suffixes)) {
      const [i, j] = Array.from([
        prefix.length,
        prefix.length + pattern.length - 1,
      ]);
      result.push([prefix + pattern + suffix, i, j]);
    }
  }
  return result;
};

const check_matches = function (
  prefix: string,
  t: test.Test,
  matches: IAnyMatch[],
  pattern_names: string[] | string,
  patterns: string[],
  ijs: number[][],
  props: { [index: string]: unknown[] }
) {
  let i;
  if (typeof pattern_names === "string") {
    // shortcut: if checking for a list of the same type of patterns,
    // allow passing a string 'pat' instead of array ['pat', 'pat', ...]
    pattern_names = (() => {
      let asc, end;
      const result: string[] = [];
      for (
        i = 0, end = patterns.length, asc = 0 <= end;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        result.push(pattern_names);
      }
      return result;
    })();
  }

  let is_equal_len_args =
    pattern_names.length === patterns.length && patterns.length === ijs.length;
  for (const prop in props) {
    // props is structured as: keys that points to list of values
    const lst = props[prop];
    is_equal_len_args = is_equal_len_args && lst.length === patterns.length;
  }
  if (!is_equal_len_args) {
    throw "unequal argument lists to check_matches";
  }

  let msg = `${prefix}: matches.length == ${patterns.length}`;
  t.equal(matches.length, patterns.length, msg);
  return (() => {
    const result1: boolean[][] = [];
    for (
      let k = 0, end1 = patterns.length, asc1 = 0 <= end1;
      asc1 ? k < end1 : k > end1;
      asc1 ? k++ : k--
    ) {
      let j;
      const match = matches[k];
      const pattern_name = pattern_names[k];
      const pattern = patterns[k];
      [i, j] = Array.from(ijs[k]);
      msg = `${prefix}: matches[${k}].pattern == '${pattern_name}'`;
      t.equal(match.pattern, pattern_name, msg);
      msg = `${prefix}: matches[${k}] should have [i, j] of [${i}, ${j}]`;
      t.deepEqual([match.i, match.j], [i, j], msg);
      msg = `${prefix}: matches[${k}].token == '${pattern}'`;
      t.equal(match.token, pattern, msg);
      result1.push(
        (() => {
          const result2: boolean[] = [];
          for (const prop_name in props) {
            const prop_list = props[prop_name];
            let prop_msg = prop_list[k];
            if (typeof prop_msg === "string") {
              prop_msg = `'${prop_msg}'`;
            }
            msg = `${prefix}: matches[${k}].${prop_name} == ${prop_msg}`;
            t.deepEqual(match[prop_name], prop_list[k], msg);
          }
          return result2;
        })()
      );
    }
    return result1;
  })();
};

test("reverse dictionary matching", function (t) {
  const test_dicts = {
    d1: {
      123: 1,
      321: 2,
      456: 3,
      654: 4,
    },
  };
  const password = "0123456789";
  const matches = matching.reverse_dictionary_match(password, test_dicts);
  const msg = "matches against reversed words";
  check_matches(
    msg,
    t,
    matches,
    "dictionary",
    ["123", "456"],
    [
      [1, 3],
      [4, 6],
    ],
    {
      matched_word: ["321", "654"],
      reversed: [true, true],
      dictionary_name: ["d1", "d1"],
      rank: [2, 4],
    }
  );
  return t.end();
});

test("l33t matching", function (t) {
  let dictionary_name, msg, rank, sub;
  let ij, password, pattern, word;
  const test_table: Record<string, string[]> = {
    a: ["4", "@"],
    c: ["(", "{", "[", "<"],
    g: ["6", "9"],
    o: ["0"],
  };

  for (const [pw, expected] of [
    ["", {}],
    ["abcdefgo123578!#$&*)]}>", {}],
    ["a", {}],
    ["4", { a: ["4"] }],
    ["4@", { a: ["4", "@"] }],
    ["4({60", { a: ["4"], c: ["(", "{"], g: ["6"], o: ["0"] }],
  ] as [string, Record<string, string[]>][]) {
    msg =
      "reduces l33t table to only the substitutions that a password might be employing";
    t.deepEquals(
      matching.relevant_l33t_subtable(pw, test_table),
      expected,
      msg
    );
  }

  for (const [table, subs] of [
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
    msg =
      "enumerates the different sets of l33t substitutions a password might be using";
    t.deepEquals(matching.enumerate_l33t_subs(table), subs, msg);
  }

  const lm = (pw: string) => matching.l33t_match(pw, dicts, test_table);
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

  t.deepEquals(lm(""), [], "doesn't match ''");
  t.deepEquals(lm("password"), [], "doesn't match pure dictionary words");
  for ({ password, pattern, word, dictionary_name, rank, ij, sub } of [
    {
      password: "p4ssword",
      pattern: "p4ssword",
      word: "password",
      dictionary_name: "words",
      rank: 3,
      ij: [0, 7],
      sub: { "4": "a" },
    },
    {
      password: "p@ssw0rd",
      pattern: "p@ssw0rd",
      word: "password",
      dictionary_name: "words",
      rank: 3,
      ij: [0, 7],
      sub: { "@": "a", "0": "o" },
    },
    {
      password: "aSdfO{G0asDfO",
      pattern: "{G0",
      word: "cgo",
      dictionary_name: "words2",
      rank: 1,
      ij: [5, 7],
      sub: { "{": "c", "0": "o" },
    },
  ]) {
    msg = "matches against common l33t substitutions";
    check_matches(msg, t, lm(password), "dictionary", [pattern], [ij], {
      l33t: [true],
      sub: [sub],
      matched_word: [word],
      rank: [rank],
      dictionary_name: [dictionary_name],
    });
  }

  let matches = lm("@a(go{G0");
  msg = "matches against overlapping l33t patterns";
  check_matches(
    msg,
    t,
    matches,
    "dictionary",
    ["@a(", "(go", "{G0"],
    [
      [0, 2],
      [2, 4],
      [5, 7],
    ],
    {
      l33t: [true, true, true],
      sub: [{ "@": "a", "(": "c" }, { "(": "c" }, { "{": "c", "0": "o" }],
      matched_word: ["aac", "cgo", "cgo"],
      rank: [1, 1, 1],
      dictionary_name: ["words", "words2", "words2"],
    }
  );

  msg =
    "doesn't match when multiple l33t substitutions are needed for the same letter";
  t.deepEqual(lm("p4@ssword"), [], msg);

  msg = "doesn't match single-character l33ted words";
  matches = matching.l33t_match("4 1 @");
  t.deepEqual(matches, [], msg);

  // known issue: subsets of substitutions aren't tried.
  // for long inputs, trying every subset of every possible substitution could quickly get large,
  // but there might be a performant way to fix.
  // (so in this example: {'4': a, '0': 'o'} is detected as a possible sub,
  // but the subset {'4': 'a'} isn't tried, missing the match for asdf0.)
  // TODO: consider partially fixing by trying all subsets of size 1 and maybe 2
  msg = "doesn't match with subsets of possible l33t substitutions";
  t.deepEqual(lm("4sdf0"), [], msg);
  return t.end();
});

test("spatial matching", function (t) {
  let msg: string;
  for (const password of ["", "/", "qw", "*/"]) {
    msg = "doesn't match 1- and 2-character spatial patterns";
    t.deepEqual(matching.spatial_match(password), [], msg);
  }

  // for testing, make a subgraph that contains a single keyboard
  let _graphs: Record<string, Record<string, (string | null)[]>> = {
    qwerty: adjacency_graphs.qwerty,
  };
  const pattern = "6tfGHJ";
  let matches = matching.spatial_match(`rz!${pattern}%z`, _graphs);
  msg = "matches against spatial patterns surrounded by non-spatial patterns";
  check_matches(
    msg,
    t,
    matches,
    "spatial",
    [pattern],
    [[3, 3 + pattern.length - 1]],
    {
      graph: ["qwerty"],
      turns: [2],
      shifted_count: [3],
    }
  );

  for (const [pattern, keyboard, graph, turns, shifts] of [
    ["12345", "qwerty", adjacency_graphs.qwerty, 1, 0],
    ["@WSX", "qwerty", adjacency_graphs.qwerty, 1, 4],
    ["6tfGHJ", "qwerty", adjacency_graphs.qwerty, 2, 3],
    ["hGFd", "qwerty", adjacency_graphs.qwerty, 1, 2],
    ["/;p09876yhn", "qwerty", adjacency_graphs.qwerty, 3, 0],
    ["Xdr%", "qwerty", adjacency_graphs.qwerty, 1, 2],
    ["159-", "keypad", adjacency_graphs.keypad, 1, 0],
    ["*84", "keypad", adjacency_graphs.keypad, 1, 0],
    ["/8520", "keypad", adjacency_graphs.keypad, 1, 0],
    ["369", "keypad", adjacency_graphs.keypad, 1, 0],
    ["/963.", "mac_keypad", adjacency_graphs.mac_keypad, 1, 0],
    ["*-632.0214", "mac_keypad", adjacency_graphs.mac_keypad, 9, 0],
    ["aoEP%yIxkjq:", "dvorak", adjacency_graphs.dvorak, 4, 5],
    [";qoaOQ:Aoq;a", "dvorak", adjacency_graphs.dvorak, 11, 4],
  ] as [string, string, Record<string, string[]>, number, number][]) {
    _graphs = {
      [keyboard]: graph,
    };
    matches = matching.spatial_match(pattern, _graphs);
    msg = `matches '${pattern}' as a ${keyboard} pattern`;
    check_matches(
      msg,
      t,
      matches,
      "spatial",
      [pattern],
      [[0, pattern.length - 1]],
      {
        graph: [keyboard],
        turns: [turns],
        shifted_count: [shifts],
      }
    );
  }
  return t.end();
});

test("sequence matching", function (t) {
  for (const password of ["", "a", "1"]) {
    const msg = `doesn't match length-${password.length} sequences`;
    t.deepEqual(matching.sequence_match(password), [], msg);
  }

  let matches = matching.sequence_match("abcbabc");
  const msg = "matches overlapping patterns";
  check_matches(
    msg,
    t,
    matches,
    "sequence",
    ["abc", "cba", "abc"],
    [
      [0, 2],
      [2, 4],
      [4, 6],
    ],
    { ascending: [true, false, true] }
  );

  const prefixes = ["!", "22"];
  const suffixes = ["!", "22"];
  const pattern = "jihg";
  for (const [password, i, j] of Array.from(
    genpws(pattern, prefixes, suffixes)
  )) {
    matches = matching.sequence_match(password);
    const msg = `matches embedded sequence patterns ${password}`;
    check_matches(msg, t, matches, "sequence", [pattern], [[i, j]], {
      sequence_name: ["lower"],
      ascending: [false],
    });
  }

  for (const [pattern, name, is_ascending] of [
    ["ABC", "upper", true],
    ["CBA", "upper", false],
    ["PQR", "upper", true],
    ["RQP", "upper", false],
    ["XYZ", "upper", true],
    ["ZYX", "upper", false],
    ["abcd", "lower", true],
    ["dcba", "lower", false],
    ["jihg", "lower", false],
    ["wxyz", "lower", true],
    ["zxvt", "lower", false],
    ["0369", "digits", true],
    ["97531", "digits", false],
  ] as [string, string, boolean][]) {
    matches = matching.sequence_match(pattern);
    const msg = `matches '${pattern}' as a '${name}' sequence`;
    check_matches(
      msg,
      t,
      matches,
      "sequence",
      [pattern],
      [[0, pattern.length - 1]],
      {
        sequence_name: [name],
        ascending: [is_ascending],
      }
    );
  }
  return t.end();
});

test("repeat matching", function (t) {
  let matches, msg;
  for (const password of ["", "#"]) {
    msg = `doesn't match length-${password.length} repeat patterns`;
    t.deepEqual(matching.repeat_match(password), [], msg);
  }

  // test single-character repeats
  const prefixes = ["@", "y4@"];
  const suffixes = ["u", "u%7"];
  let pattern = "&&&&&";
  for (const [password, i, j] of Array.from(
    genpws(pattern, prefixes, suffixes)
  )) {
    matches = matching.repeat_match(password);
    msg = "matches embedded repeat patterns";
    check_matches(msg, t, matches, "repeat", [pattern], [[i, j]], {
      base_token: ["&"],
    });
  }

  for (const length of [3, 12]) {
    for (const chr of ["a", "Z", "4", "&"]) {
      pattern = Array(length + 1).join(chr);
      matches = matching.repeat_match(pattern);
      msg = `matches repeats with base character '${chr}'`;
      check_matches(
        msg,
        t,
        matches,
        "repeat",
        [pattern],
        [[0, pattern.length - 1]],
        { base_token: [chr] }
      );
    }
  }

  matches = matching.repeat_match("BBB1111aaaaa@@@@@@");
  const patterns = ["BBB", "1111", "aaaaa", "@@@@@@"];
  msg = "matches multiple adjacent repeats";
  check_matches(
    msg,
    t,
    matches,
    "repeat",
    patterns,
    [
      [0, 2],
      [3, 6],
      [7, 11],
      [12, 17],
    ],
    { base_token: ["B", "1", "a", "@"] }
  );

  matches = matching.repeat_match("2818BBBbzsdf1111@*&@!aaaaaEUDA@@@@@@1729");
  msg = "matches multiple repeats with non-repeats in-between";
  check_matches(
    msg,
    t,
    matches,
    "repeat",
    patterns,
    [
      [4, 6],
      [12, 15],
      [21, 25],
      [30, 35],
    ],
    { base_token: ["B", "1", "a", "@"] }
  );

  // test multi-character repeats
  pattern = "abab";
  matches = matching.repeat_match(pattern);
  msg = "matches multi-character repeat pattern";
  check_matches(
    msg,
    t,
    matches,
    "repeat",
    [pattern],
    [[0, pattern.length - 1]],
    { base_token: ["ab"] }
  );

  pattern = "aabaab";
  matches = matching.repeat_match(pattern);
  msg = "matches aabaab as a repeat instead of the aa prefix";
  check_matches(
    msg,
    t,
    matches,
    "repeat",
    [pattern],
    [[0, pattern.length - 1]],
    { base_token: ["aab"] }
  );

  pattern = "abababab";
  matches = matching.repeat_match(pattern);
  msg = "identifies ab as repeat string, even though abab is also repeated";
  check_matches(
    msg,
    t,
    matches,
    "repeat",
    [pattern],
    [[0, pattern.length - 1]],
    { base_token: ["ab"] }
  );
  return t.end();
});

test("regex matching", function (t) {
  for (const [pattern, name] of [
    ["1922", "recent_year"],
    ["2017", "recent_year"],
  ]) {
    const matches = matching.regex_match(pattern);
    const msg = `matches ${pattern} as a ${name} pattern`;
    check_matches(
      msg,
      t,
      matches,
      "regex",
      [pattern],
      [[0, pattern.length - 1]],
      { regex_name: [name] }
    );
  }
  return t.end();
});

test("date matching", function (t) {
  let day, matches, month, msg, password, year;
  let i, j;
  for (const sep of ["", " ", "-", "/", "\\", "_", "."]) {
    password = `13${sep}2${sep}1921`;
    matches = matching.date_match(password);
    msg = `matches dates that use '${sep}' as a separator`;
    check_matches(
      msg,
      t,
      matches,
      "date",
      [password],
      [[0, password.length - 1]],
      {
        separator: [sep],
        year: [1921],
        month: [2],
        day: [13],
      }
    );
  }

  for (const order of ["mdy", "dmy", "ymd", "ydm"]) {
    const [d, m, y] = Array.from([8, 8, 88]);
    password = order
      .replace("y", y.toString())
      .replace("m", m.toString())
      .replace("d", d.toString());
    matches = matching.date_match(password);
    msg = `matches dates with '${order}' format`;
    check_matches(
      msg,
      t,
      matches,
      "date",
      [password],
      [[0, password.length - 1]],
      {
        separator: [""],
        year: [1988],
        month: [8],
        day: [8],
      }
    );
  }

  password = "111504";
  matches = matching.date_match(password);
  msg = "matches the date with year closest to REFERENCE_YEAR when ambiguous";
  check_matches(
    msg,
    t,
    matches,
    "date",
    [password],
    [[0, password.length - 1]],
    {
      separator: [""],
      year: [2004], // picks '04' -> 2004 as year, not '1504'
      month: [11],
      day: [15],
    }
  );

  for ([day, month, year] of [
    [1, 1, 1999],
    [11, 8, 2000],
    [9, 12, 2005],
    [22, 11, 1551],
  ]) {
    password = `${year}${month}${day}`;
    matches = matching.date_match(password);
    msg = `matches ${password}`;
    check_matches(
      msg,
      t,
      matches,
      "date",
      [password],
      [[0, password.length - 1]],
      {
        separator: [""],
        year: [year],
      }
    );
    password = `${year}.${month}.${day}`;
    matches = matching.date_match(password);
    msg = `matches ${password}`;
    check_matches(
      msg,
      t,
      matches,
      "date",
      [password],
      [[0, password.length - 1]],
      {
        separator: ["."],
        year: [year],
      }
    );
  }

  password = "02/02/02";
  matches = matching.date_match(password);
  msg = "matches zero-padded dates";
  check_matches(
    msg,
    t,
    matches,
    "date",
    [password],
    [[0, password.length - 1]],
    {
      separator: ["/"],
      year: [2002],
      month: [2],
      day: [2],
    }
  );

  const prefixes = ["a", "ab"];
  const suffixes = ["!"];
  const pattern = "1/1/91";
  for ([password, i, j] of Array.from(genpws(pattern, prefixes, suffixes))) {
    matches = matching.date_match(password);
    msg = "matches embedded dates";
    check_matches(msg, t, matches, "date", [pattern], [[i, j]], {
      year: [1991],
      month: [1],
      day: [1],
    });
  }

  matches = matching.date_match("12/20/1991.12.20");
  msg = "matches overlapping dates";
  check_matches(
    msg,
    t,
    matches,
    "date",
    ["12/20/1991", "1991.12.20"],
    [
      [0, 9],
      [6, 15],
    ],
    {
      separator: ["/", "."],
      year: [1991, 1991],
      month: [12, 12],
      day: [20, 20],
    }
  );

  matches = matching.date_match("912/20/919");
  msg = "matches dates padded by non-ambiguous digits";
  check_matches(msg, t, matches, "date", ["12/20/91"], [[1, 8]], {
    separator: ["/"],
    year: [1991],
    month: [12],
    day: [20],
  });
  return t.end();
});

test("omnimatch", function (t) {
  t.deepEquals(matching.omnimatch(""), [], "doesn't match ''");
  const password = "r0sebudmaelstrom11/20/91aaaa";
  const matches = matching.omnimatch(password);
  for (const value of [
    ["dictionary", [0, 6]],
    ["dictionary", [7, 15]],
    ["date", [16, 23]],
    ["repeat", [24, 27]],
  ] as [string, number[]][]) {
    const pattern_name = value[0],
      [i, j] = Array.from(value[1]);
    let included = false;
    for (const match of Array.from(matches)) {
      if (match.i === i && match.j === j && match.pattern === pattern_name) {
        included = true;
      }
    }
    const msg = `for ${password}, matches a ${pattern_name} pattern at [${i}, ${j}]`;
    t.ok(included, msg);
  }
  return t.end();
});
