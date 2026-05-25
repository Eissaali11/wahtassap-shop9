const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/openwa.sqlite');

db.serialize(() => {
  db.all('SELECT * FROM contact_lists', (err, rows) => {
    console.log("=== CONTACT LISTS ===");
    console.log(rows);
  });
  db.all('SELECT * FROM contacts', (err, rows) => {
    console.log("=== CONTACTS ===");
    console.log(rows);
  });
});
db.close();
