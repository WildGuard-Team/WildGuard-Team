import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import {
  parseFieldIncidentEvidence,
} from './field-incident-evidence.middleware.js';

async function startTestServer() {
  const app =
    express();

  app.post(
    '/upload',
    parseFieldIncidentEvidence,
    (req, res) => {
      res
        .status(200)
        .json({
          files:
            (req.files ?? [])
              .map(
                (file) => ({
                  fieldname:
                    file.fieldname,

                  originalname:
                    file.originalname,

                  mimetype:
                    file.mimetype,

                  size:
                    file.size,
                }),
              ),
        });
    },
  );

  app.use(
    (
      error,
      req,
      res,
      next,
    ) => {
      /*
       * Express error middleware requires
       * four parameters.
       */
      void next;

      res
        .status(
          error.status
          ?? 500,
        )
        .json({
          error: {
            message:
              error.message,
          },
        });
    },
  );

  const server =
    await new Promise(
      (resolve) => {
        const instance =
          app.listen(
            0,
            '127.0.0.1',
            () => {
              resolve(
                instance,
              );
            },
          );
      },
    );

  const address =
    server.address();

  return {
    url:
      `http://127.0.0.1:${address.port}`,

    async close() {
      await new Promise(
        (
          resolve,
          reject,
        ) => {
          server.close(
            (error) => {
              if (error) {
                reject(
                  error,
                );

                return;
              }

              resolve();
            },
          );
        },
      );
    },
  };
}

test(
  'accepts valid JPEG evidence',
  async () => {
    const server =
      await startTestServer();

    try {
      const formData =
        new FormData();

      formData.append(
        'evidence',
        new Blob(
          [
            'image-data',
          ],
          {
            type:
              'image/jpeg',
          },
        ),
        'wildlife.jpg',
      );

      const response =
        await fetch(
          `${server.url}/upload`,
          {
            method:
              'POST',

            body:
              formData,
          },
        );

      const body =
        await response.json();

      assert.equal(
        response.status,
        200,
      );

      assert.equal(
        body.files.length,
        1,
      );

      assert.equal(
        body.files[0].fieldname,
        'evidence',
      );

      assert.equal(
        body.files[0].originalname,
        'wildlife.jpg',
      );

      assert.equal(
        body.files[0].mimetype,
        'image/jpeg',
      );
    } finally {
      await server.close();
    }
  },
);

test(
  'accepts valid MP4 evidence',
  async () => {
    const server =
      await startTestServer();

    try {
      const formData =
        new FormData();

      formData.append(
        'evidence',
        new Blob(
          [
            'video-data',
          ],
          {
            type:
              'video/mp4',
          },
        ),
        'incident.mp4',
      );

      const response =
        await fetch(
          `${server.url}/upload`,
          {
            method:
              'POST',

            body:
              formData,
          },
        );

      const body =
        await response.json();

      assert.equal(
        response.status,
        200,
      );

      assert.equal(
        body.files.length,
        1,
      );

      assert.equal(
        body.files[0].mimetype,
        'video/mp4',
      );
    } finally {
      await server.close();
    }
  },
);

test(
  'accepts request without evidence',
  async () => {
    const server =
      await startTestServer();

    try {
      const formData =
        new FormData();

      formData.append(
        'incidentType',
        'POACHING',
      );

      const response =
        await fetch(
          `${server.url}/upload`,
          {
            method:
              'POST',

            body:
              formData,
          },
        );

      const body =
        await response.json();

      assert.equal(
        response.status,
        200,
      );

      assert.deepEqual(
        body.files,
        [],
      );
    } finally {
      await server.close();
    }
  },
);

test(
  'rejects unsupported PDF evidence',
  async () => {
    const server =
      await startTestServer();

    try {
      const formData =
        new FormData();

      formData.append(
        'evidence',
        new Blob(
          [
            'pdf-data',
          ],
          {
            type:
              'application/pdf',
          },
        ),
        'document.pdf',
      );

      const response =
        await fetch(
          `${server.url}/upload`,
          {
            method:
              'POST',

            body:
              formData,
          },
        );

      const body =
        await response.json();

      assert.equal(
        response.status,
        400,
      );

      assert.equal(
        body.error.message,
        'Unsupported evidence file type.',
      );
    } finally {
      await server.close();
    }
  },
);

test(
  'rejects an unexpected file field',
  async () => {
    const server =
      await startTestServer();

    try {
      const formData =
        new FormData();

      formData.append(
        'wrongField',
        new Blob(
          [
            'image-data',
          ],
          {
            type:
              'image/jpeg',
          },
        ),
        'wildlife.jpg',
      );

      const response =
        await fetch(
          `${server.url}/upload`,
          {
            method:
              'POST',

            body:
              formData,
          },
        );

      const body =
        await response.json();

      assert.equal(
        response.status,
        400,
      );

      assert.equal(
        body.error.message,
        'Only evidence files are allowed.',
      );
    } finally {
      await server.close();
    }
  },
);