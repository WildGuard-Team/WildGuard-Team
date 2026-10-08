import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateFieldIncidentEvidence,
} from './field-incident-evidence.service.js';

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