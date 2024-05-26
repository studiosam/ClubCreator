const sqlite3 = require('sqlite3').verbose();

// Open a database connection
const db = new sqlite3.Database('./school_clubs.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Database connected.');
    }
});

function addClub(club) {

    const sql = `INSERT INTO (clubName, clubDescription, teachers, minSlots, maxCapacity, location)`
}

async function getUsers() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT email, password FROM users`;
        db.all(sql, (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
}

async function checkUser(user) {
    try {
        const currentUsers = await getUsers();
        console.log(currentUsers); // This will now correctly log the users
        const findUser = currentUsers.find((search) => search.email === user);
        if (findUser) {

            return {
                userExists: true,
                password: findUser.password
            }
        } else {
            return 'nop';
        }
    } catch (err) {
        console.log(err);
        return 'Error';
    }
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
    addUser,
    checkUser
    // Export other database functions here
};
