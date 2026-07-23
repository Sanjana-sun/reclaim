// Dual-backend data layer. DATABASE_URL set -> Postgres (JSONB store); else JSON file.
// Public API is async and identical across backends: init, insert, find, findOne, update.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const BACKEND = process.env.DATABASE_URL ? 'pg' : 'json';
const COLLECTIONS = ['users', 'orgs', 'appeals', 'bills', 'payments', 'winrate', 'subscriptions'];

// --------------------------------------------------------------------------
// JSON backend
// --------------------------------------------------------------------------
const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');
let cache = null;
function jEnsureDir() { const d = path.dirname(DB_FILE); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function jLoad() {
  jEnsureDir();
  if (fs.existsSync(DB_FILE)) cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  else { cache = { seq: {} }; COLLECTIONS.forEach((c) => (cache[c] = [])); }
}
function jSave() { jEnsureDir(); fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2)); }
const jStore = {
  async all(coll) { return cache[coll].slice(); },
  async insert(coll, obj) { cache.seq[coll] = (cache.seq[coll] || 0) + 1; obj.id = cache.seq[coll]; obj.created_at = obj.created_at || new Date().toISOString(); cache[coll].push(obj); jSave(); return obj; },
  async update(coll, id, patch) { const o = cache[coll].find((x) => x.id === id); if (!o) return null; Object.assign(o, patch); jSave(); return o; },
  async remove(coll, pred) { const before = cache[coll].length; cache[coll] = cache[coll].filter((x) => !pred(x)); jSave(); return before - cache[coll].length; },
  async count(coll) { return cache[coll].length; },
};

// --------------------------------------------------------------------------
// Postgres backend (single JSONB store table + per-collection sequence)
// --------------------------------------------------------------------------
let pool = null;
const pgStore = {
  async all(coll) { const r = await pool.query('select data from store where collection=$1 order by id', [coll]); return r.rows.map((x) => x.data); },
  async insert(coll, obj) {
    const r = await pool.query('insert into seq(collection,val) values($1,1) on conflict(collection) do update set val=seq.val+1 returning val', [coll]);
    obj.id = Number(r.rows[0].val);
    obj.created_at = obj.created_at || new Date().toISOString();
    await pool.query('insert into store(collection,id,data) values($1,$2,$3)', [coll, obj.id, obj]);
    return obj;
  },
  async update(coll, id, patch) {
    const r = await pool.query('select data from store where collection=$1 and id=$2', [coll, id]);
    if (!r.rows[0]) return null;
    const o = Object.assign(r.rows[0].data, patch);
    await pool.query('update store set data=$3 where collection=$1 and id=$2', [coll, id, o]);
    return o;
  },
  async remove(coll, pred) { const rows = await this.all(coll); const del = rows.filter(pred); for (const r of del) await pool.query('delete from store where collection=$1 and id=$2', [coll, r.id]); return del.length; },
  async count(coll) { const r = await pool.query('select count(*)::int n from store where collection=$1', [coll]); return r.rows[0].n; },
};

const store = () => (BACKEND === 'pg' ? pgStore : jStore);

// --------------------------------------------------------------------------
// Public async API
// --------------------------------------------------------------------------
async function insert(coll, obj) { return store().insert(coll, obj); }
async function find(coll, pred) { return (await store().all(coll)).filter(pred || (() => true)); }
async function findOne(coll, pred) { return (await store().all(coll)).find(pred); }
async function update(coll, id, patch) { return store().update(coll, id, patch); }
async function remove(coll, pred) { return store().remove(coll, pred); }

async function init() {
  if (BACKEND === 'pg') {
    const { Pool } = require('pg');
    const { migrate } = require('./migrate');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await migrate(pool);
  } else {
    jLoad();
  }
  if ((await store().count('users')) === 0) await seed();
  return BACKEND;
}

async function seed() {
  await insert('users', { email: 'admin@overturn.dev', password_hash: bcrypt.hashSync('admin123', 8), role: 'admin', org_id: null, name: 'Admin' });
  const pharma = await insert('orgs', { name: 'NovoMed Pharma', type: 'pharma', code: 'PHARMA', meta: { sponsored_programs: [{ drug: 'Ozempic', budget: 500000, spent: 0, rate: 75 }, { drug: 'Wegovy', budget: 300000, spent: 0, rate: 75 }] } });
  const provider = await insert('orgs', { name: 'Cascade Orthopedics', type: 'provider', code: 'PROVIDER', meta: { acv: 15000, specialty: 'orthopedics' } });
  const employer = await insert('orgs', { name: 'Acme Corp', type: 'employer', code: 'EMPLOYER', meta: { covered_lives: 4200, pmpm: 0.5 } });
  const clinicOrg = await insert('orgs', { name: 'Overturn Clinical Review', type: 'clinician', code: 'CLINICIAN', meta: {} });
  await insert('users', { email: 'pharma@overturn.dev', password_hash: bcrypt.hashSync('demo1234', 8), role: 'pharma', org_id: pharma.id, name: 'Pharma Manager' });
  await insert('users', { email: 'provider@overturn.dev', password_hash: bcrypt.hashSync('demo1234', 8), role: 'provider', org_id: provider.id, name: 'Clinic Admin' });
  await insert('users', { email: 'employer@overturn.dev', password_hash: bcrypt.hashSync('demo1234', 8), role: 'employer', org_id: employer.id, name: 'HR Benefits' });
  await insert('users', { email: 'clinician@overturn.dev', password_hash: bcrypt.hashSync('demo1234', 8), role: 'clinician', org_id: clinicOrg.id, name: 'Dr. Lee, RN' });
  await insert('users', { email: 'patient@overturn.dev', password_hash: bcrypt.hashSync('demo1234', 8), role: 'consumer', org_id: null, name: 'Sam Rivera' });
  const insurers = ['UnitedHealthcare', 'Aetna', 'Cigna', 'Anthem BCBS'];
  const reasons = ['medical_necessity', 'prior_auth', 'step_therapy', 'experimental'];
  for (let i = 0; i < 60; i++) {
    await insert('winrate', { insurer: insurers[i % insurers.length], plan_type: ['commercial', 'aca', 'ma'][i % 3], reason: reasons[i % reasons.length], outcome: Math.random() < 0.55 ? 'won' : 'lost' });
  }
}

module.exports = { init, insert, find, findOne, update, remove, backend: () => BACKEND };
