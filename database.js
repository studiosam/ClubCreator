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
  const sql = `INSERT INTO users (firstName, lastName, email, password, grade, isTeacher) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [
    user.firstName,
    user.lastName,
    user.email,
    user.password,
    user.grade,
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

function deleteAllStudentClubs() {
  const sql = `UPDATE users SET clubId = null WHERE isTeacher = false`;
  db.run(sql, (err) => {
    if (err) {
      console.log(err)
    }
    console.log(`Row(s) updated: ${this.changes}`);
  })
}


// update a single club value
async function updateClubValue(clubId, key, value) {
  const sql = `UPDATE clubs SET ${key} = ? WHERE clubId = ?`;
  db.run(sql, [value, clubId], function (err) {
    if (err) {
      return console.error(err.message);
    }
    // console.log(`Row(s) updated: ${this.changes}`);
  });
}

async function assignClub(student, club) {

  if (student.clubId !== null) {
    console.log(`Club already assigned.`);

  } else {
    const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
    await run(sqlAddId, [club, student.userId]);
    // console.log(`User with ID ${student.userId} updated with clubId ${club}`);
  }
}

async function uploadAvatar(userId, newAvatarPath) {
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
          console.error('No old Avatar found');

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


function getRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}


function getRandomEmail() {
  const domains = ['example.com', 'mail.com', 'test.com'];
  return `${getRandomString(5)}@${domains[Math.floor(Math.random() * domains.length)]}`;
}


function getRandomGrade() {
  const grades = [9, 10, 11, 12];
  return grades[Math.floor(Math.random() * grades.length)];
}


function getRandomPreferences() {
  const preferences = [];
  while (preferences.length < 5) {
    const num = Math.floor(Math.random() * 7) + 1;
    if (!preferences.includes(num)) {
      preferences.push(num);
    }
  }
  return preferences.join(',');
}

async function createRandomGuys(numberOfAccounts) {
  const sql = `INSERT INTO users (firstName, lastName, email, password, grade, clubPreferences, isTeacher) VALUES (?,?,?,?,?,?,?)`;

  for (let i = 0; i < numberOfAccounts; i++) {
    const firstName = getRandomString(7);
    const lastName = getRandomString(7);
    const email = getRandomEmail();
    const password = getRandomString(10); // In a real scenario, ensure passwords are hashed
    const grade = getRandomGrade();
    const clubPreferences = getRandomPreferences();
    const isTeacher = false;

    await db.run(sql, [firstName, lastName, email, password, grade, clubPreferences, isTeacher]);
  }

  console.log(`${numberOfAccounts} random accounts created.`);
}


// createRandomGuys(50).catch(console.error);
// createRandomClubs(10).catch(console.error);

// deleteAllStudentClubs();

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to create a specified number of random clubs
async function createRandomClubs(numberOfClubs) {
  const sqlInsert = `INSERT INTO clubs (clubName, clubDescription, coSponsorsNeeded, minSlots9, minSlots10, minSlots11, minSlots12, maxSlots, requiredCoSponsors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;


  for (let i = 0; i < numberOfClubs; i++) {
    const clubName = getRandomString(10);
    const clubDescription = getRandomString(20);
    const coSponsorsNeeded = 0;
    const maxSlots = 32;
    const requiredCoSponsors = 0;
    const primaryTeacherId = getRandomInt(1, 100); // assuming teacher IDs range from 1 to 100

    const newClubInfo = {
      preferredClub: clubName,
      preferredClubDescription: clubDescription,
      coSponsorsNeeded: coSponsorsNeeded,
      minSlots9: 8,
      minSlots10: 8,
      minSlots11: 8,
      minSlots12: 8,
      maxCapacity: maxSlots,
      requiredCoSponsors: requiredCoSponsors

    };

    await db.run(sqlInsert, [
      newClubInfo.preferredClub,
      newClubInfo.preferredClubDescription,
      newClubInfo.coSponsorsNeeded,
      newClubInfo.minSlots9,
      newClubInfo.minSlots10,
      newClubInfo.minSlots11,
      newClubInfo.minSlots12,
      newClubInfo.maxCapacity,
      newClubInfo.requiredCoSponsors
    ]);
  }

  console.log(`${numberOfClubs} random clubs created.`);
}