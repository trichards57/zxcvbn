import { IDateMatch } from "../matching/date_match";
import { MIN_YEAR_SPACE, REFERENCE_YEAR } from "./support";

export function date_guesses(match: IDateMatch): number {
  // base guesses: (year distance from REFERENCE_YEAR) * num_days * num_years
  const year_space = Math.max(
    Math.abs(match.year - REFERENCE_YEAR),
    MIN_YEAR_SPACE
  );
  let guesses = year_space * 365;
  // add factor of 4 for separator selection (one of ~4 choices)
  if (match.separator) {
    guesses *= 4;
  }
  return guesses;
}
