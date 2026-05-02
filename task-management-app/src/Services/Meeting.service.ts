import apiClient from './apiClient';

export interface Meeting {
    _id: string;
    meetingName: string;
    startTime: string;
    endTime: string;
    duration: number;
    createdBy: {
        _id: string;
        name: string;
        email: string;
    };
    participants: {
        _id: string;
        name: string;
        email: string;
    }[];
    description?: string;
    isZoomMeeting?: boolean;
    zoomMeetingId?: string;
    zoomJoinUrl?: string;
    zoomPassword?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
}

export const meetingService = {
    createMeeting: async (data: any) => {
        try {
            const response = await apiClient.post('/meetings', data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error.message;
        }
    },

    getAllMeetings: async () => {
        try {
            const response = await apiClient.get('/meetings');
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error.message;
        }
    },

    updateMeeting: async (id: string, data: any) => {
        try {
            const response = await apiClient.put(`/meetings/${id}`, data);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error.message;
        }
    },

    deleteMeeting: async (id: string) => {
        try {
            const response = await apiClient.delete(`/meetings/${id}`);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error.message;
        }
    },

    endMeeting: async (id: string) => {
        try {
            const response = await apiClient.put(`/meetings/${id}/end`);
            return response.data;
        } catch (error: any) {
            throw error.response?.data || error.message;
        }
    }
};
