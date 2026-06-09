const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Windows AppData path
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'placeholder-model-2', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.each("SELECT id, payload FROM sync_queue WHERE push_status = 'PENDING' OR push_status = 'FAILED'", (err, row) => {
    if (err) {
      console.error(err);
      return;
    }
    
    try {
      let changed = false;
      let payloadStr = row.payload;
      
      // Fix boolean is_surrendered to integer
      if (payloadStr.includes('"is_surrendered":true')) {
        payloadStr = payloadStr.replace(/"is_surrendered":true/g, '"is_surrendered":1');
        changed = true;
      }
      if (payloadStr.includes('"is_surrendered":false')) {
        payloadStr = payloadStr.replace(/"is_surrendered":false/g, '"is_surrendered":0');
        changed = true;
      }

      if (changed) {
        db.run("UPDATE sync_queue SET payload = ?, push_status = 'PENDING' WHERE id = ?", [payloadStr, row.id], (updateErr) => {
          if (updateErr) console.error(updateErr);
          else console.log(`Fixed sync_queue item ${row.id}`);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, () => {
    console.log('Finished checking sync queue at', dbPath);
  });
});
