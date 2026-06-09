const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.get("SELECT * FROM sync_queue WHERE id = 526", (err, row) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(row, null, 2));
  }
});
