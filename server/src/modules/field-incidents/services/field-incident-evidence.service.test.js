import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateFieldIncidentEvidence,
  uploadFieldIncidentEvidence,
} from './field-incident-evidence.service.js';
import { createFieldIncident } from './create-field-incident.service.js';

function createFile({
  mimetype = 'image/jpeg',
  size = 1024,
  buffer = Buffer.from('test'),
  originalname = 'evidence.jpg',
} = {}) {
  return {
    mimetype,
    size,
    buffer,
    originalname,
  };
}

function createCloudinaryBatch({ failAt, uploadError, failedDeletion } = {}) {
  const calls = { uploads: [], deletions: [] };
  const cloudinary = {
    uploader: {
      upload_stream(options, callback) {
        const attempt = calls.uploads.push(options);
        return {
          on() { return this; },
          end() {
            if (attempt === failAt) {
              callback(uploadError);
              return;
            }

            callback(null, {
              public_id: `wildguard/batch-${attempt}`,
              secure_url: `https://example.com/batch-${attempt}`,
              resource_type: options.resource_type,
              bytes: 1024,
            });
          },
        };
      },
      async destroy(publicId, options) {
        calls.deletions.push({ publicId, options });
        if (publicId === failedDeletion) {
          throw new Error('Cloudinary cleanup failed');
        }
        return { result: 'ok' };
      },
    },
  };
  return { cloudinary, calls };
}

test('deletes the first upload when the second upload fails and rethrows the original error', async () => {
  const uploadError = new Error('Second upload failed');
  const { cloudinary, calls } = createCloudinaryBatch({ failAt: 2, uploadError });

  await assert.rejects(
    () => uploadFieldIncidentEvidence([createFile(), createFile()], cloudinary),
    (error) => error === uploadError,
  );

  assert.equal(calls.uploads.length, 2);
  assert.deepEqual(calls.deletions, [{
    publicId: 'wildguard/batch-1',
    options: { resource_type: 'image' },
  }]);
});

test('attempts every partial-batch deletion even when cleanup fails', async () => {
  const uploadError = new Error('Third upload failed');
  const { cloudinary, calls } = createCloudinaryBatch({
    failAt: 3,
    uploadError,
    failedDeletion: 'wildguard/batch-1',
  });
  const files = [createFile(), createFile({ mimetype: 'video/mp4' }), createFile()];

  await assert.rejects(
    () => uploadFieldIncidentEvidence(files, cloudinary),
    (error) => error === uploadError,
  );

  assert.deepEqual(calls.deletions, [
    { publicId: 'wildguard/batch-1', options: { resource_type: 'image' } },
    { publicId: 'wildguard/batch-2', options: { resource_type: 'video' } },
  ]);
});

test('does not delete evidence after a complete successful upload batch', async () => {
  const { cloudinary, calls } = createCloudinaryBatch();
  const evidence = await uploadFieldIncidentEvidence([createFile(), createFile()], cloudinary);

  assert.equal(evidence.length, 2);
  assert.equal(evidence[0].publicId, 'wildguard/batch-1');
  assert.equal(evidence[1].publicId, 'wildguard/batch-2');
  assert.deepEqual(calls.deletions, []);
});

test('does not attempt cleanup when the first upload fails', async () => {
  const uploadError = new Error('First upload failed');
  const { cloudinary, calls } = createCloudinaryBatch({ failAt: 1, uploadError });

  await assert.rejects(
    () => uploadFieldIncidentEvidence([createFile()], cloudinary),
    (error) => error === uploadError,
  );

  assert.deepEqual(calls.deletions, []);
});

test('partial upload cleanup preserves the submission HTTP error and skips persistence', async () => {
  const { cloudinary, calls } = createCloudinaryBatch({
    failAt: 2,
    uploadError: new Error('Second upload failed'),
  });
  let createCalls = 0;
  const repository = {
    async findByClientIncidentId() { return null; },
    async create() { createCalls += 1; },
  };

  await assert.rejects(
    () => createFieldIncident(
      { clientIncidentId: 'partial-upload' },
      { id: 'ranger-user-001' },
      repository,
      [createFile(), createFile()],
      cloudinary,
      'test',
    ),
    { status: 503, message: 'Evidence upload is temporarily unavailable.' },
  );

  assert.equal(createCalls, 0);
  assert.equal(calls.deletions.length, 1);
});

test(
  'accepts valid JPEG evidence',
  () => {
    const result =
      validateFieldIncidentEvidence([
        createFile(),
      ]);

    assert.deepEqual(
      result,
      [
        'image',
      ],
    );
  },
);

test(
  'accepts valid PNG evidence',
  () => {
    const result =
      validateFieldIncidentEvidence([
        createFile({
          mimetype:
            'image/png',
        }),
      ]);

    assert.deepEqual(
      result,
      [
        'image',
      ],
    );
  },
);

test(
  'accepts valid WEBP evidence',
  () => {
    const result =
      validateFieldIncidentEvidence([
        createFile({
          mimetype:
            'image/webp',
        }),
      ]);

    assert.deepEqual(
      result,
      [
        'image',
      ],
    );
  },
);

test(
  'accepts valid MP4 evidence',
  () => {
    const result =
      validateFieldIncidentEvidence([
        createFile({
          mimetype:
            'video/mp4',

          originalname:
            'evidence.mp4',
        }),
      ]);

    assert.deepEqual(
      result,
      [
        'video',
      ],
    );
  },
);

test(
  'accepts multiple valid evidence files',
  () => {
    const result =
      validateFieldIncidentEvidence([
        createFile({
          mimetype:
            'image/jpeg',
        }),

        createFile({
          mimetype:
            'image/png',
        }),

        createFile({
          mimetype:
            'video/mp4',
        }),
      ]);

    assert.deepEqual(
      result,
      [
        'image',
        'image',
        'video',
      ],
    );
  },
);

test(
  'accepts empty evidence list',
  () => {
    const result =
      validateFieldIncidentEvidence(
        [],
      );

    assert.deepEqual(
      result,
      [],
    );
  },
);

test(
  'rejects unsupported evidence type',
  () => {
    assert.throws(
      () =>
        validateFieldIncidentEvidence([
          createFile({
            mimetype:
              'application/pdf',

            originalname:
              'document.pdf',
          }),
        ]),
      {
        status:
          400,

        message:
          'Unsupported evidence file type.',
      },
    );
  },
);

test(
  'rejects empty evidence file',
  () => {
    assert.throws(
      () =>
        validateFieldIncidentEvidence([
          createFile({
            size:
              0,

            buffer:
              Buffer.alloc(0),
          }),
        ]),
      {
        status:
          400,

        message:
          'Evidence files must not be empty.',
      },
    );
  },
);

test(
  'rejects evidence without a valid buffer',
  () => {
    assert.throws(
      () =>
        validateFieldIncidentEvidence([
          createFile({
            buffer:
              null,
          }),
        ]),
      {
        status:
          400,

        message:
          'Evidence files must not be empty.',
      },
    );
  },
);

test(
  'rejects image larger than 5 MB',
  () => {
    const oversizedImage =
      createFile({
        mimetype:
          'image/jpeg',

        size:
          (5 * 1024 * 1024) + 1,
      });

    assert.throws(
      () =>
        validateFieldIncidentEvidence([
          oversizedImage,
        ]),
      {
        status:
          413,

        message:
          'Image files must not exceed 5 MB.',
      },
    );
  },
);

test(
  'accepts image exactly 5 MB',
  () => {
    const image =
      createFile({
        mimetype:
          'image/jpeg',

        size:
          5 * 1024 * 1024,
      });

    const result =
      validateFieldIncidentEvidence([
        image,
      ]);

    assert.deepEqual(
      result,
      [
        'image',
      ],
    );
  },
);

test(
  'rejects video larger than 25 MB',
  () => {
    const oversizedVideo =
      createFile({
        mimetype:
          'video/mp4',

        size:
          (25 * 1024 * 1024) + 1,

        originalname:
          'evidence.mp4',
      });

    assert.throws(
      () =>
        validateFieldIncidentEvidence([
          oversizedVideo,
        ]),
      {
        status:
          413,

        message:
          'Video files must not exceed 25 MB.',
      },
    );
  },
);

test(
  'accepts video exactly 25 MB',
  () => {
    const video =
      createFile({
        mimetype:
          'video/mp4',

        size:
          25 * 1024 * 1024,

        originalname:
          'evidence.mp4',
      });

    const result =
      validateFieldIncidentEvidence([
        video,
      ]);

    assert.deepEqual(
      result,
      [
        'video',
      ],
    );
  },
);

test(
  'rejects more than 3 evidence files',
  () => {
    const files = [
      createFile(),
      createFile(),
      createFile(),
      createFile(),
    ];

    assert.throws(
      () =>
        validateFieldIncidentEvidence(
          files,
        ),
      {
        status:
          413,

        message:
          'A maximum of 3 evidence files is allowed.',
      },
    );
  },
);
