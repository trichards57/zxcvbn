/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const time_estimates = {
  estimate_attack_times(guesses) {
    const crack_times_seconds = {
      online_throttling_100_per_hour: guesses / (100 / 3600),
      online_no_throttling_10_per_second: guesses / 10,
      offline_slow_hashing_1e4_per_second: guesses / 1e4,
      offline_fast_hashing_1e10_per_second: guesses / 1e10
    };

    const crack_times_display = {};
    for (let scenario in crack_times_seconds) {
      const seconds = crack_times_seconds[scenario];
      crack_times_display[scenario] = this.display_time(seconds);
    }

    return {
      crack_times_seconds,
      crack_times_display,
      score: this.guesses_to_score(guesses)
    };
  },


  guesses_to_score(guesses) {
    const DELTA = 5;
    if (guesses < (1e3 + DELTA)) {
      // risky password: "too guessable"
      return 0;
    } else if (guesses < (1e6 + DELTA)) {
      // modest protection from throttled online attacks: "very guessable"
      return 1;
    } else if (guesses < (1e8 + DELTA)) {
      // modest protection from unthrottled online attacks: "somewhat guessable"
      return 2;
    } else if (guesses < (1e10 + DELTA)) {
      // modest protection from offline attacks: "safely unguessable"
      // assuming a salted, slow hash function like bcrypt, scrypt, PBKDF2, argon, etc
      return 3;
    } else {
      // strong protection from offline attacks under same scenario: "very unguessable"
      return 4;
    }
  },

  display_time(seconds) {
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const month = day * 31;
    const year = month * 12;
    const century = year * 100;
    let [display_num, display_str] = Array.from((() => {
      let base;
      if (seconds < 1) {
      return [null, 'less than a second'];
    } else if (seconds < minute) {
      base = Math.round(seconds);
      return [base, `${base} second`];
    } else if (seconds < hour) {
      base = Math.round(seconds / minute);
      return [base, `${base} minute`];
    } else if (seconds < day) {
      base = Math.round(seconds / hour);
      return [base, `${base} hour`];
    } else if (seconds < month) {
      base = Math.round(seconds / day);
      return [base, `${base} day`];
    } else if (seconds < year) {
      base = Math.round(seconds / month);
      return [base, `${base} month`];
    } else if (seconds < century) {
      base = Math.round(seconds / year);
      return [base, `${base} year`];
    } else {
      return [null, 'centuries'];
    }
    })());
    if ((display_num != null) && (display_num !== 1)) { display_str += 's'; }
    return display_str;
  }
};

module.exports = time_estimates;
