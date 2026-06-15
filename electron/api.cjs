const { randomUUID: uuidv4 } = require('crypto');
const { hashPassword, validatePasswordStrength } = require('./passwordUtils.cjs');

// Fields to track for audit history
const TRACKED_FIELDS = [
  'name', 'category', 'department', 'designation', 'mobile_number',
  'address', 'basic_salary', 'service_duration', 'weekly_off',
  'fathers_name', 'aadhar_number', 'dob', 'qualification',
  'bank_name', 'account_number', 'ifsc_code', 'pf_number', 'epf_uan_number',
  'tenure_end_date'
];

async function registerApiHandlers(ipcMain, db) {

  // Helper: Get effective weekly off for a given employee and date
  // Returns the day name (e.g. 'Sunday') or 'None' if no weekly off is set
  async function getEffectiveWeeklyOff(employeeId, dateStr) {
    const hist = await db.get(
      `SELECT weekly_off FROM employee_weekly_off_history
       WHERE employee_id = ? AND effective_from <= ?
       ORDER BY effective_from DESC, created_at DESC LIMIT 1`,
      [employeeId, dateStr]
    );
    if (hist && hist.weekly_off && hist.weekly_off !== 'None') {
      return hist.weekly_off;
    }
    const emp = await db.get('SELECT weekly_off FROM employees WHERE id = ?', [employeeId]);
    if (emp && emp.weekly_off && emp.weekly_off !== 'None') {
      return emp.weekly_off;
    }
    return 'None';
  }

  // Startup migrations are now handled by database.cjs

  // Helper: log to employee_history
  async function logHistory(employeeId, employeeName, actionType, fieldName, oldVal, newVal, opts = {}) {
    await db.run(
      `INSERT INTO employee_history (history_id, employee_id, employee_name, action_type, field_name, old_value, new_value, previous_category, new_category, changed_by, change_reason, changed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), employeeId, employeeName || '', actionType,
        fieldName || null, oldVal || null, newVal || null,
        opts.previousCategory || null, opts.newCategory || null,
        opts.changedBy || 'Admin', opts.changeReason || null,
        new Date().toISOString()
      ]
    );
  }

  // ─── Multi-User Security & Access Control Helpers ───
  function getEntityFilter(session) {
    if (!session || !session.role) {
      return "entity = 'NONE'";
    }
    if (session.role === 'ROLE_BRANCH') {
      return "entity = 'BRANCH'";
    }
    if (session.role === 'ROLE_HO') {
      return "entity = 'HO'";
    }
    if (session.role === 'ROLE_SUPER') {
      return "entity IN ('HO', 'BRANCH', 'ALL')";
    }
    return "entity = 'NONE'";
  }

  function canWrite(session, targetEntity) {
    if (!session || !session.role) return false;
    if (session.role === 'ROLE_SUPER') return true; // Super Admin has full power
    if (session.role === 'ROLE_BRANCH') return targetEntity === 'BRANCH';
    if (session.role === 'ROLE_HO') return targetEntity === 'HO';
    return false;
  }

  async function logAccessDenied(session, action, target) {
    try {
      await logHistory(
        'SYSTEM',
        session ? session.username : 'Unknown',
        'ACCESS_DENIED',
        action,
        null,
        target,
        { changedBy: session ? session.username : 'Unknown' }
      );
    } catch(e) { console.error('Failed to log ACCESS_DENIED:', e); }
  }

  async function enqueueSync(tableName, recordId, operation, payload, entity) {
    try {
      await db.run(
        `INSERT INTO sync_queue (table_name, record_id, operation, payload, entity)
         VALUES (?, ?, ?, ?, ?)`,
        [tableName, recordId, operation, JSON.stringify(payload), entity || 'BRANCH']
      );
    } catch(e) { console.error('Failed to enqueue sync:', e); }
  }

  // ─── Dashboard ───
  ipcMain.handle('api:dashboard', async (event, session) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filter = getEntityFilter(session);
      const getCount = async (query, params = []) => {
        const res = await db.get(query, params);
        return res ? res.count : 0;
      };

      const totalEmployees = await getCount(`SELECT COUNT(*) as count FROM employees WHERE is_active = 1 AND ${filter}`);
      const dailyWage = await getCount(`SELECT COUNT(*) as count FROM employees WHERE category = 'daily_wage' AND is_active = 1 AND ${filter}`);
      const samvida = await getCount(`SELECT COUNT(*) as count FROM employees WHERE category = 'samvida' AND is_active = 1 AND ${filter}`);
      const probation = await getCount(`SELECT COUNT(*) as count FROM employees WHERE category = 'probation' AND is_active = 1 AND ${filter}`);
      const permanent = await getCount(`SELECT COUNT(*) as count FROM employees WHERE category = 'permanent' AND is_active = 1 AND ${filter}`);
      const resigned = await getCount(`SELECT COUNT(*) as count FROM resigned_employees WHERE ${filter}`);
      
      const todayAttendance = await db.all(`
        SELECT a.status FROM attendance a
        LEFT JOIN employees e ON a.employee_id = e.id
        WHERE a.date = ? AND e.${filter}
      `, [today]);

      const attendanceStats = {
        P:   todayAttendance.filter(a => a.status === 'P').length,
        A:   todayAttendance.filter(a => a.status === 'A').length,
        PL:  todayAttendance.filter(a => a.status === 'PL').length,
        CL:  todayAttendance.filter(a => a.status === 'CL').length,
        HCL: todayAttendance.filter(a => a.status === 'HCL').length,
        HD:  todayAttendance.filter(a => a.status === 'HD').length,
        WO:  todayAttendance.filter(a => a.status === 'WO').length,
        OD:  todayAttendance.filter(a => a.status === 'OD').length,
        LWP: todayAttendance.filter(a => a.status === 'LWP').length,
      };

      let crossEntityClause = '';
      if (session.role === 'ROLE_BRANCH') {
        crossEntityClause = `OR (l.source_entity = 'BRANCH' AND l.target_entity = 'HO')`;
      } else if (session.role === 'ROLE_HO') {
        crossEntityClause = `OR (l.source_entity = 'HO' AND l.target_entity = 'BRANCH')`;
      }

      const recentLetters = await db.all(`
        SELECT l.*, e.name as employee_name FROM letters l
        LEFT JOIN employees e ON l.employee_id = e.id
        WHERE e.${filter} ${crossEntityClause}
        ORDER BY l.dispatch_date DESC LIMIT 5
      `);

      const recentCategoryChanges = await db.all(`
        SELECT h.* FROM employee_history h
        LEFT JOIN employees e ON h.employee_id = e.id
        WHERE h.action_type = 'CATEGORY_CHANGE' AND e.${filter}
        ORDER BY h.changed_at DESC LIMIT 5
      `);

      // Tenure expiring in next 30 days
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const expiringTenure = await db.all(`
        SELECT id, name, employee_code, department, 
               designation, category, tenure_end_date
        FROM employees 
        WHERE is_active = 1 
          AND tenure_end_date IS NOT NULL 
          AND tenure_end_date != ''
          AND tenure_end_date <= ?
          AND tenure_end_date >= ?
          AND ${filter}
        ORDER BY tenure_end_date ASC
        LIMIT 5
      `, [
        thirtyDaysLater.toISOString().split('T')[0],
        today
      ]);

      // Monthly attendance rate for current month
      const currentMonthPrefix = today.substring(0, 7);
      const monthlyAttendance = await db.all(`
        SELECT a.status FROM attendance a
        LEFT JOIN employees e ON a.employee_id = e.id
        WHERE a.date LIKE '${currentMonthPrefix}-%' AND e.${filter}
      `);
      const totalMonthlyMarked = monthlyAttendance.length;
      const totalMonthlyPresent = monthlyAttendance.filter(
        a => ['P', 'WO', 'OD', 'CL', 'PL', 'HCL', 'HD'].includes(a.status)
      ).length;
      const attendanceRate = totalMonthlyMarked > 0 
        ? Math.round((totalMonthlyPresent / totalMonthlyMarked) * 100) 
        : 0;

      return {
        counts: { totalEmployees, dailyWage, samvida, probation, permanent, resigned },
        attendanceToday: attendanceStats,
        recentLetters: recentLetters.map(l => ({ ...l, employee: { name: l.employee_name } })),
        recentCategoryChanges: recentCategoryChanges.map(c => ({
          ...c,
          employee: { name: c.employee_name },
          old_category: c.previous_category,
          category: c.new_category
        })),
        expiringTenure,
        attendanceRate,
        monthlyMarked: totalMonthlyMarked
      };
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── Employees ───
  ipcMain.handle('api:employees', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      // ── GET ──
      if (action === 'get') {
        const { id, is_active, search, category, include_branch } = data || {};

        let effectiveFilter = filter;
        if (include_branch && session && session.role === 'ROLE_HO') {
          effectiveFilter = "entity IN ('HO', 'BRANCH')";
        }

        if (id) {
          const employee = await db.get(`SELECT * FROM employees WHERE id = ? AND ${effectiveFilter}`, [id]);
          if (employee) {
            employee.category_history = await db.all(
              `SELECT * FROM employee_history WHERE employee_id = ? ORDER BY changed_at DESC`, [id]
            );
          }
          return employee;
        }

        let query = `SELECT * FROM employees WHERE is_active = 1 AND ${effectiveFilter}`;
        const params = [];

        if (is_active !== undefined) {
          query = `SELECT * FROM employees WHERE is_active = ? AND ${effectiveFilter}`;
          params.push(is_active ? 1 : 0);
        }

        if (category) {
          query += ' AND category = ?';
          params.push(category);
        }

        if (search) {
          query += ' AND (name LIKE ? OR employee_code LIKE ? OR joining_date LIKE ?)';
          const p = `%${search}%`;
          params.push(p, p, p);
        }

        query += ' ORDER BY employee_code ASC';
        return await db.all(query, params);
      }
      
      // ── CREATE ──
      if (action === 'create') {
        const targetEntity = session && session.role === 'ROLE_BRANCH' ? 'BRANCH' : 'HO';
        
        if (!canWrite(session, targetEntity)) {
          await logAccessDenied(session, 'api:employees:create', targetEntity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar create karne ka adhikar nahi hai.');
        }

        const id = data.id || uuidv4();
        let {
          name, category, is_active, appointment_order_number, appointment_date, joining_date,
          photo_url, qualification, address, husband_name, fathers_name, mobile_number, phone, email,
          blood_group, pan_number, aadhar_number, pf_number, epf_uan_number, bank_name, account_number, ifsc_code, title,
          employee_code, department, designation, dob, weekly_off, service_duration, basic_salary, tenure_end_date
        } = data;

        // Dynamic sequential employee ID generation with configuration tracker
        let finalEmployeeCode = employee_code;
        if (!finalEmployeeCode) {
          const prefixKey = targetEntity === 'BRANCH' ? 'branch_id_prefix' : 'ho_id_prefix';
          const counterKey = targetEntity === 'BRANCH' ? 'branch_id_counter' : 'ho_id_counter';
          
          const prefixRow = await db.get("SELECT value FROM system_config WHERE key = ?", [prefixKey]);
          const counterRow = await db.get("SELECT value FROM system_config WHERE key = ?", [counterKey]);
          
          const prefix = prefixRow ? prefixRow.value : (targetEntity === 'BRANCH' ? 'Emp' : 'Hemp');
          const currentCount = counterRow ? parseInt(counterRow.value, 10) : 0;
          const newCount = currentCount + 1;
          
          finalEmployeeCode = `${prefix}${String(newCount).padStart(4, '0')}`;
          
          // Increment counter
          await db.run("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)", [counterKey, String(newCount)]);
        }
        
        const now = new Date().toISOString();
        const finalPhone = phone || mobile_number || '';
        const finalMobile = mobile_number || phone || '';

        await db.run(`INSERT INTO employees (
          id, name, title, category, is_active, appointment_order_number, appointment_date, joining_date,
          photo_url, qualification, address, husband_name, fathers_name, mobile_number, phone, email,
          blood_group, pan_number, aadhar_number, pf_number, epf_uan_number, bank_name, account_number, ifsc_code,
          employee_code, department, designation, dob, weekly_off, service_duration, basic_salary, tenure_end_date, entity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, name, title || '', category || 'daily_wage', is_active !== undefined ? is_active : 1,
          appointment_order_number || '', appointment_date || null, joining_date || null,
          photo_url || '', qualification || '', address || '', husband_name || '', fathers_name || '', finalMobile, finalPhone, email || '',
          blood_group || '', pan_number || '', aadhar_number || '', pf_number || '', epf_uan_number || '', bank_name || '', account_number || '', ifsc_code || '',
          finalEmployeeCode, department || '', designation || '', dob || '', weekly_off || '', service_duration || '', basic_salary || '', tenure_end_date || '',
          targetEntity, now, now
        ]);

        // Audit: CREATE
        await logHistory(id, name, 'CREATE', null, null, null, { changedBy: session ? session.username : 'Admin' });
        
        // Also log initial weekly off in history (only if a real day is selected, skip 'None' or empty)
        const effectiveFrom = joining_date || new Date().toISOString().split('T')[0];
        const validWeeklyOff = weekly_off && weekly_off !== 'None' ? weekly_off : null;
        if (validWeeklyOff) {
          await db.run(
            `INSERT INTO employee_weekly_off_history (id, employee_id, weekly_off, effective_from)
             VALUES (?, ?, ?, ?)`,
            [uuidv4(), id, validWeeklyOff, effectiveFrom]
          );
        }

        // Queue in Delta Sync Engine
        await enqueueSync('employees', id, 'INSERT', {
          id, name, title, category, is_active, appointment_order_number, appointment_date, joining_date,
          photo_url, qualification, address, husband_name, fathers_name, mobile_number, phone, email,
          blood_group, pan_number, aadhar_number, pf_number, epf_uan_number, bank_name, account_number, ifsc_code,
          employee_code: finalEmployeeCode, department, designation, dob, weekly_off, service_duration, basic_salary, tenure_end_date,
          entity: targetEntity, created_at: now, updated_at: now
        }, targetEntity);
        
        return { id, employee_code: finalEmployeeCode, ...data };
      }

      // ── UPDATE ──
      if (action === 'update') {
        const { id, category_change_reason, ...updates } = data;
        
        // Get current employee state
        const current = await db.get('SELECT * FROM employees WHERE id = ?', [id]);
        if (!current) throw new Error('Employee not found');

        // Security check
        if (!canWrite(session, current.entity)) {
          await logAccessDenied(session, 'api:employees:update', current.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar edit karne ka adhikar nahi hai.');
        }

        // Category change validation
        if (updates.category && updates.category !== current.category) {
          if (current.category === 'permanent') {
            throw new Error('Permanent employee ki category change nahi ho sakti');
          }
        }

        if (updates.phone !== undefined && updates.mobile_number === undefined) updates.mobile_number = updates.phone;
        if (updates.mobile_number !== undefined && updates.phone === undefined) updates.phone = updates.mobile_number;

        // Build SET clause, track changes
        const setMap = [];
        const params = [];
        const changes = [];

        for (const [key, newVal] of Object.entries(updates)) {
          if (key === 'category_history' || key === 'oldCategory' || key === 'id' || key === 'entity') continue;
          const oldVal = current[key];
          const newStr = newVal != null ? String(newVal) : '';
          const oldStr = oldVal != null ? String(oldVal) : '';

          if (newStr !== oldStr) {
             setMap.push(`${key} = ?`);
             params.push(newVal);

             if (TRACKED_FIELDS.includes(key)) {
                changes.push({ field: key, oldVal: oldStr, newVal: newStr });
             }
          }
        }

        if (setMap.length > 0) {
          // Always update updated_at
          setMap.push('updated_at = ?');
          const updatedNow = new Date().toISOString();
          params.push(updatedNow);
          params.push(id);
          
          await db.run(`UPDATE employees SET ${setMap.join(', ')} WHERE id = ?`, params);

          // Log each field change
          for (const ch of changes) {
            const actionType = ch.field === 'category' ? 'CATEGORY_CHANGE' : 'UPDATE';
            const opts = { changedBy: session ? session.username : 'Admin' };
            if (ch.field === 'category') {
              opts.previousCategory = ch.oldVal;
              opts.newCategory = ch.newVal;
              opts.changeReason = category_change_reason || '';
            }
            await logHistory(id, current.name, actionType, ch.field, ch.oldVal, ch.newVal, opts);
            
            // Log weekly off changes in history table for dynamic historical auto-fill
            if (ch.field === 'weekly_off') {
              const effectiveFrom = new Date().toISOString().split('T')[0];
              const histWeeklyOff = ch.newVal && ch.newVal !== 'None' ? ch.newVal : null;
              if (histWeeklyOff) {
                await db.run(
                  `INSERT INTO employee_weekly_off_history (id, employee_id, weekly_off, effective_from)
                   VALUES (?, ?, ?, ?)`,
                  [uuidv4(), id, histWeeklyOff, effectiveFrom]
                );
              }
            }
          }

          // Also log into old category_history for backward compatibility
          if (updates.category && updates.category !== current.category) {
            await db.run(
              `INSERT INTO employee_category_history (id, employee_id, old_category, category) VALUES (?, ?, ?, ?)`,
              [uuidv4(), id, current.category, updates.category]
            );
          }

          // Queue in Delta Sync Engine
          await enqueueSync('employees', id, 'UPDATE', { id, ...updates, updated_at: updatedNow }, current.entity);
        }

        return await db.get('SELECT * FROM employees WHERE id = ?', [id]);
      }
      
      // ── DELETE (soft) ──
      if (action === 'delete') {
        const { id } = data;
        const emp = await db.get('SELECT * FROM employees WHERE id = ?', [id]);
        if (!emp) throw new Error('Employee not found');

        // Security check
        if (!canWrite(session, emp.entity)) {
          await logAccessDenied(session, 'api:employees:delete', emp.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar delete karne ka adhikar nahi hai.');
        }
        
        const deletedNow = new Date().toISOString();
        await db.run('UPDATE employees SET is_active = 0, updated_at = ? WHERE id = ?', [deletedNow, id]);
        await logHistory(id, emp.name, 'DELETE', 'is_active', '1', '0', { changedBy: session ? session.username : 'Admin' });
        
        // Queue in Delta Sync Engine
        await enqueueSync('employees', id, 'UPDATE', { id, is_active: 0, updated_at: deletedNow }, emp.entity);

        return { success: true };
      }

      // ── HARD DELETE (permanent, for import batch removal) ──
      if (action === 'hardDelete') {
        const { id } = data;
        const emp = await db.get('SELECT * FROM employees WHERE id = ?', [id]);
        if (!emp) return { success: true };

        if (!canWrite(session, emp.entity)) {
          await logAccessDenied(session, 'api:employees:hardDelete', emp.entity);
          throw new Error('ACCESS_DENIED');
        }

        await db.run('DELETE FROM employee_history WHERE employee_id = ?', [id]);
        await db.run('DELETE FROM employee_weekly_off_history WHERE employee_id = ?', [id]);
        await db.run('DELETE FROM tenure_renewals WHERE employee_id = ?', [id]);
        await db.run('DELETE FROM employees WHERE id = ?', [id]);
        await enqueueSync('employees', id, 'DELETE', { id }, emp.entity);

        return { success: true };
      }

      // ── BATCH RENAME (for name standardization) ──
      if (action === 'batchRename') {
        const { renames } = data; // [{ oldName, newName, field }]
        if (!Array.isArray(renames) || renames.length === 0) return { success: true, updated: 0 };

        let updated = 0;
        for (const { oldName, newName, field } of renames) {
          if (!oldName || !newName || oldName === newName) continue;
          const col = field === 'designation' ? 'designation' : 'department';
          const result = await db.run(`UPDATE employees SET ${col} = ?, updated_at = ? WHERE ${col} = ?`, [newName, new Date().toISOString(), oldName]);
          updated += result.changes || 0;
        }
        return { success: true, updated };
      }

      // ── BATCH RENAME MASTERS (departments/designations) ──
      if (action === 'batchRenameMasters') {
        const { renames } = data; // [{ oldName, newName, type: 'dept'|'desig' }]
        if (!Array.isArray(renames) || renames.length === 0) return { success: true, updated: 0 };

        let updated = 0;
        for (const { oldName, newName, type } of renames) {
          if (!oldName || !newName || oldName === newName) continue;
          const table = type === 'desig' ? 'designations' : 'departments';
          const existing = await db.get(`SELECT id FROM ${table} WHERE name = ?`, [newName]);
          if (existing) {
            // Target already exists — delete the old one
            await db.run(`DELETE FROM ${table} WHERE name = ?`, [oldName]);
          } else {
            // Rename: update the name
            await db.run(`UPDATE ${table} SET name = ? WHERE name = ?`, [newName, oldName]);
          }
          updated++;
        }
        return { success: true, updated };
      }

      // ── BATCH RENAME EMPLOYEE NAMES ──
      if (action === 'batchRenameNames') {
        const { renames } = data; // [{ oldName, newName }]
        if (!Array.isArray(renames) || renames.length === 0) return { success: true, updated: 0 };

        let updated = 0;
        for (const { oldName, newName } of renames) {
          if (!oldName || !newName || oldName === newName) continue;
          const result = await db.run('UPDATE employees SET name = ?, updated_at = ? WHERE name = ?', [newName, new Date().toISOString(), oldName]);
          updated += result.changes || 0;
        }
        return { success: true, updated };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── Employee History ───
  ipcMain.handle('api:employee-history', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);
      if (action === 'get') {
        const { employee_id, action_type, from_date, to_date, search, limit, offset } = data || {};
        
        const isSuper = session && session.role === 'ROLE_SUPER';
        let query = `
          SELECT h.* FROM employee_history h
          LEFT JOIN employees e ON h.employee_id = e.id
          WHERE (h.employee_id = 'SYSTEM' OR e.${filter} OR e.id IS NULL)
        `;
        
        if (!isSuper) {
          query += ` AND (h.employee_name != 'Sync Engine' AND h.changed_by != 'Sync Engine')`;
        }
        const params = [];

        if (employee_id) {
          query += ' AND h.employee_id = ?';
          params.push(employee_id);
        }
        if (action_type) {
          query += ' AND h.action_type = ?';
          params.push(action_type);
        }
        if (from_date) {
          query += ' AND h.changed_at >= ?';
          params.push(from_date);
        }
        if (to_date) {
          query += ' AND h.changed_at <= ?';
          params.push(to_date + 'T23:59:59');
        }
        if (search) {
          query += ' AND h.employee_name LIKE ?';
          params.push(`%${search}%`);
        }

        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
        const countResult = await db.get(countQuery, params);
        const total = countResult ? countResult.total : 0;

        query += ' ORDER BY h.changed_at DESC';
        query += ` LIMIT ${parseInt(limit) || 50} OFFSET ${parseInt(offset) || 0}`;

        const rows = await db.all(query, params);
        return { rows, total };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  async function logLetterAudit(db, letterId, action, performedBy, notes = '') {
    const { randomUUID: uuidv4 } = require('crypto');
    await db.run(
      `INSERT INTO letter_audit_log (id, letter_id, action, performed_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), letterId, action, performedBy || 'system', notes]
    );
  }

  // ─── Letters ───
  ipcMain.handle('api:letters', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { employee_id, include_cross_entity, status, priority, direction, department, confidential_level, is_notice_board, date_from, date_to, search } = data || {};
        
        let crossEntityClause = '';
        if (session.role === 'ROLE_BRANCH') {
          crossEntityClause = `OR (l.source_entity = 'BRANCH' AND l.target_entity = 'HO')`;
        } else if (session.role === 'ROLE_HO') {
          crossEntityClause = `OR (l.source_entity = 'HO' AND l.target_entity = 'BRANCH')`;
        }

        let query = `
          SELECT l.*, e.name as employee_name, 
                 (SELECT MAX(performed_at) FROM letter_audit_log WHERE letter_id = l.id) as last_activity,
                 (SELECT COUNT(*) FROM letter_acknowledgements WHERE letter_id = l.id AND acknowledged_at IS NOT NULL) as ack_count
          FROM letters l
          LEFT JOIN employees e ON l.employee_id = e.id
          WHERE (e.${filter} ${include_cross_entity ? crossEntityClause : ''})
        `;
        const params = [];

        if (employee_id) { query += ' AND l.employee_id = ?'; params.push(employee_id); }
        if (status) { query += ' AND l.status = ?'; params.push(status); }
        if (priority) { query += ' AND l.priority = ?'; params.push(priority); }
        if (direction) { query += ' AND l.direction = ?'; params.push(direction); }
        if (department) { query += ' AND l.department = ?'; params.push(department); }
        if (is_notice_board !== undefined) { query += ' AND l.is_notice_board = ?'; params.push(is_notice_board ? 1 : 0); }
        if (date_from) { query += ' AND l.dispatch_date >= ?'; params.push(date_from); }
        if (date_to) { query += ' AND l.dispatch_date <= ?'; params.push(date_to); }
        if (search) {
          query += ' AND (l.subject LIKE ? OR l.letter_number LIKE ? OR l.sender LIKE ? OR l.receiver LIKE ?)';
          const p = `%${search}%`; params.push(p, p, p, p);
        }

        if (session.role !== 'ROLE_SUPER') {
          query += ` AND (l.confidential_level = 'public' OR l.source_entity = '${session.entity === 'BRANCH' ? 'BRANCH' : 'HO'}')`;
        }
        if (confidential_level) {
          query += ' AND l.confidential_level = ?'; params.push(confidential_level);
        }

        query += ' ORDER BY l.dispatch_date DESC';
        const letters = await db.all(query, params);
        return letters.map(l => ({ ...l, employee: { name: l.employee_name } }));
      }
      
      if (action === 'getStats') {
        let crossEntityClause = '';
        if (session.role === 'ROLE_BRANCH') crossEntityClause = `OR (l.source_entity = 'BRANCH' AND l.target_entity = 'HO')`;
        else if (session.role === 'ROLE_HO') crossEntityClause = `OR (l.source_entity = 'HO' AND l.target_entity = 'BRANCH')`;
        
        let baseWhere = `WHERE (e.${filter} ${crossEntityClause})`;
        if (session.role !== 'ROLE_SUPER') {
          baseWhere += ` AND (l.confidential_level = 'public' OR l.source_entity = '${session.entity === 'BRANCH' ? 'BRANCH' : 'HO'}')`;
        }

        const today = new Date().toISOString().split('T')[0];

        const [total, pending, dispatched_today, received, confidential, notice_board] = await Promise.all([
          db.get(`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id ${baseWhere}`),
          db.get(`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id ${baseWhere} AND l.status IN ('dispatched','in_transit')`),
          db.get(`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id ${baseWhere} AND l.dispatch_date = ? AND l.status = 'dispatched'`, [today]),
          db.get(`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id ${baseWhere} AND (l.status = 'received' OR l.acknowledged = 1)`),
          db.get(`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id ${baseWhere} AND l.confidential_level != 'public'`),
          db.get(`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id ${baseWhere} AND l.is_notice_board = 1`)
        ]);

        return {
          total: total?.c || 0,
          pending: pending?.c || 0,
          dispatched_today: dispatched_today?.c || 0,
          received: received?.c || 0,
          confidential: confidential?.c || 0,
          notice_board: notice_board?.c || 0
        };
      }

      if (action === 'getAuditLog') {
        return await db.all(`SELECT * FROM letter_audit_log WHERE letter_id = ? ORDER BY performed_at DESC`, [data.letter_id]);
      }

      if (action === 'updateStatus') {
        const { id, status } = data;
        const letter = await db.get('SELECT * FROM letters WHERE id = ?', [id]);
        if (!letter) throw new Error('Letter not found');
        if (!canWrite(session, letter.source_entity)) {
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar status update karne ka adhikar nahi hai.');
        }
        await db.run('UPDATE letters SET status = ? WHERE id = ?', [status, id]);
        await logLetterAudit(db, id, 'STATUS_CHANGED:' + status, session.username);
        await enqueueSync('letters', id, 'UPDATE', { id, status }, letter.source_entity);
        return { success: true };
      }

      if (action === 'getNoticeBoard') {
        let query = `
          SELECT l.*, e.name as employee_name
          FROM letters l
          LEFT JOIN employees e ON l.employee_id = e.id
          WHERE l.is_notice_board = 1
            AND (l.notice_expiry_date IS NULL OR l.notice_expiry_date >= DATE('now'))
            AND (e.${filter} OR l.source_entity = 'BRANCH' AND l.target_entity = 'HO' OR l.source_entity = 'HO' AND l.target_entity = 'BRANCH')
        `;
        if (session.role !== 'ROLE_SUPER') {
          query += ` AND (l.confidential_level = 'public' OR l.source_entity = '${session.entity === 'BRANCH' ? 'BRANCH' : 'HO'}')`;
        }
        query += ` ORDER BY l.notice_pinned DESC, l.dispatch_date DESC`;
        const letters = await db.all(query);
        return letters.map(l => ({ ...l, employee: { name: l.employee_name } }));
      }

      if (action === 'saveFile') {
        const { id: letterId, file_data, file_name, mime_type } = data;
        const { app } = require('electron');
        const path = require('path');
        const fs = require('fs');

        // STEP A — Save locally first
        const lettersDir = path.join(app.getPath('userData'), 'letters');
        if (!fs.existsSync(lettersDir)) fs.mkdirSync(lettersDir, { recursive: true });

        const buffer = Buffer.from(file_data, 'base64');
        const safeName = `${letterId}_${Date.now()}_${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const localPath = path.join(lettersDir, safeName);
        fs.writeFileSync(localPath, buffer);

        // STEP B — Update DB with local path immediately
        await db.run(
          'UPDATE letters SET file_local_path = ?, file_name = ? WHERE id = ?',
          [localPath, file_name, letterId]
        );

        // STEP C — Attempt Supabase Storage upload
        let supabaseUrl = null;
        try {
          const supabaseUrlRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_url'");
          const supabaseKeyRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_anon_key'");

          if (supabaseUrlRow && supabaseKeyRow) {
            const SUPABASE_URL = supabaseUrlRow.value;
            const SUPABASE_KEY = supabaseKeyRow.value;
            const BUCKET = 'letter-files';
            
            const fetch = require('node-fetch');
            const uploadPath = `letters/${letterId}/${safeName}`;

            const uploadRes = await fetch(
              `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${uploadPath}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': mime_type || 'application/octet-stream',
                  'x-upsert': 'true'
                },
                body: buffer
              }
            );

            if (uploadRes.ok) {
              supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uploadPath}`;
              await db.run('UPDATE letters SET file_url = ? WHERE id = ?', [supabaseUrl, letterId]);
            } else {
              console.warn('[DOLMS] Supabase file upload failed, local fallback active');
            }
          }
        } catch (uploadErr) {
          console.warn('[DOLMS] Supabase upload error (non-fatal):', uploadErr.message);
        }

        await logLetterAudit(
          db, letterId, 'FILE_ATTACHED', session.username,
          `${file_name} | local: ${localPath} | cloud: ${supabaseUrl || 'pending'}`
        );

        await enqueueSync('letters', letterId, 'UPDATE', {
          id: letterId,
          file_url: supabaseUrl,
          file_local_path: localPath,
          file_name
        }, session.entity);

        return {
          success: true,
          file_local_path: localPath,
          file_url: supabaseUrl,
          file_name,
          storage: supabaseUrl ? 'both' : 'local_only'
        };
      }

      if (action === 'readFile') {
        const { file_url, file_local_path } = data;
        const fs = require('fs');
        const path = require('path');

        if (file_local_path && fs.existsSync(file_local_path)) {
          const buffer = fs.readFileSync(file_local_path);
          return { file_data: buffer.toString('base64'), source: 'local' };
        }

        if (file_url) {
          try {
            const fetch = require('node-fetch');
            const res = await fetch(file_url);
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);
              
              if (file_local_path) {
                const dir = path.dirname(file_local_path);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(file_local_path, buffer);
              }
              
              return { file_data: buffer.toString('base64'), source: 'supabase' };
            }
          } catch (fetchErr) {
            console.warn('[DOLMS] Supabase file fetch failed:', fetchErr.message);
          }
        }

        throw new Error('File not found — local path missing and Supabase unavailable');
      }

      if (action === 'retryPendingUploads') {
        const pendingFiles = await db.all(
          `SELECT id, file_local_path, file_name FROM letters
           WHERE file_local_path IS NOT NULL
           AND (file_url IS NULL OR file_url = '')
           AND file_local_path != ''`
        );

        let retried = 0;
        for (const letter of pendingFiles) {
          try {
            const fs = require('fs');
            if (!fs.existsSync(letter.file_local_path)) continue;
            const buffer = fs.readFileSync(letter.file_local_path);
            
            const supabaseUrlRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_url'");
            const supabaseKeyRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_anon_key'");

            if (supabaseUrlRow && supabaseKeyRow) {
              const SUPABASE_URL = supabaseUrlRow.value;
              const SUPABASE_KEY = supabaseKeyRow.value;
              const BUCKET = 'letter-files';
              const fetch = require('node-fetch');
              
              const safeName = `${letter.id}_${Date.now()}_${letter.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
              const uploadPath = `letters/${letter.id}/${safeName}`;

              const uploadRes = await fetch(
                `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${uploadPath}`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/octet-stream',
                    'x-upsert': 'true'
                  },
                  body: buffer
                }
              );

              if (uploadRes.ok) {
                const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${uploadPath}`;
                await db.run('UPDATE letters SET file_url = ? WHERE id = ?', [supabaseUrl, letter.id]);
                await enqueueSync('letters', letter.id, 'UPDATE', { id: letter.id, file_url: supabaseUrl }, session.entity);
                retried++;
              }
            }
          } catch(e) {
            console.warn(`[DOLMS] Retry upload failed for letter ${letter.id}:`, e.message);
          }
        }
        return { success: true, retried };
      }
      
      if (action === 'create') {
        const { employee_id, subject, content, dispatch_date, file_url, letter_type, office, sender, receiver, received_date, remarks, target_entity,
                status = 'dispatched', priority = 'normal', department, confidential_level = 'public', is_notice_board = 0, notice_expiry_date, notice_pinned = 0, file_name, uploaded_by, assigned_to_employee_id } = data;
        const emp = await db.get('SELECT entity FROM employees WHERE id = ?', [employee_id]);
        if (!emp) throw new Error('Employee not found');

        if (!canWrite(session, emp.entity)) {
          await logAccessDenied(session, 'api:letters:create', emp.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar letter create karne ka adhikar nahi hai.');
        }

        const { randomUUID: uuidv4 } = require('crypto');
        const id = uuidv4();
        const sourceEntity = emp.entity;
        const finalTargetEntity = target_entity || (sourceEntity === 'BRANCH' ? 'HO' : 'BRANCH');
        
        let finalLetterNumber = data.letter_number;
        if (!finalLetterNumber) {
          const countRes = await db.get('SELECT COUNT(*) as c FROM letters WHERE source_entity = ?', [sourceEntity]);
          const count = (countRes?.c || 0) + 1;
          const prefix = sourceEntity === 'HO' ? 'JO' : 'MAH';
          finalLetterNumber = `${prefix}/${new Date().getFullYear()}/${String(count).padStart(4, '0')}`;
        }

        let finalDirection = data.direction;
        if (!finalDirection) {
          if (sourceEntity === 'BRANCH' && finalTargetEntity === 'HO') finalDirection = 'branch_to_ho';
          else if (sourceEntity === 'HO' && finalTargetEntity === 'BRANCH') finalDirection = 'ho_to_branch';
          else finalDirection = 'internal_' + sourceEntity.toLowerCase();
        }

        await db.run(
          `INSERT INTO letters (id, employee_id, subject, content, letter_number, dispatch_date, file_url, letter_type, office, sender, receiver, received_date, remarks, source_entity, target_entity, acknowledged,
            status, priority, direction, department, confidential_level, is_notice_board, notice_expiry_date, notice_pinned, file_name, uploaded_by, assigned_to_employee_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, employee_id, subject, content, finalLetterNumber, dispatch_date, file_url, letter_type, office, sender, receiver, received_date, remarks, sourceEntity, finalTargetEntity,
           status, priority, finalDirection, department, confidential_level, is_notice_board ? 1 : 0, notice_expiry_date, notice_pinned ? 1 : 0, file_name, uploaded_by, assigned_to_employee_id]
        );

        await logLetterAudit(db, id, 'CREATED', session.username);

        const fullData = { id, ...data, letter_number: finalLetterNumber, direction: finalDirection, source_entity: sourceEntity, target_entity: finalTargetEntity, acknowledged: 0 };
        await enqueueSync('letters', id, 'INSERT', fullData, emp.entity);

        return fullData;
      }
      
      if (action === 'update') {
        const { id, employee_id, subject, content, letter_number, dispatch_date, file_url, letter_type, office, sender, receiver, received_date, remarks,
                status, priority, direction, department, confidential_level, is_notice_board, notice_expiry_date, notice_pinned, file_name, uploaded_by, assigned_to_employee_id } = data;
        const emp = await db.get('SELECT entity FROM employees WHERE id = ?', [employee_id]);
        if (!emp) throw new Error('Employee not found');

        if (!canWrite(session, emp.entity)) {
          await logAccessDenied(session, 'api:letters:update', emp.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar letter edit karne ka adhikar nahi hai.');
        }

        await db.run(
          `UPDATE letters SET employee_id=?, subject=?, content=?, letter_number=?, dispatch_date=?, file_url=?, letter_type=?, office=?, sender=?, receiver=?, received_date=?, remarks=?,
           status=?, priority=?, direction=?, department=?, confidential_level=?, is_notice_board=?, notice_expiry_date=?, notice_pinned=?, file_name=?, uploaded_by=?, assigned_to_employee_id=? WHERE id=?`,
          [employee_id, subject, content, letter_number, dispatch_date, file_url, letter_type, office, sender, receiver, received_date, remarks,
           status, priority, direction, department, confidential_level, is_notice_board ? 1 : 0, notice_expiry_date, notice_pinned ? 1 : 0, file_name, uploaded_by, assigned_to_employee_id, id]
        );

        await logLetterAudit(db, id, 'UPDATED', session.username);
        await enqueueSync('letters', id, 'UPDATE', { id, ...data }, emp.entity);

        return { id, ...data };
      }
      
      if (action === 'delete') {
        const letter = await db.get(`
          SELECT l.*, e.entity FROM letters l
          LEFT JOIN employees e ON l.employee_id = e.id
          WHERE l.id = ?
        `, [data.id]);
        if (!letter) throw new Error('Letter not found');

        if (!canWrite(session, letter.entity)) {
          await logAccessDenied(session, 'api:letters:delete', letter.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar letter delete karne ka adhikar nahi hai.');
        }

        await db.run(`DELETE FROM letters WHERE id=?`, [data.id]);

        await enqueueSync('letters', data.id, 'DELETE', { id: data.id }, letter.entity);

        return { success: true };
      }

      if (action === 'acknowledge') {
        const { id } = data;
        const letter = await db.get('SELECT * FROM letters WHERE id = ?', [id]);
        if (!letter) throw new Error('Letter not found');

        const canAcknowledge = (session.role === 'ROLE_HO' && letter.target_entity === 'HO') ||
                               (session.role === 'ROLE_BRANCH' && letter.target_entity === 'BRANCH') ||
                               session.role === 'ROLE_SUPER';
        if (!canAcknowledge) {
          throw new Error('ACCESS_DENIED: You cannot acknowledge this letter.');
        }

        const acknowledgedAt = new Date().toISOString();
        await db.run(
          `UPDATE letters SET acknowledged = 1, acknowledged_at = ?, acknowledged_by = ? WHERE id = ?`,
          [acknowledgedAt, session.username, id]
        );

        await logLetterAudit(db, id, 'ACKNOWLEDGED', session.username);
        await enqueueSync('letters', id, 'UPDATE', { id, acknowledged: 1, acknowledged_at: acknowledgedAt, acknowledged_by: session.username }, letter.source_entity);

        return { success: true, acknowledged_at: acknowledgedAt };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  async function validateAndUpdateLeaveBalance(db, employee_id, date, newStatus, oldStatus) {
    const year = new Date(date).getFullYear();
    
    // Get or create leave balance record
    let balance = await db.get(
      `SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?`,
      [employee_id, year]
    );
    
    if (!balance) {
      await db.run(
        `INSERT INTO leave_balances (id, employee_id, year, cl_total, pl_total, used_cl, used_pl)
         VALUES (lower(hex(randomblob(16))), ?, ?, 12, 15, 0, 0)`,
        [employee_id, year]
      );
      balance = { cl_total: 12, pl_total: 15, used_cl: 0, used_pl: 0 };
    }
    
    // Calculate deduction delta
    const getDeduction = (status) => {
      if (status === 'CL') return { type: 'cl', value: 1 };
      if (status === 'HCL') return { type: 'cl', value: 0.5 };
      if (status === 'PL') return { type: 'pl', value: 1 };
      return null;
    };
    
    const oldDeduction = getDeduction(oldStatus);
    const newDeduction = getDeduction(newStatus);
    
    // Reverse old deduction if applicable
    if (oldDeduction) {
      if (oldDeduction.type === 'cl') {
        balance.used_cl = Math.max(0, balance.used_cl - oldDeduction.value);
      } else {
        balance.used_pl = Math.max(0, balance.used_pl - oldDeduction.value);
      }
    }
    
    // Validate new deduction
    if (newDeduction) {
      const remaining = newDeduction.type === 'cl'
        ? (balance.cl_total - balance.used_cl)
        : (balance.pl_total - balance.used_pl);
      
      if (remaining < newDeduction.value) {
        const typeLabel = newDeduction.type === 'cl' ? 'CL (Casual Leave)' : 'PL (Paid Leave)';
        throw new Error(
          `Insufficient ${typeLabel} balance. ` +
          `Available: ${remaining.toFixed(1)}, ` +
          `Required: ${newDeduction.value}. ` +
          `कृपया LWP उपयोग करें।`
        );
      }
      
      // Apply new deduction
      if (newDeduction.type === 'cl') {
        balance.used_cl += newDeduction.value;
      } else {
        balance.used_pl += newDeduction.value;
      }
    }
    
    // Update leave_balances
    await db.run(
      `UPDATE leave_balances SET used_cl = ?, used_pl = ?, updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = ? AND year = ?`,
      [balance.used_cl, balance.used_pl, employee_id, year]
    );
    
    // Sync leave_history
    if (newDeduction) {
      const leaveType = newDeduction.type === 'cl' ? 'CL' : 'PL';
      await db.run(
        `INSERT INTO leave_history (id, employee_id, leave_type, leave_date, leave_value)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)
         ON CONFLICT(employee_id, leave_date) DO UPDATE SET 
           leave_type = excluded.leave_type, leave_value = excluded.leave_value`,
        [employee_id, leaveType, date, newDeduction.value]
      );
    } else {
      await db.run(`DELETE FROM leave_history WHERE employee_id = ? AND leave_date = ?`, [employee_id, date]);
    }
    
    return { success: true, balance };
  }

  // ─── Attendance ───
  ipcMain.handle('api:attendance', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { date, month, year, employee_id, include_branch } = data || {};
        let effectiveFilter = filter;
        if (include_branch && session && session.role === 'ROLE_HO') {
          effectiveFilter = "entity IN ('HO', 'BRANCH')";
        }
        let res = [];
        if (date) {
          res = await db.all(`
            SELECT a.* FROM attendance a
            LEFT JOIN employees e ON a.employee_id = e.id
            WHERE a.date = ? AND e.${effectiveFilter}
          `, [date]);
        } else if (employee_id) {
          res = await db.all(`
            SELECT a.* FROM attendance a
            LEFT JOIN employees e ON a.employee_id = e.id
            WHERE a.employee_id = ? AND e.${effectiveFilter}
            ORDER BY a.date DESC
          `, [employee_id]);
        } else if (month && year) {
          const prefix = `${year}-${String(month).padStart(2, '0')}`;
          res = await db.all(`
            SELECT a.* FROM attendance a
            LEFT JOIN employees e ON a.employee_id = e.id
            WHERE a.date LIKE '${prefix}-%' AND e.${effectiveFilter}
          `);
        } else {
          res = await db.all(`
            SELECT a.* FROM attendance a
            LEFT JOIN employees e ON a.employee_id = e.id
            WHERE e.${effectiveFilter}
          `);
        }
        return res;
      }

      if (action === 'upsert') {
        const records = Array.isArray(data) ? data : [data];
        const errors = [];
        
        await db.run('SAVEPOINT sp_attendance_upsert');
        try {
          for (const record of records) {
            const { employee_id, date, status, remarks } = record;
            if (!employee_id || !date) continue;
            
            // Get employee entity and validate write permission
            const emp = await db.get('SELECT entity FROM employees WHERE id = ?', [employee_id]);
            if (!emp) continue;

            if (!canWrite(session, emp.entity)) {
              errors.push({
                employee_id,
                date,
                error: 'ACCESS_DENIED: Apne entity data scope ke bahar attendance edit karne ka adhikar nahi hai.'
              });
              continue;
            }

            // Get old status
            const old = await db.get(
              'SELECT status FROM attendance WHERE employee_id=? AND date=?',
              [employee_id, date]
            );
            const oldStatus = old?.status || null;
            const finalStatus = status?.toUpperCase().trim();
            
            if (!finalStatus) {
              await db.run(
                'DELETE FROM attendance WHERE employee_id=? AND date=?',
                [employee_id, date]
              );
              // Reverse any leave balance
              await validateAndUpdateLeaveBalance(
                db, employee_id, date, null, oldStatus
              );

              // Sync Queue Delete
              await enqueueSync('attendance', `${employee_id}_${date}`, 'DELETE', { employee_id, date }, emp.entity);
              continue;
            }
            
            // Validate leave balance
            try {
              await validateAndUpdateLeaveBalance(
                db, employee_id, date, finalStatus, oldStatus
              );
            } catch (balanceErr) {
              errors.push({
                employee_id,
                date,
                error: balanceErr.message
              });
              continue; // Skip this record, continue others
            }
            
            // UPSERT attendance
            await db.run(
              `INSERT INTO attendance (employee_id, date, status, remarks)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(employee_id, date) 
               DO UPDATE SET 
                 status = excluded.status,
                 remarks = excluded.remarks`,
              [employee_id, date, finalStatus, remarks || '']
            );

            // Sync Queue Insert/Update
            await enqueueSync('attendance', `${employee_id}_${date}`, 'INSERT', {
              employee_id, date, status: finalStatus, remarks: remarks || ''
            }, emp.entity);
          }
          
          await db.run('RELEASE SAVEPOINT sp_attendance_upsert');
          
          // Return with errors if any
          return { 
            success: true, 
            errors,  // Frontend shows these as warnings
            savedCount: records.length - errors.length
          };
          
        } catch (txErr) {
          await db.run('ROLLBACK TO SAVEPOINT sp_attendance_upsert');
          throw txErr;
        }
      }

      if (action === 'auto-fill-weekly-offs') {
        const { month, year, include_branch } = data || {};
        if (!month || !year) throw new Error('Month and year are required');
        
        let effectiveFilter = filter;
        if (include_branch && session && session.role === 'ROLE_HO') {
          effectiveFilter = "entity IN ('HO', 'BRANCH')";
        }
        
        const employees = await db.all(`SELECT id, weekly_off, entity FROM employees WHERE is_active = 1 AND ${effectiveFilter}`);
        
        // Determine all dates for this month
        const daysInMonth = new Date(year, month, 0).getDate();
        const fillResults = [];
        
        await db.run('SAVEPOINT sp_auto_fill_wo');
        try {
          for (const emp of employees) {
            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              // Find out if there's already an attendance record
              const existing = await db.get(
                'SELECT status FROM attendance WHERE employee_id = ? AND date = ?',
                [emp.id, dateStr]
              );
              
              // Only fill if there is no existing record (do not overwrite!)
              if (!existing) {
                // Determine day of the week
                const dateObj = new Date(dateStr);
                const dayName = dateObj.toLocaleString('en-US', { weekday: 'long' });
                const effectiveWeeklyOff = await getEffectiveWeeklyOff(emp.id, dateStr);
                
                if (dayName.toLowerCase() === effectiveWeeklyOff.toLowerCase()) {
                  // Insert WO (Weekly Off)
                  await db.run(
                    `INSERT INTO attendance (employee_id, date, status, remarks)
                     VALUES (?, ?, ?, ?)`,
                    [emp.id, dateStr, 'WO', 'Auto-filled Weekly Off']
                  );

                  await enqueueSync('attendance', `${emp.id}_${dateStr}`, 'INSERT', {
                    employee_id: emp.id, date: dateStr, status: 'WO', remarks: 'Auto-filled Weekly Off'
                  }, emp.entity);

                  fillResults.push({ employee_id: emp.id, date: dateStr, status: 'WO' });
                }
              }
            }
          }
          await db.run('RELEASE SAVEPOINT sp_auto_fill_wo');
        } catch (txErr) {
          await db.run('ROLLBACK TO SAVEPOINT sp_auto_fill_wo');
          throw txErr;
        }
        
        return { success: true, count: fillResults.length, records: fillResults };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── Resigned Employees ───
  ipcMain.handle('api:resigned', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { search, include_tenure_expired } = data || {};
        // BUG 2 FIX: alias resignation_date as resign_date for frontend compatibility
        let query = `SELECT *, resignation_date AS resign_date FROM resigned_employees WHERE ${filter}`;
        const params = [];
        if (search) {
          query += ' AND (name LIKE ? OR employee_code LIKE ? OR department LIKE ?)';
          const p = `%${search}%`;
          params.push(p, p, p);
        }
        query += ' ORDER BY resignation_date DESC';
        const resignedRows = await db.all(query, params);

        // If include_tenure_expired is true, also fetch active employees whose tenure_end_date is within 6 months
        if (include_tenure_expired) {
          const sixMonthsLater = new Date();
          sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
          const today = new Date().toISOString().split('T')[0];
          const sixMonthsStr = sixMonthsLater.toISOString().split('T')[0];

          const tenureExpired = await db.all(`
            SELECT id, name, title, employee_code, department, designation, category,
                   joining_date, ? AS resign_date, '' AS reason, '' AS remarks, tenure_end_date,
                   service_duration, dob, weekly_off, appointment_order_number,
                   appointment_date, photo_url, qualification, address, husband_name,
                   fathers_name, mobile_number, phone, email, blood_group, pan_number,
                   aadhar_number, pf_number, epf_uan_number, bank_name, account_number, ifsc_code
            FROM employees
            WHERE is_active = 1
              AND tenure_end_date IS NOT NULL
              AND tenure_end_date != ''
              AND tenure_end_date <= ?
              AND ${filter}
            ORDER BY tenure_end_date ASC
          `, ['Tenure Expiring Soon', sixMonthsStr]);

          return [...resignedRows, ...tenureExpired];
        }

        return resignedRows;
      }
      
      if (action === 'create') {
        const { employee_id, id: alt_id, reason, resign_date, resignation_date: alt_date } = data;
        const target_id = employee_id || alt_id;
        const target_date = resign_date || alt_date;

        const emp = await db.get('SELECT * FROM employees WHERE id = ?', [target_id]);
        if (emp) {
          if (!canWrite(session, emp.entity)) {
            await logAccessDenied(session, 'api:resigned:create', emp.entity);
            throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar resign karne ka adhikar nahi hai.');
          }

          const finalPhone = emp.phone || emp.mobile_number || '';
          const finalMobile = emp.mobile_number || emp.phone || '';

          await db.run(`
            INSERT INTO resigned_employees (
              id, name, title, employee_code, department, designation, category, 
              joining_date, resignation_date, service_duration, dob, weekly_off,
              appointment_order_number, appointment_date, photo_url, qualification, 
              address, husband_name, fathers_name, mobile_number, phone, email,
              blood_group, pan_number, aadhar_number, pf_number, epf_uan_number, 
              bank_name, account_number, ifsc_code, reason, tenure_end_date, entity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            emp.id, emp.name, emp.title, emp.employee_code, emp.department, emp.designation, emp.category,
            emp.joining_date, target_date, emp.service_duration, emp.dob, emp.weekly_off,
            emp.appointment_order_number, emp.appointment_date, emp.photo_url, emp.qualification,
            emp.address, emp.husband_name, emp.fathers_name, finalMobile, finalPhone, emp.email,
            emp.blood_group, emp.pan_number, emp.aadhar_number, emp.pf_number, emp.epf_uan_number,
            emp.bank_name, emp.account_number, emp.ifsc_code, reason, emp.tenure_end_date || '', emp.entity
          ]);
          
          // Soft-delete from employees
          const nowISO = new Date().toISOString();
          await db.run('UPDATE employees SET is_active = 0, updated_at = ? WHERE id = ?', [nowISO, target_id]);
          await logHistory(target_id, emp.name, 'STATUS_CHANGE', 'employment_status', 'active', 'resigned', { changeReason: reason, changedBy: session ? session.username : 'Admin' });

          // Queue Delta Syncs
          await enqueueSync('resigned_employees', target_id, 'INSERT', {
            id: target_id, name: emp.name, title: emp.title, employee_code: emp.employee_code, department: emp.department,
            designation: emp.designation, category: emp.category, joining_date: emp.joining_date, resignation_date: target_date,
            reason, tenure_end_date: emp.tenure_end_date, entity: emp.entity
          }, emp.entity);

          await enqueueSync('employees', target_id, 'UPDATE', { id: target_id, is_active: 0, updated_at: nowISO }, emp.entity);
        }
        return { success: true };
      }

      if (action === 'update') {
        const { id, tenure_end_date, reason, remarks } = data;
        const current = await db.get('SELECT entity FROM resigned_employees WHERE id = ?', [id]);
        if (!current) throw new Error('Resigned employee not found');

        if (!canWrite(session, current.entity)) {
          await logAccessDenied(session, 'api:resigned:update', current.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar resigned record edit karne ka adhikar nahi hai.');
        }

        await db.run(
          `UPDATE resigned_employees 
           SET tenure_end_date = ?, reason = ?, remarks = ? 
           WHERE id = ?`,
          [tenure_end_date, reason, remarks || '', id]
        );
        // Also update employees table if present
        await db.run('UPDATE employees SET tenure_end_date = ? WHERE id = ?', [tenure_end_date, id]);

        // Queue Sync
        await enqueueSync('resigned_employees', id, 'UPDATE', { id, tenure_end_date, reason, remarks }, current.entity);
        await enqueueSync('employees', id, 'UPDATE', { id, tenure_end_date }, current.entity);

        return { success: true };
      }

      if (action === 'delete') {
        const { id } = data;
        const current = await db.get('SELECT entity FROM resigned_employees WHERE id = ?', [id]);
        if (!current) throw new Error('Resigned employee not found');

        if (!canWrite(session, current.entity)) {
          await logAccessDenied(session, 'api:resigned:delete', current.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar delete/rehire karne ka adhikar nahi hai.');
        }

        const emp = await db.get('SELECT * FROM employees WHERE id = ?', [id]);
        if (emp) {
          const nowISO = new Date().toISOString();
          await db.run('UPDATE employees SET is_active = 1, updated_at = ? WHERE id = ?', [nowISO, id]);
          await db.run('DELETE FROM resigned_employees WHERE id = ?', [id]);
          await logHistory(id, emp.name, 'STATUS_CHANGE', 'employment_status', 'resigned', 'active', { changeReason: 'Employee rehired / बहाल किया गया', changedBy: session ? session.username : 'Admin' });

          // Queue Sync
          await enqueueSync('resigned_employees', id, 'DELETE', { id }, current.entity);
          await enqueueSync('employees', id, 'UPDATE', { id, is_active: 1, updated_at: nowISO }, current.entity);
        }
        return { success: true };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── PL Records ───
  ipcMain.handle('api:pl-records', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { employee_id, month_year } = data || {};
        if (employee_id && month_year) {
          return await db.get(`
            SELECT p.* FROM pl_records p
            LEFT JOIN employees e ON p.employee_id = e.id
            WHERE p.employee_id = ? AND p.month_year = ? AND e.${filter}
          `, [employee_id, month_year]);
        }
        if (employee_id) {
          return await db.all(`
            SELECT p.* FROM pl_records p
            LEFT JOIN employees e ON p.employee_id = e.id
            WHERE p.employee_id = ? AND e.${filter}
            ORDER BY p.month_year ASC
          `, [employee_id]);
        }
        return await db.all(`
          SELECT p.* FROM pl_records p
          LEFT JOIN employees e ON p.employee_id = e.id
          WHERE e.${filter}
          ORDER BY p.month_year ASC
        `);
      }

      if (action === 'upsert') {
        const { id, employee_id, month_year, opening_balance, added_pl, is_surrendered, surrender_year, surrender_letter_number, surrender_letter_date, closing_balance } = data;
        
        const emp = await db.get('SELECT entity FROM employees WHERE id = ?', [employee_id]);
        if (!emp) throw new Error('Employee not found');

        if (!canWrite(session, emp.entity)) {
          await logAccessDenied(session, 'api:pl-records:upsert', emp.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar PL record edit karne ka adhikar nahi hai.');
        }

        const recordId = id || uuidv4();
        await db.run(`
          INSERT INTO pl_records (
            id, employee_id, month_year, opening_balance, added_pl, is_surrendered, 
            surrender_year, surrender_letter_number, surrender_letter_date, closing_balance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(employee_id, month_year) DO UPDATE SET
            opening_balance=excluded.opening_balance,
            added_pl=excluded.added_pl,
            is_surrendered=excluded.is_surrendered,
            surrender_year=excluded.surrender_year,
            surrender_letter_number=excluded.surrender_letter_number,
            surrender_letter_date=excluded.surrender_letter_date,
            closing_balance=excluded.closing_balance,
            updated_at=CURRENT_TIMESTAMP
        `, [
          recordId, employee_id, month_year, opening_balance || 0, added_pl || 0, is_surrendered ? 1 : 0,
          surrender_year || null, surrender_letter_number || null, surrender_letter_date || null, closing_balance || 0
        ]);

        await enqueueSync('pl_records', recordId, 'INSERT', {
          id: recordId, employee_id, month_year, opening_balance, added_pl, is_surrendered,
          surrender_year, surrender_letter_number, surrender_letter_date, closing_balance
        }, emp.entity);

        return { id: recordId, ...data };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── Masters (Departments & Designations) ───
  ipcMain.handle('api:masters', async (event, action, data, session) => {
    try {
      if (action === 'get') {
        const departments = await db.all('SELECT * FROM departments ORDER BY name ASC');
        const designations = await db.all('SELECT * FROM designations ORDER BY name ASC');
        return { departments, designations };
      }
      
      // Super Admin is now allowed to mutate masters along with HO and Branch.
      if (action === 'create_department') {
        const id = uuidv4();
        await db.run('INSERT INTO departments (id, name) VALUES (?, ?)', [id, data.name]);
        return { id, name: data.name };
      }
      if (action === 'delete_department') {
        await db.run('DELETE FROM departments WHERE id = ?', [data.id]);
        return { success: true };
      }
      if (action === 'create_designation') {
        const id = uuidv4();
        await db.run('INSERT INTO designations (id, name) VALUES (?, ?)', [id, data.name]);
        return { id, name: data.name };
      }
      if (action === 'delete_designation') {
        await db.run('DELETE FROM designations WHERE id = ?', [data.id]);
        return { success: true };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── Tenure Renewals ───
  ipcMain.handle('api:tenure-renewals', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { employee_id } = data || {};
        if (!employee_id) return [];
        return await db.all(`
          SELECT t.* FROM tenure_renewals t
          LEFT JOIN employees e ON t.employee_id = e.id
          WHERE t.employee_id = ? AND e.${filter}
          ORDER BY t.created_at DESC
        `, [employee_id]);
      }
      if (action === 'create') {
        const id = uuidv4();
        const { employee_id, renewal_date, new_tenure_end_date, letter_number, letter_date, remarks } = data;
        
        const emp = await db.get('SELECT * FROM employees WHERE id = ?', [employee_id]);
        if (!emp) throw new Error('Employee not found');

        if (!canWrite(session, emp.entity)) {
          await logAccessDenied(session, 'api:tenure-renewals:create', emp.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar tenure renew karne ka adhikar nahi hai.');
        }
        
        await db.run('BEGIN TRANSACTION');
        try {
          await db.run(
            `INSERT INTO tenure_renewals (id, employee_id, renewal_date, new_tenure_end_date, letter_number, letter_date, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, employee_id, renewal_date || new Date().toISOString().split('T')[0], new_tenure_end_date, letter_number || '', letter_date || '', remarks || '']
          );
          
          const nowISO = new Date().toISOString();
          await db.run('UPDATE employees SET tenure_end_date = ?, updated_at = ? WHERE id = ?', [new_tenure_end_date, nowISO, employee_id]);
          
          // Log audit history
          await db.run(
            `INSERT INTO employee_history (history_id, employee_id, employee_name, action_type, field_name, old_value, new_value, change_reason, changed_by, changed_at)
             VALUES (?, ?, ?, 'TENURE_RENEWAL', 'tenure_end_date', ?, ?, ?, ?, ?)`,
            [uuidv4(), employee_id, emp.name, String(emp.tenure_end_date || ''), new_tenure_end_date, `Renewal Letter No: ${letter_number || 'N/A'}, Date: ${letter_date || 'N/A'}`, session ? session.username : 'Admin', nowISO]
          );
          
          await db.run('COMMIT');

          // Queue in delta sync engine
          await enqueueSync('tenure_renewals', id, 'INSERT', {
            id, employee_id, renewal_date, new_tenure_end_date, letter_number, letter_date, remarks
          }, emp.entity);

          await enqueueSync('employees', employee_id, 'UPDATE', { id: employee_id, tenure_end_date: new_tenure_end_date, updated_at: nowISO }, emp.entity);

        } catch (txErr) {
          await db.run('ROLLBACK');
          throw txErr;
        }
        return { id, ...data };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── Leave Balances ───
  ipcMain.handle('api:leave-balances', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { employee_id, year } = data || {};
        if (employee_id && year) {
          return await db.get(`
            SELECT lb.* FROM leave_balances lb
            LEFT JOIN employees e ON lb.employee_id = e.id
            WHERE lb.employee_id = ? AND lb.year = ? AND e.${filter}
          `, [employee_id, year]);
        }
        if (employee_id) {
          return await db.all(`
            SELECT lb.* FROM leave_balances lb
            LEFT JOIN employees e ON lb.employee_id = e.id
            WHERE lb.employee_id = ? AND e.${filter}
            ORDER BY lb.year DESC
          `, [employee_id]);
        }
        if (year) {
          return await db.all(`
            SELECT lb.*, e.name as employee_name, e.employee_code 
            FROM leave_balances lb JOIN employees e ON lb.employee_id = e.id 
            WHERE lb.year = ? AND e.${filter} ORDER BY e.name
          `, [year]);
        }
        return await db.all(`
          SELECT lb.* FROM leave_balances lb
          LEFT JOIN employees e ON lb.employee_id = e.id
          WHERE e.${filter}
          ORDER BY lb.year DESC
        `);
      }
      if (action === 'upsert') {
        const { employee_id, year, cl_total, pl_total, used_cl, used_pl } = data;
        const emp = await db.get('SELECT entity FROM employees WHERE id = ?', [employee_id]);
        if (!emp) throw new Error('Employee not found');

        if (!canWrite(session, emp.entity)) {
          await logAccessDenied(session, 'api:leave-balances:upsert', emp.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar leave balances edit karne ka adhikar nahi hai.');
        }

        await db.run(`INSERT INTO leave_balances (id, employee_id, year, cl_total, pl_total, used_cl, used_pl)
          VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)
          ON CONFLICT(employee_id, year) DO UPDATE SET 
          cl_total=COALESCE(excluded.cl_total, cl_total), 
          pl_total=COALESCE(excluded.pl_total, pl_total),
          used_cl=COALESCE(excluded.used_cl, used_cl), 
          used_pl=COALESCE(excluded.used_pl, used_pl),
          updated_at=CURRENT_TIMESTAMP`,
          [employee_id, year, cl_total || 12, pl_total || 15, used_cl || 0, used_pl || 0]);

        await enqueueSync('leave_balances', `${employee_id}_${year}`, 'INSERT', {
          employee_id, year, cl_total, pl_total, used_cl, used_pl
        }, emp.entity);

        return { success: true };
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── Payroll Summary ───
  ipcMain.handle('api:payroll-summary', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { employee_id, month, year } = data || {};
        if (employee_id && month && year) {
          return await db.get(`
            SELECT ps.* FROM payroll_summary ps
            LEFT JOIN employees e ON ps.employee_id = e.id
            WHERE ps.employee_id = ? AND ps.month = ? AND ps.year = ? AND e.${filter}
          `, [employee_id, month, year]);
        }
        if (month && year) {
          return await db.all(`
            SELECT ps.*, e.name as employee_name, e.employee_code
            FROM payroll_summary ps JOIN employees e ON ps.employee_id = e.id
            WHERE ps.month = ? AND ps.year = ? AND e.${filter} ORDER BY e.name
          `, [month, year]);
        }
        return [];
      }
    } catch (err) {
      console.error(err);
      throw new Error(err.message);
    }
  });

  // ─── App Users Management ───
  ipcMain.handle('api:users', async (event, action, data, session) => {
    try {
      if (!session) {
        throw new Error('ACCESS_DENIED: User session not found.');
      }

      if (action === 'get') {
        if (session.role === 'ROLE_SUPER') {
          return await db.all(`
            SELECT id, username, display_name, role, entity, is_active, last_login, created_at, updated_at 
            FROM app_users
          `);
        } else {
          const user = await db.get(`
            SELECT id, username, display_name, role, entity, is_active, last_login, created_at, updated_at 
            FROM app_users 
            WHERE username = ?
          `, [session.username]);
          return user ? [user] : [];
        }
      }

        if (action === 'create') {
        if (session.role !== 'ROLE_SUPER') {
          return { success: false, error: 'ACCESS_DENIED: Only Super Admin can create users.' };
        }

        const { username, display_name, password, role } = data || {};
        let { entity } = data || {};
        
        if (!username || !display_name || !password || !role) {
          return { success: false, error: 'All fields are required: username, display_name, password, role.' };
        }

        // Auto-assign entity based on role if not provided
        if (!entity) {
          if (role === 'ROLE_SUPER') entity = 'ALL';
          else if (role === 'ROLE_HO') entity = 'HO';
          else entity = 'BRANCH';
        }

        const strengthCheck = validatePasswordStrength(password);
        if (!strengthCheck.valid) {
          return { success: false, error: strengthCheck.error };
        }

        const existingUser = await db.get('SELECT id FROM app_users WHERE username = ?', [username]);
        if (existingUser) {
          return { success: false, error: 'Username already exists.' };
        }

        const validRoles = ['ROLE_BRANCH', 'ROLE_HO', 'ROLE_SUPER'];
        const validEntities = ['BRANCH', 'HO', 'ALL'];
        if (!validRoles.includes(role)) {
          return { success: false, error: 'Invalid role. Must be ROLE_BRANCH, ROLE_HO, or ROLE_SUPER.' };
        }
        if (!validEntities.includes(entity)) {
          return { success: false, error: 'Invalid entity. Must be BRANCH, HO, or ALL.' };
        }

        const hashedPassword = await hashPassword(password);
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.run(
          'INSERT INTO app_users (id, username, display_name, password, password_hash, role, entity, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
          [id, username, display_name, password, hashedPassword, role, entity, now, now]
        );

        await enqueueSync('app_users', id, 'INSERT', {
          id, username, display_name, role, entity, is_active: 1, created_at: now, updated_at: now
        }, entity);

        const newUser = await db.get(`
          SELECT id, username, display_name, role, entity, is_active, last_login, created_at, updated_at 
          FROM app_users WHERE id = ?
        `, [id]);

        return { success: true, user: newUser };
      }

      if (action === 'change-password') {
        const { target_username, old_password, new_password } = data || {};
        
        const strengthCheck = validatePasswordStrength(new_password);
        if (!strengthCheck.valid) {
          return { success: false, error: strengthCheck.error };
        }

        const isSuper = session.role === 'ROLE_SUPER';
        const isSelf = session.username.toLowerCase() === target_username.toLowerCase();

        if (!isSuper && !isSelf) {
          return { success: false, error: 'ACCESS_DENIED: You can only change your own password.' };
        }

        const user = await db.get('SELECT * FROM app_users WHERE username = ?', [target_username]);
        if (!user) {
          return { success: false, error: 'User not found.' };
        }

        if (!isSuper) {
          const { verifyPassword, isPasswordHashed } = require('./passwordUtils.cjs');
          let oldPasswordValid = false;
          if (user.password_hash && isPasswordHashed(user.password_hash)) {
            oldPasswordValid = await verifyPassword(old_password, user.password_hash);
          } else if (user.password) {
            if (isPasswordHashed(user.password)) {
              oldPasswordValid = await verifyPassword(old_password, user.password);
            } else {
              oldPasswordValid = (user.password === old_password);
            }
          }
          if (!oldPasswordValid) {
            return { success: false, error: 'Incorrect old password.' };
          }
        }

        const hashedPassword = await hashPassword(new_password);
        const updated_at = new Date().toISOString();
        await db.run('UPDATE app_users SET password_hash = ?, updated_at = ? WHERE username = ?', [hashedPassword, updated_at, target_username]);

        await logHistory(
          user.id,
          user.display_name,
          'UPDATE',
          'password',
          '***',
          '***',
          { changedBy: session.username, changeReason: 'Password changed' }
        );

        await enqueueSync('app_users', user.id, 'UPDATE', {
          username: target_username,
          updated_at
        }, user.entity);

        return { success: true };
      }

      if (action === 'update') {
        if (session.role !== 'ROLE_SUPER') {
          return { success: false, error: 'ACCESS_DENIED: Only Super Admin can update users.' };
        }

        const { id, display_name, is_active } = data || {};
        const user = await db.get('SELECT * FROM app_users WHERE id = ?', [id]);
        if (!user) {
          return { success: false, error: 'User not found.' };
        }

        const updated_at = new Date().toISOString();
        const finalActive = is_active !== undefined ? (is_active ? 1 : 0) : user.is_active;
        const finalDisplayName = display_name || user.display_name;

        await db.run(
          'UPDATE app_users SET display_name = ?, is_active = ?, updated_at = ? WHERE id = ?',
          [finalDisplayName, finalActive, updated_at, id]
        );

        await enqueueSync('app_users', id, 'UPDATE', {
          id,
          username: user.username,
          display_name: finalDisplayName,
          role: user.role,
          entity: user.entity,
          is_active: finalActive,
          updated_at
        }, user.entity);

        const updatedUser = await db.get(`
          SELECT id, username, display_name, role, entity, is_active, last_login, created_at, updated_at 
          FROM app_users WHERE id = ?
        `, [id]);

        return { success: true, user: updatedUser };
      }

      if (action === 'update-display-name') {
        const { new_display_name } = data || {};
        if (!new_display_name || !new_display_name.trim()) {
          return { success: false, error: 'Display name cannot be empty.' };
        }

        const user = await db.get('SELECT * FROM app_users WHERE username = ?', [session.username]);
        if (!user) {
          return { success: false, error: 'User not found.' };
        }

        const updated_at = new Date().toISOString();
        const finalDisplayName = new_display_name.trim();

        await db.run(
          'UPDATE app_users SET display_name = ?, updated_at = ? WHERE username = ?',
          [finalDisplayName, updated_at, session.username]
        );

        await enqueueSync('app_users', user.id, 'UPDATE', {
          id: user.id,
          username: user.username,
          display_name: finalDisplayName,
          role: user.role,
          entity: user.entity,
          is_active: user.is_active,
          updated_at
        }, user.entity);

        return { success: true, display_name: finalDisplayName };
      }

      return { success: false, error: 'Invalid action' };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  // ─── Page Permissions API ───
  ipcMain.handle('api:permissions', async (event, action, data, session) => {
    try {
      if (!session) {
        throw new Error('ACCESS_DENIED: User session not found.');
      }

      if (action === 'get') {
        // Super admin can see all permissions; others see their own
        if (session.role === 'ROLE_SUPER') {
          if (data && data.user_id) {
            return await db.all(
              'SELECT * FROM page_permissions WHERE user_id = ?',
              [data.user_id]
            );
          }
          const perms = await db.all(`
            SELECT pp.*, au.display_name, au.username, au.role
            FROM page_permissions pp
            LEFT JOIN app_users au ON pp.user_id = au.id
            ORDER BY au.display_name, pp.page_path
          `);
          // Group by user
          const grouped = {};
          for (const p of perms) {
            if (!grouped[p.user_id]) {
              grouped[p.user_id] = {
                user_id: p.user_id,
                display_name: p.display_name,
                username: p.username,
                role: p.role,
                permissions: []
              };
            }
            grouped[p.user_id].permissions.push({
              page_path: p.page_path,
              can_read: p.can_read,
              can_write: p.can_write,
              can_update: p.can_update
            });
          }
          return Object.values(grouped);
        } else {
          // Non-super: get own permissions
          const user = await db.get('SELECT id FROM app_users WHERE username = ?', [session.username]);
          if (!user) return [];
          return await db.all(
            'SELECT * FROM page_permissions WHERE user_id = ?',
            [user.id]
          );
        }
      }

      if (action === 'check') {
        const { page_path } = data || {};
        if (!page_path) return { can_read: true, can_write: false, can_update: false };

        if (session.role === 'ROLE_SUPER') {
          return { can_read: true, can_write: true, can_update: true };
        }

        const user = await db.get('SELECT id FROM app_users WHERE username = ?', [session.username]);
        if (!user) return { can_read: false, can_write: false, can_update: false };

        const perm = await db.get(
          'SELECT can_read, can_write, can_update FROM page_permissions WHERE user_id = ? AND page_path = ?',
          [user.id, page_path]
        );

        if (perm) {
          return {
            can_read: perm.can_read === 1,
            can_write: perm.can_write === 1,
            can_update: perm.can_update === 1
          };
        } else {
          // Default if no explicit permissions exist: Read allowed, Write/Update denied
          return { can_read: true, can_write: false, can_update: false };
        }
      }

      if (action === 'set') {
        if (session.role !== 'ROLE_SUPER') {
          return { success: false, error: 'ACCESS_DENIED: Only Super Admin can set permissions.' };
        }

        const { user_id, permissions } = data || {};
        if (!user_id || !Array.isArray(permissions)) {
          return { success: false, error: 'user_id and permissions array required.' };
        }

        const now = new Date().toISOString();
        // Upsert each permission
        for (const perm of permissions) {
          const { page_path, can_read, can_write, can_update } = perm;
          if (!page_path) continue;

          await db.run(`
            INSERT INTO page_permissions (user_id, page_path, can_read, can_write, can_update, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, page_path) DO UPDATE SET
              can_read = excluded.can_read,
              can_write = excluded.can_write,
              can_update = excluded.can_update,
              updated_by = excluded.updated_by,
              updated_at = excluded.updated_at
          `, [user_id, page_path, can_read ? 1 : 0, can_write ? 1 : 0, can_update ? 1 : 0, session.username, now]);
        }

        return { success: true };
      }

      if (action === 'check') {
        const { page_path } = data || {};
        if (!page_path) {
          return { can_read: true, can_write: false, can_update: false };
        }
        
        // Super Admin gets full access to everything
        if (session.role === 'ROLE_SUPER') {
          return { can_read: true, can_write: true, can_update: true };
        }

        const user = await db.get('SELECT id FROM app_users WHERE username = ?', [session.username]);
        if (!user) {
          return { can_read: true, can_write: false, can_update: false };
        }

        // Check if any permissions exist for this user
        const permCount = await db.get(
          'SELECT COUNT(*) as count FROM page_permissions WHERE user_id = ?',
          [user.id]
        );

        if (permCount && permCount.count === 0) {
          // No permissions set yet - allow all (backward compatible)
          return { can_read: true, can_write: true, can_update: true };
        }

        const perm = await db.get(
          'SELECT can_read, can_write, can_update FROM page_permissions WHERE user_id = ? AND page_path = ?',
          [user.id, page_path]
        );

        if (!perm) {
          // No specific permission for this page - deny access
          return { can_read: false, can_write: false, can_update: false };
        }

        return {
          can_read: perm.can_read === 1,
          can_write: perm.can_write === 1,
          can_update: perm.can_update === 1
        };
      }

      return { success: false, error: 'Invalid action' };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  // ─── App Update Engine ───
  ipcMain.handle('api:update:list', async () => {
    try {
      const updates = await db.all(
        `SELECT * FROM app_updates ORDER BY created_at DESC`
      );
      return { success: true, updates };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message, updates: [] };
    }
  });

  ipcMain.handle('api:update:check', async (event, session) => {
    try {
      const results = { local: false, supabase: false, updates: [] };

      // Check local DB for available updates
      const localUpdates = await db.all(
        `SELECT * FROM app_updates WHERE status = 'available' ORDER BY created_at DESC`
      );
      if (localUpdates.length > 0) {
        results.local = true;
        results.updates.push(...localUpdates.map(u => ({ ...u, source: 'local' })));
      }

      // Check Supabase for available updates
      try {
        const supabaseUrlRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_url'");
        const supabaseKeyRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_anon_key'");
        if (supabaseUrlRow && supabaseKeyRow) {
          const { createClient } = require('@supabase/supabase-js');
          const supabase = createClient(supabaseUrlRow.value, supabaseKeyRow.value, { auth: { persistSession: false } });
          const { data: remoteUpdates, error } = await supabase
            .from('app_updates')
            .select('*')
            .eq('status', 'available')
            .order('created_at', { ascending: false });

          if (!error && remoteUpdates && remoteUpdates.length > 0) {
            results.supabase = true;
            const existingVersions = new Set(results.updates.map(u => u.version));
            for (const ru of remoteUpdates) {
              if (!existingVersions.has(ru.version)) {
                results.updates.push({ ...ru, source: 'supabase', id: ru.id || `supabase_${ru.version}` });
              }
            }
          }
        }
      } catch (supaErr) {
        console.warn('[Update] Supabase check failed:', supaErr.message);
      }

      return { success: true, ...results };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message, local: false, supabase: false, updates: [] };
    }
  });

  ipcMain.handle('api:update:scan-pendrive', async (event, drivePath) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const found = [];

      if (!fs.existsSync(drivePath)) {
        return { success: false, error: 'Path not found', updates: [] };
      }

      const entries = fs.readdirSync(drivePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name === '.hrms-update.json') {
          const manifestPath = path.join(drivePath, entry.name);
          try {
            const raw = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(raw);
            manifest.source = 'pendrive';
            manifest.file_path = drivePath;
            found.push(manifest);
          } catch (parseErr) {
            console.warn('[Update] Invalid manifest:', manifestPath, parseErr.message);
          }
        }
      }

      return { success: true, updates: found };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message, updates: [] };
    }
  });

  ipcMain.handle('api:update:register', async (event, updateData) => {
    try {
      const { version, title, description, source, file_path, file_url, file_size, checksum, module_scope } = updateData;
      const id = uuidv4();

      const existing = await db.get('SELECT id FROM app_updates WHERE version = ?', [version]);
      if (existing) {
        return { success: false, error: `Update version ${version} already exists.` };
      }

      await db.run(
        `INSERT INTO app_updates (id, version, title, description, source, file_path, file_url, file_size, checksum, module_scope, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
        [id, version, title || version, description || '', source || 'local', file_path || null, file_url || null, file_size || 0, checksum || '', module_scope || 'all']
      );

      const newUpdate = await db.get('SELECT * FROM app_updates WHERE id = ?', [id]);
      return { success: true, update: newUpdate };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update:install', async (event, updateId) => {
    try {
      const fs = require('fs');
      const path = require('path');

      const update = await db.get('SELECT * FROM app_updates WHERE id = ?', [updateId]);
      if (!update) {
        return { success: false, error: 'Update not found' };
      }

      await db.run('UPDATE app_updates SET status = ? WHERE id = ?', ['installing', updateId]);

      // Determine source files
      let sourcePath = null;
      if (update.source === 'pendrive' || update.source === 'local') {
        sourcePath = update.file_path;
      } else if (update.source === 'supabase' && update.file_url) {
        // Download from Supabase
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrlRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_url'");
        const supabaseKeyRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_anon_key'");
        if (supabaseUrlRow && supabaseKeyRow) {
          const supabase = createClient(supabaseUrlRow.value, supabaseKeyRow.value, { auth: { persistSession: false } });
          const { data, error } = await supabase.storage.from('app-updates').download(update.file_url);
          if (!error && data) {
            const { app } = require('electron');
            const updatesDir = path.join(app.getPath('userData'), 'updates');
            if (!fs.existsSync(updatesDir)) fs.mkdirSync(updatesDir, { recursive: true });
            const destPath = path.join(updatesDir, `update_${update.version}_${Date.now()}.zip`);
            const buffer = Buffer.from(await data.arrayBuffer());
            fs.writeFileSync(destPath, buffer);
            sourcePath = destPath;
          }
        }
      }

      // Apply update - copy update files
      if (sourcePath && fs.existsSync(sourcePath)) {
        const { app } = require('electron');
        const resourceDir = path.dirname(app.getPath('exe'));

        // Check for update package structure
        const updatePackagePath = path.join(sourcePath, 'update_package.json');
        if (fs.existsSync(updatePackagePath)) {
          const pkg = JSON.parse(fs.readFileSync(updatePackagePath, 'utf-8'));
          if (pkg.files && Array.isArray(pkg.files)) {
            for (const fileEntry of pkg.files) {
              const srcFile = path.join(sourcePath, fileEntry.source);
              const destFile = path.join(resourceDir, fileEntry.dest);
              const destDir = path.dirname(destFile);
              if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
              if (fs.existsSync(srcFile)) {
                fs.copyFileSync(srcFile, destFile);
              }
            }
          }
        }

        await db.run('UPDATE app_updates SET status = ?, installed_at = ? WHERE id = ?',
          ['installed', new Date().toISOString(), updateId]);

        return { success: true, message: `Update ${update.version} installed successfully.` };
      }

      // If no files to copy, just mark as installed (e.g., for data-only updates)
      await db.run('UPDATE app_updates SET status = ?, installed_at = ? WHERE id = ?',
        ['installed', new Date().toISOString(), updateId]);

      return { success: true, message: `Update ${update.version} registered as installed.` };
    } catch (err) {
      console.error(err);
      await db.run('UPDATE app_updates SET status = ? WHERE id = ?', ['failed', updateId]).catch(() => {});
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('api:update:sync-from-supabase', async () => {
    try {
      const supabaseUrlRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_url'");
      const supabaseKeyRow = await db.get("SELECT value FROM system_config WHERE key = 'supabase_anon_key'");
      if (!supabaseUrlRow || !supabaseKeyRow) {
        return { success: false, error: 'Supabase not configured', count: 0 };
      }

      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrlRow.value, supabaseKeyRow.value, { auth: { persistSession: false } });
      const { data: remoteUpdates, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('status', 'available');

      if (error) {
        return { success: false, error: error.message, count: 0 };
      }

      let synced = 0;
      if (remoteUpdates) {
        for (const ru of remoteUpdates) {
          const existing = await db.get('SELECT id FROM app_updates WHERE version = ?', [ru.version]);
          if (!existing) {
            await db.run(
              `INSERT INTO app_updates (id, version, title, description, source, file_url, file_size, checksum, module_scope, status)
               VALUES (?, ?, ?, ?, 'supabase', ?, ?, ?, ?, 'available')`,
              [ru.id || uuidv4(), ru.version, ru.title || ru.version, ru.description || '', ru.file_url || '', ru.file_size || 0, ru.checksum || '', ru.module_scope || 'all']
            );
            synced++;
          }
        }
      }

      return { success: true, count: synced };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message, count: 0 };
    }
  });

  // ─── Danger Zone: Nuke Database ───
  ipcMain.handle('api:nuke-database', async (event, session) => {
    try {
      if (!session || session.role !== 'ROLE_SUPER') {
        throw new Error('ACCESS_DENIED: Only Super Admin can nuke the database.');
      }
      
      const tablesToClear = [
        'page_permissions', 'attendance', 'letters', 'pl_records', 'leave_history', 'leave_balances', 'payroll_summary',
        'employee_history', 'employee_category_history', 'employee_weekly_off_history', 'tenure_renewals',
        'letter_audit_log', 'letter_acknowledgements',
        'employees', 'resigned_employees', 'departments', 'designations', 'sync_queue'
      ];
      
      for (const table of tablesToClear) {
        await db.run(`DELETE FROM ${table}`);
      }
      
      const { nukeSupabase } = require('./syncEngine.cjs');
      await nukeSupabase(db);
      
      return { success: true };
    } catch (err) {
      console.error('Nuke Database Error:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = registerApiHandlers;

