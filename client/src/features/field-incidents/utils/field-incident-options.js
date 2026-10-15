export const fieldIncidentTypes = [
    {
      value: 'WILDLIFE_SIGHTING',
      title: 'Wildlife Sighting',
      description:
        'Record an important wildlife sighting during patrol.',
      icon: 'paw',
    },
    {
      value: 'POACHING',
      title: 'Poaching / Snare',
      description:
        'Report suspected poaching, traps, snares, or hunting activity.',
      icon: 'shield',
    },
    {
      value: 'INJURED_ANIMAL',
      title: 'Injured Animal',
      description:
        'Report an injured or distressed wild animal.',
      icon: 'report',
    },
    {
      value: 'ANIMAL_CARCASS',
      title: 'Animal Carcass',
      description:
        'Report a dead animal or discovered animal carcass.',
      icon: 'report',
    },
    {
      value: 'ILLEGAL_LOGGING',
      title: 'Illegal Logging',
      description:
        'Report illegal tree cutting or forest destruction.',
      icon: 'shield',
    },
    {
      value: 'ILLEGAL_CAMPSITE',
      title: 'Illegal Campsite',
      description:
        'Report an unauthorized campsite inside the protected area.',
      icon: 'map',
    },
    {
      value: 'WILDLIFE_CONFLICT',
      title: 'Wildlife Conflict',
      description:
        'Report human-wildlife conflict observed during patrol.',
      icon: 'users',
    },
    {
      value: 'OTHER',
      title: 'Other',
      description:
        'Report another field incident requiring ranger attention.',
      icon: 'report',
    },
  ];
  
  export function fieldIncidentTypeLabel(value) {
    return (
      fieldIncidentTypes.find(
        (type) => type.value === value,
      )?.title ?? value
    );
  }