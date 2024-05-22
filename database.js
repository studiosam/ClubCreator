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
                teacher1 INTEGER,
                teacher2 INTEGER,
                minSlots12 INTEGER,
                minSlots11 INTEGER,
                minSlots10 INTEGER,
                minSlots9 INTEGER,
                maxSlots INTEGER,
                location INTEGER
            );
        `);

        // Create the 'teachers' table
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

        // Create the 'locations' table
        db.run(`
            CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                roomNumber TEXT NOT NULL,
                maxCapacity INTEGER NOT NULL,
                clubId INTEGER,
                FOREIGN KEY (clubId) REFERENCES clubs(id)
            );
        `);
    });
}

function addClub(club, callback) {
    const { clubName, clubDescription, maxSlots, teachers } = club;
    const sql = `INSERT INTO clubs (clubName, clubDescription, maxSlots) VALUES (?, ?, ?)`;
    db.run(sql, [clubName, clubDescription, maxSlots], function (err) {
        if (err) {
            callback(err, null);
        } else {
            const clubId = this.lastID;
            const teacherInsertions = teachers.map(teacher => {
                return new Promise((resolve, reject) => {
                    const { firstName, lastName, room } = teacher;
                    db.run(`INSERT INTO teachers (firstName, lastName, clubId, room) VALUES (?, ?, ?, ?)`,
                        [firstName, lastName, clubId, room], function (err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        });
                });
            });
            Promise.all(teacherInsertions)
                .then(() => callback(null, { id: clubId }))
                .catch(callback);
        }
    });
}

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
