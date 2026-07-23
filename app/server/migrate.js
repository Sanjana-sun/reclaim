const fs = require('fs');
const path = require('path');

// Ordered, idempotent SQL migrations tracked in _migrations. Each runs in a transaction.
async function migrate(pool) {
  await pool.query('create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())');
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const done = new Set((await pool.query('select name from _migrations')).rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into _migrations(name) values($1)', [f]);
      await client.query('commit');
      console.log('migrated:', f);
    } catch (e) {
      await client.query('rollback');
      throw new Error(`Migration ${f} failed: ${e.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = { migrate };
