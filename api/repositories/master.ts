import { query, queryOne, run, genId } from '../db/database.js';
import { Resident, Package, DoctorTeam, Doctor } from '../types/index.js';

const parseJSON = (v: any, def: any) => {
  if (!v) return def;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return def; }
};

function mapResident(r: any): Resident {
  return {
    id: r.id,
    idCard: r.id_card,
    name: r.name,
    gender: r.gender,
    age: r.age,
    phone: r.phone,
    address: r.address || '',
    community: r.community,
    chronicTags: parseJSON(r.chronic_tags, []),
    hasArrears: r.has_arrears === 1,
    arrearsAmount: r.arrears_amount || 0,
    currentContractId: r.current_contract_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapPackage(p: any): Package {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    category: p.category,
    price: p.price || 0,
    subsidyAmount: p.subsidy_amount || 0,
    duration: p.duration,
    requiresDoctor: p.requires_doctor === 1,
    services: parseJSON(p.services, []),
    description: p.description || '',
    isActive: p.is_active === 1,
  };
}

function mapTeam(t: any): DoctorTeam {
  return {
    id: t.id,
    name: t.name,
    community: t.community,
    serviceScope: parseJSON(t.service_scope, []),
    maxCapacity: t.max_capacity,
    currentCapacity: t.current_capacity || 0,
    isActive: t.is_active === 1,
  };
}

function mapDoctor(d: any): Doctor {
  return {
    id: d.id,
    teamId: d.team_id,
    employeeId: d.employee_id,
    name: d.name,
    title: d.title,
    specialty: parseJSON(d.specialty, []),
    maxPatients: d.max_patients,
    currentPatients: d.current_patients || 0,
    isAvailable: d.is_available === 1,
  };
}

export const ResidentRepo = {
  findAll: (): Resident[] => query<any>('SELECT * FROM resident ORDER BY name').map(mapResident),
  findById: (id: string): Resident | null => {
    const r = queryOne<any>('SELECT * FROM resident WHERE id = ?', [id]);
    return r ? mapResident(r) : null;
  },
  findByIdCard: (idCard: string): Resident | null => {
    const r = queryOne<any>('SELECT * FROM resident WHERE id_card = ?', [idCard]);
    return r ? mapResident(r) : null;
  },
  findByCommunity: (community: string): Resident[] =>
    query<any>('SELECT * FROM resident WHERE community = ? ORDER BY name', [community]).map(mapResident),
  count: () => Number(queryOne<any>('SELECT COUNT(*) as c FROM resident')?.c || 0),
  update: (id: string, data: Partial<Resident>) => {
    const tags = data.chronicTags ? JSON.stringify(data.chronicTags) : undefined;
    run(
      `UPDATE resident SET name=?, gender=?, age=?, phone=?, address=?, community=?,
       chronic_tags=?, has_arrears=?, arrears_amount=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [
        data.name, data.gender, data.age, data.phone, data.address, data.community,
        tags, data.hasArrears ? 1 : 0, data.arrearsAmount, id
      ]
    );
    return ResidentRepo.findById(id);
  },
};

export const PackageRepo = {
  findAll: (): Package[] =>
    query<any>('SELECT * FROM package WHERE is_active = 1 ORDER BY category, price').map(mapPackage),
  findById: (id: string): Package | null => {
    const r = queryOne<any>('SELECT * FROM package WHERE id = ?', [id]);
    return r ? mapPackage(r) : null;
  },
  findByCategory: (category: string): Package[] =>
    query<any>('SELECT * FROM package WHERE is_active = 1 AND category = ? ORDER BY price', [category]).map(mapPackage),
};

export const TeamRepo = {
  findAll: (): DoctorTeam[] =>
    query<any>('SELECT * FROM doctor_team ORDER BY name').map(mapTeam),
  findById: (id: string): DoctorTeam | null => {
    const r = queryOne<any>('SELECT * FROM doctor_team WHERE id = ?', [id]);
    return r ? mapTeam(r) : null;
  },
  findByCommunity: (community: string): DoctorTeam[] =>
    query<any>('SELECT * FROM doctor_team WHERE community = ? AND is_active = 1 ORDER BY name', [community]).map(mapTeam),
  updateCapacity: (id: string, delta: number) =>
    run('UPDATE doctor_team SET current_capacity = MAX(0, current_capacity + ?) WHERE id = ?', [delta, id]),
};

export const DoctorRepo = {
  findAll: (): Doctor[] => query<any>('SELECT * FROM doctor ORDER BY name').map(mapDoctor),
  findById: (id: string): Doctor | null => {
    const r = queryOne<any>('SELECT * FROM doctor WHERE id = ?', [id]);
    return r ? mapDoctor(r) : null;
  },
  findByTeam: (teamId: string): Doctor[] =>
    query<any>('SELECT * FROM doctor WHERE team_id = ? ORDER BY name', [teamId]).map(mapDoctor),
  findByTeamAndAvailable: (teamId: string): Doctor[] =>
    query<any>('SELECT * FROM doctor WHERE team_id = ? AND is_available = 1 ORDER BY name', [teamId]).map(mapDoctor),
  findByEmployeeId: (empId: string): Doctor | null => {
    const r = queryOne<any>('SELECT * FROM doctor WHERE employee_id = ?', [empId]);
    return r ? mapDoctor(r) : null;
  },
  updateCapacity: (id: string, delta: number) =>
    run('UPDATE doctor SET current_patients = MAX(0, current_patients + ?) WHERE id = ?', [delta, id]),
};

export { genId };
