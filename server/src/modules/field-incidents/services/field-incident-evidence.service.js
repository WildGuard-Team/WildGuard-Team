import {
    HttpError,
  } from '../../../shared/http-error.js';
  
  import {
    FIELD_INCIDENT_IMAGE_TYPES,
    FIELD_INCIDENT_VIDEO_TYPES,
    FIELD_INCIDENT_IMAGE_MAX_BYTES,
    FIELD_INCIDENT_VIDEO_MAX_BYTES,
    FIELD_INCIDENT_EVIDENCE_MAX_FILES,
    FIELD_INCIDENT_CLOUDINARY_FOLDER,
  } from '../config/field-incident-evidence.constants.js';
  
  function resourceTypeFor(
    file,
  ) {
    if (
      FIELD_INCIDENT_IMAGE_TYPES.includes(
        file.mimetype,
      )
    ) {
      return 'image';
    }
  
    if (
      FIELD_INCIDENT_VIDEO_TYPES.includes(
        file.mimetype,
      )
    ) {
      return 'video';
    }
  
    throw new HttpError(
      400,
      'Unsupported evidence file type.',
    );
  }
  
  export function validateFieldIncidentEvidence(
    files = [],
  ) {
    if (
      files.length
      > FIELD_INCIDENT_EVIDENCE_MAX_FILES
    ) {
      throw new HttpError(
        413,
        'A maximum of 3 evidence files is allowed.',
      );
    }
  
    return files.map(
      (file) => {
        if (
          !file
          || !Buffer.isBuffer(
            file.buffer,
          )
          || file.size < 1
        ) {
          throw new HttpError(
            400,
            'Evidence files must not be empty.',
          );
        }
  
        const resourceType =
          resourceTypeFor(
            file,
          );
  
        if (
          resourceType === 'image'
          && file.size
            > FIELD_INCIDENT_IMAGE_MAX_BYTES
        ) {
          throw new HttpError(
            413,
            'Image files must not exceed 5 MB.',
          );
        }
  
        if (
          resourceType === 'video'
          && file.size
            > FIELD_INCIDENT_VIDEO_MAX_BYTES
        ) {
          throw new HttpError(
            413,
            'Video files must not exceed 25 MB.',
          );
        }
  
        return resourceType;
      },
    );
  }
  
  function uploadBuffer(
    cloudinary,
    file,
    options,
  ) {
    return new Promise(
      (
        resolve,
        reject,
      ) => {
        const stream =
          cloudinary
            .uploader
            .upload_stream(
              options,
              (
                error,
                result,
              ) => {
                if (error) {
                  reject(
                    error,
                  );
  
                  return;
                }
  
                if (!result) {
                  reject(
                    new Error(
                      'Cloudinary returned no upload result.',
                    ),
                  );
  
                  return;
                }
  
                resolve(
                  result,
                );
              },
            );
  
        stream.on(
          'error',
          reject,
        );
  
        stream.end(
          file.buffer,
        );
      },
    );
  }
  
  function sanitizeOriginalName(
    name,
  ) {
    const normalized =
      typeof name === 'string'
        ? name.normalize(
            'NFKC',
          )
        : '';
  
    const value =
      Array
        .from(
          normalized,
          (character) => {
            const code =
              character.charCodeAt(
                0,
              );
  
            if (
              character === '\\'
              || character === '/'
              || code <= 31
              || code === 127
            ) {
              return '_';
            }
  
            return character;
          },
        )
        .join('')
        .trim();
  
    return (
      value || 'evidence'
    ).slice(
      0,
      255,
    );
  }
  
  export async function uploadFieldIncidentEvidence(
    files,
    cloudinary,
  ) {
    const resourceTypes =
      validateFieldIncidentEvidence(
        files,
      );
  
    const evidence = [];
  
    for (
      let index = 0;
      index < files.length;
      index += 1
    ) {
      const file =
        files[index];
  
      const resourceType =
        resourceTypes[index];
  
      const uploaded =
        await uploadBuffer(
          cloudinary,
          file,
          {
            folder:
              FIELD_INCIDENT_CLOUDINARY_FOLDER,
  
            resource_type:
              resourceType,
  
            overwrite:
              false,
  
            unique_filename:
              true,
  
            use_filename:
              false,
          },
        );
  
      evidence.push({
        publicId:
          uploaded.public_id,
  
        secureUrl:
          uploaded.secure_url,
  
        resourceType:
          uploaded.resource_type,
  
        originalName:
          sanitizeOriginalName(
            file.originalname,
          ),
  
        mimeType:
          file.mimetype,
  
        bytes:
          uploaded.bytes,
  
        format:
          uploaded.format,
  
        width:
          uploaded.width,
  
        height:
          uploaded.height,
  
        duration:
          uploaded.duration,
      });
    }
  
    return evidence;
  }
  
  export async function deleteFieldIncidentEvidence(
    evidence,
    cloudinary,
  ) {
    for (
      const item
      of evidence
    ) {
      await cloudinary
        .uploader
        .destroy(
          item.publicId,
          {
            resource_type:
              item.resourceType,
          },
        );
    }
  }