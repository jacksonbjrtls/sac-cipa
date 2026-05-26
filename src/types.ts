export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface DbAdmin {
  id: string; // user UID
  email: string;
  addedBy: string;
  createdAt: any; // Firestore Timestamp
}

export interface Registration {
  id?: string;
  agreedToShare: boolean;
  dateObservation: string; // dd/MM/yyyy
  isIdentified: boolean;
  name?: string;
  email?: string;
  phone?: string;
  area: string;
  category: string;
  info: string;
  status: 'pendente' | 'em_analise' | 'resolvido' | 'arquivado';
  adminNotes?: string;
  createdAt: any; // Firestore Timestamp
  respondedBy?: string;
  respondedAt?: any; // Firestore Timestamp
}

export interface SystemLog {
  id?: string;
  email: string;
  action: string;
  description: string;
  timestamp: any; // Firestore Timestamp or local object / date string
}

