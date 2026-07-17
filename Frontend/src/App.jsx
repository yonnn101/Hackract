import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthSync from "./hooks/useAuthSync";
import { useAuth } from "./context/authContext.jsx";
import useNotificationSocket from "./hooks/useNotificationSocket.jsx";

function App() {
  // Automatically sync Auth0 user data with PostgreSQL backend
  useAuthSync();
  
  const { accessToken, user } = useAuth();
  
  // Establish global real-time notification connection
  useNotificationSocket(accessToken, user);

  return (
    <>
      <main>
        <Outlet />
      </main>
      <Toaster />
    </>
  );
}
export default App;
