import dayjs from 'dayjs';
import { ResidentRepo, PackageRepo, TeamRepo, DoctorRepo } from '../repositories/master.js';
import { ContractRepo, ServiceRepo, FeeRepo, StatisticsRepo, ConfigRepo, FollowupRepo, ReferralRepo } from '../repositories/business.js';
import { StatisticsSnapshot, CoverageDetail, Contract, JWTPayload } from '../types/index.js';

export class StatisticsService {
  async recalculate(operator: JWTPayload): Promise<{ snapshot: StatisticsSnapshot; details: CoverageDetail[] }> {
    const now = dayjs();
    const snapshotDate = now.format('YYYY-MM-DD');
    const totalResidents = ResidentRepo.count();

    const activeContracts = ContractRepo.findAll({ status: 'active' });
    const approvedPending = ContractRepo.findAll({ status: 'approved' });
    const signedSet = new Set<string>();
    activeContracts.concat(approvedPending).forEach((c) => signedSet.add(c.residentId));

    const communities = [...new Set(ResidentRepo.findAll().map((r) => r.community))];
    const details: CoverageDetail[] = [];
    for (const community of communities) {
      const total = ResidentRepo.findByCommunity(community).length;
      const signed = ResidentRepo.findByCommunity(community).filter((r) => signedSet.has(r.id)).length;
      details.push({
        id: '', snapshotId: '', community,
        totalResidents: total, signedResidents: signed,
        coverageRate: total > 0 ? Number(((signed / total) * 100).toFixed(2)) : 0,
      });
    }

    const signedResidents = signedSet.size;
    const coverageRate = totalResidents > 0
      ? Number(((signedResidents / totalResidents) * 100).toFixed(2))
      : 0;

    let free = 0, paid = 0, chronic = 0, totalSubsidy = 0;
    for (const c of activeContracts) {
      const pkg = PackageRepo.findById(c.packageId);
      if (!pkg) continue;
      if (pkg.type === 'free') free++;
      else paid++;
      if (pkg.category === 'chronic') chronic++;
      totalSubsidy += pkg.subsidyAmount;
    }

    const avgSubsidy = signedResidents > 0 ? Number((totalSubsidy / signedResidents).toFixed(2)) : 0;

    const arrearsResidents = ResidentRepo.findAll().filter((r) => r.hasArrears);
    const arrearsCount = arrearsResidents.length;
    const arrearsTotal = Number(arrearsResidents.reduce((s, r) => s + r.arrearsAmount, 0).toFixed(2));

    const teams = TeamRepo.findAll();
    const teamUtilizationRates = teams.map((t) => ({
      teamId: t.id,
      teamName: t.name,
      utilizationRate: t.maxCapacity > 0 ? Number(((t.currentCapacity / t.maxCapacity) * 100).toFixed(2)) : 0,
    }));

    const statisticalCaliber = ConfigRepo.getSystemConfig('statistical_caliber') || '';

    const snapshot = StatisticsRepo.createSnapshot({
      snapshotDate, totalResidents, signedResidents, coverageRate,
      freePackageCount: free, paidPackageCount: paid, chronicPackageCount: chronic,
      totalSubsidy, avgSubsidyPerPerson: avgSubsidy,
      arrearsCount, arrearsTotalAmount: arrearsTotal,
      teamUtilizationRates, statisticalCaliber,
      generatedBy: operator.name,
    }, details);

    return { snapshot, details: StatisticsRepo.findCoverageDetails(snapshot.id) };
  }

  getOverview() {
    const snapshot = StatisticsRepo.findLatest();
    const teams = TeamRepo.findAll().map((t) => ({
      ...t,
      utilizationRate: t.maxCapacity > 0 ? Number(((t.currentCapacity / t.maxCapacity) * 100).toFixed(2)) : 0,
      doctors: DoctorRepo.findByTeam(t.id),
    }));
    const active = ContractRepo.findAll({ status: 'active' });
    const pending = ContractRepo.findAll({ status: 'pending' });
    const arrearsConfig = ConfigRepo.getArrearsConfig();
    const overdueFees = FeeRepo.findOverdue();
    const recentServices = ServiceRepo.findAll().slice(0, 20);
    const upcomingFollowups = FollowupRepo.findAll({ status: 'scheduled' })
      .filter((f) => dayjs(f.planDate).isSame(dayjs(), 'month') || dayjs(f.planDate).isAfter(dayjs()))
      .slice(0, 20);
    const pendingReferrals = ReferralRepo.findAll({ status: 'pending' });

    return {
      snapshot, teams,
      contractSummary: {
        active: active.length,
        pending: pending.length,
        activeContracts: active.slice(0, 10),
        pendingContracts: pending.slice(0, 10),
      },
      arrearsConfig,
      overdueFees,
      recentServices,
      upcomingFollowups,
      pendingReferrals,
      statisticalCaliber: ConfigRepo.getSystemConfig('statistical_caliber'),
      subsidyStandard: ConfigRepo.getSystemConfig('subsidy_standard'),
      renewalReminderDays: Number(ConfigRepo.getSystemConfig('renewal_reminder_days') || '30'),
    };
  }

  getRenewalReminders() {
    const days = Number(ConfigRepo.getSystemConfig('renewal_reminder_days') || '30');
    const today = dayjs();
    const remindBefore = today.add(days, 'day').format('YYYY-MM-DD');
    return ContractRepo.findAll({ status: 'active' })
      .filter((c) => c.endDate <= remindBefore && c.endDate >= today.format('YYYY-MM-DD'))
      .map((c) => {
        const resident = ResidentRepo.findById(c.residentId);
        const pkg = PackageRepo.findById(c.packageId);
        const team = TeamRepo.findById(c.teamId);
        const daysLeft = dayjs(c.endDate).diff(today, 'day');
        return {
          contract: c,
          resident,
          package: pkg,
          team,
          daysLeft,
          urgent: daysLeft <= 7,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  getDashboardCharts() {
    const snapshots = StatisticsRepo.findSnapshots(12).reverse();
    const timeline = snapshots.map((s) => s.snapshotDate);
    const coverageRates = snapshots.map((s) => s.coverageRate);
    const signedData = snapshots.map((s) => ({
      date: s.snapshotDate,
      free: s.freePackageCount,
      paid: s.paidPackageCount,
      chronic: s.chronicPackageCount,
      signed: s.signedResidents,
    }));

    const teams = TeamRepo.findAll();
    const teamUsage = teams.map((t) => ({
      team: t.name,
      capacity: t.maxCapacity,
      used: t.currentCapacity,
      rate: t.maxCapacity > 0 ? Number(((t.currentCapacity / t.maxCapacity) * 100).toFixed(2)) : 0,
    }));

    const allResidents = ResidentRepo.findAll();
    const ageGroups: Record<string, number> = { '0-18': 0, '19-44': 0, '45-64': 0, '65+': 0 };
    const chronicCounts: Record<string, number> = {};
    for (const r of allResidents) {
      if (r.age <= 18) ageGroups['0-18']++;
      else if (r.age <= 44) ageGroups['19-44']++;
      else if (r.age <= 64) ageGroups['45-64']++;
      else ageGroups['65+']++;
      for (const tag of r.chronicTags) {
        chronicCounts[tag] = (chronicCounts[tag] || 0) + 1;
      }
    }

    return {
      timeline, coverageRates, signedData,
      teamUsage, ageGroups, chronicCounts,
    };
  }
}
