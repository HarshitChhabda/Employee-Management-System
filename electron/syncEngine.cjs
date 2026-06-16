const { safeStorage } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');
const fs = require('fs');
const path = require('path');

let supabaseClient = null;

async function saveSupabaseConfig(db, url, key) {
  const encUrl = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(url).toString('base64')
    : Buffer.from(url, 'utf-8').toString('base64');

  const encKey = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(key).toString('base64')
    : Buffer.from(key, 'utf-8').toString('base64');

  await db.run("INSERT OR REPLACE INTO system_config (key, value) VALUES ('supabase_url_enc', ?)", [encUrl]);
  await db.run("INSERT OR REPLACE INTO system_config (key, value) VALUES ('supabase_anon_key_enc', ?)", [encKey]);

  // Reset client so it re-initializes on next sync
  supabaseClient = null;
}

async function loadSupabaseConfig(db) {
  try {
    const urlRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_url_enc'");
    const keyRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_anon_key_enc'");
    
    if (!urlRow || !keyRow) {
      // Fallback to manually parsing .env file
      try {
        const envPath = path.join(__dirname, '..', '.env');
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf-8');
          const config = {};
          content.split('\n').forEach(line => {
            const [k, ...v] = line.split('=');
            if (k && v) config[k.trim()] = v.join('=').trim();
          });
          if (config.SUPABASE_URL && (config.SUPABASE_SECRET_KEY || config.SUPABASE_PUBLISHABLE_KEY)) {
            return {
              url: config.SUPABASE_URL,
              key: config.SUPABASE_SECRET_KEY || config.SUPABASE_PUBLISHABLE_KEY
            };
          }
        }
      } catch(e) { console.error('Failed reading .env fallback', e); }
      return null;
    }

    const url = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(urlRow.value, 'base64'))
      : Buffer.from(urlRow.value, 'base64').toString('utf-8');

    const key = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(keyRow.value, 'base64'))
      : Buffer.from(keyRow.value, 'base64').toString('utf-8');

    return { url, key };
  } catch (err) {
    console.error('Failed to load/decrypt Supabase config:', err);
    return null;
  }
}

async function getSupabaseClient(db) {
  if (supabaseClient) return supabaseClient;
  const config = await loadSupabaseConfig(db);
  if (!config) return null;
  try {
    supabaseClient = createClient(config.url, config.key, {
      auth: { persistSession: false }
    });
    return supabaseClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

async function pullFromSupabase(db, session) {
  const client = await getSupabaseClient(db);
  if (!client) {
    return { success: false, reason: 'Supabase credentials not configured' };
  }

  let entitiesToPull = [];
  if (session.role === 'ROLE_BRANCH') {
    entitiesToPull = ['ALL'];
  } else if (session.role === 'ROLE_HO') {
    entitiesToPull = ['BRANCH', 'ALL'];
  } else if (session.role === 'ROLE_SUPER') {
    entitiesToPull = ['BRANCH', 'HO'];
  }

  if (entitiesToPull.length === 0) {
    return { success: true, count: 0, reason: 'No entities to pull for this role' };
  }

  let totalPulled = 0;

  const globalTables = ['departments', 'designations'];
  const entityTables = ['employees', 'resigned_employees'];
  const letterTables = ['letters'];
  const childTables = ['attendance', 'employee_history', 'pl_records', 'leave_balances', 'leave_history', 'payroll_summary', 'tenure_renewals', 'employee_category_history', 'employee_weekly_off_history'];

  const DEFAULTS = {
    employees: { category: 'daily_wage', entity: 'BRANCH' },
    resigned_employees: { category: 'daily_wage', entity: 'BRANCH' },
  };

  const insertData = async (table, data) => {
    if (!data || data.length === 0) return 0;
    let count = 0;
    const defaults = DEFAULTS[table] || {};
    for (const row of data) {
      const merged = { ...defaults, ...row };
      const cols = Object.keys(merged);
      const placeholders = cols.map(() => '?');
      const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
      await db.run(sql, cols.map(c => merged[c]));
      count++;
    }
    return count;
  };

  // 1. Global Tables
  for (const table of globalTables) {
    try {
      const { data, error } = await client.from(table).select('*');
      if (error) { console.error(`[Pull Sync] ${table} error:`, error.message); continue; }
      totalPulled += await insertData(table, data);
    } catch(e) {}
  }

  // 2. Entity Tables
  for (const entity of entitiesToPull) {
    for (const table of entityTables) {
      try {
        let query = client.from(table).select('*');
        if (entity !== 'ALL') query = query.eq('entity', entity);
        const { data, error } = await query;
        if (error) { console.error(`[Pull Sync] ${table}(${entity}) error:`, error.message); continue; }
        totalPulled += await insertData(table, data);
      } catch(e) {}
    }
    
    for (const table of letterTables) {
      try {
        let query = client.from(table).select('*');
        if (entity !== 'ALL') query = query.or(`source_entity.eq.${entity},target_entity.eq.${entity}`);
        const { data, error } = await query;
        if (error) { console.error(`[Pull Sync] ${table}(${entity}) error:`, error.message); continue; }
        totalPulled += await insertData(table, data);
      } catch(e) {}
    }
  }

  // 3. Child Tables
  const isSuper = entitiesToPull.includes('ALL') || (entitiesToPull.includes('BRANCH') && entitiesToPull.includes('HO'));
  const empEntityCache = {};
  const getLocalEmpEntity = async (empId) => {
    if (empEntityCache[empId]) return empEntityCache[empId];
    const e = await db.get('SELECT entity FROM employees WHERE id = ?', [empId]);
    if (e) {
      empEntityCache[empId] = e.entity;
      return e.entity;
    }
    return null;
  };

  for (const table of childTables) {
    try {
      const { data, error } = await client.from(table).select('*');
      if (error) { console.error(`[Pull Sync] ${table} error:`, error.message); continue; }
      if (!data || data.length === 0) continue;
      
      const toInsert = [];
      for (const row of data) {
        if (isSuper) {
          toInsert.push(row);
        } else {
          const empEntity = await getLocalEmpEntity(row.employee_id);
          if (empEntity && entitiesToPull.includes(empEntity)) {
            toInsert.push(row);
          }
        }
      }
      totalPulled += await insertData(table, toInsert);
    } catch(e) {}
  }

  console.log(`[Pull Sync] Pulled ${totalPulled} records for role ${session.role}`);
  return { success: true, count: totalPulled };
}

async function processSyncQueue(db) {
  const client = await getSupabaseClient(db);
  if (!client) {
    console.log('[Sync Engine] Supabase config not set or invalid; skipping sync.');
    return { success: false, reason: 'Supabase credentials not configured' };
  }

  // Get unsynced queue items in sequential order
  const queue = await db.all("SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC");
  if (queue.length === 0) {
    return { success: true, count: 0 };
  }

  console.log(`[Sync Engine] Found ${queue.length} unsynced items in queue.`);
  let successCount = 0;

  for (const item of queue) {
    try {
      const { id, table_name, record_id, operation, payload, entity } = item;
      const parsedPayload = JSON.parse(payload);
      if (table_name === 'app_users') {
        delete parsedPayload.password;
      }

      let error = null;
      let upsertOptions = undefined;

      if (table_name === 'attendance') {
        delete parsedPayload.id;
        upsertOptions = { onConflict: 'employee_id, date' };
      } else if (table_name === 'pl_records') {
        upsertOptions = { onConflict: 'employee_id, month_year' };
      } else if (table_name === 'leave_balances') {
        upsertOptions = { onConflict: 'employee_id, year' };
      } else if (table_name === 'leave_history') {
        upsertOptions = { onConflict: 'employee_id, leave_date' };
      } else if (table_name === 'payroll_summary') {
        upsertOptions = { onConflict: 'employee_id, month, year' };
      }

      if (operation === 'INSERT') {
        const { error: upsertError } = await client
          .from(table_name)
          .upsert(parsedPayload, upsertOptions);
        error = upsertError;
      } else if (operation === 'UPDATE') {
        let query = client.from(table_name).update(parsedPayload);
        if (table_name === 'attendance') {
            query = query.match({ employee_id: parsedPayload.employee_id, date: parsedPayload.date });
        } else {
            query = query.eq('id', record_id);
        }
        const { error: updateError } = await query;
        error = updateError;
      } else if (operation === 'DELETE') {
        let query = client.from(table_name).delete();
        if (table_name === 'attendance') {
            query = query.match({ employee_id: parsedPayload.employee_id, date: parsedPayload.date });
        } else {
            query = query.eq('id', record_id);
        }
        const { error: deleteError } = await query;
        error = deleteError;
      }

      if (error) {
        if (error.code === '23503' && parsedPayload && parsedPayload.employee_id) {
          console.log(`[Sync Engine] Foreign key missing. Attempting to auto-sync missing employee ${parsedPayload.employee_id}...`);
          const emp = await db.get("SELECT * FROM employees WHERE id = ?", [parsedPayload.employee_id]);
          if (emp) {
            const { error: syncErr } = await client.from('employees').upsert(emp);
            if (!syncErr) {
              console.log(`[Sync Engine] Successfully auto-synced missing employee. Retrying original operation...`);
              if (operation === 'INSERT') {
                const { error: e2 } = await client.from(table_name).upsert(parsedPayload, upsertOptions);
                error = e2;
              } else if (operation === 'UPDATE') {
                let query = client.from(table_name).update(parsedPayload);
                if (table_name === 'attendance') {
                  query = query.match({ employee_id: parsedPayload.employee_id, date: parsedPayload.date });
                } else {
                  query = query.eq('id', record_id);
                }
                const { error: e2 } = await query;
                error = e2;
              } else if (operation === 'DELETE') {
                let query = client.from(table_name).delete();
                if (table_name === 'attendance') {
                  query = query.match({ employee_id: parsedPayload.employee_id, date: parsedPayload.date });
                } else {
                  query = query.eq('id', record_id);
                }
                const { error: e2 } = await query;
                error = e2;
              }
            }
          }
        }

        if (error) {
          console.error(`[Sync Engine] Sync failed for item ${id}:`, error.message);
          if (error.code === '23503' || error.code === '23502') {
            console.warn(`[Sync Engine] Marking item ${id} as failed due to constraint violation to prevent queue blocking.`);
            await db.run("UPDATE sync_queue SET synced = -1, push_status = 'FAILED' WHERE id = ?", [id]);
            continue;
          }
          return { success: false, reason: error.message, syncedCount: successCount };
        }
      }

      await db.run("UPDATE sync_queue SET synced = 1 WHERE id = ?", [id]);
      successCount++;

      await db.run(
        `INSERT INTO employee_history (
          history_id, employee_id, employee_name, action_type, field_name, 
          old_value, new_value, changed_by, change_reason, changed_at
        ) VALUES (?, 'SYSTEM', 'Sync Engine', 'SYNC_SUCCESS', ?, ?, ?, 'SYSTEM', ?, ?)`,
        [
          uuidv4(),
          table_name,
          operation,
          record_id,
          `Synced item ${id} successfully to Supabase.`,
          new Date().toISOString()
        ]
      );

    } catch (itemErr) {
      console.error(`[Sync Engine] Exception during queue sync at item ${item.id}:`, itemErr);
      return { success: false, reason: itemErr.message, syncedCount: successCount };
    }
  }

  return { success: true, count: successCount };
}

async function checkSyncStatus(db) {
  const config = await loadSupabaseConfig(db);
  
  let pendingCount = 0;
  try {
    const pendingRow = await db.get("SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0");
    pendingCount = pendingRow ? pendingRow.count : 0;
  } catch (e) {
    console.error('[Sync Status] Failed to get pending count:', e.message);
  }

  let lastSyncAt = null;
  try {
    const lastSyncRow = await db.get(
      `SELECT changed_at FROM employee_history 
       WHERE action_type = 'SYNC_SUCCESS' 
       ORDER BY changed_at DESC LIMIT 1`
    );
    lastSyncAt = lastSyncRow ? lastSyncRow.changed_at : null;
  } catch (e) {
    console.error('[Sync Status] Failed to get last sync time:', e.message);
  }

  if (!config || !config.url || !config.key) {
    return { configured: false, connected: false, pendingCount, lastSyncAt };
  }

  let connected = false;
  try {
    const client = await getSupabaseClient(db);
    if (client) {
      const { error } = await client.from('employees').select('id').limit(1);
      if (!error) {
        connected = true;
      } else {
        console.error('[Sync Status] Supabase select failed:', error.message);
      }
    }
  } catch (e) {
    console.error('[Sync Status] Supabase ping exception:', e.message);
  }

  return {
    configured: true,
    connected,
    pendingCount,
    lastSyncAt
  };
}

async function nukeSupabase(db) {
  const client = await getSupabaseClient(db);
  if (!client) {
    return { success: false, reason: 'Supabase credentials not configured' };
  }
  
  const tables = [
    'attendance', 'letters', 'pl_records', 'leave_history', 'leave_balances', 'payroll_summary',
    'employee_history', 'employee_category_history', 'employee_weekly_off_history', 'tenure_renewals',
    'employees', 'resigned_employees', 'departments', 'designations'
  ];
  
  for (const table of tables) {
    try {
      // Delete where id is not null to wipe out the table content
      await client.from(table).delete().neq('id', 'dummy_id_that_never_exists_12345');
    } catch (e) {
      console.error(`[Nuke] Failed to clear Supabase table ${table}:`, e.message);
    }
  }
  return { success: true };
}

module.exports = {
  saveSupabaseConfig,
  loadSupabaseConfig,
  processSyncQueue,
  checkSyncStatus,
  pullFromSupabase,
  nukeSupabase
};
