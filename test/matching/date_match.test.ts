import { date_match, IDateMatch } from "../../src/matching/date_match";
import { generatePasswords } from "../test-support";

describe("matching", () => {
  describe("date_match", () => {
    it("matches dates with varied separators", () => {
      for (const sep of ["", " ", "-", "/", "\\", "_", "."]) {
        const password = `13${sep}2${sep}1921`;
        const expected: IDateMatch[] = [
          {
            i: 0,
            j: password.length - 1,
            pattern: "date",
            token: password,
            day: 13,
            month: 2,
            year: 1921,
            separator: sep,
          },
        ];

        const actual = date_match(password);
        expect(actual).toStrictEqual(expected);
      }
    });

    it("matches dates with varied element order", () => {
      // TODO : Fix this test
      for (const order of ["mdy", "dmy", "ymd", "ydm"]) {
        const d = 8;
        const m = 8;
        const y = 88;
        const password = order
          .replace("y", y.toString())
          .replace("m", m.toString())
          .replace("d", d.toString());

        const expected: IDateMatch[] = [
          {
            i: 0,
            j: password.length - 1,
            pattern: "date",
            token: password,
            day: 8,
            month: 8,
            year: 1988,
            separator: "",
          },
        ];

        const actual = date_match(password);
        expect(actual).toStrictEqual(expected);
      }
    });

    it("matches the date with year closest to REFERENCE_YEAR", () => {
      const password = "111504";

      const expected: IDateMatch[] = [
        {
          i: 0,
          j: password.length - 1,
          pattern: "date",
          token: password,
          day: 15,
          month: 11,
          year: 2004,
          separator: "",
        },
      ];

      const actual = date_match(password);
      expect(actual).toStrictEqual(expected);
    });

    it("matches various dates", () => {
      for (const sep of ["", "."]) {
        for (const [day, month, year] of [
          [1, 1, 1999],
          [11, 8, 2000],
          [9, 12, 2005],
          [22, 11, 1551],
        ]) {
          const password = `${year}${sep}${month}${sep}${day}`;
          const actual = date_match(password);

          expect(actual.length).toBe(1);
          expect(actual[0].i).toBe(0);
          expect(actual[0].j).toBe(password.length - 1);
          expect(actual[0].pattern).toBe("date");
          expect(actual[0].token).toBe(password);
          expect(actual[0].year).toBe(year);
          expect(actual[0].separator).toBe(sep);
        }
      }
    });

    it("matches zero-padded dates", () => {
      const password = "02/02/02";

      const expected: IDateMatch[] = [
        {
          i: 0,
          j: password.length - 1,
          pattern: "date",
          token: password,
          day: 2,
          month: 2,
          year: 2002,
          separator: "/",
        },
      ];

      const actual = date_match(password);
      expect(actual).toStrictEqual(expected);
    });

    it("matches embedded dates", () => {
      const prefixes = ["a", "ab"];
      const suffixes = ["!"];
      const pattern = "1/1/91";
      for (const { password, i, j } of generatePasswords(
        pattern,
        prefixes,
        suffixes
      )) {
        const expected: IDateMatch[] = [
          {
            i,
            j,
            pattern: "date",
            token: pattern,
            day: 1,
            month: 1,
            year: 1991,
            separator: "/",
          },
        ];
        const actual = date_match(password);
        expect(actual).toStrictEqual(expected);
      }
    });

    it("matches overlapping dates", () => {
      const expected: IDateMatch[] = [
        {
          i: 0,
          j: 9,
          pattern: "date",
          token: "12/20/1991",
          day: 20,
          month: 12,
          year: 1991,
          separator: "/",
        },
        {
          i: 6,
          j: 15,
          pattern: "date",
          token: "1991.12.20",
          day: 20,
          month: 12,
          year: 1991,
          separator: ".",
        },
      ];
      const actual = date_match("12/20/1991.12.20");
      expect(actual).toStrictEqual(expected);
    });

    it("matches dates padded by non-ambiguous digits", () => {
      const expected: IDateMatch[] = [
        {
          i: 1,
          j: 8,
          pattern: "date",
          token: "12/20/91",
          day: 20,
          month: 12,
          year: 1991,
          separator: "/",
        },
      ];
      const actual = date_match("912/20/919");
      expect(actual).toStrictEqual(expected);
    });
  });
});
