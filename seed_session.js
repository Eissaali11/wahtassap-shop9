const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/openwa.sqlite');

db.serialize(() => {
  db.run(`INSERT OR IGNORE INTO sessions (id, name, status, created_at, updated_at) 
          VALUES ('b0c4e93c-5026-4893-984b-1639c3b04f61', 'Salla Session', 'disconnected', datetime('now'), datetime('now'))`, 
    function(err) {
      if (err) {
        console.log("Session table error:", err.message);
      } else {
        console.log("Inserted session.");
      }
    });
});
db.close();
