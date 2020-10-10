import { IMatch } from "./support";

const MAX_DELTA = 5;

export interface ISequenceMatch extends IMatch {
  pattern: "sequence";
  sequence_name: string;
  sequence_space: number;
  ascending: boolean;
}

function update(
  password: string,
  i: number,
  j: number,
  result: ISequenceMatch[],
  delta: number
) {
  if (j - i > 1 || Math.abs(delta) === 1) {
    const middle = Math.abs(delta);
    if (0 < middle && middle <= MAX_DELTA) {
      let sequence_name, sequence_space;
      const token = password.slice(i, j + 1);
      if (/^[a-z]+$/.test(token)) {
        sequence_name = "lower";
        sequence_space = 26;
      } else if (/^[A-Z]+$/.test(token)) {
        sequence_name = "upper";
        sequence_space = 26;
      } else if (/^\d+$/.test(token)) {
        sequence_name = "digits";
        sequence_space = 10;
      } else {
        // conservatively stick with roman alphabet size.
        // (this could be improved)
        sequence_name = "unicode";
        sequence_space = 26;
      }
      result.push({
        pattern: "sequence",
        i,
        j,
        token: password.slice(i, j + 1),
        sequence_name,
        sequence_space,
        ascending: delta > 0,
      });
    }
  }
  return;
}

export function sequence_match(password: string): ISequenceMatch[] {
  // Identifies sequences by looking for repeated differences in unicode code point.
  // this allows skipping, such as 9753, and also matches some extended unicode sequences
  // such as Greek and Cyrillic alphabets.
  //
  // for example, consider the input 'abcdb975zy'
  //
  // password: a   b   c   d   b    9   7   5   z   y
  // index:    0   1   2   3   4    5   6   7   8   9
  // delta:      1   1   1  -2  -41  -2  -2  69   1
  //
  // expected result:
  // [(i, j, delta), ...] = [(0, 3, 1), (5, 7, -2), (8, 9, 1)]

  if (password.length === 1) {
    return [];
  }

  const result: ISequenceMatch[] = [];
  let i = 0;
  let last_delta: null | number = null;

  for (let k = 1; k < password.length; k++) {
    const delta = password.charCodeAt(k) - password.charCodeAt(k - 1);
    if (last_delta == null) {
      last_delta = delta;
    }
    if (delta === last_delta) {
      continue;
    }
    const j = k - 1;
    update(password, i, j, result, last_delta);
    i = j;
    last_delta = delta;
  }
  update(password, i, password.length - 1, result, last_delta || 0);
  return result;
}
