import { useCallback, useEffect, useRef, useState } from 'react';

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Allow camera access in your browser settings, upload evidence instead, or continue without camera evidence.';
  }
  if (error?.name === 'NotFoundError') {
    return 'No camera was found on this device. You can upload evidence instead or continue without camera evidence.';
  }
  if (error?.name === 'NotReadableError') {
    return 'The camera is currently unavailable or being used by another application.';
  }
  return 'The camera could not be started. You can upload evidence instead or continue without camera evidence.';
}

export default function useFieldIncidentCamera(videoRef) {
  const streamRef = useRef(null);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stopCamera = useCallback(() => {
    requestRef.current += 1;
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mountedRef.current) {
      setCameraActive(false);
      setIsStarting(false);
      setCameraError('');
    }
  }, [videoRef]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    if (!mountedRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by this browser. You can upload evidence instead or continue without camera evidence.');
      return;
    }

    const request = requestRef.current;
    const isCurrent = () => mountedRef.current && requestRef.current === request;
    let stream;
    setIsStarting(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (!isCurrent()) {
        stopStream(stream);
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!isCurrent()) {
        stopStream(stream);
        return;
      }
      setCameraActive(true);
    } catch (error) {
      if (!isCurrent()) return;
      stopCamera();
      setCameraError(cameraErrorMessage(error));
    } finally {
      if (isCurrent()) setIsStarting(false);
    }
  }, [stopCamera, videoRef]);

  // A photo conversion may finish after cancellation, a new camera request, or unmount.
  const getCameraSession = useCallback(() => requestRef.current, []);
  const isCameraSessionCurrent = useCallback((session) => (
    mountedRef.current && requestRef.current === session && Boolean(streamRef.current)
  ), []);

  return {
    cameraActive,
    isStarting,
    cameraError,
    startCamera,
    stopCamera,
    getCameraSession,
    isCameraSessionCurrent,
  };
}
