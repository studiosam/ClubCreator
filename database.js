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

async function addClub(newClubInfo) {
  const sql = `INSERT INTO clubs (clubName, clubDescription, coSponsorsNeeded, maxSlots, requiredCoSponsors, primaryTeacherId) VALUES (? , ? , ? , ?, ? , ?)`;
  db.run(sql, [
    newClubInfo.preferredClub,
    newClubInfo.preferredClubDescription,
    newClubInfo.coSponsorsNeeded,
    newClubInfo.maxCapacity,
    newClubInfo.coSponsorsNeeded,
    newClubInfo.teacherId,
  ]);
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
async function updateClubValue(club, key, value) {
  console.log("CLUB=" + club);
  const sql = `UPDATE clubs SET ${key} = ? WHERE clubId = ?`;
  db.run(sql, [value, club.clubId], function (err) {
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
  getAllTeachersOrStudents,
  getUserInfo,
  getAllClubs,
  getClubInfo,
  getUnapprovedClubs,
  approveClub,
  updateClub,
  deleteClub,
  getAllUsers,
  // Export other database functions here
};
