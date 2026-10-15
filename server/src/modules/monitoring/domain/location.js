export class Location {
  constructor(latitude, longitude) {
    this.latitude = Number(latitude);
    this.longitude = Number(longitude);

    this.validate();
  }

  validate() {
    if (
      !Number.isFinite(this.latitude) ||
      this.latitude < -90 ||
      this.latitude > 90
    ) {
      throw new Error("Latitude must be between -90 and 90.");
    }

    if (
      !Number.isFinite(this.longitude) ||
      this.longitude < -180 ||
      this.longitude > 180
    ) {
      throw new Error("Longitude must be between -180 and 180.");
    }
  }

  toObject() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
