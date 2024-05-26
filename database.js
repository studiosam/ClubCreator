const sqlite3 = require('sqlite3').verbose();

// Open a database connection
const db = new sqlite3.Database('./school_clubs.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Database connected.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Create the 'clubs' table
        db.run(`
            CREATE TABLE IF NOT EXISTS clubs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clubName TEXT NOT NULL,
                clubDescription TEXT,
                coSponsorsNeeded INTEGER,                                                                                                 
                minSlots TEXT,
                maxSlots INTEGER,
                location INTEGER,
                requiredCoSponsors INTEGER NOT NULL,
                currentCoSponsors INTEGER DEFAULT 0 
            );
        `);

        // Create the 'users' table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                club INTEGER,
                room TEXT,
                email TEXT,
                password TEXT,
                isTeacher BOOLEAN
            );
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacherName TEXT NOT NULL,
                clubId INTEGER,
                room TEXT,
                email TEXT,
                password TEXT,
                isTeacher BOOLEAN
            );
        `);
    });
}

function addClub(club) {

    const sql = `INSERT INTO (clubName, clubDescription, teachers, minSlots, maxCapacity, location)`
}



// function to check for email address already connected to account

function addUser(user) {

    const sql = `INSERT INTO users (firstName, lastName, email, password, isTeacher) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [user.firstName, user.lastName, user.email, user.password, user.isTeacher])

}

function closeDatabase() {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
    });
}

module.exports = {
    addClub,
    closeDatabase,
    addUser
    // Export other database functions here
};
