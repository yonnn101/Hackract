import api from "../api/axiosConfig";

// --- API Methods ---

export const createWorkflow = async (data) => {
  const response = await api.post("/workflows/", data);
  return response.data;
};

export const getWorkflowsByPentest = async (pentestId) => {
  const response = await api.get(`/workflows/pentest/${pentestId}`);
  return response.data;
};

export const getWorkflowById = async (id) => {
  const response = await api.get(`/workflows/${id}`);
  return response.data;
};

export const updateWorkflow = async (id, data) => {
  const response = await api.patch(`/workflows/${id}`, data);
  return response.data;
};

// --- History API Methods ---

export const getWorkflowHistory = async (workflowId) => {
  const response = await api.get(`/workflows/${workflowId}/history`);
  return response.data;
};

export const recordWorkflowHistory = async (workflowId, historyData) => {
  const response = await api.post(`/workflows/${workflowId}/history`, historyData);
  return response.data;
};

export default {
  createWorkflow,
  getWorkflowsByPentest,
  getWorkflowById,
  updateWorkflow,
  getWorkflowHistory,
  recordWorkflowHistory,
};
