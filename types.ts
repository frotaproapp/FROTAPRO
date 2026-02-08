
export enum UserRole {
  PADRAO = 'PADRAO',
  COORDENADOR = 'COORDENADOR',
  DIRETOR = 'DIRETOR',
  USER = 'PADRAO',
  ORG_ADMIN = 'ORG_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_TENANT = 'ADMIN_TENANT',
  GESTOR = 'GESTOR',
  MOTORISTA = 'MOTORISTA',
  ADMIN_SECRETARIA = 'ADMIN_SECRETARIA'
}

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID',
  RESTRICTED = 'RESTRICTED',
  SUSPENDED = 'SUSPENDED'
}

export enum TripStatus {
  AGENDADA = 'AGENDADA',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
  AGUARDANDO = 'AGUARDANDO'
}

export enum ProfessionalType {
  MOTORISTA = 'MOTORISTA',
  ENFERMEIRO = 'ENFERMEIRO',
  MEDICO = 'MEDICO',
  TECNICO = 'TECNICO'
}

export enum VehicleType {
  CARRO = 'CARRO',
  AMBULANCIA = 'AMBULANCIA',
  ONIBUS = 'ONIBUS',
  VAN = 'VAN'
}

export enum AmbulanceType {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D'
}

export interface Passenger {
  name: string;
  cpf: string;
  susCard?: string;
  birthDate: string;
  direction: 'IDA' | 'VOLTA' | 'AMBOS';
}

export interface Trip {
  id: string;
  status: TripStatus;
  type: string;
  vehicleId: string;
  vehicleSnapshot: string;
  driverId?: string;
  driverName: string;
  driverUid?: string;
  solicitante: string;
  solicitante2?: string;
  responsavel: string;
  origin: string;
  destination: string;
  destination2?: string;
  destination3?: string;
  destinationUnit?: string;
  dateOut: string;
  timeOut: string;
  kmOut: number;
  kmIn?: number;
  fuelLiters?: number;
  dateReturn?: string;
  timeReturn?: string;
  patient?: {
    name: string;
    cpf: string;
    cartaoSus?: string;
    birthDate: string;
    plano: string;
    endereco: string;
    telefone: string;
    condicao: string;
    hasCompanion: boolean;
    companionName?: string;
    companionCpf?: string;
    companionPhone?: string;
    needsOxygen: boolean;
    isBedridden: boolean;
  };
  passengerList?: Passenger[];
  tripChecklist?: any;
  tenantId?: string;
  priority?: 'BAIXA' | 'NORMAL' | 'ALTA';
  driverNotes?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: VehicleType;
  capacity: number;
  currentKm: number;
  status: 'ATIVO' | 'MANUTENCAO' | 'INATIVO';
  year?: number;
  hasOxygen?: boolean;
  ambulanceType?: AmbulanceType;
  secretariaId?: string;
  checklist?: {
    spareTire: boolean;
    warningTriangle: boolean;
    jack: boolean;
    wheelWrench: boolean;
    fireExtinguisher: boolean;
  };
}

export interface Professional {
  id: string;
  name: string;
  type: ProfessionalType;
  userId?: string;
  status: 'ATIVO' | 'INATIVO';
  documentNumber?: string;
  secretariaId?: string | null;
}

export interface Solicitor {
  id: string;
  name: string;
  responsible?: string;
  secretariaId?: string | null;
}

export interface Secretaria {
  id: string;
  nome: string;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  role: UserRole;
  active: boolean;
  tenantId?: string;
  organization_id?: string;
}

export interface Tenant {
  id: string;
  name: string;
  cnpj?: string;
  estado?: string;
  email?: string;
  address?: string;
  active: boolean;
  plan?: string;
  license?: {
    status: string;
    expiresAt: any;
    type: string;
  };
}

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  entity: string;
  details: any;
  timestamp: number | string;
  secretariaId?: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  date: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface HealthPlan {
  id: string;
  name: string;
}

export interface SystemSettings {
  id: string;
  municipalityName?: string;
  logoBase64?: string;
  secretariatName?: string;
  customHeaderBase64?: string;
  licenseKey?: string;
  backupEnabled?: boolean;
  backupTime?: string;
  backupTime2?: string;
  cloudBackupEnabled?: boolean;
}

// Added ContinuityMetrics interface to fix import errors in Disaster Recovery and BCM dashboards
export interface ContinuityMetrics {
  isoStatus: string;
  lastBackup: {
    date: string;
    status: string;
    location: string;
  };
  lastDrill: {
    date: string;
    type: string;
  };
  rto: {
    actual: number;
    target: number;
    history: {
      date: string;
      value: number;
    }[];
  };
  rpo: {
    actual: number;
    target: number;
  };
}
