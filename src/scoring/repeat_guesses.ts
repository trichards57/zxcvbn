import { IRepeatMatch } from "../matching/repeat_match";

export function repeat_guesses(match: IRepeatMatch): number {
  return match.base_guesses * match.repeat_count;
}