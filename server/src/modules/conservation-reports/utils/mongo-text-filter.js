export function exactCaseInsensitive(value) {
  return new RegExp(`^${escapeRegularExpression(value)}$`, 'i');
}

export function containsCaseInsensitive(value) {
  return new RegExp(escapeRegularExpression(value), 'i');
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
