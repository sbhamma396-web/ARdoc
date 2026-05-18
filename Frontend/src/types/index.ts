export type Page = 'login' | 'dashboard' | 'encoder' | 'access' | 'scanner';

export type DocumentStatus = 'Actif' | 'Révoqué';
export type DocumentType = 'Médical' | 'Juridique' | 'Industriel' | 'Éducation';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  totalAccess: number;
  lastAccess: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  accessType: 'Accès accordé' | 'Accès refusé';
  document: string;
  time: string;
  location: string;
}
