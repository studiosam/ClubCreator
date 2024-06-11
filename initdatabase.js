const sqlite3 = require("sqlite3").verbose();

// Open a database connection
const db = new sqlite3.Database(
  `../school_clubs.db`,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error("Error opening database:", err.message);
    } else {
      console.log("Database connected.");
    }
  }
);
function initializeDatabase() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");
    // Create the 'clubs' table
    db.run(`
            CREATE TABLE IF NOT EXISTS clubs (
                clubId INTEGER PRIMARY KEY AUTOINCREMENT,
                clubName TEXT NOT NULL,
                clubDescription TEXT,
                primaryTeacherId INTEGER,
                coSponsorsNeeded INTEGER,
                minSlots9 INTEGER,
                minSlots10 INTEGER,
                minSlots11 INTEGER,
                minSlots12 INTEGER,
                maxSlots INTEGER,
                location TEXT,
                requiredCoSponsors INTEGER NOT NULL,
                currentCoSponsors INTEGER DEFAULT 0,
                isApproved BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (primaryTeacherId) REFERENCES users (userId)
            );
        `);

    // Create the 'users' table
    db.run(`
            CREATE TABLE IF NOT EXISTS users (
                userId INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                grade INTEGER,
                clubId INTEGER,
                room TEXT,
                email TEXT,
                password TEXT,
                isTeacher BOOLEAN,
                isAdmin BOOLEAN DEFAULT FALSE,
                clubPreferences TEXT, 
                FOREIGN KEY (clubId) REFERENCES clubs (clubId)
            );
        `);
  });
}
initializeDatabase();
