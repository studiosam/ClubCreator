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
                minSlots9 INTEGER DEFAULT 0,
                minSlots10 INTEGER DEFAULT 0,
                minSlots11 INTEGER DEFAULT 0,
                minSlots12 INTEGER DEFAULT 0,
                maxSlots INTEGER,
                room TEXT,
                isApproved BOOLEAN DEFAULT FALSE,
                coverPhoto TEXT
            );
        `);

    // Create the 'users' table
    db.run(`
            CREATE TABLE IF NOT EXISTS users (
                userId INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                avatar TEXT,
                grade INTEGER,
                clubId INTEGER,
                room TEXT,
                email TEXT,
                password TEXT,
                isTeacher BOOLEAN,
                isAdmin BOOLEAN DEFAULT FALSE,
                clubPreferences TEXT
            );
        `);
    db.run(`
            CREATE TABLE IF NOT EXISTS attendance (
                clubId INTEGER,
                date TEXT,
                studentsPresent TEXT,
                studentsAbsent TEXT,
                UNIQUE(clubId, date)
            );
        `);
  });
}
initializeDatabase();
