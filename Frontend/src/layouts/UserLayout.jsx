import { Outlet } from "react-router-dom";

// Sidebar is now built into DashboardPreview and individual pages.
// This layout simply provides the route guard outlet without adding extra chrome.
const UserLayout = () => {
  return <Outlet />;
};

export default UserLayout;
