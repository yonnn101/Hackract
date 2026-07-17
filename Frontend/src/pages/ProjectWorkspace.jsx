import { useNavigate, useParams } from "react-router-dom";
import WorkspaceView from "../components/WorkspaceView.jsx";

const ProjectWorkspace = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans selection:bg-[#00ff88]/30 selection:text-black">
      <WorkspaceView
        projectId={projectId}
        onBack={() => navigate("/projects")}
      />
    </div>
  );
};

export default ProjectWorkspace;
