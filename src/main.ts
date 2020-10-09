/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import matching from "./matching";
import scoring from "./scoring";
import time_estimates from "./time_estimates";
import feedback from "./feedback";

const time = () => new Date().getTime();

const zxcvbn = function (password: string, user_inputs: string[]) {
  if (user_inputs == null) {
    user_inputs = [];
  }
  const start = time();
  // reset the user inputs matcher on a per-request basis to keep things stateless
  const sanitized_inputs: string[] = [];
  for (const arg of Array.from(user_inputs)) {
    if (["string", "number", "boolean"].includes(typeof arg)) {
      sanitized_inputs.push(arg.toString().toLowerCase());
    }
  }
  matching.set_user_input_dictionary(sanitized_inputs);

  const matches = matching.omnimatch(password);
  const result = scoring.most_guessable_match_sequence(password, matches);
  const calc_time = time() - start;
  const attack_times = time_estimates.estimate_attack_times(result.guesses);
  const fb = feedback.get_feedback(result.score, result.sequence);

  return { ...result, ...attack_times, calc_time, fb };
};

module.exports = zxcvbn;
