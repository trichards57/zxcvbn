import { IRegexMatch, REGEXEN, regex_match } from "../src/matching";

describe("matching", () => {
  describe("regex_match", () => {
    it("matches recent years pattern", () => {
      for (const [pattern, name] of [
        ["1922", "recent_year"],
        ["2017", "recent_year"],
      ]) {
        const expected: IRegexMatch[] = [
          {
            i: 0,
            j: pattern.length - 1,
            pattern: "regex",
            regex_match:
              REGEXEN.recent_year.exec(pattern) ||
              (([] as unknown) as RegExpExecArray),
            regex_name: name,
            token: pattern,
          },
        ];

        const actual = regex_match(pattern);
        expect(actual).toStrictEqual(expected);
      }
    });
  });
});
