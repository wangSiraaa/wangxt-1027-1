import initSqlJs, { Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', '..', 'backend', 'data');
const DB_PATH = path.join(DATA_DIR, 'contract.db');

let db: Database | null = null;

const DDL_SQL = `
CREATE TABLE IF NOT EXISTS resident (
    id TEXT PRIMARY KEY,
    id_card TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    gender TEXT CHECK(gender IN ('male', 'female')) NOT NULL,
    age INTEGER NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    community TEXT NOT NULL,
    chronic_tags TEXT DEFAULT '[]',
    has_arrears INTEGER DEFAULT 0,
    arrears_amount REAL DEFAULT 0,
    current_contract_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS package (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('free', 'paid')) NOT NULL,
    category TEXT CHECK(category IN ('basic', 'chronic')) NOT NULL,
    price REAL DEFAULT 0,
    subsidy_amount REAL DEFAULT 0,
    duration INTEGER NOT NULL,
    requires_doctor INTEGER DEFAULT 0,
    services TEXT DEFAULT '[]',
    description TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS doctor_team (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    community TEXT NOT NULL,
    service_scope TEXT DEFAULT '[]',
    max_capacity INTEGER NOT NULL,
    current_capacity INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS doctor (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    specialty TEXT DEFAULT '[]',
    max_patients INTEGER NOT NULL,
    current_patients INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contract (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    doctor_id TEXT,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'active', 'expired', 'terminated')) NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    chronic_tags TEXT DEFAULT '[]',
    renewal_intention INTEGER DEFAULT 0,
    is_transfer INTEGER DEFAULT 0,
    transfer_from_team_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_record (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    approver_id TEXT NOT NULL,
    approver_name TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    action TEXT CHECK(action IN ('approve', 'reject', 'transfer')) NOT NULL,
    opinion TEXT,
    team_capacity_check INTEGER DEFAULT 0,
    doctor_assignment_check INTEGER DEFAULT 0,
    service_scope_config INTEGER DEFAULT 0,
    followup_plan_config INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS followup_plan (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    plan_date TEXT NOT NULL,
    plan_time TEXT NOT NULL,
    type TEXT CHECK(type IN ('home', 'clinic', 'phone')) NOT NULL,
    status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled')) NOT NULL,
    notes TEXT,
    result TEXT,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS service_record (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    service_date TEXT NOT NULL,
    service_content TEXT NOT NULL,
    duration INTEGER,
    location TEXT,
    result TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS referral_record (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    from_doctor_id TEXT NOT NULL,
    to_doctor_id TEXT,
    to_hospital TEXT,
    reason TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'completed', 'rejected')) NOT NULL,
    referral_date TEXT NOT NULL,
    completed_date TEXT,
    outcome TEXT,
    approval_records TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS fee_record (
    id TEXT PRIMARY KEY,
    resident_id TEXT NOT NULL,
    contract_id TEXT,
    type TEXT CHECK(type IN ('subscription', 'service', 'refund', 'subsidy')) NOT NULL,
    amount REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'paid', 'overdue', 'waived')) NOT NULL,
    due_date TEXT NOT NULL,
    paid_at TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS statistics_snapshot (
    id TEXT PRIMARY KEY,
    snapshot_date TEXT NOT NULL,
    total_residents INTEGER NOT NULL,
    signed_residents INTEGER NOT NULL,
    coverage_rate REAL NOT NULL,
    free_package_count INTEGER DEFAULT 0,
    paid_package_count INTEGER DEFAULT 0,
    chronic_package_count INTEGER DEFAULT 0,
    total_subsidy REAL DEFAULT 0,
    avg_subsidy_per_person REAL DEFAULT 0,
    arrears_count INTEGER DEFAULT 0,
    arrears_total_amount REAL DEFAULT 0,
    team_utilization_rates TEXT DEFAULT '[]',
    statistical_caliber TEXT,
    generated_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coverage_detail (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL,
    community TEXT NOT NULL,
    total_residents INTEGER NOT NULL,
    signed_residents INTEGER NOT NULL,
    coverage_rate REAL NOT NULL,
    year_on_year REAL,
    month_on_month REAL
);

CREATE TABLE IF NOT EXISTS arrears_config (
    id TEXT PRIMARY KEY,
    max_arrears_amount REAL DEFAULT 0,
    allow_free_package_only INTEGER DEFAULT 1,
    auto_suspension INTEGER DEFAULT 0,
    grace_period INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('resident', 'doctor', 'admin')) NOT NULL,
    ref_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resident_community ON resident(community);
CREATE INDEX IF NOT EXISTS idx_resident_has_arrears ON resident(has_arrears);
CREATE INDEX IF NOT EXISTS idx_contract_resident ON contract(resident_id);
CREATE INDEX IF NOT EXISTS idx_contract_status ON contract(status);
CREATE INDEX IF NOT EXISTS idx_contract_team ON contract(team_id);
CREATE INDEX IF NOT EXISTS idx_contract_doctor ON contract(doctor_id);
CREATE INDEX IF NOT EXISTS idx_approval_contract ON approval_record(contract_id);
CREATE INDEX IF NOT EXISTS idx_followup_date ON followup_plan(plan_date);
CREATE INDEX IF NOT EXISTS idx_followup_doctor ON followup_plan(doctor_id);
CREATE INDEX IF NOT EXISTS idx_service_date ON service_record(service_date);
CREATE INDEX IF NOT EXISTS idx_service_resident ON service_record(resident_id);
CREATE INDEX IF NOT EXISTS idx_referral_status ON referral_record(status);
CREATE INDEX IF NOT EXISTS idx_fee_resident ON fee_record(resident_id);
CREATE INDEX IF NOT EXISTS idx_fee_status ON fee_record(status);
CREATE INDEX IF NOT EXISTS idx_snapshot_date ON statistics_snapshot(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_user_role ON user(role);
CREATE INDEX IF NOT EXISTS idx_user_ref ON user(ref_id);
`;

const SEED_SQL = `
INSERT INTO package (id, name, type, category, price, subsidy_amount, duration, requires_doctor, services, description, is_active) VALUES
('PKG001', '免费基础包', 'free', 'basic', 0, 0, 12, 0, '["健康咨询","体格检查","健康档案管理"]', '为全体居民提供的基础签约服务', 1),
('PKG002', '高血压慢病包', 'paid', 'chronic', 120, 80, 12, 1, '["血压监测","用药指导","饮食干预","每月随访","并发症筛查"]', '针对高血压患者的专项管理服务', 1),
('PKG003', '糖尿病慢病包', 'paid', 'chronic', 150, 100, 12, 1, '["血糖监测","用药指导","饮食干预","每月随访","并发症筛查"]', '针对糖尿病患者的专项管理服务', 1),
('PKG004', '高血压+糖尿病合并包', 'paid', 'chronic', 240, 160, 12, 1, '["血压监测","血糖监测","联合用药指导","每两周随访","并发症筛查"]', '针对合并症患者的综合管理服务', 1),
('PKG005', '老年人健康包', 'paid', 'chronic', 180, 120, 12, 1, '["体格检查","认知评估","跌倒风险评估","每季度随访","疫苗接种提醒"]', '针对65岁以上老年人的专项服务', 1);

INSERT INTO doctor_team (id, name, community, service_scope, max_capacity, current_capacity, is_active) VALUES
('TEAM001', '东风社区第一家庭医生团队', '东风社区', '["东风小区","阳光花园","幸福里"]', 500, 0, 1),
('TEAM002', '东风社区第二家庭医生团队', '东风社区', '["和平小区","解放路1-100号","人民路片区"]', 500, 0, 1),
('TEAM003', '胜利社区家庭医生团队', '胜利社区', '["胜利小区","红星街","建设路片区"]', 600, 0, 1),
('TEAM004', '新华社区家庭医生团队', '新华社区', '["新华小区","文化路","北京路片区"]', 400, 0, 1);

INSERT INTO doctor (id, team_id, employee_id, name, title, specialty, max_patients, current_patients, is_available) VALUES
('DOC001', 'TEAM001', 'EMP001', '张医生', '全科主任医师', '["高血压","糖尿病","老年病"]', 200, 0, 1),
('DOC002', 'TEAM001', 'EMP002', '李医生', '全科主治医师', '["高血压","心血管疾病"]', 150, 0, 1),
('DOC003', 'TEAM001', 'EMP003', '王护士', '主管护师', '["护理","健康宣教"]', 150, 0, 1),
('DOC004', 'TEAM002', 'EMP004', '刘医生', '全科副主任医师', '["糖尿病","内分泌疾病"]', 180, 0, 1),
('DOC005', 'TEAM002', 'EMP005', '陈医生', '全科医师', '["呼吸系统疾病","慢性病管理"]', 120, 0, 1),
('DOC006', 'TEAM003', 'EMP006', '赵医生', '全科主任医师', '["高血压","糖尿病","老年病"]', 200, 0, 0),
('DOC007', 'TEAM003', 'EMP007', '孙医生', '全科主治医师', '["消化系统疾病"]', 150, 0, 1),
('DOC008', 'TEAM004', 'EMP008', '周医生', '全科副主任医师', '["心血管疾病","高血压"]', 180, 0, 1);

INSERT INTO arrears_config (id, max_arrears_amount, allow_free_package_only, auto_suspension, grace_period) VALUES
('CFG001', 200, 1, 0, 30);

INSERT INTO system_config (id, config_key, config_value) VALUES
('SYS001', 'statistical_caliber', '签约覆盖率 = 已签约居民数 / 辖区常住居民总数 × 100%。已签约居民指在统计时点有有效签约记录的居民。常住居民指在辖区居住满6个月以上的居民。'),
('SYS002', 'subsidy_standard', '慢病包补贴标准：高血压包80元/人/年，糖尿病包100元/人/年，合并包160元/人/年，老年人健康包120元/人/年。'),
('SYS003', 'renewal_reminder_days', '30');

INSERT INTO resident (id, id_card, name, gender, age, phone, address, community, chronic_tags, has_arrears, arrears_amount) VALUES
('RES001', '110101198001011234', '张三', 'male', 45, '13800138001', '东风小区1号楼101', '东风社区', '[]', 0, 0),
('RES002', '110101197503152345', '李四', 'male', 50, '13800138002', '阳光花园2号楼202', '东风社区', '["高血压"]', 0, 0),
('RES003', '110101196005203456', '王五', 'female', 66, '13800138003', '幸福里3号楼303', '东风社区', '["高血压","糖尿病"]', 1, 250),
('RES004', '110101198507104567', '赵六', 'female', 40, '13800138004', '和平小区4号楼404', '东风社区', '[]', 0, 0),
('RES005', '110101195509255678', '孙七', 'male', 70, '13800138005', '胜利小区1号楼101', '胜利社区', '["糖尿病"]', 0, 0),
('RES006', '110101199011306789', '周八', 'female', 35, '13800138006', '新华小区2号楼202', '新华社区', '[]', 1, 100),
('RES007', '110101198802021234', '吴九', 'male', 38, '13800138007', '阳光花园5号楼505', '东风社区', '["高血压"]', 0, 0),
('RES008', '110101195208082345', '郑十', 'female', 74, '13800138008', '幸福里7号楼707', '东风社区', '["高血压","糖尿病"]', 0, 0);

INSERT INTO user (id, username, password, role, ref_id, name) VALUES
('USR001', '110101198001011234', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'resident', 'RES001', '张三'),
('USR002', '110101197503152345', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'resident', 'RES002', '李四'),
('USR003', '110101196005203456', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'resident', 'RES003', '王五'),
('USR004', '110101198507104567', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'resident', 'RES004', '赵六'),
('USR005', '110101195509255678', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'resident', 'RES005', '孙七'),
('USR006', '110101199011306789', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'resident', 'RES006', '周八'),
('USR007', 'EMP001', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor', 'DOC001', '张医生'),
('USR008', 'EMP002', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor', 'DOC002', '李医生'),
('USR009', 'EMP004', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor', 'DOC004', '刘医生'),
('USR010', 'EMP007', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'doctor', 'DOC007', '孙医生'),
('USR011', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'ADMIN001', '系统管理员');
`;

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
  });

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
    db.run(DDL_SQL);
    try {
      db.run(SEED_SQL);
    } catch (e) {
      console.warn('Seed skip (likely already seeded):', (e as Error).message);
    }
    saveDB();
  }

  return db;
}

export function saveDB(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDB(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function run(sql: string, params: any[] = []): number {
  const d = getDB();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const hasMore = stmt.step();
  let changes = d.getRowsModified();
  while (hasMore) { stmt.step(); }
  stmt.free();
  saveDB();
  return changes;
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  const d = getDB();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = query<T>(sql, params);
  return rows.length ? rows[0] : null;
}

export function genId(prefix: string): string {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}
