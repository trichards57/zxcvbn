/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import scoring from "./scoring";
import { IAnyMatch, IDictionaryMatch } from "./matching";

interface IFeedbackItem {
  warning: string;
  suggestions: string[];
}

const feedback = {
  default_feedback: {
    warning: "",
    suggestions: [
      "Use a few words, avoid common phrases",
      "No need for symbols, digits, or uppercase letters",
    ],
  },

  get_feedback(score: number, sequence: IAnyMatch[]): IFeedbackItem {
    // starting feedback
    if (sequence.length === 0) {
      return this.default_feedback;
    }

    // no feedback if score is good or great.
    if (score > 2) {
      return {
        warning: "",
        suggestions: [],
      };
    }

    // tie feedback to the longest match for longer sequences
    let longest_match = sequence[0];
    for (const match of Array.from(sequence.slice(1))) {
      if (match.token.length > longest_match.token.length) {
        longest_match = match;
      }
    }
    let feedback = this.get_match_feedback(
      longest_match,
      sequence.length === 1
    );
    const extra_feedback =
      "Add another word or two. Uncommon words are better.";
    if (feedback != null) {
      feedback.suggestions.unshift(extra_feedback);
      if (feedback.warning == null) {
        feedback.warning = "";
      }
    } else {
      feedback = {
        warning: "",
        suggestions: [extra_feedback],
      };
    }
    return feedback;
  },

  get_match_feedback(
    match: IAnyMatch,
    is_sole_match: boolean
  ): IFeedbackItem | undefined {
    switch (match.pattern) {
      case "dictionary":
        return this.get_dictionary_match_feedback(match, is_sole_match);

      case "spatial":
        return {
          warning:
            match.turns === 1
              ? "Straight rows of keys are easy to guess"
              : "Short keyboard patterns are easy to guess",
          suggestions: ["Use a longer keyboard pattern with more turns"],
        };

      case "repeat":
        return {
          warning:
            match.base_token.length === 1
              ? 'Repeats like "aaa" are easy to guess'
              : 'Repeats like "abcabcabc" are only slightly harder to guess than "abc"',
          suggestions: ["Avoid repeated words and characters"],
        };

      case "sequence":
        return {
          warning: "Sequences like abc or 6543 are easy to guess",
          suggestions: ["Avoid sequences"],
        };

      case "regex":
        if (match.regex_name === "recent_year") {
          return {
            warning: "Recent years are easy to guess",
            suggestions: [
              "Avoid recent years",
              "Avoid years that are associated with you",
            ],
          };
        }
        break;

      case "date":
        return {
          warning: "Dates are often easy to guess",
          suggestions: ["Avoid dates and years that are associated with you"],
        };
    }
  },

  get_dictionary_match_feedback(
    match: IDictionaryMatch,
    is_sole_match: boolean
  ): IFeedbackItem {
    const warning = (() => {
      if (match.dictionary_name === "passwords") {
        if (is_sole_match && !match.l33t && !match.reversed) {
          if (match.rank <= 10) {
            return "This is a top-10 common password";
          } else if (match.rank <= 100) {
            return "This is a top-100 common password";
          } else {
            return "This is a very common password";
          }
        } else if (
          match.guesses_log10 != undefined &&
          match.guesses_log10 <= 4
        ) {
          return "This is similar to a commonly used password";
        }
      } else if (match.dictionary_name === "english_wikipedia") {
        if (is_sole_match) {
          return "A word by itself is easy to guess";
        }
      } else if (
        ["surnames", "male_names", "female_names"].includes(
          match.dictionary_name
        )
      ) {
        if (is_sole_match) {
          return "Names and surnames by themselves are easy to guess";
        } else {
          return "Common names and surnames are easy to guess";
        }
      } else {
        return "";
      }
    })();

    const suggestions: string[] = [];
    const word = match.token;
    if (word.match(scoring.START_UPPER)) {
      suggestions.push("Capitalization doesn't help very much");
    } else if (word.match(scoring.ALL_UPPER) && word.toLowerCase() !== word) {
      suggestions.push(
        "All-uppercase is almost as easy to guess as all-lowercase"
      );
    }

    if (match.reversed && match.token.length >= 4) {
      suggestions.push("Reversed words aren't much harder to guess");
    }
    if (match.l33t) {
      suggestions.push(
        "Predictable substitutions like '@' instead of 'a' don't help very much"
      );
    }

    const result = {
      warning: warning || "",
      suggestions,
    };
    return result;
  },
};

export default feedback;
