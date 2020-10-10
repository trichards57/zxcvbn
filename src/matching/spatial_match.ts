import { IMatch, sorted } from "./support";
import * as adjacency_graphs from "../adjacency_graphs";

export interface ISpatialMatch extends IMatch {
  pattern: "spatial";
  graph: string;
  turns: number;
  base_token?: string;
  regex_name?: string;
  shifted_count: number;
}

// ------------------------------------------------------------------------------
// spatial match (qwerty/dvorak/keypad) -----------------------------------------
// ------------------------------------------------------------------------------
export function spatial_match(
  password: string,
  _graphs: Record<string, Record<string, (string | null)[]>> = {
    ...adjacency_graphs,
  }
): ISpatialMatch[] {
  return sorted(
    ([] as ISpatialMatch[]).concat(
      ...Object.keys(_graphs).map((graph_name) =>
        spatial_match_helper(password, _graphs[graph_name], graph_name)
      )
    )
  );
}

const SHIFTED_RX = /[~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?]/;

export function spatial_match_helper(
  password: string,
  graph: Record<string, (string | null)[]>,
  graph_name: string
): ISpatialMatch[] {
  const matches: ISpatialMatch[] = [];
  let i = 0;
  while (i < password.length - 1) {
    let shifted_count: number;
    let j = i + 1;
    let last_direction: number | null = null;
    let turns = 0;
    if (
      ["qwerty", "dvorak"].includes(graph_name) &&
      SHIFTED_RX.exec(password.charAt(i))
    ) {
      // initial character is shifted
      shifted_count = 1;
    } else {
      shifted_count = 0;
    }
    for (;;) {
      const prev_char = password.charAt(j - 1);
      let found = false;
      let found_direction = -1;
      let cur_direction = -1;
      const adjacents = graph[prev_char] || [];
      // consider growing pattern by one character if j hasn't gone over the edge.
      if (j < password.length) {
        const cur_char = password[j];
        for (const adj of adjacents) {
          cur_direction += 1;
          if (adj && adj.indexOf(cur_char) !== -1) {
            found = true;
            found_direction = cur_direction;
            if (adj.indexOf(cur_char) === 1) {
              // index 1 in the adjacency means the key is shifted,
              // 0 means unshifted: A vs a, % vs 5, etc.
              // for example, 'q' is adjacent to the entry '2@'.
              // @ is shifted w/ index 1, 2 is unshifted.
              shifted_count += 1;
            }
            if (last_direction !== found_direction) {
              // adding a turn is correct even in the initial case when last_direction is null:
              // every spatial pattern starts with a turn.
              turns += 1;
              last_direction = found_direction;
            }
            break;
          }
        }
      }
      // if the current pattern continued, extend j and try to grow again
      if (found) {
        j += 1;
        // otherwise push the pattern discovered so far, if any...
      } else {
        if (j - i > 2) {
          // don't consider length 1 or 2 chains.
          matches.push({
            pattern: "spatial",
            i,
            j: j - 1,
            token: password.slice(i, j),
            graph: graph_name,
            turns,
            shifted_count,
          });
        }
        // ...and then start a new search for the rest of the password.
        i = j;
        break;
      }
    }
  }
  return matches;
}
