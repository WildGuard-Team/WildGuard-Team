import CommunityLayout from "../components/CommunityLayout.jsx";

import AlertDetailsPage from "../../monitoring/pages/AlertDetailsPage.jsx";

export default function SharedAlertDetailsPage({ navigate, alertId }) {
  return (
    <CommunityLayout navigate={navigate} active="bell">
      <AlertDetailsPage
        navigate={navigate}
        alertId={alertId}
        backPath="/alerts"
      />
    </CommunityLayout>
  );
}
