export const reportTypes = [
  { value: 'WILDLIFE_SIGHTING', title: 'Wildlife Sighting', description: 'Report wildlife seen near your community.' },
  { value: 'HUMAN_WILDLIFE_CONFLICT', title: 'Human-Wildlife Conflict', description: 'Report an incident involving people and wildlife.' },
  { value: 'SUSPICIOUS_ACTIVITY', title: 'Suspicious Activity', description: 'Report activity that may put wildlife at risk.' },
];

export function reportTypeLabel(value) {
  return reportTypes.find((type) => type.value === value)?.title ?? value;
}

export function validateDetails({ description, manualLocation }) {
  const errors = {};
  if (description.trim().length < 10 || description.trim().length > 2000) {
    errors.description = 'Description must be between 10 and 2,000 characters.';
  }
  if (manualLocation.trim().length < 3 || manualLocation.trim().length > 300) {
    errors.manualLocation = 'Manual location must be between 3 and 300 characters.';
  }
  return errors;
}
