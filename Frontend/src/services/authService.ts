import api from './api';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  nom: string;
  email: string;
  password: string;
  role?: string;
}

interface MFASetupResponse {
  secret: string;
  qrcode: string;
  otpauth_url: string;
}

interface BiometricOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  timeout: number;
  attestation: string;
  authenticatorSelection: {
    residentKey: string;
    userVerification: string;
    authenticatorAttachment: string;
  };
  excludeCredentials: Array<any>;
}

export const authService = {
  // Basic Auth
  register: async (data: RegisterPayload) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginPayload) => {
    const response = await api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('access_token', response.data.token);
    }
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('access_token');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // MFA
  setupMFA: async (): Promise<MFASetupResponse> => {
    const response = await api.post('/auth/mfa/setup');
    return response.data;
  },

  activateMFA: async (code: string) => {
    const response = await api.post('/auth/mfa/activate', { code });
    return response.data;
  },

  verifyMFA: async (mfaToken: string, code: string) => {
    const response = await api.post('/auth/mfa/verify', { mfa_token: mfaToken, code });
    if (response.data.token) {
      localStorage.setItem('access_token', response.data.token);
    }
    return response.data;
  },

  getMFAStatus: async () => {
    const response = await api.get('/auth/mfa/status');
    return response.data;
  },

  disableMFA: async (code: string) => {
    const response = await api.delete('/auth/mfa/disable', { data: { code } });
    return response.data;
  },

  // Biometric (WebAuthn)
  getBiometricRegisterOptions: async (): Promise<BiometricOptions> => {
    const response = await api.post('/auth/biometric/register-options');
    return response.data;
  },

  verifyBiometricRegistration: async (response: any) => {
    const result = await api.post('/auth/biometric/register-verify', response);
    return result.data;
  },

  getBiometricAuthOptions: async (email: string): Promise<BiometricOptions> => {
    const response = await api.post('/auth/biometric/auth-options', { email });
    return response.data;
  },

  verifyBiometricAuth: async (userId: string, assertionResponse: any) => {
    const response = await api.post('/auth/biometric/auth-verify', { userId, ...assertionResponse });
    if (response.data.token) {
      localStorage.setItem('access_token', response.data.token);
    }
    return response.data;
  },

  getBiometricDevices: async () => {
    const response = await api.get('/auth/biometric/devices');
    return response.data;
  },

  deleteBiometricDevice: async (credentialId: string) => {
    const response = await api.delete(`/auth/biometric/devices/${credentialId}`);
    return response.data;
  },

  // CSRF & Refresh
  getCSRFToken: async () => {
    const response = await api.get('/auth/csrf-token');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

export default authService;
