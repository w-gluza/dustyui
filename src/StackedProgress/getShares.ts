const PRECISION = 1e9;

export function getShares(values: readonly number[], whole: number): string[] {
  if (whole <= 0) {
    return values.map(() => "0%");
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const exact = [...values, Math.max(0, whole - total)].map(
    (value) => Math.round((value / whole) * 100 * PRECISION) / PRECISION,
  );
  const percents = exact.map(Math.floor);
  const spare = 100 - percents.reduce((sum, percent) => sum + percent, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .filter(({ remainder }) => remainder > 0)
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (const { index } of byRemainder.slice(0, Math.max(0, spare))) {
    percents[index] = (percents[index] ?? 0) + 1;
  }

  return values.map((value, index) => {
    if (value > 0 && percents[index] === 0) {
      return "<1%";
    }
    return value < whole && percents[index] === 100
      ? ">99%"
      : `${String(percents[index])}%`;
  });
}
