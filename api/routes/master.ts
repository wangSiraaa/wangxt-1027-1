import { Router, Request, Response } from 'express';
import { ResidentRepo, PackageRepo, TeamRepo, DoctorRepo } from '../repositories/master.js';
import { ConfigRepo } from '../repositories/business.js';

const router = Router();

router.get('/residents', (req, res) => {
  const { community, hasArrears } = req.query;
  let list = ResidentRepo.findAll();
  if (community) list = list.filter((r) => r.community === community);
  if (hasArrears !== undefined) list = list.filter((r) => String(r.hasArrears) === String(hasArrears));
  res.json({ code: 0, data: list });
});

router.get('/residents/:id', (req, res) => {
  const r = ResidentRepo.findById(req.params.id);
  if (!r) return res.json({ code: 404, message: '居民不存在' });
  res.json({ code: 0, data: r });
});

router.get('/packages', (req, res) => {
  const { category } = req.query;
  let list = PackageRepo.findAll();
  if (category) list = list.filter((p) => p.category === category);
  res.json({ code: 0, data: list });
});

router.get('/packages/:id', (req, res) => {
  const p = PackageRepo.findById(req.params.id);
  if (!p) return res.json({ code: 404, message: '签约包不存在' });
  res.json({ code: 0, data: p });
});

router.get('/teams', (req, res) => {
  const { community } = req.query;
  let list = TeamRepo.findAll();
  if (community) list = list.filter((t) => t.community === community);
  const enriched = list.map((t) => ({
    ...t,
    utilizationRate: t.maxCapacity > 0 ? Number(((t.currentCapacity / t.maxCapacity) * 100).toFixed(2)) : 0,
    doctors: DoctorRepo.findByTeam(t.id),
  }));
  res.json({ code: 0, data: enriched });
});

router.get('/teams/:id', (req, res) => {
  const t = TeamRepo.findById(req.params.id);
  if (!t) return res.json({ code: 404, message: '团队不存在' });
  const data = {
    ...t,
    utilizationRate: t.maxCapacity > 0 ? Number(((t.currentCapacity / t.maxCapacity) * 100).toFixed(2)) : 0,
    doctors: DoctorRepo.findByTeam(t.id),
  };
  res.json({ code: 0, data });
});

router.get('/teams/:id/doctors', (req, res) => {
  const available = req.query.available !== undefined;
  let list = available ? DoctorRepo.findByTeamAndAvailable(req.params.id) : DoctorRepo.findByTeam(req.params.id);
  const enriched = list.map((d) => ({
    ...d,
    utilizationRate: d.maxPatients > 0 ? Number(((d.currentPatients / d.maxPatients) * 100).toFixed(2)) : 0,
  }));
  res.json({ code: 0, data: enriched });
});

router.get('/doctors', (req, res) => {
  const { teamId } = req.query;
  let list = DoctorRepo.findAll();
  if (teamId) list = list.filter((d) => d.teamId === teamId);
  res.json({ code: 0, data: list });
});

router.get('/config/arrears', (_req, res) => {
  const c = ConfigRepo.getArrearsConfig();
  res.json({ code: 0, data: c });
});

router.get('/config/system', (req, res) => {
  const { key } = req.query;
  if (key) {
    const v = ConfigRepo.getSystemConfig(key as string);
    res.json({ code: 0, data: { key, value: v } });
  } else {
    const cal = ConfigRepo.getSystemConfig('statistical_caliber');
    const sub = ConfigRepo.getSystemConfig('subsidy_standard');
    const rem = ConfigRepo.getSystemConfig('renewal_reminder_days');
    res.json({ code: 0, data: { statistical_caliber: cal, subsidy_standard: sub, renewal_reminder_days: rem } });
  }
});

export default router;
