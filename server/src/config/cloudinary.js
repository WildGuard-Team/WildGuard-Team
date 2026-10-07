import { v2 as cloudinary } from 'cloudinary';

export function createCloudinaryClient({ cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret }) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
    secure: true,
  });
  return cloudinary;
}
