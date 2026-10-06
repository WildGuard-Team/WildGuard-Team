export const reportTypes = [
  { value: 'WILDLIFE_SIGHTING', title: 'Wildlife Sighting', description: 'Report wild animals seen in your area.', image: '/Sri Lankan Spotted Deer in Sunlit Forest-1.png', icon: 'paw' },
  { value: 'HUMAN_WILDLIFE_CONFLICT', title: 'Human–Wildlife Conflict', description: 'Report incidents between humans and wildlife.', image: '/Sri Lankan elephant crossing a forest road-2.png', icon: 'users' },
  { value: 'SUSPICIOUS_ACTIVITY', title: 'Suspicious Activity', description: 'Report illegal activities, traps, or suspicious behavior in the area.', image: '/Abandoned Wire Snare in Tropical Understory-3.png', icon: 'shield' },
];

export function reportTypeLabel(value) {
  return reportTypes.find((type) => type.value === value)?.title ?? value;
}
