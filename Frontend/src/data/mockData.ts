import { Document, ActivityItem } from '../types';

export const documents: Document[] = [
  {
    id: 'DOC-4521',
    name: 'Dossier médical patient #4521',
    type: 'Médical',
    status: 'Actif',
    totalAccess: 234,
    lastAccess: 'Il y a 2 min',
  },
  {
    id: 'DOC-8834',
    name: 'Contrat juridique #8834',
    type: 'Juridique',
    status: 'Actif',
    totalAccess: 45,
    lastAccess: 'Il y a 15 min',
  },
  {
    id: 'DOC-2234',
    name: 'Plan industriel #2234',
    type: 'Industriel',
    status: 'Actif',
    totalAccess: 89,
    lastAccess: 'Il y a 1h',
  },
  {
    id: 'DOC-7712',
    name: 'Examen final 2026',
    type: 'Éducation',
    status: 'Révoqué',
    totalAccess: 156,
    lastAccess: 'Il y a 3h',
  },
];

export const activityItems: ActivityItem[] = [
  {
    id: '1',
    user: 'Dr. Marie Dupont',
    accessType: 'Accès accordé',
    document: 'Dossier médical #4521',
    time: 'Il y a 2 min',
    location: 'CHU Paris 13',
  },
  {
    id: '2',
    user: 'Me. Jean Martin',
    accessType: 'Accès refusé',
    document: 'Contrat juridique #8834',
    time: 'Il y a 5 min',
    location: 'Hors zone autorisée',
  },
  {
    id: '3',
    user: 'Ing. Sophie Bernard',
    accessType: 'Accès accordé',
    document: 'Plan industriel #2234',
    time: 'Il y a 12 min',
    location: 'Usine Lyon Sud',
  },
  {
    id: '4',
    user: 'Prof. Alain Moreau',
    accessType: 'Accès refusé',
    document: 'Examen final 2026',
    time: 'Il y a 25 min',
    location: 'Document révoqué',
  },
  {
    id: '5',
    user: 'Dr. Claire Petit',
    accessType: 'Accès accordé',
    document: 'Dossier médical #4521',
    time: 'Il y a 45 min',
    location: 'CHU Bordeaux',
  },
];
