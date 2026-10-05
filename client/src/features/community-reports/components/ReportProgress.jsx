const steps = ['Report type', 'Details & location', 'Review'];

export default function ReportProgress({ currentStep }) {
  return <ol className="report-progress" aria-label="Report submission progress">
    {steps.map((step, index) => <li key={step} className={index + 1 <= currentStep ? 'is-current' : ''}>{step}</li>)}
  </ol>;
}
