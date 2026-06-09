const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function main() {
  const db = await open({
    filename: process.env.APPDATA + '\\placeholder-model-2\\database.sqlite',
    driver: sqlite3.Database
  });

  try {
    const users = await db.all("SELECT * FROM app_users");
    console.log('App Users Table:', users);
  } catch(e) {
    console.error('Error fetching users:', e.message);
  }
}

main();
