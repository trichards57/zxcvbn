interface IPassword {
  password: string;
  i: number;
  j: number;
}

export function generatePasswords(
  pattern: string,
  prefixes: string[],
  suffixes: string[]
): IPassword[] {
  const result: IPassword[] = [];
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      result.push({
        password: prefix + pattern + suffix,
        i: prefix.length,
        j: prefix.length + pattern.length - 1,
      });
    }
  }
  return result;
}
