import api from './api';

interface DocumentMetadata {
  nom: string;
  file_type: string;
  file_size: number;
  original_name: string;
  createdAt: string;
}

interface EncodeTextPayload {
  nom: string;
  contenu: string;
  allowedUsers?: string[];
}

interface DecodePayload {
  doc_id: string;
}

interface DecodeResponse {
  success: boolean;
  plaintext: string;
  document: {
    nom: string;
    type: string;
    mime: string;
  };
}

export const documentService = {
  // Upload and encode file
  encodeFile: async (file: File, documentName: string, allowedUsers?: string[]) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nom', documentName);
    if (allowedUsers && allowedUsers.length > 0) {
      formData.append('allowedUsers', JSON.stringify(allowedUsers));
    }

    const response = await api.post('/documents/encode', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });

    // Auto-download PDF
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${documentName}_secure.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentElement?.removeChild(link);

    return response.data;
  },

  // Encode plain text
  encodeText: async (payload: EncodeTextPayload) => {
    const response = await api.post('/documents/encode-text', payload, {
      responseType: 'blob',
    });

    // Auto-download PDF
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${payload.nom}_secure.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentElement?.removeChild(link);

    return response.data;
  },

  // Decrypt document
  decode: async (docId: string): Promise<DecodeResponse> => {
    const response = await api.post('/documents/decode', { doc_id: docId });
    return response.data;
  },

  // List accessible documents
  listDocuments: async () => {
    const response = await api.get('/documents');
    return response.data as DocumentMetadata[];
  },

  // Delete (soft delete) document
  deleteDocument: async (docId: string) => {
    const response = await api.delete(`/documents/${docId}`);
    return response.data;
  },
};

export default documentService;
