import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ContractService } from '../services/contract.js';
import { ContractRepo, ApprovalRepo } from '../repositories/business.js';
import { JWTPayload } from '../types/index.js';

const router = Router();
const svc = new ContractService();

const getApprover = (req: Request): JWTPayload => {
  const h = req.headers['x-user-role'] as string;
  return {
    userId: (req.headers['x-user-id'] as string) || 'USR011',
    role: (h || 'admin') as any,
    refId: (req.headers['x-user-refid'] as string) || 'ADMIN001',
    name: (req.headers['x-user-name'] as string) || '系统管理员',
  };
};

router.get('/contracts', (req, res) => {
  const { status, residentId, teamId, doctorId } = req.query;
  const list = ContractRepo.findAll({
    status: status as string,
    residentId: residentId as string,
    teamId: teamId as string,
    doctorId: doctorId as string,
  });
  res.json({ code: 0, data: list });
});

router.get('/contracts/:id', (req, res) => {
  const c = ContractRepo.findById(req.params.id);
  if (!c) return res.json({ code: 404, message: '签约不存在' });
  const approvals = ApprovalRepo.findByContract(c.id);
  res.json({ code: 0, data: { contract: c, approvals } });
});

router.post('/contracts/validate', async (req, res) => {
  try {
    const validations = await svc.validateContract(req.body);
    const anyBlocked = validations.some((v) => v.blocked);
    const anyWarn = validations.some((v) => !v.valid);
    res.json({
      code: 0,
      data: {
        validations,
        blocked: anyBlocked,
        hasWarning: anyWarn,
        summary: anyBlocked ? '存在拦截规则，签约不可提交' : (anyWarn ? '存在校验提示，请审核确认' : '校验全部通过'),
      },
    });
  } catch (e) {
    res.json({ code: 400, message: (e as Error).message });
  }
});

const createSchema = z.object({
  residentId: z.string().min(1),
  packageId: z.string().min(1),
  teamId: z.string().min(1),
  doctorId: z.string().optional(),
  chronicTags: z.array(z.string()).default([]),
  renewalIntention: z.boolean().default(false),
  isTransfer: z.boolean().default(false),
  transferFromTeamId: z.string().optional(),
});

router.post('/contracts', async (req, res) => {
  try {
    const dto = createSchema.parse(req.body);
    const result = await svc.createContract(dto);
    res.json({
      code: 0,
      message: '签约创建成功，等待医生团队审核',
      data: {
        contract: result.contract,
        validations: result.validations,
        blocked: result.validations.some((v) => v.blocked),
      },
    });
  } catch (e) {
    res.json({ code: 400, message: (e as Error).message });
  }
});

const approvalSchema = z.object({
  contractId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'transfer']),
  opinion: z.string().default(''),
  toTeamId: z.string().optional(),
  toDoctorId: z.string().optional(),
  teamCapacityCheck: z.boolean().default(false),
  doctorAssignmentCheck: z.boolean().default(false),
  serviceScopeConfig: z.boolean().default(false),
  followupPlanConfig: z.boolean().default(false),
});

router.post('/contracts/approval', async (req, res) => {
  try {
    const dto = approvalSchema.parse(req.body);
    const approver = getApprover(req);
    const result = await svc.approve({ ...dto, approver });
    const actionText = dto.action === 'approve' ? '审核通过' : (dto.action === 'reject' ? '审核驳回' : '转团队处理');
    res.json({
      code: 0,
      message: actionText + '成功',
      data: {
        contract: result.contract,
        validations: result.validations,
      },
    });
  } catch (e) {
    res.json({ code: 400, message: (e as Error).message });
  }
});

router.post('/contracts/:id/renew', async (req, res) => {
  try {
    const { startDate } = req.body || {};
    const approver = getApprover(req);
    const c = await svc.renew(req.params.id, startDate, approver);
    res.json({ code: 0, message: '续约成功', data: c });
  } catch (e) {
    res.json({ code: 400, message: (e as Error).message });
  }
});

router.get('/contracts/:id/approvals', (req, res) => {
  res.json({ code: 0, data: ApprovalRepo.findByContract(req.params.id) });
});

export default router;
