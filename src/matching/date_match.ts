import { REFERENCE_YEAR } from "../scoring/support";
import { IMatch, sorted } from "./support";

interface IDM {
  day: number;
  month: number;
}

interface IDMY extends IDM {
  year: number;
}

export interface IDateMatch extends IMatch {
  pattern: "date";
  separator: string;
  year: number;
  month: number;
  day: number;
  has_full_year?: boolean;
}

const DATE_MAX_YEAR = 2050;
const DATE_MIN_YEAR = 1000;
const DATE_SPLITS: Record<number, [number, number][]> = {
  4: [
    // for length-4 strings, eg 1191 or 9111, two ways to split:
    [1, 2], // 1 1 91 (2nd split starts at index 1, 3rd at index 2)
    [2, 3], // 91 1 1
  ],
  5: [
    [1, 3], // 1 11 91
    [2, 3], // 11 1 91
  ],
  6: [
    [1, 2], // 1 1 1991
    [2, 4], // 11 11 91
    [4, 5], // 1991 1 1
  ],
  7: [
    [1, 3], // 1 11 1991
    [2, 3], // 11 1 1991
    [4, 5], // 1991 1 11
    [4, 6], // 1991 11 1
  ],
  8: [
    [2, 4], // 11 11 1991
    [4, 6], // 1991 11 11
  ],
};

/**
 * Attempts to match a string with a date.
 *
 * @remarks
 * A date is recognised if it is:
 * - Any 3-tuple that starts or ends with a 2- or 4-digit year
 * - With 2 or 0 separator chars (1.1.91 or 1191)
 * - Maybe zero-padded (01-01-91 vs 1-1-91)
 * - Has a month between 1 and 12
 * - Has a day between 1 and 31
 *
 * Note: This isn't true date parsing, and allows invalid dates like 31 Feb or 29 Feb on non-leap-years.
 *
 * @param password - The string to examine
 */
export function date_match(password: string): IDateMatch[] {
  // recipe:
  // start with regex to find maybe-dates, then attempt to map the integers
  // onto month-day-year to filter the maybe-dates into dates.
  // finally, remove matches that are substrings of other matches to reduce noise.
  //
  // note: instead of using a lazy or greedy regex to find many dates over the full string,
  // this uses a ^...$ regex against every substring of the password -- less performant but leads
  // to every possible date match.
  const matches: IDateMatch[] = [];
  const maybe_date_no_separator = /^\d{4,8}$/;
  const maybe_date_with_separator = new RegExp(`\
^\
(\\d{1,4})\
([\\s/\\\\_.-])\
(\\d{1,2})\
\\2\
(\\d{1,4})\
$\
`);

  // dates without separators are between length 4 '1191' and 8 '11111991'
  for (let i = 0; i <= password.length - 4; i++) {
    for (let j = i + 3; j <= i + 7 && j < password.length; j++) {
      const token = password.slice(i, j + 1);
      if (!maybe_date_no_separator.exec(token)) {
        continue;
      }
      const candidates: IDMY[] = DATE_SPLITS[token.length]
        .map(([k, l]) =>
          map_ints_to_dmy([
            parseInt(token.slice(0, k)),
            parseInt(token.slice(k, l)),
            parseInt(token.slice(l)),
          ])
        )
        .filter((d) => d) as IDMY[];
      if (!(candidates.length > 0)) continue;

      // At this point: different possible dmy mappings for the same i,j substring.
      // Match the candidate date that likely takes the fewest guesses: a year closest to REFERENCE_YEAR.
      // For example: considering '111504', prefer 11-15-04 to 1-1-1504 (interpreting '04' as 2004)
      const [first, ...rest] = candidates;
      let best_candidate = first;
      const metric = (candidate: IDMY) =>
        Math.abs(candidate.year - REFERENCE_YEAR);
      let min_distance = metric(candidates[0]);
      for (const candidate of rest) {
        const distance = metric(candidate);
        if (distance < min_distance) {
          best_candidate = candidate;
          min_distance = distance;
        }
      }
      matches.push({
        pattern: "date",
        token,
        i,
        j,
        separator: "",
        ...best_candidate,
      });
    }
  }

  // dates with separators are between length 6 '1/1/91' and 10 '11/11/1991'
  for (let i = 0; i < password.length; i++) {
    for (let j = i + 5; j <= i + 9 && j < password.length; j++) {
      const token = password.slice(i, j + 1);
      const rx_match = maybe_date_with_separator.exec(token);
      if (!rx_match) continue;

      const dmy = map_ints_to_dmy([
        parseInt(rx_match[1]),
        parseInt(rx_match[3]),
        parseInt(rx_match[4]),
      ]);
      if (!dmy) continue;

      matches.push({
        pattern: "date",
        token,
        i,
        j,
        separator: rx_match[2],
        ...dmy,
      });
    }
  }

  // matches now contains all valid date strings in a way that is tricky to capture
  // with regexes only. while thorough, it will contain some unintuitive noise:
  //
  // '2015_06_04', in addition to matching 2015_06_04, will also contain
  // 5(!) other date matches: 15_06_04, 5_06_04, ..., even 2015 (matched as 5/1/2020)
  //
  // to reduce noise, remove date matches that are strict substrings of others
  return sorted(
    matches.filter(function (match) {
      let is_submatch = false;
      for (const other_match of matches) {
        if (match === other_match) continue;

        if (other_match.i <= match.i && other_match.j >= match.j) {
          is_submatch = true;
          break;
        }
      }
      return !is_submatch;
    })
  );
}

function map_ints_to_dmy(ints: number[]): IDMY | undefined {
  // given a 3-tuple, discard if:
  //   middle int is over 31 (for all dmy formats, years are never allowed in the middle)
  //   middle int is zero
  //   any int is over the max allowable year
  //   any int is over two digits but under the min allowable year
  //   2 ints are over 31, the max allowable day
  //   2 ints are zero
  //   all ints are over 12, the max allowable month
  if (ints[1] > 31 || ints[1] <= 0) {
    return;
  }
  let over_12 = 0;
  let over_31 = 0;
  let under_1 = 0;
  for (const int of ints) {
    if ((99 < int && int < DATE_MIN_YEAR) || int > DATE_MAX_YEAR) {
      return;
    }
    if (int > 31) {
      over_31 += 1;
    }
    if (int > 12) {
      over_12 += 1;
    }
    if (int <= 0) {
      under_1 += 1;
    }
  }
  if (over_31 >= 2 || over_12 === 3 || under_1 >= 2) {
    return;
  }

  // first look for a four digit year: yyyy + daymonth or daymonth + yyyy
  const possible_year_splits = [
    { year: ints[2], rest: ints.slice(0, 2) },
    { year: ints[0], rest: ints.slice(1, 3) },
  ];
  for (const { year, rest } of possible_year_splits) {
    if (DATE_MIN_YEAR <= year && year <= DATE_MAX_YEAR) {
      const dm = map_ints_to_dm(rest);
      if (dm) {
        return {
          year,
          ...dm,
        };
      } else {
        // for a candidate that includes a four-digit year,
        // when the remaining ints don't match to a day and month,
        // it is not a date.
        return;
      }
    }
  }

  // given no four-digit year, two digit years are the most flexible int to match, so
  // try to parse a day-month out of ints[0..1] or ints[1..0]
  for (const { year: y, rest } of possible_year_splits) {
    const dm = map_ints_to_dm(rest);
    if (dm) {
      return {
        year: two_to_four_digit_year(y),
        ...dm,
      };
    }
  }
  return;
}

function map_ints_to_dm(ints: number[]): IDM | undefined {
  for (const [d, m] of [ints, [...ints].reverse()]) {
    if (1 <= d && d <= 31 && 1 <= m && m <= 12) {
      return {
        day: d,
        month: m,
      };
    }
  }
  return;
}

function two_to_four_digit_year(year: number): number {
  if (year > 99) {
    return year;
  } else if (year > 50) {
    // 87 -> 1987
    return year + 1900;
  } else {
    // 15 -> 2015
    return year + 2000;
  }
}
