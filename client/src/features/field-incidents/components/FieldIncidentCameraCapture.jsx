import {
    useEffect,
    useRef,
    useState,
  } from 'react';
  
  import {
    validateEvidenceSelection,
  } from '../../community-reports/validation/evidence.validation.js';
  
  export default function FieldIncidentCameraCapture({
    files,
    onChange,
  }) {
    const videoRef =
      useRef(null);
  
    const streamRef =
      useRef(null);
  
    const [
      cameraActive,
      setCameraActive,
    ] = useState(false);
  
    const [
      isStarting,
      setIsStarting,
    ] = useState(false);
  
    const [
      message,
      setMessage,
    ] = useState('');
  
    const [
      messageType,
      setMessageType,
    ] = useState('');
  
    useEffect(() => {
      return () => {
        stopCameraStream();
      };
    }, []);
  
    function stopCameraStream() {
      const stream =
        streamRef.current;
  
      if (stream) {
        stream
          .getTracks()
          .forEach(
            (track) => {
              track.stop();
            },
          );
      }
  
      streamRef.current =
        null;
  
      if (videoRef.current) {
        videoRef.current.srcObject =
          null;
      }
    }
  
    async function startCamera() {
      if (
        files.length >= 3
      ) {
        setMessageType(
          'error',
        );
  
        setMessage(
          'You can attach up to 3 evidence files.',
        );
  
        return;
      }
  
      if (
        !navigator.mediaDevices
        || !navigator.mediaDevices.getUserMedia
      ) {
        setMessageType(
          'error',
        );
  
        setMessage(
          'Camera access is not supported by this browser. You can upload evidence instead or continue without camera evidence.',
        );
  
        return;
      }
  
      setIsStarting(true);
      setMessage('');
  
      try {
        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              video: {
                facingMode: {
                  ideal:
                    'environment',
                },
              },
  
              audio:
                false,
            });
  
        streamRef.current =
          stream;
  
        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;
  
          await videoRef.current.play();
        }
  
        setCameraActive(
          true,
        );
  
        setMessageType(
          'success',
        );
  
        setMessage(
          'Camera ready. Position the incident evidence and capture the photo.',
        );
      } catch (error) {
        stopCameraStream();
  
        setCameraActive(
          false,
        );
  
        setMessageType(
          'error',
        );
  
        if (
          error?.name
          === 'NotAllowedError'
          || error?.name
          === 'PermissionDeniedError'
        ) {
          setMessage(
            'Camera permission was denied. Allow camera access in your browser settings, upload evidence instead, or continue without camera evidence.',
          );
  
          return;
        }
  
        if (
          error?.name
          === 'NotFoundError'
        ) {
          setMessage(
            'No camera was found on this device. You can upload evidence instead or continue without camera evidence.',
          );
  
          return;
        }
  
        if (
          error?.name
          === 'NotReadableError'
        ) {
          setMessage(
            'The camera is currently unavailable or being used by another application.',
          );
  
          return;
        }
  
        setMessage(
          'The camera could not be started. You can upload evidence instead or continue without camera evidence.',
        );
      } finally {
        setIsStarting(
          false,
        );
      }
    }
  
    function closeCamera() {
      stopCameraStream();
  
      setCameraActive(
        false,
      );
  
      setMessage('');
    }
  
    async function capturePhoto() {
      const video =
        videoRef.current;
  
      if (
        !video
        || !cameraActive
      ) {
        return;
      }
  
      if (
        files.length >= 3
      ) {
        setMessageType(
          'error',
        );
  
        setMessage(
          'You can attach up to 3 evidence files.',
        );
  
        return;
      }
  
      const width =
        video.videoWidth;
  
      const height =
        video.videoHeight;
  
      if (
        !width
        || !height
      ) {
        setMessageType(
          'error',
        );
  
        setMessage(
          'The camera image is not ready yet. Please try again.',
        );
  
        return;
      }
  
      const canvas =
        document.createElement(
          'canvas',
        );
  
      canvas.width =
        width;
  
      canvas.height =
        height;
  
      const context =
        canvas.getContext(
          '2d',
        );
  
      if (!context) {
        setMessageType(
          'error',
        );
  
        setMessage(
          'The photo could not be captured. Please try again.',
        );
  
        return;
      }
  
      context.drawImage(
        video,
        0,
        0,
        width,
        height,
      );
  
      const blob =
        await new Promise(
          (resolve) => {
            canvas.toBlob(
              resolve,
              'image/jpeg',
              0.9,
            );
          },
        );
  
      if (!blob) {
        setMessageType(
          'error',
        );
  
        setMessage(
          'The photo could not be captured. Please try again.',
        );
  
        return;
      }
  
      const file =
        new File(
          [
            blob,
          ],
          `field-incident-${Date.now()}.jpg`,
          {
            type:
              'image/jpeg',
  
            lastModified:
              Date.now(),
          },
        );
  
      const {
        accepted,
        messages,
      } =
        validateEvidenceSelection(
          [
            file,
          ],
          files,
        );
  
      if (
        !accepted.length
      ) {
        setMessageType(
          'error',
        );
  
        setMessage(
          messages[0]
          ?? 'The captured photo could not be added.',
        );
  
        return;
      }
  
      onChange([
        ...files,
        ...accepted,
      ]);
  
      setMessageType(
        'success',
      );
  
      setMessage(
        'Photo captured and added to the incident evidence.',
      );
  
      closeCamera();
    }
  
    return (
      <section className="field-incident-camera">
        <div className="field-incident-camera-heading">
          <div>
            <h2>
              Capture Photo
            </h2>
  
            <p>
              Use the device camera to capture
              evidence from the field.
            </p>
          </div>
  
          {!cameraActive && (
            <button
              type="button"
              className="secondary-button field-incident-camera-open"
              disabled={
                isStarting
                || files.length >= 3
              }
              onClick={
                startCamera
              }
            >
              {isStarting
                ? 'Opening Camera...'
                : 'Take Photo'}
            </button>
          )}
        </div>
  
        <div
          className={
            `field-incident-camera-preview${
              cameraActive
                ? ' is-active'
                : ''
            }`
          }
        >
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label="Camera preview"
          />
  
          {cameraActive && (
            <div className="field-incident-camera-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeCamera
                }
              >
                Cancel
              </button>
  
              <button
                type="button"
                className="primary-button"
                onClick={
                  capturePhoto
                }
              >
                Capture Photo
              </button>
            </div>
          )}
        </div>
  
        {message && (
          <div
            className={
              `field-incident-camera-message ${
                messageType === 'error'
                  ? 'is-error'
                  : 'is-success'
              }`
            }
            role={
              messageType === 'error'
                ? 'alert'
                : 'status'
            }
          >
            {message}
          </div>
        )}
  
        {files.length >= 3 && (
          <p className="field-incident-camera-limit">
            Maximum evidence limit reached.
            Remove a file if you want to capture
            another photo.
          </p>
        )}
      </section>
    );
  }