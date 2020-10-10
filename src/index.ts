import { IAnyMatch, omnimatch } from "./matching";
import { estimate_attack_times, IAttackTimes } from "./time_estimates";
import { get_feedback, IFeedbackItem } from "./feedback";
import { most_guessable_match_sequence } from "./scoring";
import { set_user_input_dictionary } from "./matching/dictionary_match";

const time = () => new Date().getTime();

interface IZXCVBNResult extends IAttackTimes {
  sequence: IAnyMatch[];
  guesses: number;
  guesses_log10: number;
  password: string;
  score: number;
  calc_time: number;
  fb: IFeedbackItem;
}

export default function zxcvbn(
  password: string,
  user_inputs: (string | number | boolean)[] = []
): IZXCVBNResult {
  const start = time();
  // reset the user inputs matcher on a per-request basis to keep things stateless
  const sanitized_inputs: string[] = [];
  for (const arg of user_inputs) {
    if (typeof arg in ["string", "number", "boolean"]) {
      sanitized_inputs.push(arg.toString().toLowerCase());
    }
  }
  set_user_input_dictionary(sanitized_inputs);

  const matches = omnimatch(password);
  const result = most_guessable_match_sequence(password, matches);
  const calc_time = time() - start;
  const attack_times = estimate_attack_times(result.guesses);
  const fb = get_feedback(result.score, result.sequence);

  return { ...result, ...attack_times, calc_time, fb };
}
