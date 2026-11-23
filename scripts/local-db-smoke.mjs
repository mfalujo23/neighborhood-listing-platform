import { PGlite } from '@electric-sql/pglite';

// Capability check only: a fresh, in-memory PostgreSQL WASM instance.
const db = await PGlite.create();
try {
  console.log(JSON.stringify((await db.query('select version(), current_user')).rows));
  await db.exec(`
    create role local_rls_probe nologin;
    create table probe (id integer primary key, visible boolean not null);
    insert into probe values (1, true), (2, false);
    alter table probe enable row level security;
    create policy visible_probe on probe for select to local_rls_probe using (visible);
    grant select, insert on probe to local_rls_probe;
    set role local_rls_probe;
  `);
  console.log('Restricted SELECT:', JSON.stringify((await db.query('select * from probe')).rows));
  try {
    await db.query('insert into probe values (3, false)');
    throw new Error('RLS probe unexpectedly allowed the insert');
  } catch (error) {
    if (error.code !== '42501') throw error;
    console.log('Blocked INSERT:', JSON.stringify({ code: error.code, message: error.message }));
  }
} finally {
  await db.close();
}
