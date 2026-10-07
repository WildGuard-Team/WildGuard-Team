import MonitoringLayout from "./components/MonitoringLayout.jsx";

import MonitoringDashboard from "./pages/MonitoringDashboard.jsx";
import MonitoringDataPage from "./pages/MonitoringDataPage.jsx";
import ReadingDetailsPage from "./pages/ReadingDetailsPage.jsx";
import SimulateReadingPage from "./pages/SimulateReadingPage.jsx";
import SensorsPage from "./pages/SensorsPage.jsx";
import AlertsPage from "./pages/AlertsPage.jsx";
import AlertDetailsPage from "./pages/AlertDetailsPage.jsx";
import ProcessingLogsPage from "./pages/ProcessingLogsPage.jsx";

function getMonitoringPage(path, navigate) {
  const readingMatch = path.match(/^\/monitoring\/data\/([^/]+)$/);

  if (readingMatch) {
    return {
      title: "Reading Details",
      subtitle: "Review validation results and risk analysis.",
      content: (
        <ReadingDetailsPage readingId={readingMatch[1]} navigate={navigate} />
      ),
    };
  }

  const alertMatch = path.match(/^\/monitoring\/alerts\/([^/]+)$/);

  if (alertMatch) {
    return {
      title: "Alert Details",
      subtitle: "Review risk information and delivery history.",
      content: <AlertDetailsPage alertId={alertMatch[1]} navigate={navigate} />,
    };
  }

  switch (path) {
    case "/monitoring":
      return {
        title: "Monitoring Dashboard",
        subtitle: "Wildlife sensor activity and detected risks.",
        content: <MonitoringDashboard navigate={navigate} />,
      };

    case "/monitoring/data":
      return {
        title: "Monitoring Data",
        subtitle: "Incoming sensor readings and processing status.",
        content: <MonitoringDataPage navigate={navigate} />,
      };

    case "/monitoring/simulate":
      return {
        title: "Simulate Reading",
        subtitle: "Submit simulated sensor data for processing.",
        content: <SimulateReadingPage navigate={navigate} />,
      };

    case "/monitoring/sensors":
      return {
        title: "Sensors",
        subtitle: "Registered sensors and device health status.",
        content: <SensorsPage />,
      };

    case "/monitoring/alerts":
      return {
        title: "Risk Alerts",
        subtitle: "Generated alerts and delivery status.",
        content: <AlertsPage navigate={navigate} />,
      };

    case "/monitoring/logs":
      return {
        title: "Processing Logs",
        subtitle: "Validation, analysis and failure history.",
        content: <ProcessingLogsPage />,
      };

    default:
      return {
        title: "Page Not Found",
        subtitle: "The requested monitoring page does not exist.",
        content: (
          <div>
            <h2>Monitoring page not found.</h2>

            <button type="button" onClick={() => navigate("/monitoring")}>
              Back to Dashboard
            </button>
          </div>
        ),
      };
  }
}

export default function MonitoringRoutes({ path, navigate }) {
  const page = getMonitoringPage(path, navigate);

  return (
    <MonitoringLayout
      path={path}
      navigate={navigate}
      title={page.title}
      subtitle={page.subtitle}
    >
      {page.content}
    </MonitoringLayout>
  );
}
