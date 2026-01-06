import { get_feedback, type IFeedbackItem } from "./feedback";
import { type IAnyMatch, omnimatch } from "./matching";
import { set_user_input_dictionary } from "./matching/dictionary_match";
import { most_guessable_match_sequence } from "./scoring";
import { estimate_attack_times, type IAttackTimes } from "./time_estimates";

const time = () => new Date().getTime();

export interface IZXCVBNResult extends IAttackTimes {
  sequence: IAnyMatch[];
  guesses: number;
  guesses_log10: number;
  password: string;
  score: number;
  calc_time: number;
  feedback: IFeedbackItem;
}

export function zxcvbn(
  password: string,
  user_inputs: (string | number | boolean)[] = [],
): IZXCVBNResult {
  const start = time();
  // reset the user inputs matcher on a per-request basis to keep things stateless
  const sanitized_inputs: string[] = [];
  for (const arg of user_inputs) {
    sanitized_inputs.push(arg.toString().toLowerCase());
  }
  set_user_input_dictionary(sanitized_inputs);

  const matches = omnimatch(password);
  const result = most_guessable_match_sequence(password, matches);
  const calc_time = time() - start;
  const attack_times = estimate_attack_times(result.guesses);
  const fb = get_feedback(result.score, result.sequence);

  return { ...result, ...attack_times, calc_time, feedback: fb };
}

export default zxcvbn;
