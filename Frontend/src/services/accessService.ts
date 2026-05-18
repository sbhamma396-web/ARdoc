import api from './api';

interface AccessCheckPayload {
  doc_id: string;
  gps_lat?: number;
  gps_lng?: number;
  device_fingerprint?: string;
}

interface AccessCheckResponse {
  granted: boolean;
  content?: string;
  reason?: string;
  document?: {
    id: string;
    nom: string;
    file_type: string;
    mime_type: string;
  };
}

export const accessService = {
  // Check document access with all conditions (GPS, time, device)
  checkAccess: async (payload: AccessCheckPayload): Promise<AccessCheckResponse> => {
    const response = await api.post('/access-check', payload);
    return response.data;
  },

  // Get user's current GPS position
  getUserPosition: async (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => reject(error)
      );
    });
  },
};

export default accessService;
