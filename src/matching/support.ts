export interface ISortable {
  i: number;
  j: number;
}

export interface IMatch extends ISortable {
  token: string;
  pattern:
    | "repeat"
    | "sequence"
    | "dictionary"
    | "regex"
    | "date"
    | "spatial"
    | "bruteforce";
  guesses?: number;
  guesses_log10?: number;
  [index: string]: unknown;
}

export function empty(obj: Record<string, unknown> | unknown[]): boolean {
  return Object.keys(obj).length === 0;
}

export function translate(
  string: string,
  chr_map: Record<string, string>
): string {
  return string
    .split("")
    .map((chr: string) => chr_map[chr] || chr)
    .join("");
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
} // mod impl that works for negative numbers

export function sorted<T extends ISortable>(matches: T[]): T[] {
  // sort on i primary, j secondary
  return matches.sort((m1, m2) => m1.i - m2.i || m1.j - m2.j);
}
