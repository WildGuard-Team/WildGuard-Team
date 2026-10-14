import {
    useState,
  } from 'react';
  
  import EvidenceUploader
    from '../../community-reports/components/EvidenceUploader.jsx';
  
  import RangerLayout
    from '../components/RangerLayout.jsx';
  
  import FieldIncidentCameraCapture
    from '../components/FieldIncidentCameraCapture.jsx';
  
  import {
    useFieldIncidentDraft,
  } from '../context/useFieldIncidentDraft.js';
  
  export default function FieldIncidentEvidencePage({
    navigate,
  }) {
    const {
      draft,
      setEvidence,
    } = useFieldIncidentDraft();
  
    const [
      isNavigating,
      setIsNavigating,
    ] = useState(false);
  
    function goBack() {
      if (
        isNavigating
      ) {
        return;
      }
  
      navigate(
        '/ranger/incidents/details',
      );
    }
  
    function continueToReview() {
      if (
        isNavigating
      ) {
        return;
      }
  
      setIsNavigating(
        true,
      );
  
      navigate(
        '/ranger/incidents/review',
      );
    }
  
    function continueWithoutEvidence() {
      if (
        isNavigating
      ) {
        return;
      }
  
      setIsNavigating(
        true,
      );
  
      setEvidence([]);
  
      navigate(
        '/ranger/incidents/review',
      );
    }
  
    return (
      <RangerLayout
        navigate={navigate}
        active="report"
      >
        <section className="report-workspace">
          <div className="report-heading">
            <div>
              <h1>
                Report Field Incident
              </h1>
  
              <p>
                Add photos or video evidence
                related to the incident.
              </p>
            </div>
  
            <p className="report-step">
              Step 3 of 4
            </p>
          </div>
  
          <div className="evidence-panel">
            <EvidenceUploader
              files={
                draft.evidence
              }
              onChange={
                setEvidence
              }
              browseLabel="Add Evidence"
            />
  
            <FieldIncidentCameraCapture
              files={
                draft.evidence
              }
              onChange={
                setEvidence
              }
            />
  
            <p className="evidence-information">
              <span
                aria-hidden="true"
              >
                i
              </span>
  
              Evidence helps verify the incident.
              You may upload photos or video,
              capture a photo using the device
              camera, or continue without evidence.
            </p>
  
            <div className="evidence-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={
                  isNavigating
                }
                onClick={
                  goBack
                }
              >
                Back
              </button>
  
              <button
                type="button"
                className="evidence-skip"
                disabled={
                  isNavigating
                }
                onClick={
                  continueWithoutEvidence
                }
              >
                Continue without evidence
              </button>
  
              <button
                type="button"
                className="primary-button"
                disabled={
                  isNavigating
                }
                onClick={
                  continueToReview
                }
              >
                Continue to Review
              </button>
            </div>
          </div>
        </section>
      </RangerLayout>
    );
  }