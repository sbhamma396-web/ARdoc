import api from './api';

interface User {
  _id: string;
  nom: string;
  email: string;
  role: string;
  actif: boolean;
  createdAt: string;
  stats?: {
    totalAccess: number;
    grantedAccess: number;
    deniedAccess: number;
    lastAccess: any;
  };
}

interface AuditLog {
  _id: string;
  user_id: any;
  document_id: any;
  action: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  users: { total: number; active: number; inactive: number };
  documents: { total: number };
  access: {
    today: { total: number; granted: number; denied: number };
    week: { total: number };
    month: { total: number };
    successRate: number;
  };
  charts: {
    byHour: any[];
    byRole: any[];
  };
  alerts: AuditLog[];
}

export const userService = {
  // User Management
  listUsers: async (page = 1, limit = 50, search?: string, role?: string, actif?: boolean) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (actif !== undefined) params.append('actif', actif.toString());

    const response = await api.get(`/users?${params}`);
    return response.data;
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const response = await api.put(`/users/${userId}/role`, { role });
    return response.data;
  },

  toggleUser: async (userId: string) => {
    const response = await api.put(`/users/${userId}/toggle`);
    return response.data;
  },

  resetUserMFA: async (userId: string) => {
    const response = await api.delete(`/users/${userId}/mfa`);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (page = 1, limit = 100, filters?: any) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    Object.keys(filters || {}).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });

    const response = await api.get(`/users/logs?${params}`);
    return response.data;
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/users/dashboard/stats');
    return response.data;
  },

  getTopDocuments: async (limit = 10, period = '7d') => {
    const response = await api.get(`/users/dashboard/top-documents?limit=${limit}&period=${period}`);
    return response.data;
  },

  getTopUsers: async (limit = 10, period = '7d') => {
    const response = await api.get(`/users/dashboard/top-users?limit=${limit}&period=${period}`);
    return response.data;
  },

  getLiveActivity: async () => {
    const response = await api.get('/users/dashboard/live');
    return response.data;
  },

  // Document Management (Admin)
  listAllDocuments: async (page = 1, limit = 50, search?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    const response = await api.get(`/users/documents?${params}`);
    return response.data;
  },

  revokeDocument: async (docId: string) => {
    const response = await api.put(`/users/documents/${docId}/revoke`);
    return response.data;
  },

  restoreDocument: async (docId: string) => {
    const response = await api.put(`/users/documents/${docId}/restore`);
    return response.data;
  },

  deleteDocument: async (docId: string) => {
    const response = await api.delete(`/users/documents/${docId}`);
    return response.data;
  },

  // User Policies
  updateUserPolicy: async (userId: string, policy: {
    gps_zone?: { lat: number; lng: number; radius: number };
    time_window?: string;
    device_id?: string;
  }) => {
    const response = await api.put(`/users/${userId}/policy`, policy);
    return response.data;
  },

  // Document Permissions
  getDocumentUsers: async (docId: string) => {
    const response = await api.get(`/users/documents/${docId}/users`);
    return response.data;
  },

  updateDocumentUsers: async (docId: string, userIds: string[]) => {
    const response = await api.put(`/users/documents/${docId}/users`, { userIds });
    return response.data;
  },
};

export default userService;
