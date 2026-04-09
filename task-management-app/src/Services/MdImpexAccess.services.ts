import apiClient from "./apiClient";

const isDev = Boolean(import.meta.env.DEV);

const describeAxiosError = (err: any) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const code = err?.code;
    const message = err?.message;
    const method = err?.config?.method;
    const baseURL = err?.config?.baseURL;
    const url = err?.config?.url;

    const fullUrl =
        baseURL && url
            ? `${String(baseURL).replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`
            : (baseURL || url);

    return { status, data, code, message, method, url: fullUrl };
};

type MemberItem = {
    id: string;
    email: string;
    name: string;
    role: string;
    companyName: string;
};

type RoleItem = {
    id: string;
    role: string;
    emails: string[];
    description: string;
    createdAt: string;
    updatedAt?: string;
};

type CreateRolePayload = {
    role: string;
    emails?: string[];
    description?: string;
};

type UpdateRoleEmailsPayload = {
    emails: string[];
};

type PersonAccessItem = {
    id: string;
    assignedToEmail: string;
    assignedToName: string;
    assignedToRole: string;
    accessRole: string;
    allowedAssignees: string[];
    allowedTaskTypes?: string[];
    allowedBrands?: string[];
    showEmployeeOfMonth?: boolean;
    showMonthlyRanking?: boolean;
    showPowerStar?: boolean;
    createdAt: string;
    updatedAt?: string;
};

type CreatePersonAccessPayload = {
    assignedToEmail: string;
    assignedToRole: string;
    accessRole?: string;
    allowedAssignees: string[];
    allowedTaskTypes?: string[];
    allowedBrands?: string[];
    showEmployeeOfMonth?: boolean;
    showMonthlyRanking?: boolean;
    showPowerStar?: boolean;
};

type UpdatePersonAccessPayload = {
    accessRole?: string;
    allowedAssignees: string[];
    allowedTaskTypes?: string[];
    allowedBrands?: string[];
    showEmployeeOfMonth?: boolean;
    showMonthlyRanking?: boolean;
    showPowerStar?: boolean;
};

class MdImpexAccessService {
    baseUrl = "/md-impex-access/";

    async getAllRoles() {
        try {
            const res = await apiClient.get(`${this.baseUrl}roles?companyName=MD%20Impex`);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || [] as RoleItem[],
                message: res.data.message || 'Roles fetched successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Get Roles Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [] as RoleItem[],
                message: backendMessage || backendError || err.message || 'Failed to fetch roles'
            };
        }
    }

    async getAllMembers() {
        try {
            const res = await apiClient.get(`${this.baseUrl}members?companyName=MD%20Impex`);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || [] as MemberItem[],
                message: res.data.message || 'Members fetched successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Get Members Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [] as MemberItem[],
                message: backendMessage || backendError || err.message || 'Failed to fetch members'
            };
        }
    }

    async getEmailsByRole(role: string) {
        try {
            const res = await apiClient.get(`${this.baseUrl}roles/${encodeURIComponent(role)}/emails`);
            return {
                success: Boolean(res.data.success),
                data: res.data.data?.emails || [] as string[],
                message: res.data.message || 'Emails fetched successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Get Emails By Role Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [] as string[],
                message: backendMessage || backendError || err.message || 'Failed to fetch emails'
            };
        }
    }

    async createRole(payload: CreateRolePayload) {
        try {
            const res = await apiClient.post(`${this.baseUrl}roles`, payload);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || null,
                message: res.data.message || 'Role created successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Create Role Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || 'Failed to create role'
            };
        }
    }

    async updateRoleEmails(roleId: string, payload: UpdateRoleEmailsPayload) {
        try {
            const res = await apiClient.patch(`${this.baseUrl}roles/${roleId}/emails`, payload);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || null,
                message: res.data.message || 'Role emails updated successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Update Role Emails Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || 'Failed to update role emails'
            };
        }
    }

    async deleteRole(roleId: string) {
        try {
            const res = await apiClient.delete(`${this.baseUrl}roles/${roleId}`);
            return {
                success: Boolean(res.data.success),
                message: res.data.message || 'Role deleted successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Delete Role Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                message: backendMessage || backendError || err.message || 'Failed to delete role'
            };
        }
    }

    // Person-wise access methods
    async getAllPersonAccess() {
        try {
            const res = await apiClient.get(`${this.baseUrl}person-access`);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || [] as PersonAccessItem[],
                message: res.data.message || 'Person access fetched successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Get Person Access Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [] as PersonAccessItem[],
                message: backendMessage || backendError || err.message || 'Failed to fetch person access'
            };
        }
    }

    async createPersonAccess(payload: CreatePersonAccessPayload) {
        try {
            const res = await apiClient.post(`${this.baseUrl}person-access`, payload);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || null,
                message: res.data.message || 'Person access created successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Create Person Access Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || 'Failed to create person access'
            };
        }
    }

    async updatePersonAccess(personAccessId: string, payload: UpdatePersonAccessPayload) {
        try {
            const res = await apiClient.patch(`${this.baseUrl}person-access/${personAccessId}`, payload);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || null,
                message: res.data.message || 'Person access updated successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Update Person Access Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || 'Failed to update person access'
            };
        }
    }

    async deletePersonAccess(personAccessId: string) {
        try {
            const res = await apiClient.delete(`${this.baseUrl}person-access/${personAccessId}`);
            return {
                success: Boolean(res.data.success),
                message: res.data.message || 'Person access deleted successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Delete Person Access Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                message: backendMessage || backendError || err.message || 'Failed to delete person access'
            };
        }
    }
}

const mdImpexAccessService = new MdImpexAccessService();
export default mdImpexAccessService;
