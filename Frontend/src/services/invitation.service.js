import api from "../api/axiosConfig";

export const sendInvitation = async (data) => {
  const response = await api.post("/invitations", data);
  return response.data;
};

export const getInvitationsByProject = async (pentestId) => {
  const response = await api.get(`/invitations/project/${pentestId}`);
  return response.data;
};

export const getMyInvitations = async (params) => {
  const response = await api.get("/invitations/mine", { params });
  return response.data;
};

export const respondToInvitation = async (id, payloadOrStatus) => {
  const payload = typeof payloadOrStatus === 'string'
    ? { status: payloadOrStatus }
    : payloadOrStatus;
  const response = await api.patch(`/invitations/${id}/respond`, payload);
  return response.data;
};

export const revokeInvitation = async (id) => {
  const response = await api.delete(`/invitations/${id}`);
  return response.data;
};

export const getPendingCount = async () => {
  const response = await api.get("/invitations/mine/count");
  return response.data;
};

export default {
  sendInvitation,
  getInvitationsByProject,
  getMyInvitations,
  respondToInvitation,
  revokeInvitation,
  getPendingCount,
};
