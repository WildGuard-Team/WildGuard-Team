import CommunityLayout from "../components/CommunityLayout.jsx";
import AlertsPage from "../../monitoring/pages/AlertsPage.jsx";

export default function SharedAlertsPage({ navigate }) {
  return (
    <CommunityLayout navigate={navigate} active="bell">
      <AlertsPage
        navigate={navigate}
        detailsBasePath="/alerts"
        hidePageHeading={false}
      />
    </CommunityLayout>
  );
}
