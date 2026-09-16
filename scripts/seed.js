const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Standard bcrypt hash for default development password: "password123"
// This is secure for dev, standard for future bcrypt auth implementations, and avoids plaintext in DB.
const DEV_PASSWORD_HASH = '$2b$10$idcht6zP8rL.7qc8H6ZhruWwLQj2N12eQ0ypIrPtL2no4XxsZLWHS';

function getDatabaseUrl() {
  const envLocalPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    const match = content.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
    if (match && match[1]) return match[1].trim();
  }

  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
    if (match && match[1]) return match[1].trim();
  }

  return process.env.DATABASE_URL || '';
}

async function runSeed() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    console.error('Error: DATABASE_URL not found in .env.local or .env');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({
    connectionString,
    ssl: !isLocal ? { rejectUnauthorized: false } : false,
  });

  console.log('Connecting to PostgreSQL Railway...');
  await client.connect();
  console.log('Connected! Starting idempotent seed transaction...\n');

  try {
    await client.query('BEGIN');

    // -------------------------------------------------------------------------
    // 1. DISASTER EVENTS
    // -------------------------------------------------------------------------
    console.log('1. Seeding disaster_events...');
    const eventRes = await client.query(`
      INSERT INTO disaster_events (code, name, description, status, started_at)
      VALUES (
        'GEMPA-CBR-2026',
        'Tanggap Darurat Gempa Cianjur 2026',
        'Operasi tanggap darurat bencana gempa bumi dan distribusi logistik posko.',
        'ACTIVE',
        '2026-09-01T00:00:00Z'
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status
      RETURNING id, code, name;
    `);
    const disasterEventId = eventRes.rows[0].id;
    console.log(`   ✓ Disaster Event: [${disasterEventId}] ${eventRes.rows[0].name}`);

    // -------------------------------------------------------------------------
    // 2. PHYSICAL LOCATIONS
    // -------------------------------------------------------------------------
    console.log('2. Seeding physical_locations...');
    const locationsData = [
      {
        name: 'Gudang Utama BPBD',
        address: 'Jl. Logistik Bencana No. 1, Pusat Logistik Kota',
        latitude: -6.8173,
        longitude: 107.1327,
      },
      {
        name: 'Posko Utama Tanggap Darurat',
        address: 'Jl. Merdeka No. 10, Kantor Kecamatan Karangtengah',
        latitude: -6.8225,
        longitude: 107.1412,
      },
      {
        name: 'Posko Lapangan Desa Sukamaju',
        address: 'Balai Desa Sukamaju, RT 02 / RW 04, Zona Terdampak',
        latitude: -6.835,
        longitude: 107.155,
      },
    ];

    const physicalLocationMap = {};
    for (const loc of locationsData) {
      const existing = await client.query(
        'SELECT id FROM physical_locations WHERE name = $1 LIMIT 1;',
        [loc.name]
      );
      if (existing.rows.length > 0) {
        physicalLocationMap[loc.name] = existing.rows[0].id;
        await client.query(
          `UPDATE physical_locations 
           SET address = $1, latitude = $2, longitude = $3, status = 'ACTIVE' 
           WHERE id = $4;`,
          [loc.address, loc.latitude, loc.longitude, existing.rows[0].id]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO physical_locations (name, address, latitude, longitude, status)
           VALUES ($1, $2, $3, $4, 'ACTIVE')
           RETURNING id;`,
          [loc.name, loc.address, loc.latitude, loc.longitude]
        );
        physicalLocationMap[loc.name] = ins.rows[0].id;
      }
      console.log(`   ✓ Physical Location: [${physicalLocationMap[loc.name]}] ${loc.name}`);
    }

    // -------------------------------------------------------------------------
    // 3. EVENT LOCATIONS
    // -------------------------------------------------------------------------
    console.log('3. Seeding event_locations...');
    const eventLocationConfig = [
      {
        physicalName: 'Gudang Utama BPBD',
        type: 'WAREHOUSE',
      },
      {
        physicalName: 'Posko Utama Tanggap Darurat',
        type: 'COMMAND_CENTER',
      },
      {
        physicalName: 'Posko Lapangan Desa Sukamaju',
        type: 'FIELD_POST',
      },
    ];

    const eventLocationMap = {};
    for (const el of eventLocationConfig) {
      const physId = physicalLocationMap[el.physicalName];
      const elRes = await client.query(
        `INSERT INTO event_locations (disaster_event_id, physical_location_id, type, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         ON CONFLICT (disaster_event_id, physical_location_id, type)
         DO UPDATE SET status = 'ACTIVE'
         RETURNING id, type;`,
        [disasterEventId, physId, el.type]
      );
      eventLocationMap[el.physicalName] = elRes.rows[0].id;
      console.log(`   ✓ Event Location: [${elRes.rows[0].id}] ${el.physicalName} (${el.type})`);
    }

    // -------------------------------------------------------------------------
    // 4. ROLES
    // -------------------------------------------------------------------------
    console.log('4. Seeding roles...');
    const rolesData = [
      { code: 'ADMIN', name: 'Administrator BPBD' },
      { code: 'GUDANG', name: 'Petugas Logistik Gudang' },
      { code: 'PETUGAS_POSKO', name: 'Petugas Lapangan Posko' },
    ];

    const roleMap = {};
    for (const r of rolesData) {
      const rRes = await client.query(
        `INSERT INTO roles (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code;`,
        [r.code, r.name]
      );
      roleMap[r.code] = rRes.rows[0].id;
      console.log(`   ✓ Role: [${rRes.rows[0].id}] ${r.code}`);
    }

    // -------------------------------------------------------------------------
    // 5. USERS
    // -------------------------------------------------------------------------
    console.log('5. Seeding users...');
    const usersData = [
      {
        name: 'Budi Santoso',
        email: 'admin@sibantu.id',
        role: 'ADMIN',
      },
      {
        name: 'Ahmad Fauzi',
        email: 'gudang@sibantu.id',
        role: 'GUDANG',
      },
      {
        name: 'Siti Rahma',
        email: 'posko@sibantu.id',
        role: 'PETUGAS_POSKO',
      },
    ];

    const userMap = {};
    for (const u of usersData) {
      const uRes = await client.query(
        `INSERT INTO users (name, email, password_hash, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           status = 'ACTIVE'
         RETURNING id, email, name;`,
        [u.name, u.email, DEV_PASSWORD_HASH]
      );
      userMap[u.role] = uRes.rows[0].id;
      console.log(`   ✓ User: [${uRes.rows[0].id}] ${u.name} (${u.email})`);
    }

    // -------------------------------------------------------------------------
    // 6. ROLE GRANTS
    // -------------------------------------------------------------------------
    console.log('6. Seeding role_grants...');
    for (const u of usersData) {
      const userId = userMap[u.role];
      const roleId = roleMap[u.role];

      const existingGrant = await client.query(
        `SELECT id FROM role_grants
         WHERE user_id = $1 AND role_id = $2 AND disaster_event_id = $3 AND status = 'ACTIVE'
         LIMIT 1;`,
        [userId, roleId, disasterEventId]
      );

      if (existingGrant.rows.length === 0) {
        const grantRes = await client.query(
          `INSERT INTO role_grants (user_id, role_id, disaster_event_id, status)
           VALUES ($1, $2, $3, 'ACTIVE')
           RETURNING id;`,
          [userId, roleId, disasterEventId]
        );
        console.log(`   ✓ Role Grant: [${grantRes.rows[0].id}] User ${userId} -> Role ${u.role}`);
      } else {
        console.log(`   ✓ Role Grant: [${existingGrant.rows[0].id}] User ${userId} -> Role ${u.role} (existing)`);
      }
    }

    // -------------------------------------------------------------------------
    // 7. AID ITEMS
    // -------------------------------------------------------------------------
    console.log('7. Seeding aid_items...');
    const aidItemsData = [
      {
        code: 'WATER-600ML',
        name: 'Air Mineral 600ml',
        unit: 'KARTON',
        description: 'Air mineral kemasan botol 600ml (1 karton isi 24 botol)',
      },
      {
        code: 'FOOD-READY',
        name: 'Makanan Siap Saji',
        unit: 'KARTON',
        description: 'Paket ransum darurat makanan siap santap bencana (1 karton isi 20 paket)',
      },
      {
        code: 'MEDS-FIRSTAID',
        name: 'Obat-obatan P3K',
        unit: 'PAKET',
        description: 'Paket standar pertolongan pertama (antiseptik, perban, analgesik, kasa steril)',
      },
    ];

    const aidItemMap = {};
    for (const item of aidItemsData) {
      const itemRes = await client.query(
        `INSERT INTO aid_items (code, name, unit, description, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           unit = EXCLUDED.unit,
           description = EXCLUDED.description,
           is_active = TRUE
         RETURNING id, code;`,
        [item.code, item.name, item.unit, item.description]
      );
      aidItemMap[item.code] = itemRes.rows[0].id;
      console.log(`   ✓ Aid Item: [${itemRes.rows[0].id}] ${item.name} (${item.code})`);
    }

    // -------------------------------------------------------------------------
    // 8. INVENTORY LOTS (Gudang Utama)
    // -------------------------------------------------------------------------
    console.log('8. Seeding inventory_lots (Gudang Utama)...');
    const warehouseEventLocationId = eventLocationMap['Gudang Utama BPBD'];

    const lotsData = [
      {
        itemCode: 'WATER-600ML',
        lotCode: 'LOT-WATER-2026-001',
        onHandQty: 500.0,
        reservedQty: 0.0,
        expiredAt: '2027-12-31T00:00:00Z',
      },
      {
        itemCode: 'FOOD-READY',
        lotCode: 'LOT-FOOD-2026-001',
        onHandQty: 300.0,
        reservedQty: 0.0,
        expiredAt: '2026-11-30T00:00:00Z',
      },
      {
        itemCode: 'MEDS-FIRSTAID',
        lotCode: 'LOT-MEDS-2026-001',
        onHandQty: 150.0,
        reservedQty: 0.0,
        expiredAt: '2028-06-30T00:00:00Z',
      },
    ];

    for (const lot of lotsData) {
      const itemId = aidItemMap[lot.itemCode];
      const lotRes = await client.query(
        `INSERT INTO inventory_lots (
           event_location_id, aid_item_id, lot_code, on_hand_qty, reserved_qty, status, expired_at
         )
         VALUES ($1, $2, $3, $4, $5, 'AVAILABLE', $6)
         ON CONFLICT (event_location_id, lot_code) DO UPDATE SET
           on_hand_qty = EXCLUDED.on_hand_qty,
           reserved_qty = EXCLUDED.reserved_qty,
           status = EXCLUDED.status,
           expired_at = EXCLUDED.expired_at
         RETURNING id, lot_code, on_hand_qty;`,
        [
          warehouseEventLocationId,
          itemId,
          lot.lotCode,
          lot.onHandQty,
          lot.reservedQty,
          lot.expiredAt,
        ]
      );
      console.log(
        `   ✓ Inventory Lot: [${lotRes.rows[0].id}] ${lotRes.rows[0].lot_code} (Qty: ${lotRes.rows[0].on_hand_qty})`
      );
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed completed successfully!\n');

    // -------------------------------------------------------------------------
    // VERIFICATION: Record Counts & Select Queries
    // -------------------------------------------------------------------------
    console.log('====================================================');
    console.log('             VERIFICATION & RECORD COUNTS           ');
    console.log('====================================================');

    const tablesToVerify = [
      'disaster_events',
      'physical_locations',
      'event_locations',
      'roles',
      'users',
      'role_grants',
      'aid_items',
      'inventory_lots',
    ];

    const counts = [];
    for (const t of tablesToVerify) {
      const cRes = await client.query(`SELECT count(*)::int as count FROM ${t};`);
      counts.push({ Table: t, 'Record Count': cRes.rows[0].count });
    }
    console.table(counts);

    console.log('\n--- SAMPLE SELECT: INVENTORY DI GUDANG UTAMA ---');
    const invSelect = await client.query(`
      SELECT 
        il.id,
        il.lot_code,
        ai.name AS item_name,
        ai.unit,
        il.on_hand_qty,
        il.reserved_qty,
        il.status,
        pl.name AS location_name
      FROM inventory_lots il
      JOIN aid_items ai ON ai.id = il.aid_item_id
      JOIN event_locations el ON el.id = il.event_location_id
      JOIN physical_locations pl ON pl.id = el.physical_location_id
      ORDER BY il.id;
    `);
    console.table(invSelect.rows);

    console.log('\n--- SAMPLE SELECT: USERS & ROLES ---');
    const usersSelect = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        r.code AS role_code,
        rg.status AS grant_status,
        de.code AS event_code
      FROM users u
      JOIN role_grants rg ON rg.user_id = u.id
      JOIN roles r ON r.id = rg.role_id
      LEFT JOIN disaster_events de ON de.id = rg.disaster_event_id
      ORDER BY u.id;
    `);
    console.table(usersSelect.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed, transaction rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed().catch((err) => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
