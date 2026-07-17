import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";

const LegalAgreementCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const roleType = user?.roles?.[0]?.type;
  const isOrgAdmin = roleType === "ORG_ADMIN";

  useEffect(() => {
    navigate('/org-agreement', { replace: true });
  }, [navigate]);

  return <div className="min-h-screen bg-gray-50" />;
};

export default LegalAgreementCreate;
