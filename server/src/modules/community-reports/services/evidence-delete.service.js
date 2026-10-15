export async function deleteEvidenceAssets(assets, cloudinary) {
  const results = await Promise.allSettled(assets.map(({ publicId, resourceType }) => cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  })));
  if (results.some((result) => result.status === 'rejected')) throw new Error('One or more evidence assets could not be removed.');
}
