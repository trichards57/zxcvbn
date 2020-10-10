export function nCk(n: number, k: number): number {
  // http://blog.plover.com/math/choose.html
  if (k > n) {
    return 0;
  }
  if (k === 0) {
    return 1;
  }
  let r = 1;
  for (let d = 1; d <= k; d++) {
    r *= n;
    r /= d;
    n -= 1;
  }
  return r;
}

Math.log10 =
  Math.log10 ||
  function (x) {
    return Math.log(x) * Math.LOG10E;
  };

export function factorial(n: number): number {
  // unoptimized, called only on small n
  if (n < 2) {
    return 1;
  }
  let f = 1;
  for (let i = 2; i <= n; i++) {
    f *= i;
  }
  return f;
}

export const REFERENCE_YEAR = new Date().getFullYear();
export const MIN_YEAR_SPACE = 20;
