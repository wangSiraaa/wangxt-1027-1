export type Role = 'resident' | 'doctor' | 'admin';

export interface JWTPayload {
  userId: string;
  role: Role;
  refId: string;
  name: string;
}

export interface LoginRequest {
  role: Role;
  idCard?: string;
  phone?: string;
  employeeId?: string;
  username?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: JWTPayload;
}

export interface Resident {
  id: string;
  idCard: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  phone: string;
  address: string;
  community: string;
  chronicTags: string[];
  hasArrears: boolean;
  arrearsAmount: number;
  currentContractId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  name: string;
  type: 'free' | 'paid';
  category: 'basic' | 'chronic';
  price: number;
  subsidyAmount: number;
  duration: number;
  requiresDoctor: boolean;
  services: string[];
  description: string;
  isActive: boolean;
}

export interface DoctorTeam {
  id: string;
  name: string;
  community: string;
  serviceScope: string[];
  maxCapacity: number;
  currentCapacity: number;
  isActive: boolean;
}

export interface Doctor {
  id: string;
  teamId: string;
  employeeId: string;
  name: string;
  title: string;
  specialty: string[];
  maxPatients: number;
  currentPatients: number;
  isAvailable: boolean;
}

export type ContractStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'expired' | 'terminated';

export interface Contract {
  id: string;
  residentId: string;
  packageId: string;
  teamId: string;
  doctorId?: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  version: number;
  chronicTags: string[];
  renewalIntention: boolean;
  isTransfer: boolean;
  transferFromTeamId?: string;
  createdAt: string;
  updatedAt: string;
  package?: Package;
  resident?: Resident;
  team?: DoctorTeam;
  doctor?: Doctor;
}

export interface ApprovalRecord {
  id: string;
  contractId: string;
  approverId: string;
  approverName: string;
  approverRole: string;
  action: 'approve' | 'reject' | 'transfer';
  opinion: string;
  teamCapacityCheck: boolean;
  doctorAssignmentCheck: boolean;
  serviceScopeConfig: boolean;
  followupPlanConfig: boolean;
  createdAt: string;
}

export interface FollowupPlan {
  id: string;
  contractId: string;
  doctorId: string;
  residentId: string;
  planDate: string;
  planTime: string;
  type: 'home' | 'clinic' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  result?: string;
  completedAt?: string;
  resident?: Resident;
  doctor?: Doctor;
}

export interface ServiceRecord {
  id: string;
  contractId: string;
  residentId: string;
  doctorId: string;
  serviceType: string;
  serviceDate: string;
  serviceContent: string;
  duration?: number;
  location?: string;
  result?: string;
  notes?: string;
  resident?: Resident;
  doctor?: Doctor;
}

export interface ReferralRecord {
  id: string;
  contractId: string;
  residentId: string;
  fromDoctorId: string;
  toDoctorId?: string;
  toHospital?: string;
  reason: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  referralDate: string;
  completedDate?: string;
  outcome?: string;
  approvalRecords: any[];
  resident?: Resident;
  fromDoctor?: Doctor;
  toDoctor?: Doctor;
}

export interface FeeRecord {
  id: string;
  residentId: string;
  contractId?: string;
  type: 'subscription' | 'service' | 'refund' | 'subsidy';
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  dueDate: string;
  paidAt?: string;
  description: string;
}

export interface StatisticsSnapshot {
  id: string;
  snapshotDate: string;
  totalResidents: number;
  signedResidents: number;
  coverageRate: number;
  freePackageCount: number;
  paidPackageCount: number;
  chronicPackageCount: number;
  totalSubsidy: number;
  avgSubsidyPerPerson: number;
  arrearsCount: number;
  arrearsTotalAmount: number;
  teamUtilizationRates: { teamId: string; teamName: string; utilizationRate: number }[];
  statisticalCaliber: string;
  generatedBy: string;
  createdAt: string;
}

export interface CoverageDetail {
  id: string;
  snapshotId: string;
  community: string;
  totalResidents: number;
  signedResidents: number;
  coverageRate: number;
  yearOnYear?: number;
  monthOnMonth?: number;
}

export interface ArrearsConfig {
  id: string;
  maxArrearsAmount: number;
  allowFreePackageOnly: boolean;
  autoSuspension: boolean;
  gracePeriod: number;
}

export interface ValidationResult {
  valid: boolean;
  code: string;
  message: string;
  blocked?: boolean;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}
