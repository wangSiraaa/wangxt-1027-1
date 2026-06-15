import dayjs from 'dayjs';
import { query } from '../db/database.js';
import { ValidationResult, Resident, Package, DoctorTeam, Doctor } from '../types/index.js';

export class ContractRuleEngine {
  static async validateCreate(
    resident: Resident,
    pkg: Package,
    team: DoctorTeam,
    doctor?: Doctor | null,
    opts: { isRenewal?: boolean; isTransfer?: boolean; excludeContractId?: string } = {}
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    results.push(this.checkArrearsLimit(resident, pkg));
    results.push(this.checkChronicRequiresDoctor(pkg, doctor));

    if (!opts.isRenewal && !opts.isTransfer) {
      const dup = await this.checkDuplicateContract(resident.id, pkg, opts.excludeContractId);
      results.push(dup);
    }

    results.push(this.checkTeamCapacity(team));
    if (doctor) results.push(this.checkDoctorCapacity(doctor));
    results.push(this.checkServiceScope(team, resident));
    results.push(this.checkChronicTagsMatch(resident, pkg));

    return results;
  }

  static checkArrearsLimit(resident: Resident, pkg: Package): ValidationResult {
    if (!resident.hasArrears || resident.arrearsAmount <= 0) {
      return { valid: true, code: 'R001_OK', message: '无欠费，签约限制已解除' };
    }
    if (pkg.type === 'free') {
      return {
        valid: true,
        code: 'R001_WARN',
        message: `存在欠费 ¥${resident.arrearsAmount}，仅允许选择免费基础包`,
      };
    }
    return {
      valid: false,
      code: 'R001_BLOCK',
      message: `欠费限制：居民${resident.name}存在欠费¥${resident.arrearsAmount}，根据规则仅允许选择免费基础包，已拦截付费签约包`,
      blocked: true,
    };
  }

  static checkChronicRequiresDoctor(pkg: Package, doctor?: Doctor | null): ValidationResult {
    if (!pkg.requiresDoctor) {
      return { valid: true, code: 'R002_OK', message: '基础包无需绑定责任医生' };
    }
    if (!doctor) {
      return {
        valid: false,
        code: 'R002_BLOCK',
        message: `慢病包拦截：签约包【${pkg.name}】要求必须绑定责任医生，请先为居民分配责任医生后再提交`,
        blocked: true,
      };
    }
    if (!doctor.isAvailable) {
      return {
        valid: false,
        code: 'R002_BLOCK',
        message: `慢病包拦截：责任医生【${doctor.name}】当前不可用（停诊/休假），请重新分配责任医生`,
        blocked: true,
      };
    }
    return {
      valid: true,
      code: 'R002_OK',
      message: `慢病包绑定医生【${doctor.name}（${doctor.title}）】校验通过`,
    };
  }

  static async checkDuplicateContract(residentId: string, pkg: Package, excludeContractId?: string): Promise<ValidationResult> {
    const now = dayjs().format('YYYY-MM-DD');
    const clauses: string[] = [
      'c.resident_id = ?',
      'c.status IN (\'pending\', \'approved\', \'active\')',
      'c.end_date >= ?',
      'p.category = ?'
    ];
    const params: any[] = [residentId, now, pkg.category];
    if (excludeContractId) {
      clauses.push('c.id != ?');
      params.push(excludeContractId);
    }
    const rows = query<any>(
      `SELECT c.id, c.start_date, c.end_date, c.status, p.name as package_name, p.category
       FROM contract c
       JOIN package p ON c.package_id = p.id
       WHERE ${clauses.join(' AND ')}
       ORDER BY c.created_at DESC`,
      params
    );
    if (rows.length === 0) {
      return { valid: true, code: 'R003_OK', message: '签约期内无同类包重复签约' };
    }
    const existing = rows[0];
    return {
      valid: false,
      code: 'R003_BLOCK',
      message: `重复签约拦截：居民在【${existing.start_date} 至 ${existing.end_date}】已有同类签约包【${existing.package_name}】（状态：${existing.status}），签约期内不能重复签同类包`,
      blocked: true,
    };
  }

  static checkTeamCapacity(team: DoctorTeam): ValidationResult {
    const rate = team.maxCapacity > 0 ? (team.currentCapacity / team.maxCapacity) * 100 : 0;
    if (team.currentCapacity >= team.maxCapacity) {
      return {
        valid: false,
        code: 'R004_BLOCK',
        message: `团队容量已满：【${team.name}】当前容量 ${team.currentCapacity}/${team.maxCapacity}（${rate.toFixed(1)}%），已达到上限`,
        blocked: true,
      };
    }
    if (rate >= 90) {
      return {
        valid: true,
        code: 'R004_WARN',
        message: `团队容量预警：【${team.name}】当前容量 ${team.currentCapacity}/${team.maxCapacity}（${rate.toFixed(1)}%），容量使用接近90%`,
      };
    }
    return {
      valid: true,
      code: 'R004_OK',
      message: `团队容量校验通过：${team.currentCapacity}/${team.maxCapacity}（${rate.toFixed(1)}%）`,
    };
  }

  static checkDoctorCapacity(doctor: Doctor): ValidationResult {
    const rate = doctor.maxPatients > 0 ? (doctor.currentPatients / doctor.maxPatients) * 100 : 0;
    if (doctor.currentPatients >= doctor.maxPatients) {
      return {
        valid: false,
        code: 'R005_BLOCK',
        message: `医生容量已满：【${doctor.name}】当前签约患者 ${doctor.currentPatients}/${doctor.maxPatients}，已达到上限`,
        blocked: true,
      };
    }
    if (rate >= 85) {
      return {
        valid: true,
        code: 'R005_WARN',
        message: `医生容量预警：【${doctor.name}】当前签约患者 ${doctor.currentPatients}/${doctor.maxPatients}（${rate.toFixed(1)}%）`,
      };
    }
    return {
      valid: true,
      code: 'R005_OK',
      message: `医生容量校验通过：${doctor.currentPatients}/${doctor.maxPatients}（${rate.toFixed(1)}%）`,
    };
  }

  static checkServiceScope(team: DoctorTeam, resident: Resident): ValidationResult {
    if (team.community !== resident.community) {
      return {
        valid: false,
        code: 'R006_BLOCK',
        message: `服务范围拦截：团队【${team.name}】服务社区【${team.community}】与居民【${resident.name}】所在社区【${resident.community}】不匹配`,
        blocked: true,
      };
    }
    const scope = team.serviceScope || [];
    const addr = resident.address || '';
    const matched = scope.some((s) => addr.includes(s));
    if (scope.length > 0 && !matched) {
      return {
        valid: true,
        code: 'R006_WARN',
        message: `服务范围提醒：居民地址【${addr}】不在团队服务范围${JSON.stringify(scope)}内，请团队确认是否上门服务`,
      };
    }
    return {
      valid: true,
      code: 'R006_OK',
      message: `服务范围校验通过：团队覆盖居民所在社区【${resident.community}】`,
    };
  }

  static checkChronicTagsMatch(resident: Resident, pkg: Package): ValidationResult {
    if (pkg.category !== 'chronic') {
      return { valid: true, code: 'R007_OK', message: '基础包不校验慢病标签' };
    }
    const tags = resident.chronicTags || [];
    if (tags.length === 0) {
      return {
        valid: true,
        code: 'R007_WARN',
        message: `慢病提醒：居民【${resident.name}】慢病标签为空，建议核实后再签约慢病包【${pkg.name}】`,
      };
    }
    if (pkg.name.includes('高血压') && !tags.includes('高血压')) {
      return {
        valid: false,
        code: 'R007_BLOCK',
        message: `慢病标签不匹配：【${pkg.name}】要求有高血压标签，但居民当前标签为${JSON.stringify(tags)}`,
        blocked: true,
      };
    }
    if (pkg.name.includes('糖尿病') && !tags.includes('糖尿病')) {
      return {
        valid: false,
        code: 'R007_BLOCK',
        message: `慢病标签不匹配：【${pkg.name}】要求有糖尿病标签，但居民当前标签为${JSON.stringify(tags)}`,
        blocked: true,
      };
    }
    return {
      valid: true,
      code: 'R007_OK',
      message: `慢病标签校验通过：居民标签${JSON.stringify(tags)}与${pkg.name}匹配`,
    };
  }
}
