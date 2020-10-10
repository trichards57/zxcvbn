import { IRegexMatch } from "../matching/regex_match";
import { MIN_YEAR_SPACE, REFERENCE_YEAR } from "./support";

export function regex_guesses(match: IRegexMatch): number {
  const char_class_bases: { [index: string]: number } = {
    alpha_lower: 26,
    alpha_upper: 26,
    alpha: 52,
    alphanumeric: 62,
    digits: 10,
    symbols: 33,
  };
  if (match.regex_name in char_class_bases) {
    return Math.pow(char_class_bases[match.regex_name], match.token.length);
  } else {
    let year_space: number;
    switch (match.regex_name) {
      case "recent_year":
        // conservative estimate of year space: num years from REFERENCE_YEAR.
        // if year is close to REFERENCE_YEAR, estimate a year space of MIN_YEAR_SPACE.
        year_space = Math.abs(parseInt(match.regex_match[0]) - REFERENCE_YEAR);
        year_space = Math.max(year_space, MIN_YEAR_SPACE);
        return year_space;
    }
  }
  return 0;
}
