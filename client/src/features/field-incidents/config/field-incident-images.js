import wildlifeSighting from '../../../assets/incident-types/wildlife-sighting.png';
import poachingSnare from '../../../assets/incident-types/poaching-snare.png';
import injuredAnimal from '../../../assets/incident-types/injured-animal.png';
import animalCarcass from '../assets/animal-carcass.png';
import illegalLogging from '../../../assets/incident-types/illegal-logging.png';
import illegalCampsite from '../../../assets/incident-types/illegal-campsite.png';
import wildlifeConflict from '../../../assets/incident-types/wildlife-conflict.png';
import otherIncident from '../../../assets/incident-types/other-incident.jpg';

export const fieldIncidentImages = {
  WILDLIFE_SIGHTING: { src: wildlifeSighting, alt: 'Spotted deer in a sunlit forest' },
  POACHING: { src: poachingSnare, alt: 'Wire snare discovered in forest undergrowth' },
  INJURED_ANIMAL: { src: injuredAnimal, alt: 'Deer standing in a forest clearing' },
  ANIMAL_CARCASS: { src: animalCarcass, alt: 'Dry deer skeletal remains on a tropical forest floor' },
  ILLEGAL_LOGGING: { src: illegalLogging, alt: 'Freshly cut tree stump and logs in a forest' },
  ILLEGAL_CAMPSITE: { src: illegalCampsite, alt: 'Tent set up in a forest clearing' },
  WILDLIFE_CONFLICT: { src: wildlifeConflict, alt: 'Elephant crossing a forest road' },
  OTHER: { src: otherIncident, alt: 'Rangers inspecting a trail beside a forest lake' },
};
