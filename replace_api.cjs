const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'electron/api.cjs');
let api = fs.readFileSync(targetPath, 'utf-8');

const helper = `  async function logLetterAudit(db, letterId, action, performedBy, notes = '') {
    const { randomUUID: uuidv4 } = require('crypto');
    await db.run(
      \`INSERT INTO letter_audit_log (id, letter_id, action, performed_by, notes)
       VALUES (?, ?, ?, ?, ?)\`,
      [uuidv4(), letterId, action, performedBy || 'system', notes]
    );
  }

  // ─── Letters ───`;

api = api.replace('  // ─── Letters ───', helper);

const oldLettersHandlerStart = `  ipcMain.handle('api:letters', async (event, action, data, session) => {`;
const startIdx = api.indexOf(oldLettersHandlerStart);

// Find the matching end brace for this handler
let braceCount = 0;
let endIdx = -1;
let i = startIdx;
while (i < api.length) {
    if (api[i] === '{') braceCount++;
    else if (api[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            endIdx = i;
            break;
        }
    }
    i++;
}

// Ensure we capture the `});`
const oldLettersHandler = api.substring(startIdx, endIdx + 3);

const newLettersHandler = `  ipcMain.handle('api:letters', async (event, action, data, session) => {
    try {
      const filter = getEntityFilter(session);

      if (action === 'get') {
        const { employee_id, include_cross_entity, status, priority, direction, department, confidential_level, is_notice_board, date_from, date_to, search } = data || {};
        
        let crossEntityClause = '';
        if (session.role === 'ROLE_BRANCH') {
          crossEntityClause = \`OR (l.source_entity = 'BRANCH' AND l.target_entity = 'HO')\`;
        } else if (session.role === 'ROLE_HO') {
          crossEntityClause = \`OR (l.source_entity = 'HO' AND l.target_entity = 'BRANCH')\`;
        }

        let query = \`
          SELECT l.*, e.name as employee_name, 
                 (SELECT MAX(performed_at) FROM letter_audit_log WHERE letter_id = l.id) as last_activity,
                 (SELECT COUNT(*) FROM letter_acknowledgements WHERE letter_id = l.id AND acknowledged_at IS NOT NULL) as ack_count
          FROM letters l
          LEFT JOIN employees e ON l.employee_id = e.id
          WHERE (e.\${filter} \${include_cross_entity ? crossEntityClause : ''})
        \`;
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
          const p = \`%\${search}%\`; params.push(p, p, p, p);
        }

        if (session.role !== 'ROLE_SUPER') {
          query += \` AND (l.confidential_level = 'public' OR l.source_entity = '\${session.entity === 'BRANCH' ? 'BRANCH' : 'HO'}')\`;
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
        if (session.role === 'ROLE_BRANCH') crossEntityClause = \`OR (l.source_entity = 'BRANCH' AND l.target_entity = 'HO')\`;
        else if (session.role === 'ROLE_HO') crossEntityClause = \`OR (l.source_entity = 'HO' AND l.target_entity = 'BRANCH')\`;
        
        let baseWhere = \`WHERE (e.\${filter} \${crossEntityClause})\`;
        if (session.role !== 'ROLE_SUPER') {
          baseWhere += \` AND (l.confidential_level = 'public' OR l.source_entity = '\${session.entity === 'BRANCH' ? 'BRANCH' : 'HO'}')\`;
        }

        const today = new Date().toISOString().split('T')[0];

        const [total, pending, dispatched_today, received, confidential, notice_board] = await Promise.all([
          db.get(\`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id \${baseWhere}\`),
          db.get(\`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id \${baseWhere} AND l.status IN ('dispatched','in_transit')\`),
          db.get(\`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id \${baseWhere} AND l.dispatch_date = ? AND l.status = 'dispatched'\`, [today]),
          db.get(\`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id \${baseWhere} AND (l.status = 'received' OR l.acknowledged = 1)\`),
          db.get(\`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id \${baseWhere} AND l.confidential_level != 'public'\`),
          db.get(\`SELECT COUNT(*) as c FROM letters l LEFT JOIN employees e ON l.employee_id = e.id \${baseWhere} AND l.is_notice_board = 1\`)
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
        return await db.all(\`SELECT * FROM letter_audit_log WHERE letter_id = ? ORDER BY performed_at DESC\`, [data.letter_id]);
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
        let query = \`
          SELECT l.*, e.name as employee_name
          FROM letters l
          LEFT JOIN employees e ON l.employee_id = e.id
          WHERE l.is_notice_board = 1
            AND (l.notice_expiry_date IS NULL OR l.notice_expiry_date >= DATE('now'))
            AND (e.\${filter} OR l.source_entity = 'BRANCH' AND l.target_entity = 'HO' OR l.source_entity = 'HO' AND l.target_entity = 'BRANCH')
        \`;
        if (session.role !== 'ROLE_SUPER') {
          query += \` AND (l.confidential_level = 'public' OR l.source_entity = '\${session.entity === 'BRANCH' ? 'BRANCH' : 'HO'}')\`;
        }
        query += \` ORDER BY l.notice_pinned DESC, l.dispatch_date DESC\`;
        const letters = await db.all(query);
        return letters.map(l => ({ ...l, employee: { name: l.employee_name } }));
      }

      if (action === 'saveFile') {
        const { id: letterId, file_data, file_name } = data;
        const fs = require('fs');
        const path = require('path');
        const { app } = require('electron');
        
        const lettersDir = path.join(app.getPath('userData'), 'letters');
        if (!fs.existsSync(lettersDir)) fs.mkdirSync(lettersDir, { recursive: true });

        const buffer = Buffer.from(file_data, 'base64');
        const safeName = \`\${letterId}_\${Date.now()}_\${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}\`;
        const filePath = path.join(lettersDir, safeName);
        fs.writeFileSync(filePath, buffer);

        await db.run('UPDATE letters SET file_url = ?, file_name = ? WHERE id = ?', [filePath, file_name, letterId]);
        await logLetterAudit(db, letterId, 'FILE_ATTACHED', session.username, file_name);
        
        const letter = await db.get('SELECT source_entity FROM letters WHERE id = ?', [letterId]);
        if (letter) {
          await enqueueSync('letters', letterId, 'UPDATE', { id: letterId, file_url: filePath, file_name }, letter.source_entity);
        }
        return { success: true, file_path: filePath, file_name };
      }

      if (action === 'readFile') {
        const fs = require('fs');
        if (!fs.existsSync(data.file_path)) throw new Error('File not found');
        const buffer = fs.readFileSync(data.file_path);
        return { file_data: buffer.toString('base64') };
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
          finalLetterNumber = \`\${prefix}/\${new Date().getFullYear()}/\${String(count).padStart(4, '0')}\`;
        }

        let finalDirection = data.direction;
        if (!finalDirection) {
          if (sourceEntity === 'BRANCH' && finalTargetEntity === 'HO') finalDirection = 'branch_to_ho';
          else if (sourceEntity === 'HO' && finalTargetEntity === 'BRANCH') finalDirection = 'ho_to_branch';
          else finalDirection = 'internal_' + sourceEntity.toLowerCase();
        }

        await db.run(
          \`INSERT INTO letters (id, employee_id, subject, content, letter_number, dispatch_date, file_url, letter_type, office, sender, receiver, received_date, remarks, source_entity, target_entity, acknowledged,
            status, priority, direction, department, confidential_level, is_notice_board, notice_expiry_date, notice_pinned, file_name, uploaded_by, assigned_to_employee_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
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
          \`UPDATE letters SET employee_id=?, subject=?, content=?, letter_number=?, dispatch_date=?, file_url=?, letter_type=?, office=?, sender=?, receiver=?, received_date=?, remarks=?,
           status=?, priority=?, direction=?, department=?, confidential_level=?, is_notice_board=?, notice_expiry_date=?, notice_pinned=?, file_name=?, uploaded_by=?, assigned_to_employee_id=? WHERE id=?\`,
          [employee_id, subject, content, letter_number, dispatch_date, file_url, letter_type, office, sender, receiver, received_date, remarks,
           status, priority, direction, department, confidential_level, is_notice_board ? 1 : 0, notice_expiry_date, notice_pinned ? 1 : 0, file_name, uploaded_by, assigned_to_employee_id, id]
        );

        await logLetterAudit(db, id, 'UPDATED', session.username);
        await enqueueSync('letters', id, 'UPDATE', { id, ...data }, emp.entity);

        return { id, ...data };
      }
      
      if (action === 'delete') {
        const letter = await db.get(\`
          SELECT l.*, e.entity FROM letters l
          LEFT JOIN employees e ON l.employee_id = e.id
          WHERE l.id = ?
        \`, [data.id]);
        if (!letter) throw new Error('Letter not found');

        if (!canWrite(session, letter.entity)) {
          await logAccessDenied(session, 'api:letters:delete', letter.entity);
          throw new Error('ACCESS_DENIED: Apne entity data scope ke bahar letter delete karne ka adhikar nahi hai.');
        }

        await db.run(\`DELETE FROM letters WHERE id=?\`, [data.id]);

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
          \`UPDATE letters SET acknowledged = 1, acknowledged_at = ?, acknowledged_by = ? WHERE id = ?\`,
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
  });`;

api = api.replace(oldLettersHandler, newLettersHandler);

api = api.replace(
  `'employee_history', 'employee_category_history', 'employee_weekly_off_history', 'tenure_renewals',`,
  `'employee_history', 'employee_category_history', 'employee_weekly_off_history', 'tenure_renewals',\n        'letter_audit_log', 'letter_acknowledgements',`
);

fs.writeFileSync(targetPath, api);
console.log('Successfully replaced api:letters handler in electron/api.cjs');
