// A mixed, reproducible stream also gives adjacent birth seeds different starts.
export function randomStream(seed: number) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = Math.imul(state ^ (state >>> 15), state | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    get seed() { return state; },
  };
}
export function weightedPick<T>(values: readonly T[], weight: (value: T) => number, random: () => number): T {
  if (!values.length) throw new Error('Empty event pool');
  const weights = values.map(value => Math.max(0.01, weight(value)));
  let draw = random() * weights.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < values.length; index++) {
    draw -= weights[index];
    if (draw < 0) return values[index];
  }
  return values[values.length - 1];
}
