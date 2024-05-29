const sqlite3 = require('sqlite3').verbose();

// Open a database connection
const db = new sqlite3.Database(`C:/Users/Waffles/Desktop/Coding Stuff/Databases/school_clubs.db`, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Database connected.');
    }
});

async function addClub(newClubInfo) {
    const sql = `INSERT INTO clubs (clubName, clubDescription, coSponsorsNeeded, maxSlots, requiredCoSponsors, primaryTeacherId) VALUES (? , ? , ? , ?, ? , ?)`
    db.run(sql, [newClubInfo.preferredClub,
    newClubInfo.preferredClubDescription,
    newClubInfo.coSponsorsNeeded,
    newClubInfo.maxCapacity,
    newClubInfo.coSponsorsNeeded,
    newClubInfo.teacherId
    ]);
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

async function getUserInfo(email) {
    const sql = `SELECT * FROM users WHERE email = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [email], (err, row) => {
            if (err) {
                return reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function checkUser(user) {
    try {
        const currentUsers = await getUsers();
        const findUser = currentUsers.find((search) => search.email === user);
        if (findUser) {
            return {
                userExists: true,
                password: findUser.password
            }
        } else {
            return 'User does not exist';
        }
    } catch (err) {
        console.log(err);
        return 'Error';
    }
}

async function getAllUsers(isTeacherBool) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users WHERE isTeacher = ${isTeacherBool}`
        db.all(sql, (err, rows) => {
            if (err) {
                return reject(err)
            } else {
                return resolve(rows)
            }
        })
    })
}

async function getAllClubs() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM clubs`
        db.all(sql, (err, rows) => {
            if (err) {
                return reject(err)
            } else {
                return resolve(rows)
            }
        })
    })
}

async function getUnapprovedClubs() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM clubs WHERE isApproved = false`
        db.all(sql, (err, rows) => {
            if (err) {
                return reject(err)
            } else {
                return resolve(rows)
            }
        })
    })
}
// function to check for email address already connected to account

function addUser(user) {

    const sql = `INSERT INTO users (firstName, lastName, email, password, isTeacher) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [user.firstName, user.lastName, user.email, user.password, user.isTeacher]);

}

async function approveClub(club) {
    console.log("CLUB=" + club);
    const sql = `UPDATE clubs SET isApproved = true WHERE clubId = ?`;
    db.run(sql, [club], function (err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Row(s) updated: ${this.changes}`);
    });
}

////// FIXME//////////////////
async function updateClub(club) {
    console.log("CLUB=" + club);
    const sql = `UPDATE clubs SET isApproved = true WHERE clubId = ?`;
    db.run(sql, [club], function (err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Row(s) updated: ${this.changes}`);
    });
}
//////////////////////////

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
    checkUser,
    getAllUsers,
    getUserInfo,
    getAllClubs,
    getUnapprovedClubs,
    approveClub,
    updateClub
    // Export other database functions here
};
