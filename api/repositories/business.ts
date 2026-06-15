import dayjs from 'dayjs';
import { query, queryOne, run, genId } from '../db/database.js';
import {
  Contract, ApprovalRecord, FollowupPlan, ServiceRecord,
  ReferralRecord, FeeRecord, StatisticsSnapshot, CoverageDetail, ArrearsConfig,
} from '../types/index.js';
import { ResidentRepo, PackageRepo, TeamRepo, DoctorRepo } from './master.js';

const parseJSON = (v: any, def: any) => {
  if (!v) return def;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return def; }
};

function hydrateContract(c: any): Contract {
  return {
    id: c.id,
    residentId: c.resident_id,
    packageId: c.package_id,
    teamId: c.team_id,
    doctorId: c.doctor_id,
    status: c.status,
    startDate: c.start_date,
    endDate: c.end_date,
    version: c.version || 1,
    chronicTags: parseJSON(c.chronic_tags, []),
    renewalIntention: c.renewal_intention === 1,
    isTransfer: c.is_transfer === 1,
    transferFromTeamId: c.transfer_from_team_id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function withJoins(contracts: Contract[]): Contract[] {
  return contracts.map((c) => ({
    ...c,
    package: PackageRepo.findById(c.packageId) || undefined,
    resident: ResidentRepo.findById(c.residentId) || undefined,
    team: TeamRepo.findById(c.teamId) || undefined,
    doctor: c.doctorId ? DoctorRepo.findById(c.doctorId) || undefined : undefined,
  }));
}

export const ContractRepo = {
  findAll: (opts: { status?: string; residentId?: string; teamId?: string; doctorId?: string } = {}): Contract[] => {
    const clauses: string[] = [];
    const params: any[] = [];
    if (opts.status) { clauses.push('status = ?'); params.push(opts.status); }
    if (opts.residentId) { clauses.push('resident_id = ?'); params.push(opts.residentId); }
    if (opts.teamId) { clauses.push('team_id = ?'); params.push(opts.teamId); }
    if (opts.doctorId) { clauses.push('doctor_id = ?'); params.push(opts.doctorId); }
    const sql = `SELECT * FROM contract ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY created_at DESC`;
    return withJoins(query<any>(sql, params).map(hydrateContract));
  },

  findById: (id: string): Contract | null => {
    const r = queryOne<any>('SELECT * FROM contract WHERE id = ?', [id]);
    return r ? withJoins([hydrateContract(r)])[0] : null;
  },

  countActive: (): number =>
    Number(queryOne<any>(`SELECT COUNT(*) as c FROM contract WHERE status IN ('approved','active')`)?.c || 0),

  create: (data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { version?: number }): Contract => {
    const id = genId('CTR');
    const version = data.version || 1;
    run(
      `INSERT INTO contract (id, resident_id, package_id, team_id, doctor_id, status, start_date, end_date,
       version, chronic_tags, renewal_intention, is_transfer, transfer_from_team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.residentId, data.packageId, data.teamId, data.doctorId || null, data.status,
        data.startDate, data.endDate, version, JSON.stringify(data.chronicTags || []),
        data.renewalIntention ? 1 : 0, data.isTransfer ? 1 : 0, data.transferFromTeamId || null]
    );
    return ContractRepo.findById(id)!;
  },

  updateStatus: (id: string, status: string): Contract | null => {
    run(`UPDATE contract SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);
    return ContractRepo.findById(id);
  },

  update: (id: string, data: Partial<Contract>): Contract | null => {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.doctorId) { fields.push('doctor_id = ?'); params.push(data.doctorId); }
    if (data.startDate) { fields.push('start_date = ?'); params.push(data.startDate); }
    if (data.endDate) { fields.push('end_date = ?'); params.push(data.endDate); }
    if (typeof data.renewalIntention === 'boolean') {
      fields.push('renewal_intention = ?'); params.push(data.renewalIntention ? 1 : 0);
    }
    if (data.chronicTags) { fields.push('chronic_tags = ?'); params.push(JSON.stringify(data.chronicTags)); }
    fields.push('version = version + 1');
    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    run(`UPDATE contract SET ${fields.join(', ')} WHERE id = ?`, params);
    return ContractRepo.findById(id);
  },

  renewContract: (oldId: string, newStartDate: string, newEndDate: string): Contract | null => {
    const old = ContractRepo.findById(oldId);
    if (!old) return null;
    run(`UPDATE contract SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [oldId]);
    const c = ContractRepo.create({
      residentId: old.residentId,
      packageId: old.packageId,
      teamId: old.teamId,
      doctorId: old.doctorId,
      status: 'pending',
      startDate: newStartDate,
      endDate: newEndDate,
      version: (old.version || 1) + 1,
      chronicTags: old.chronicTags,
      renewalIntention: true,
      isTransfer: false,
    });
    return c;
  },
};

export const ApprovalRepo = {
  findByContract: (contractId: string): ApprovalRecord[] =>
    query<any>('SELECT * FROM approval_record WHERE contract_id = ? ORDER BY created_at DESC', [contractId]).map((r) => ({
      id: r.id, contractId: r.contract_id, approverId: r.approver_id,
      approverName: r.approver_name, approverRole: r.approver_role,
      action: r.action, opinion: r.opinion || '',
      teamCapacityCheck: r.team_capacity_check === 1,
      doctorAssignmentCheck: r.doctor_assignment_check === 1,
      serviceScopeConfig: r.service_scope_config === 1,
      followupPlanConfig: r.followup_plan_config === 1,
      createdAt: r.created_at,
    })),

  create: (data: Omit<ApprovalRecord, 'id' | 'createdAt'>): ApprovalRecord => {
    const id = genId('APR');
    run(
      `INSERT INTO approval_record (id, contract_id, approver_id, approver_name, approver_role, action, opinion,
       team_capacity_check, doctor_assignment_check, service_scope_config, followup_plan_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.contractId, data.approverId, data.approverName, data.approverRole, data.action, data.opinion,
        data.teamCapacityCheck ? 1 : 0, data.doctorAssignmentCheck ? 1 : 0,
        data.serviceScopeConfig ? 1 : 0, data.followupPlanConfig ? 1 : 0]
    );
    return { ...data, id, createdAt: new Date().toISOString() };
  },
};

export const FollowupRepo = {
  findAll: (opts: { doctorId?: string; status?: string; residentId?: string } = {}): FollowupPlan[] => {
    const clauses: string[] = [];
    const params: any[] = [];
    if (opts.doctorId) { clauses.push('doctor_id = ?'); params.push(opts.doctorId); }
    if (opts.status) { clauses.push('status = ?'); params.push(opts.status); }
    if (opts.residentId) { clauses.push('resident_id = ?'); params.push(opts.residentId); }
    const rows = query<any>(
      `SELECT * FROM followup_plan ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY plan_date DESC`,
      params
    );
    return rows.map((r) => ({
      id: r.id, contractId: r.contract_id, doctorId: r.doctor_id, residentId: r.resident_id,
      planDate: r.plan_date, planTime: r.plan_time, type: r.type, status: r.status,
      notes: r.notes || '', result: r.result, completedAt: r.completed_at,
      resident: ResidentRepo.findById(r.resident_id) || undefined,
      doctor: DoctorRepo.findById(r.doctor_id) || undefined,
    }));
  },

  create: (data: Omit<FollowupPlan, 'id'>): FollowupPlan => {
    const id = genId('FUP');
    run(
      `INSERT INTO followup_plan (id, contract_id, doctor_id, resident_id, plan_date, plan_time, type, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.contractId, data.doctorId, data.residentId, data.planDate, data.planTime, data.type, data.status, data.notes]
    );
    return { ...data, id };
  },

  complete: (id: string, result: string): boolean => {
    run(
      `UPDATE followup_plan SET status = 'completed', result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [result, id]
    );
    return true;
  },
};

export const ServiceRepo = {
  findAll: (opts: { residentId?: string; doctorId?: string } = {}): ServiceRecord[] => {
    const clauses: string[] = [];
    const params: any[] = [];
    if (opts.residentId) { clauses.push('resident_id = ?'); params.push(opts.residentId); }
    if (opts.doctorId) { clauses.push('doctor_id = ?'); params.push(opts.doctorId); }
    const rows = query<any>(
      `SELECT * FROM service_record ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY service_date DESC`,
      params
    );
    return rows.map((r) => ({
      id: r.id, contractId: r.contract_id, residentId: r.resident_id, doctorId: r.doctor_id,
      serviceType: r.service_type, serviceDate: r.service_date, serviceContent: r.service_content,
      duration: r.duration, location: r.location, result: r.result, notes: r.notes,
      resident: ResidentRepo.findById(r.resident_id) || undefined,
      doctor: DoctorRepo.findById(r.doctor_id) || undefined,
    }));
  },

  create: (data: Omit<ServiceRecord, 'id'>): ServiceRecord => {
    const id = genId('SRV');
    run(
      `INSERT INTO service_record (id, contract_id, resident_id, doctor_id, service_type, service_date, service_content, duration, location, result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.contractId, data.residentId, data.doctorId, data.serviceType, data.serviceDate,
        data.serviceContent, data.duration, data.location, data.result, data.notes]
    );
    return { ...data, id };
  },
};

export const ReferralRepo = {
  findAll: (opts: { status?: string; residentId?: string; fromDoctorId?: string } = {}): ReferralRecord[] => {
    const clauses: string[] = [];
    const params: any[] = [];
    if (opts.status) { clauses.push('status = ?'); params.push(opts.status); }
    if (opts.residentId) { clauses.push('resident_id = ?'); params.push(opts.residentId); }
    if (opts.fromDoctorId) { clauses.push('from_doctor_id = ?'); params.push(opts.fromDoctorId); }
    const rows = query<any>(
      `SELECT * FROM referral_record ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''} ORDER BY referral_date DESC`,
      params
    );
    return rows.map((r) => ({
      id: r.id, contractId: r.contract_id, residentId: r.resident_id,
      fromDoctorId: r.from_doctor_id, toDoctorId: r.to_doctor_id, toHospital: r.to_hospital,
      reason: r.reason, status: r.status, referralDate: r.referral_date, completedDate: r.completed_date,
      outcome: r.outcome, approvalRecords: parseJSON(r.approval_records, []),
      resident: ResidentRepo.findById(r.resident_id) || undefined,
      fromDoctor: DoctorRepo.findById(r.from_doctor_id) || undefined,
      toDoctor: r.to_doctor_id ? DoctorRepo.findById(r.to_doctor_id) || undefined : undefined,
    }));
  },

  create: (data: Omit<ReferralRecord, 'id'>): ReferralRecord => {
    const id = genId('REF');
    run(
      `INSERT INTO referral_record (id, contract_id, resident_id, from_doctor_id, to_doctor_id, to_hospital,
       reason, status, referral_date, outcome, approval_records)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.contractId, data.residentId, data.fromDoctorId, data.toDoctorId, data.toHospital,
        data.reason, data.status, data.referralDate, data.outcome, JSON.stringify(data.approvalRecords || [])]
    );
    return { ...data, id };
  },

  update: (id: string, patch: Partial<ReferralRecord>): ReferralRecord | null => {
    const fields: string[] = [];
    const params: any[] = [];
    if (patch.status) { fields.push('status = ?'); params.push(patch.status); }
    if (patch.toDoctorId) { fields.push('to_doctor_id = ?'); params.push(patch.toDoctorId); }
    if (patch.outcome) { fields.push('outcome = ?'); params.push(patch.outcome); }
    if (patch.approvalRecords) { fields.push('approval_records = ?'); params.push(JSON.stringify(patch.approvalRecords)); }
    if (patch.status === 'completed') { fields.push('completed_date = CURRENT_TIMESTAMP'); }
    params.push(id);
    run(`UPDATE referral_record SET ${fields.join(', ')} WHERE id = ?`, params);
    return ReferralRepo.findAll()[0] || null;
  },
};

export const FeeRepo = {
  findByResident: (residentId: string): FeeRecord[] =>
    query<any>('SELECT * FROM fee_record WHERE resident_id = ? ORDER BY due_date DESC', [residentId]).map((r) => ({
      id: r.id, residentId: r.resident_id, contractId: r.contract_id,
      type: r.type, amount: r.amount, status: r.status, dueDate: r.due_date,
      paidAt: r.paid_at, description: r.description,
    })),

  findOverdue: (): FeeRecord[] =>
    query<any>(`SELECT * FROM fee_record WHERE status = 'overdue' OR (status = 'pending' AND due_date < date('now')) ORDER BY due_date`).map((r) => ({
      id: r.id, residentId: r.resident_id, contractId: r.contract_id,
      type: r.type, amount: r.amount, status: r.status, dueDate: r.due_date,
      paidAt: r.paid_at, description: r.description,
    })),

  create: (data: Omit<FeeRecord, 'id'>): FeeRecord => {
    const id = genId('FEE');
    run(
      `INSERT INTO fee_record (id, resident_id, contract_id, type, amount, status, due_date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.residentId, data.contractId, data.type, data.amount, data.status, data.dueDate, data.description]
    );
    return { ...data, id };
  },

  pay: (id: string): boolean => {
    run(`UPDATE fee_record SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    return true;
  },
};

export const StatisticsRepo = {
  findSnapshots: (limit = 30): StatisticsSnapshot[] =>
    query<any>(`SELECT * FROM statistics_snapshot ORDER BY snapshot_date DESC LIMIT ?`, [limit]).map((r) => ({
      id: r.id, snapshotDate: r.snapshot_date, totalResidents: r.total_residents,
      signedResidents: r.signed_residents, coverageRate: r.coverage_rate,
      freePackageCount: r.free_package_count || 0, paidPackageCount: r.paid_package_count || 0,
      chronicPackageCount: r.chronic_package_count || 0, totalSubsidy: r.total_subsidy || 0,
      avgSubsidyPerPerson: r.avg_subsidy_per_person || 0,
      arrearsCount: r.arrears_count || 0, arrearsTotalAmount: r.arrears_total_amount || 0,
      teamUtilizationRates: parseJSON(r.team_utilization_rates, []),
      statisticalCaliber: r.statistical_caliber || '',
      generatedBy: r.generated_by, createdAt: r.created_at,
    })),

  findLatest: (): StatisticsSnapshot | null => StatisticsRepo.findSnapshots(1)[0] || null,

  findCoverageDetails: (snapshotId: string): CoverageDetail[] =>
    query<any>('SELECT * FROM coverage_detail WHERE snapshot_id = ?', [snapshotId]).map((r) => ({
      id: r.id, snapshotId: r.snapshot_id, community: r.community,
      totalResidents: r.total_residents, signedResidents: r.signed_residents,
      coverageRate: r.coverage_rate, yearOnYear: r.year_on_year, monthOnMonth: r.month_on_month,
    })),

  createSnapshot: (data: Omit<StatisticsSnapshot, 'id' | 'createdAt'>, details: Omit<CoverageDetail, 'id' | 'snapshotId'>[]): StatisticsSnapshot => {
    const id = genId('SS');
    run(
      `INSERT INTO statistics_snapshot (id, snapshot_date, total_residents, signed_residents, coverage_rate,
       free_package_count, paid_package_count, chronic_package_count, total_subsidy, avg_subsidy_per_person,
       arrears_count, arrears_total_amount, team_utilization_rates, statistical_caliber, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.snapshotDate, data.totalResidents, data.signedResidents, data.coverageRate,
        data.freePackageCount, data.paidPackageCount, data.chronicPackageCount,
        data.totalSubsidy, data.avgSubsidyPerPerson, data.arrearsCount, data.arrearsTotalAmount,
        JSON.stringify(data.teamUtilizationRates), data.statisticalCaliber, data.generatedBy]
    );
    for (const d of details) {
      const did = genId('CD');
      run(
        `INSERT INTO coverage_detail (id, snapshot_id, community, total_residents, signed_residents, coverage_rate, year_on_year, month_on_month)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [did, id, d.community, d.totalResidents, d.signedResidents, d.coverageRate, d.yearOnYear ?? 0, d.monthOnMonth ?? 0]
      );
    }
    const arr = StatisticsRepo.findSnapshots(1);
    return arr[0];
  },
};

export const ConfigRepo = {
  getArrearsConfig: (): ArrearsConfig | null => {
    const r = queryOne<any>('SELECT * FROM arrears_config LIMIT 1');
    if (!r) return null;
    return {
      id: r.id, maxArrearsAmount: r.max_arrears_amount,
      allowFreePackageOnly: r.allow_free_package_only === 1,
      autoSuspension: r.auto_suspension === 1, gracePeriod: r.grace_period,
    };
  },

  getSystemConfig: (key: string): string | null => {
    const r = queryOne<any>('SELECT config_value FROM system_config WHERE config_key = ?', [key]);
    return r?.config_value ?? null;
  },
};

export { genId };
