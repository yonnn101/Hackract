import api from '../api/axiosConfig';

const NationalIDService = {
    /**
     * Step 1: Create and Initiate verification
     */
    create: async (data) => {
        const response = await api.post('/national-id', data);
        return response.data;
    },

    /**
     * Step 1 (Alternative): Initiate verification for existing Citizen
     */
    initiateVerification: async (data) => {
        const response = await api.post('/national-id/initiate-verification', data);
        return response.data;
    },

    /**
     * Step 2: Verify OTP
     */
    verifyOtp: async (data) => {
        const response = await api.post('/national-id/verify-otp', data);
        return response.data;
    },

    /**
     * Get Status
     */
    getStatus: async () => {
        const response = await api.get('/national-id/status');
        return response.data;
    },

    /**
     * Seed Registry (Admin/Test)
     */
    seedRegistry: async () => {
        const response = await api.post('/national-id/admin/seed');
        return response.data;
    }
};

export default NationalIDService;
