import { Router, Request, Response } from 'express';
import { StatisticsService } from '../services/statistics.js';
import {
  FollowupRepo, ServiceRepo, ReferralRepo, FeeRepo, StatisticsRepo,
} from '../repositories/business.js';

const router = Router();
const svc = new StatisticsService();

const getApprover = (req: Request) => ({
  userId: (req.headers['x-user-id'] as string) || 'USR011',
  role: (req.headers['x-user-role'] as string) || 'admin',
  refId: (req.headers['x-user-refid'] as string) || 'ADMIN001',
  name: (req.headers['x-user-name'] as string) || '系统管理员',
});

router.get('/overview', (_req, res) => {
  res.json({ code: 0, data: svc.getOverview() });
});

router.post('/snapshot/recalculate', async (req, res) => {
  try {
    const operator = getApprover(req);
    const r = await svc.recalculate(operator);
    res.json({ code: 0, message: '覆盖率重算成功', data: r });
  } catch (e) {
    res.json({ code: 400, message: (e as Error).message });
  }
});

router.get('/snapshots', (_req, res) => {
  const list = StatisticsRepo.findSnapshots(30);
  res.json({ code: 0, data: list });
});

router.get('/snapshots/:id/details', (req, res) => {
  res.json({ code: 0, data: StatisticsRepo.findCoverageDetails(req.params.id) });
});

router.get('/charts/dashboard', (_req, res) => {
  res.json({ code: 0, data: svc.getDashboardCharts() });
});

router.get('/renewal-reminders', (_req, res) => {
  res.json({ code: 0, data: svc.getRenewalReminders() });
});

router.get('/followups', (req, res) => {
  const { doctorId, residentId, status } = req.query;
  res.json({
    code: 0,
    data: FollowupRepo.findAll({
      doctorId: doctorId as string,
      residentId: residentId as string,
      status: status as string,
    }),
  });
});

router.post('/followups/:id/complete', (req, res) => {
  const { result } = req.body || {};
  FollowupRepo.complete(req.params.id, result || '已完成');
  res.json({ code: 0, message: '随访完成' });
});

router.post('/followups', (req, res) => {
  const f = FollowupRepo.create(req.body);
  res.json({ code: 0, data: f });
});

router.get('/services', (req, res) => {
  const { residentId, doctorId } = req.query;
  res.json({
    code: 0,
    data: ServiceRepo.findAll({ residentId: residentId as string, doctorId: doctorId as string }),
  });
});

router.post('/services', (req, res) => {
  const s = ServiceRepo.create(req.body);
  res.json({ code: 0, data: s });
});

router.get('/referrals', (req, res) => {
  const { status, residentId, fromDoctorId } = req.query;
  res.json({
    code: 0,
    data: ReferralRepo.findAll({
      status: status as string,
      residentId: residentId as string,
      fromDoctorId: fromDoctorId as string,
    }),
  });
});

router.post('/referrals', (req, res) => {
  const r = ReferralRepo.create(req.body);
  res.json({ code: 0, data: r });
});

router.put('/referrals/:id', (req, res) => {
  const r = ReferralRepo.update(req.params.id, req.body);
  res.json({ code: 0, data: r });
});

router.get('/fees', (req, res) => {
  const { residentId } = req.query;
  if (residentId) {
    res.json({ code: 0, data: FeeRepo.findByResident(residentId as string) });
  } else {
    res.json({ code: 0, data: FeeRepo.findOverdue() });
  }
});

router.post('/fees/:id/pay', (_req, res) => {
  FeeRepo.pay(_req.params.id);
  res.json({ code: 0, message: '缴费成功' });
});

export default router;
