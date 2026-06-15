/**
 * Seed Firestore + Firebase Auth admin.
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-firestore.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'malcriadosburger-958b8';

if (!getApps().length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  initializeApp(
    credPath
      ? { credential: cert(JSON.parse(readFileSync(credPath, 'utf8'))), projectId }
      : { projectId }
  );
}

const db = getFirestore();
const auth = getAuth();
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@malcriados.com').trim().toLowerCase();
const adminPassword = (process.env.ADMIN_PASSWORD || 'admin123').trim();

const TABLES = [
  { id: 1, name: 'Mesa 1', capacity: 4, status: 'free', zone: 'Salón' },
  { id: 2, name: 'Mesa 2', capacity: 4, status: 'free', zone: 'Salón' },
  { id: 3, name: 'Mesa 3', capacity: 4, status: 'free', zone: 'Salón' },
  { id: 4, name: 'Barra 1', capacity: 1, status: 'free', zone: 'Barra' },
  { id: 5, name: 'Barra 2', capacity: 1, status: 'free', zone: 'Barra' },
];

async function ensureAdmin() {
  let user;
  try {
    user = await auth.getUserByEmail(adminEmail);
    await auth.updateUser(user.uid, { password: adminPassword, emailVerified: true });
    console.log('Admin updated:', adminEmail);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    user = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      emailVerified: true,
      displayName: 'Administrador',
    });
    console.log('Admin created:', adminEmail);
  }
  await db.collection('profiles').doc(user.uid).set(
    {
      uid: user.uid,
      email: adminEmail,
      name: 'Administrador',
      role: 'admin',
      phone: null,
      active: 1,
      created_at: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function seedProducts() {
  const snap = await db.collection('products').limit(1).get();
  if (!snap.empty) {
    console.log('Products exist — skip (delete collection to re-seed)');
    return;
  }
  const samples = [
    ['El Malcriado Clásico', 'Hamburguesa sencilla', 'Hamburguesas', 55],
    ['Dogo Patín', 'Hot dog sencillo', 'Hot dogs', 45],
    ['Malcriada Refrescante', 'Refresco', 'Bebidas', 25],
  ];
  let id = 0;
  const batch = db.batch();
  for (const [name, subtitle, category, price] of samples) {
    id += 1;
    batch.set(db.collection('products').doc(String(id)), {
      id,
      name,
      subtitle,
      category,
      price,
      cost: Math.round(price * 0.4),
      description: '',
      active: 1,
    });
  }
  await batch.commit();
  await db.collection('_counters').doc('products').set({ value: id }, { merge: true });
  await db.collection('_counters').doc('orders').set({ value: 0 }, { merge: true });
  await db.collection('_counters').doc('order_lines').set({ value: 0 }, { merge: true });
  console.log(`Seeded ${id} sample products — add full menu from Admin > Menú`);
}

async function seedTables() {
  const batch = db.batch();
  for (const t of TABLES) batch.set(db.collection('tables').doc(String(t.id)), t, { merge: true });
  await batch.commit();
}

async function seedSettings() {
  await db
    .collection('settings')
    .doc('restaurant')
    .set({ isOpen: true, updatedAt: new Date().toISOString() }, { merge: true });
}

await ensureAdmin();
await seedProducts();
await seedTables();
await seedSettings();
console.log('Seed complete.');
