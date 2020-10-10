interface ICrackTimes {
  online_throttling_100_per_hour: number;
  online_no_throttling_10_per_second: number;
  offline_slow_hashing_1e4_per_second: number;
  offline_fast_hashing_1e10_per_second: number;
  [index: string]: number;
}

type ICrackTimesDisplay = { [P in keyof ICrackTimes]?: string };

export interface IAttackTimes {
  crack_times_seconds: ICrackTimes;
  crack_times_display: ICrackTimesDisplay;
  score: number;
}

export function estimate_attack_times(guesses: number): IAttackTimes {
  const crack_times_seconds: ICrackTimes = {
    online_throttling_100_per_hour: guesses / (100 / 3600),
    online_no_throttling_10_per_second: guesses / 10,
    offline_slow_hashing_1e4_per_second: guesses / 1e4,
    offline_fast_hashing_1e10_per_second: guesses / 1e10,
  };

  const crack_times_display: ICrackTimesDisplay = {};
  for (const scenario in crack_times_seconds) {
    const seconds = crack_times_seconds[scenario];
    crack_times_display[scenario] = display_time(seconds);
  }

  return {
    crack_times_seconds,
    crack_times_display,
    score: guesses_to_score(guesses),
  };
}

export function guesses_to_score(guesses: number): 0 | 1 | 2 | 3 | 4 {
  const DELTA = 5;
  if (guesses < 1e3 + DELTA) {
    // risky password: "too guessable"
    return 0;
  } else if (guesses < 1e6 + DELTA) {
    // modest protection from throttled online attacks: "very guessable"
    return 1;
  } else if (guesses < 1e8 + DELTA) {
    // modest protection from unthrottled online attacks: "somewhat guessable"
    return 2;
  } else if (guesses < 1e10 + DELTA) {
    // modest protection from offline attacks: "safely unguessable"
    // assuming a salted, slow hash function like bcrypt, scrypt, PBKDF2, argon, etc
    return 3;
  } else {
    // strong protection from offline attacks under same scenario: "very unguessable"
    return 4;
  }
}

export function display_time(seconds: number): string {
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const month = day * 31;
  const year = month * 12;
  const century = year * 100;

  let display_num: number | undefined;
  let display_str: string;

  if (seconds < 1) {
    display_str = "less than a second";
  } else if (seconds < minute) {
    display_num = Math.round(seconds);
    display_str = `${display_num} second`;
  } else if (seconds < hour) {
    display_num = Math.round(seconds / minute);
    display_str = `${display_num} minute`;
  } else if (seconds < day) {
    display_num = Math.round(seconds / hour);
    display_str = `${display_num} hour`;
  } else if (seconds < month) {
    display_num = Math.round(seconds / day);
    display_str = `${display_num} day`;
  } else if (seconds < year) {
    display_num = Math.round(seconds / month);
    display_str = `${display_num} month`;
  } else if (seconds < century) {
    display_num = Math.round(seconds / year);
    display_str = `${display_num} year`;
  } else {
    display_str = "centuries";
  }

  if (display_num !== undefined && display_num !== 1) {
    return display_str + "s";
  }
  return display_str;
}
