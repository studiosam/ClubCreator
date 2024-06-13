const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require('fs');
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

async function addClub(newClubInfo) {
  try {
    console.log('Starting addClub function with newClubInfo:', newClubInfo);


    const sqlInsert = `INSERT INTO clubs (clubName, clubDescription, coSponsorsNeeded, maxSlots, requiredCoSponsors, primaryTeacherId) VALUES (?, ?, ?, ?, ?, ?)`;
    const insertResult = await run(sqlInsert, [
      newClubInfo.preferredClub,
      newClubInfo.preferredClubDescription,
      newClubInfo.coSponsorsNeeded,
      newClubInfo.maxCapacity,
      newClubInfo.coSponsorsNeeded,
      newClubInfo.teacherId
    ]);

  } catch (err) {
    console.error('Error in addClub function:', err.message);
  }
}

async function updateClub(clubChangeInfo) {
  const {
    clubName,
    clubDescription,
    coSponsorsNeeded,
    minSlots9,
    minSlots10,
    minSlots11,
    minSlots12,
    maxSlots,
    requiredCoSponsors,
    currentCoSponsors,
    primaryTeacherId,
    location,
    isApproved,
    clubId,
  } = clubChangeInfo;
  const sql = `UPDATE clubs SET clubName = ?,
  clubDescription = ?,
  coSponsorsNeeded = ?,
  minSlots9 = ?,
  minSlots10 = ?,
  minSlots11 = ?,
  minSlots12 = ?,
  maxSlots = ?,
  requiredCoSponsors = ?,
  currentCoSponsors = ?,
  primaryTeacherId = ?,
  location = ?,
  isApproved = ?  WHERE clubId = ${clubId}`;
  await new Promise((resolve, reject) => {
    db.run(
      sql,
      [
        clubName,
        clubDescription,
        coSponsorsNeeded,
        minSlots9,
        minSlots10,
        minSlots11,
        minSlots12,
        maxSlots,
        requiredCoSponsors,
        currentCoSponsors,
        primaryTeacherId,
        location,
        isApproved,
      ],
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      }
    );
    const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
    db.run(sqlAddId, [clubId, primaryTeacherId]);
  });

  return true;
}

async function updateClubPrefs(clubPrefsString, studentId) {
  const sql = `UPDATE users SET clubPreferences = ? WHERE userId = ${studentId}`;
  await new Promise((resolve, reject) => {
    db.run(
      sql,
      [clubPrefsString].toString(),
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
        return 'Success'
      }
    );
  });
}

async function updateUser(userChangeInfo) {
  const {
    firstName,
    lastName,
    clubId,
    room,
    email,
    password,
    isTeacher,
    isAdmin,
    clubPreferences,
  } = userChangeInfo;
  const sql = `UPDATE users SET firstName = ?,
  lastName = ?,
  clubId = ?,
  room = ?,
  email = ?,
  password = ?,
  isTeacher = ?,
  isAdmin = ?,
  clubPreferences = ? WHERE userId = ${userId}`;

  await new Promise((resolve, reject) => {
    db.run(
      sql,
      [
        firstName,
        lastName,
        clubId,
        room,
        email,
        password,
        isTeacher,
        isAdmin,
        clubPreferences
      ],
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      }
    );

  });

  return true;
}

async function deleteClub(clubId) {
  const sql = `DELETE FROM clubs WHERE clubId =?`;
  db.run(sql, [clubId], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) deleted: ${this.changes}`);
  });
  return true;
}

async function deleteUser(userId) {
  const sql = `DELETE FROM users WHERE userId =?`;
  db.run(sql, [userId], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) deleted: ${this.changes}`);
  });
  return true;
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

async function getUserInfo(data, type) {
  const sql = `SELECT * FROM users WHERE ${type} = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [data], (err, row) => {
      if (err) {
        return reject(err);
      } else {
        resolve(row);
        // console.log(row)
        return row;
      }
    });
  });
}

async function getClubInfo(clubId) {
  const sql = `SELECT * FROM clubs WHERE clubId = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [clubId], (err, row) => {
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
        password: findUser.password,
      };
    } else {
      return "User does not exist";
    }
  } catch (err) {
    console.log(err);

    return "Error";
  }
}

async function getAllTeachersOrStudents(isTeacherBool) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE isTeacher = ${isTeacherBool}`;
    db.all(sql, (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(rows);
      }
    });
  });
}
async function getAllUsers() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users`;
    db.all(sql, (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(rows);
      }
    });
  });
}
async function getAllClubs() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM clubs`;
    db.all(sql, (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(rows);
      }
    });
  });
}

async function getUnapprovedClubs() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM clubs WHERE isApproved = false`;
    db.all(sql, (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(rows);
      }
    });
  });
}
// function to check for email address already connected to account

function addUser(user) {
  const sql = `INSERT INTO users (firstName, lastName, email, password, isTeacher) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [
    user.firstName,
    user.lastName,
    user.email,
    user.password,
    user.isTeacher,
  ]);
}

async function removeClubFromUser(userId) {
  const sql = `UPDATE users SET clubId = null WHERE userId = ?`;
  db.run(sql, [userId], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });
}

async function approveClub(club) {
  // console.log("CLUB=" + club);
  const sql = `UPDATE clubs SET isApproved = true WHERE clubId = ?`;
  db.run(sql, [club], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });

  const sqlSelect = `SELECT * FROM clubs WHERE clubId = ?`;
  const row = await get(sqlSelect, [club]);

  const teacherId = row.primaryTeacherId;


  const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
  await run(sqlAddId, [club, teacherId]);

  console.log(`User with ID ${teacherId} updated with clubId ${club}`);
}

function setAdmin() {
  const sql = `UPDATE users SET isAdmin = true WHERE userId = ?`;
  db.run(sql, [31], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });
}

// update a single club value
async function updateClubValue(clubId, key, value) {
  const sql = `UPDATE clubs SET ${key} = ? WHERE clubId = ?`;
  db.run(sql, [value, clubId], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });
}

async function assignClub(student, club) {

  const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
  await run(sqlAddId, [club, student.userId]);

  console.log(`User with ID ${student.userId} updated with clubId ${club}`);
}

function uploadAvatar(userId, newAvatarPath) {
  const normalizedPath = path.posix.normalize(newAvatarPath).replace(/\\/g, '/');

  db.get('SELECT avatar FROM users WHERE userId = ?', [userId], (err, row) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return { message: 'Database error' };
    }

    if (row && row.avatar) {
      const oldAvatarPath = row.avatar;

      // Delete the old avatar file
      fs.unlink(oldAvatarPath, (err) => {
        if (err) {
          console.error('Error deleting old avatar:', err.message);

        }


        const sqlUpdate = 'UPDATE users SET avatar = ? WHERE userId = ?';
        const params = [normalizedPath, userId];

        db.run(sqlUpdate, params, function (err) {
          if (err) {
            console.error('Error updating user:', err.message);
            return { message: 'Database error' };
          }
          return true;
        });
      });
    } else {
      // No old avatar, just update the avatar path
      const sqlUpdate = 'UPDATE users SET avatar = ? WHERE userId = ?';
      const params = [normalizedPath, userId];

      db.run(sqlUpdate, params, function (err) {
        if (err) {
          console.error('Error updating user:', err.message);
          return { message: 'Database error' };
        }
        return true;
      });
    }
  });
  return true
}


function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
  });
}

module.exports = {
  addClub,
  closeDatabase,
  addUser,
  checkUser,
  updateUser,
  deleteUser,
  getAllTeachersOrStudents,
  getUserInfo,
  getAllClubs,
  getClubInfo,
  getUnapprovedClubs,
  approveClub,
  updateClub,
  updateClubValue,
  deleteClub,
  getAllUsers,
  updateClubPrefs,
  removeClubFromUser,
  assignClub,
  uploadAvatar
  // Export other database functions here
};


function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error running SQL:', sql, 'Params:', params, 'Error:', err);
        reject(err);
      } else {
        console.log('SQL run successfully:', sql, 'Params:', params);
        resolve(this);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Error getting SQL:', sql, 'Params:', params, 'Error:', err);
        reject(err);
      } else {
        console.log('SQL get successfully:', sql, 'Params:', params, 'Row:', row);
        resolve(row);
      }
    });
  });
}