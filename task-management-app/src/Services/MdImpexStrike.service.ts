import apiClient from './apiClient';

export interface MdImpexStrike {
  _id: string;
  date: string;
  time: string;
  strikeType?: 'small' | 'big' | string;
  poc: {
    name: string;
    email: string;
  };
  brandName?: string;
  strikeTitle: string;
  assignBy: {
    name: string;
    email: string;
  };
  company: string;
  reason: string;
  createdAt: string;
}

export const mdImpexStrikeService = {
  getStrikes: async (month?: string) => {
    try {
      const url = month ? `/md-impex-strikes?month=${month}` : '/md-impex-strikes';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch strikes'
      };
    }
  },

  createStrike: async (data: Partial<MdImpexStrike> & { pocEmail: string }) => {
    try {
      const response = await apiClient.post('/md-impex-strikes', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create strike'
      };
    }
  },

  updateStrike: async (id: string, data: Partial<MdImpexStrike> & { pocEmail?: string }) => {
    try {
      const response = await apiClient.put(`/md-impex-strikes/${id}`, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update strike'
      };
    }
  },

  deleteStrike: async (id: string) => {
    try {
      const response = await apiClient.delete(`/md-impex-strikes/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete strike'
      };
    }
  }
};
