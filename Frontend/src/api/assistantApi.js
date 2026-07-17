import api from './axiosConfig';

const BASE = '/ai-assistants';
const REQUEST_TIMEOUT_MS = 120000;
const MAX_RETRIES = 2;

const normalizePayload = (payload) => payload?.data ?? payload ?? {};

const getErrorMessage = (error) => {
    const responseMessage = error?.response?.data?.error
        || error?.response?.data?.message
        || error?.response?.data?.details?.message;

    if (responseMessage) {
        return String(responseMessage);
    }

    if (error?.code === 'ECONNABORTED') {
        return 'The AI assistant request timed out. Please try again.';
    }

    if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
        return 'You appear to be offline. The AI assistant could not be reached.';
    }

    return 'The AI assistant could not be reached. Please try again.';
};

export const generateWorkflowAssistantResponse = async (payload) => {
    let lastError = null;
    const requestTimeout = Math.max(10000, Number(payload?.timeoutMs) || REQUEST_TIMEOUT_MS);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        try {
            const response = await api.post(`${BASE}/generate`, payload, { timeout: requestTimeout });
            return normalizePayload(response.data);
        } catch (error) {
            lastError = error;
            if (attempt < MAX_RETRIES) {
                continue;
            }
        }
    }

    const error = new Error(getErrorMessage(lastError));
    error.cause = lastError;
    throw error;
};

export const assistantApi = {
    generateWorkflowAssistantResponse,
};

export default assistantApi;