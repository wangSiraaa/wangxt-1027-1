import { create } from 'zustand';
import api from '../api/client';

export interface Package { id: string; name: string; type: 'free'|'paid'; category: 'basic'|'chronic'; price: number; subsidyAmount: number; duration: number; requiresDoctor: boolean; services: string[]; description: string; }
export interface Resident { id: string; idCard: string; name: string; gender: 'male'|'female'; age: number; phone: string; address: string; community: string; chronicTags: string[]; hasArrears: boolean; arrearsAmount: number; }
export interface Doctor { id: string; teamId: string; employeeId: string; name: string; title: string; specialty: string[]; maxPatients: number; currentPatients: number; isAvailable: boolean; utilizationRate?: number; }
export interface Team { id: string; name: string; community: string; serviceScope: string[]; maxCapacity: number; currentCapacity: number; isActive: boolean; utilizationRate?: number; doctors: Doctor[]; }
export interface Contract { id: string; residentId: string; packageId: string; teamId: string; doctorId?: string; status: string; startDate: string; endDate: string; version: number; chronicTags: string[]; renewalIntention: boolean; isTransfer: boolean; package?: Package; resident?: Resident; team?: Team; doctor?: Doctor; approvals?: Approval[]; }
export interface Approval { id: string; contractId: string; approverId: string; approverName: string; approverRole: string; action: 'approve'|'reject'|'transfer'; opinion: string; teamCapacityCheck: boolean; doctorAssignmentCheck: boolean; serviceScopeConfig: boolean; followupPlanConfig: boolean; createdAt: string; }
export interface Validation { valid: boolean; code: string; message: string; blocked?: boolean; }
export interface Followup { id: string; contractId: string; doctorId: string; residentId: string; planDate: string; planTime: string; type: 'home'|'clinic'|'phone'; status: 'scheduled'|'completed'|'cancelled'; notes: string; result?: string; resident?: Resident; doctor?: Doctor; }
export interface Service { id: string; contractId: string; residentId: string; doctorId: string; serviceType: string; serviceDate: string; serviceContent: string; duration?: number; location?: string; result?: string; notes?: string; resident?: Resident; doctor?: Doctor; }
export interface Referral { id: string; contractId: string; residentId: string; fromDoctorId: string; toDoctorId?: string; toHospital?: string; reason: string; status: 'pending'|'accepted'|'completed'|'rejected'; referralDate: string; completedDate?: string; outcome?: string; resident?: Resident; fromDoctor?: Doctor; toDoctor?: Doctor; }
export interface Fee { id: string; residentId: string; contractId?: string; type: 'subscription'|'service'|'refund'|'subsidy'; amount: number; status: 'pending'|'paid'|'overdue'|'waived'; dueDate: string; paidAt?: string; description: string; }
export interface Snapshot { id: string; snapshotDate: string; totalResidents: number; signedResidents: number; coverageRate: number; freePackageCount: number; paidPackageCount: number; chronicPackageCount: number; totalSubsidy: number; avgSubsidyPerPerson: number; arrearsCount: number; arrearsTotalAmount: number; teamUtilizationRates: any[]; statisticalCaliber: string; generatedBy: string; createdAt: string; }
export interface CoverageDetail { id: string; snapshotId: string; community: string; totalResidents: number; signedResidents: number; coverageRate: number; yearOnYear?: number; monthOnMonth?: number; }
export interface RenewalReminder { contract: Contract; resident?: Resident; package?: Package; team?: Team; daysLeft: number; urgent: boolean; }

interface DataState {
  packages: Package[]; residents: Resident[]; teams: Team[]; doctors: Doctor[];
  contracts: Contract[]; followups: Followup[]; services: Service[];
  referrals: Referral[]; fees: Fee[]; snapshots: Snapshot[];
  overview: any; renewalReminders: RenewalReminder[]; charts: any;
  loadMaster: () => Promise<void>;
  loadContracts: (q?: any) => Promise<void>;
  loadOverview: () => Promise<void>;
  validate: (data: any) => Promise<{ validations: Validation[]; blocked: boolean; hasWarning: boolean; summary: string; }>;
  createContract: (data: any) => Promise<any>;
  approve: (data: any) => Promise<any>;
  recalc: () => Promise<any>;
  loadSnapshots: () => Promise<void>;
  loadRenewal: () => Promise<void>;
  loadCharts: () => Promise<void>;
}

export const useData = create<DataState>((set, get) => ({
  packages: [], residents: [], teams: [], doctors: [], contracts: [],
  followups: [], services: [], referrals: [], fees: [], snapshots: [],
  overview: null, renewalReminders: [], charts: null,
  loadMaster: async () => {
    const [p, r, t] = await Promise.all([
      api.get<Package[]>('/master/packages'),
      api.get<Resident[]>('/master/residents'),
      api.get<Team[]>('/master/teams'),
    ]);
    set({ packages: p.data || [], residents: r.data || [], teams: t.data || [] });
  },
  loadContracts: async (q) => {
    const r = await api.get<Contract[]>('/contract/contracts', q);
    set({ contracts: r.data || [] });
  },
  loadOverview: async () => {
    const r = await api.get('/biz/overview');
    set({ overview: r.data || null });
  },
  validate: async (data) => {
    const r = await api.post('/contract/contracts/validate', data);
    return (r.data || { validations: [], blocked: false, hasWarning: false, summary: '' }) as any;
  },
  createContract: async (data) => {
    return api.post('/contract/contracts', data);
  },
  approve: async (data) => {
    return api.post('/contract/contracts/approval', data);
  },
  recalc: async () => {
    return api.post('/biz/snapshot/recalculate');
  },
  loadSnapshots: async () => {
    const r = await api.get<Snapshot[]>('/biz/snapshots');
    set({ snapshots: r.data || [] });
  },
  loadRenewal: async () => {
    const r = await api.get<RenewalReminder[]>('/biz/renewal-reminders');
    set({ renewalReminders: r.data || [] });
  },
  loadCharts: async () => {
    const r = await api.get('/biz/charts/dashboard');
    set({ charts: r.data || null });
  },
}));
