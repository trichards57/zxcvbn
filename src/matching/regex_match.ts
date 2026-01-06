import { type IMatch, sorted } from "./support";

export interface IRegexMatch extends IMatch {
  pattern: "regex";
  regex_name: string;
  regex_match: RegExpExecArray;
}
//-------------------------------------------------------------------------------
// regex matching ---------------------------------------------------------------
//-------------------------------------------------------------------------------

export function regex_match(
  password: string,
  _regexen: Record<string, RegExp> = { recent_year: /19\d\d|200\d|201\d/g },
): IRegexMatch[] {
  const matches: IRegexMatch[] = [];
  for (const name in _regexen) {
    const regex = _regexen[name];
    regex.lastIndex = 0; // keeps regex_match stateless
    let rx_match = regex.exec(password);
    while (rx_match !== null) {
      const token = rx_match[0];
      matches.push({
        pattern: "regex",
        token,
        i: rx_match.index,
        j: rx_match.index + rx_match[0].length - 1,
        regex_name: name,
        regex_match: rx_match,
      });
      rx_match = regex.exec(password);
    }
  }
  return sorted(matches);
}
