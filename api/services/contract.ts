import dayjs from 'dayjs';
import { ContractRuleEngine } from './rules.js';
import { ResidentRepo, PackageRepo, TeamRepo, DoctorRepo } from '../repositories/master.js';
import {
  ContractRepo, ApprovalRepo, FollowupRepo, ServiceRepo, FeeRepo, ReferralRepo, ConfigRepo,
} from '../repositories/business.js';
import { Contract, ValidationResult, JWTPayload } from '../types/index.js';

export interface CreateContractDTO {
  residentId: string;
  packageId: string;
  teamId: string;
  doctorId?: string;
  chronicTags?: string[];
  renewalIntention?: boolean;
  isTransfer?: boolean;
  transferFromTeamId?: string;
}

export interface ApprovalDTO {
  contractId: string;
  action: 'approve' | 'reject' | 'transfer';
  opinion: string;
  approver: JWTPayload;
  toTeamId?: string;
  toDoctorId?: string;
  teamCapacityCheck?: boolean;
  doctorAssignmentCheck?: boolean;
  serviceScopeConfig?: boolean;
  followupPlanConfig?: boolean;
}

export class ContractService {
  async validateContract(dto: CreateContractDTO): Promise<ValidationResult[]> {
    const resident = ResidentRepo.findById(dto.residentId);
    if (!resident) return [{ valid: false, code: 'E001', message: '居民档案不存在', blocked: true }];

    const pkg = PackageRepo.findById(dto.packageId);
    if (!pkg) return [{ valid: false, code: 'E002', message: '签约包不存在', blocked: true }];

    const team = TeamRepo.findById(dto.teamId);
    if (!team) return [{ valid: false, code: 'E003', message: '医生团队不存在', blocked: true }];

    let doctor = null;
    if (dto.doctorId) {
      doctor = DoctorRepo.findById(dto.doctorId);
      if (!doctor) return [{ valid: false, code: 'E004', message: '指定责任医生不存在', blocked: true }];
      if (doctor.teamId !== dto.teamId) {
        return [{ valid: false, code: 'E005', message: `责任医生不属于团队【${team.name}】`, blocked: true }];
      }
    }

    const results = await ContractRuleEngine.validateCreate(
      resident, pkg, team, doctor,
      { isRenewal: false, isTransfer: !!dto.isTransfer }
    );

    if (dto.chronicTags && dto.chronicTags.length) {
      resident.chronicTags = Array.from(new Set([...(resident.chronicTags || []), ...dto.chronicTags]));
      ResidentRepo.update(resident.id, resident);
    }

    return results;
  }

  async createContract(dto: CreateContractDTO): Promise<{ contract: Contract; validations: ValidationResult[] }> {
    const validations = await this.validateContract(dto);
    const blocked = validations.find((v) => v.blocked);
    if (blocked) {
      throw new Error(`签约创建被拦截：${blocked.message}`);
    }

    const startDate = dayjs().format('YYYY-MM-DD');
    const pkg = PackageRepo.findById(dto.packageId)!;
    const endDate = dayjs(startDate).add(pkg.duration, 'month').subtract(1, 'day').format('YYYY-MM-DD');

    const contract = ContractRepo.create({
      residentId: dto.residentId,
      packageId: dto.packageId,
      teamId: dto.teamId,
      doctorId: dto.doctorId,
      status: 'pending',
      startDate,
      endDate,
      chronicTags: dto.chronicTags || [],
      renewalIntention: !!dto.renewalIntention,
      isTransfer: !!dto.isTransfer,
      transferFromTeamId: dto.transferFromTeamId,
    });

    if (pkg.type === 'paid' && pkg.price > 0) {
      const dueDate = dayjs(startDate).add(30, 'day').format('YYYY-MM-DD');
      FeeRepo.create({
        residentId: dto.residentId,
        contractId: contract.id,
        type: 'subscription',
        amount: pkg.price,
        status: 'pending',
        dueDate,
        description: `【${pkg.name}】签约费用（签约期 ${startDate} 至 ${endDate}）`,
      });
      if (pkg.subsidyAmount > 0) {
        FeeRepo.create({
          residentId: dto.residentId,
          contractId: contract.id,
          type: 'subsidy',
          amount: pkg.subsidyAmount,
          status: 'paid',
          dueDate: startDate,
          paidAt: startDate,
          description: `【${pkg.name}】卫健补贴¥${pkg.subsidyAmount}`,
        });
      }
    }

    return { contract, validations };
  }

  async approve(dto: ApprovalDTO): Promise<{ contract: Contract; validations: ValidationResult[] }> {
    const contract = ContractRepo.findById(dto.contractId);
    if (!contract) throw new Error('签约记录不存在');
    if (!['pending', 'approved'].includes(contract.status)) {
      throw new Error(`当前状态【${contract.status}】不可审批`);
    }

    const resident = ResidentRepo.findById(contract.residentId)!;
    const pkg = PackageRepo.findById(contract.packageId)!;
    const team = TeamRepo.findById(contract.teamId)!;
    const doctor = contract.doctorId ? DoctorRepo.findById(contract.doctorId) : null;

    const validations = await ContractRuleEngine.validateCreate(resident, pkg, team, doctor, { excludeContractId: dto.contractId });
    const blocked = validations.find((v) => v.blocked);
    if (dto.action === 'approve' && blocked) {
      ApprovalRepo.create({
        contractId: dto.contractId,
        approverId: dto.approver.userId,
        approverName: dto.approver.name,
        approverRole: dto.approver.role,
        action: 'reject',
        opinion: `审批时拦截规则触发：${blocked.message}`,
        teamCapacityCheck: false,
        doctorAssignmentCheck: false,
        serviceScopeConfig: false,
        followupPlanConfig: false,
      });
      ContractRepo.updateStatus(dto.contractId, 'rejected');
      throw new Error(`审批被拦截：${blocked.message}`);
    }

    if (dto.action === 'transfer') {
      if (!dto.toTeamId) throw new Error('转团队必须指定目标团队');
      const newTeam = TeamRepo.findById(dto.toTeamId);
      if (!newTeam) throw new Error('目标团队不存在');
      const teamCheck = ContractRuleEngine.checkTeamCapacity(newTeam);
      if (teamCheck.blocked) throw new Error(teamCheck.message);

      if (contract.status === 'active') {
        TeamRepo.updateCapacity(contract.teamId, -1);
        if (contract.doctorId) DoctorRepo.updateCapacity(contract.doctorId, -1);
        TeamRepo.updateCapacity(dto.toTeamId, 1);
        if (dto.toDoctorId) DoctorRepo.updateCapacity(dto.toDoctorId, 1);
      }

      const updated = ContractRepo.update(dto.contractId, {
        doctorId: dto.toDoctorId,
      });
      const teamIdSql = dto.toTeamId;
      import('../db/database.js').then(({ run }) => {
        run(`UPDATE contract SET team_id = ? WHERE id = ?`, [teamIdSql, dto.contractId]);
      });
      ApprovalRepo.create({
        contractId: dto.contractId,
        approverId: dto.approver.userId,
        approverName: dto.approver.name,
        approverRole: dto.approver.role,
        action: 'transfer',
        opinion: dto.opinion || `转团队：${team.name} → ${newTeam.name}`,
        teamCapacityCheck: !!dto.teamCapacityCheck,
        doctorAssignmentCheck: !!dto.doctorAssignmentCheck,
        serviceScopeConfig: !!dto.serviceScopeConfig,
        followupPlanConfig: !!dto.followupPlanConfig,
      });
      return { contract: updated!, validations };
    }

    const finalContract = await this._applyApproval(contract, dto);
    return { contract: finalContract, validations };
  }

  async _applyApproval(contract: Contract, dto: ApprovalDTO): Promise<Contract> {
    const newStatus = dto.action === 'approve' ? 'active' : 'rejected';
    if (dto.action === 'approve' && contract.status !== 'active') {
      TeamRepo.updateCapacity(contract.teamId, 1);
      if (contract.doctorId) DoctorRepo.updateCapacity(contract.doctorId, 1);
    }
    const updated = ContractRepo.updateStatus(dto.contractId, newStatus)!;
    if (dto.action === 'approve' && contract.doctorId) {
      const resident = ResidentRepo.findById(contract.residentId)!;
      this._genFollowupPlans(contract, resident.chronicTags);
    }
    ApprovalRepo.create({
      contractId: dto.contractId,
      approverId: dto.approver.userId,
      approverName: dto.approver.name,
      approverRole: dto.approver.role,
      action: dto.action,
      opinion: dto.opinion || (dto.action === 'approve' ? '审核通过' : '审核驳回'),
      teamCapacityCheck: !!dto.teamCapacityCheck,
      doctorAssignmentCheck: !!dto.doctorAssignmentCheck,
      serviceScopeConfig: !!dto.serviceScopeConfig,
      followupPlanConfig: !!dto.followupPlanConfig,
    });
    return updated;
  }

  _genFollowupPlans(contract: Contract, tags: string[]) {
    const pkg = PackageRepo.findById(contract.packageId)!;
    let interval = 3;
    if (pkg.name.includes('合并包')) interval = 2;
    else if (pkg.category === 'chronic') interval = 1;

    const start = dayjs(contract.startDate);
    const end = dayjs(contract.endDate);
    let cur = start.add(interval, 'day');
    let i = 1;
    while (cur.isBefore(end) && i <= 12) {
      FollowupRepo.create({
        contractId: contract.id,
        doctorId: contract.doctorId!,
        residentId: contract.residentId,
        planDate: cur.format('YYYY-MM-DD'),
        planTime: '09:00',
        type: i % 3 === 0 ? 'home' : (i % 2 === 0 ? 'clinic' : 'phone'),
        status: 'scheduled',
        notes: `${tags.join('、') || pkg.category}随访（第${i}次）`,
      });
      cur = cur.add(interval, 'month');
      i++;
    }
  }

  async renew(contractId: string, newStart: string, approver?: JWTPayload): Promise<Contract> {
    const old = ContractRepo.findById(contractId);
    if (!old) throw new Error('原签约不存在');
    const pkg = PackageRepo.findById(old.packageId)!;
    const newEnd = dayjs(newStart).add(pkg.duration, 'month').subtract(1, 'day').format('YYYY-MM-DD');

    const renewed = ContractRepo.renewContract(contractId, newStart, newEnd)!;
    if (approver) {
      ApprovalRepo.create({
        contractId: renewed.id,
        approverId: approver.userId, approverName: approver.name, approverRole: approver.role,
        action: 'approve', opinion: '续约审批，自动通过',
        teamCapacityCheck: true, doctorAssignmentCheck: true,
        serviceScopeConfig: true, followupPlanConfig: true,
      });
    }
    return renewed;
  }
}
