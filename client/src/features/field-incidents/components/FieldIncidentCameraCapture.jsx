import { useEffect, useRef, useState } from 'react';
import { validateEvidenceSelection } from '../../community-reports/validation/evidence.validation.js';
import useFieldIncidentCamera from '../hooks/useFieldIncidentCamera.js';
import { FIELD_INCIDENT_EVIDENCE_MAX_FILES } from '../config/field-incident.constants.js';

export default function FieldIncidentCameraCapture({ files, onChange }) {
  const videoRef = useRef(null);
  const evidenceRef = useRef({ files, onChange });
  const [feedback, setFeedback] = useState(null);
  const {
    cameraActive, isStarting, cameraError, startCamera, stopCamera,
    getCameraSession, isCameraSessionCurrent,
  } = useFieldIncidentCamera(videoRef);

  useEffect(() => {
    evidenceRef.current = { files, onChange };
  }, [files, onChange]);

  function showError(message) {
    setFeedback({ message, type: 'error' });
  }

  function openCamera() {
    if (files.length >= FIELD_INCIDENT_EVIDENCE_MAX_FILES) {
      showError('You can attach up to 3 evidence files.');
      return;
    }
    setFeedback(null);
    void startCamera();
  }

  function closeCamera() {
    stopCamera();
    setFeedback(null);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraActive) return;
    if (files.length >= FIELD_INCIDENT_EVIDENCE_MAX_FILES) {
      showError('You can attach up to 3 evidence files.');
      return;
    }

    const session = getCameraSession();
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      showError('The camera image is not ready yet. Please try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      showError('The photo could not be captured. Please try again.');
      return;
    }
    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!isCameraSessionCurrent(session)) return;
    if (!blob) {
      showError('The photo could not be captured. Please try again.');
      return;
    }

    const file = new File([blob], `field-incident-${Date.now()}.jpg`, {
      type: 'image/jpeg', lastModified: Date.now(),
    });
    const currentEvidence = evidenceRef.current;
    const { accepted, messages } = validateEvidenceSelection([file], currentEvidence.files);
    if (!accepted.length) {
      showError(messages[0] ?? 'The captured photo could not be added.');
      return;
    }

    currentEvidence.onChange([...currentEvidence.files, ...accepted]);
    stopCamera();
    setFeedback({
      type: 'success',
      message: 'Photo captured and added to the incident evidence.',
    });
  }

  const message = feedback?.message || cameraError || (cameraActive
    ? 'Camera ready. Position the incident evidence and capture the photo.'
    : '');
  const messageType = feedback?.type || (cameraError ? 'error' : 'success');

  return (
    <section className="field-incident-camera">
      <div className="field-incident-camera-heading">
        <div>
          <h2>Capture Photo</h2>
          <p>Use the device camera to capture evidence from the field.</p>
        </div>
        {!cameraActive && (
          <button
            type="button"
            className="secondary-button field-incident-camera-open"
            disabled={isStarting || files.length >= FIELD_INCIDENT_EVIDENCE_MAX_FILES}
            onClick={openCamera}
          >
            {isStarting ? 'Opening Camera...' : 'Take Photo'}
          </button>
        )}
      </div>
      <div className={`field-incident-camera-preview${cameraActive ? ' is-active' : ''}`}>
        <video ref={videoRef} muted playsInline aria-label="Camera preview" />
        {cameraActive && (
          <div className="field-incident-camera-actions">
            <button type="button" className="secondary-button" onClick={closeCamera}>
              Cancel
            </button>
            <button type="button" className="primary-button" onClick={capturePhoto}>
              Capture Photo
            </button>
          </div>
        )}
      </div>
      {message && (
        <div
          className={`field-incident-camera-message ${messageType === 'error' ? 'is-error' : 'is-success'}`}
          role={messageType === 'error' ? 'alert' : 'status'}
        >
          {message}
        </div>
      )}
      {files.length >= FIELD_INCIDENT_EVIDENCE_MAX_FILES && (
        <p className="field-incident-camera-limit">
          Maximum evidence limit reached. Remove a file if you want to capture another photo.
        </p>
      )}
    </section>
  );
}
