// utils/seed.js — Remplir la DB avec des données de test
const bcrypt        = require('bcrypt');
const { dbRun, getDb } = require('../config/database');

async function seed() {
  // Initialiser la DB (crée les tables si nécessaire)
  getDb();
  // Attendre que le serialize initial soit terminé
  await new Promise(r => setTimeout(r, 1500));

  console.log('Seeding...');

  const users = [
    { id: 'ADMIN001', name: 'Admin Système',    email: 'admin@campus.tn',   dept: 'IT',           year: 0, pwd: 'Admin@123',   admin: 1 },
    { id: '21CS042',  name: 'Ahmed Ben Ali',     email: 'ahmed@campus.tn',   dept: 'Informatique', year: 3, pwd: 'Ahmed@123',   admin: 0 },
    { id: '22EL017',  name: 'Sarra Mansouri',    email: 'sarra@campus.tn',   dept: 'Electronique', year: 2, pwd: 'Sarra@123',   admin: 0 },
    { id: '23ME008',  name: 'Yassine Trabelsi',  email: 'yassine@campus.tn', dept: 'Mecanique',    year: 1, pwd: 'Yassine@123', admin: 0 },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.pwd, 10);
    await dbRun(
      `INSERT OR REPLACE INTO students (student_id, full_name, email, department, year, password_hash, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, u.dept, u.year, hashed, u.admin]
    );
    console.log(`  ✓ ${u.id} — ${u.name}  (pwd: ${u.pwd})`);
  }

  console.log('\n✅ Seed terminé.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
