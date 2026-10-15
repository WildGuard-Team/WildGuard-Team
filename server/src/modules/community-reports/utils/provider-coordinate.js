export function providerCoordinate(value, minimum, maximum) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}
