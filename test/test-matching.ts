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
