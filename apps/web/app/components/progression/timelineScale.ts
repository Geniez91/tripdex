/** Round up to a readable integer ceiling, with room above small collections. */
export function countriesAxisMax(maximum: number): number {
  const target = Math.max(5, maximum * 1.1);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step =
    [1, 2, 2.5, 5, 10].find((value) => value * magnitude >= target) ?? 10;
  return Math.ceil(step * magnitude);
}
