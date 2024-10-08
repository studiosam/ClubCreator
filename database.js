const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8008 });

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

async function checkAttendance(clubId, date) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT studentsPresent, studentsAbsent
      FROM attendance
      WHERE clubId = ? AND date = ?
    `;
    db.all(sql, [clubId, date], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

async function submitAttendance(presentStudents, absentStudents, clubId, date) {
  try {
    const sql = `
      INSERT INTO attendance (studentsPresent, studentsAbsent, clubId, date)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(clubId, date) DO UPDATE SET
        studentsPresent = excluded.studentsPresent,
        studentsAbsent = excluded.studentsAbsent
    `;
    const insertResult = await run(sql, [
      presentStudents,
      absentStudents,
      clubId,
      date,
    ]);
    console.log("Attendance submitted successfully.");
    return true;
  } catch (err) {
    console.error("Error inserting or updating attendance:", err);
    return false;
  }
}

async function addClub(newClubInfo) {
  try {
    const normalizedPath = path.posix
      .normalize(newClubInfo.cover)
      .replace(/\\/g, "/");

    const sqlInsert = `INSERT INTO clubs (clubName, clubDescription, coSponsorsNeeded, maxSlots, primaryTeacherId, coverPhoto) VALUES (?, ?, ?, ?, ?,?)`;
    const insertResult = await run(sqlInsert, [
      newClubInfo.preferredClub,
      newClubInfo.preferredClubDescription,
      newClubInfo.coSponsorsNeeded,
      newClubInfo.maxCapacity,
      newClubInfo.teacherId,
      normalizedPath,
    ]);
  } catch (err) {
    console.error("Error in addClub function:", err.message);
  }
}

async function updateClub(clubChangeInfo) {
  let {
    clubName,
    clubDescription,
    coSponsorsNeeded,
    minSlots9,
    minSlots10,
    minSlots11,
    minSlots12,
    maxSlots,
    primaryTeacherId,
    room,
    isApproved,
    clubId,
  } = clubChangeInfo;
  if (primaryTeacherId === "null") {
    primaryTeacherId = null;
  }
  const sql = `UPDATE clubs SET clubName = ?,
  clubDescription = ?,
  coSponsorsNeeded = ?,
  minSlots9 = ?,
  minSlots10 = ?,
  minSlots11 = ?,
  minSlots12 = ?,
  maxSlots = ?,
  primaryTeacherId = ?,
  room = ?,
  isApproved = ?  WHERE clubId = ${clubId}`;
  await new Promise(async (resolve, reject) => {
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
        primaryTeacherId,
        room,
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
    db.run(sql, [clubPrefsString].toString(), function (err) {
      if (err) {
        return reject(err);
      }
      resolve(this.changes);
      return "Success";
    });
  });
}

async function getCoSponsors(clubId) {
  const allSponsors = await getTeachersOrStudentsInClub(clubId, true);
  const club = await getClubInfo(clubId);
  const coSponsors = allSponsors.filter(
    (sponsor) => sponsor.userId !== club.primaryTeacherId
  );
  return coSponsors;
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
        clubPreferences,
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
        console.error(err)
        return reject(err);
      } else {
        resolve(row);

        return row;
      }
    });
  });
}

async function getUser(userId) {
  const sql = `SELECT * FROM users WHERE userId = ${userId}`;
  return new Promise((resolve, reject) => {
    db.get(sql, (err, row) => {
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
async function getUserByEmail(email) {
  const sql = `SELECT * FROM users WHERE email = '${email}'`;
  return new Promise((resolve, reject) => {
    db.get(sql, (err, row) => {
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
async function setResetPasswordToken(userId, token, expiration) {
  const sql = `INSERT INTO password_reset_requests (user_id, token, expiration) VALUES (?, ?, ?)`;
  return new Promise((resolve, reject) => {
    db.get(sql, [userId, token, expiration], (err, row) => {
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
async function checkResetPasswordToken(token) {
  const sql = `SELECT * FROM password_reset_requests WHERE token = '${token}'`;
  return new Promise((resolve, reject) => {
    db.get(sql, (err, row) => {
      if (err) {
        return reject(err);
      } else {
        resolve(row);

        return row;
      }
    });
  });
}
async function resetUserPassword(userId, newPassword) {
  const sql = `UPDATE users SET password = '${newPassword}' WHERE userId = ${userId}`;
  return new Promise((resolve, reject) => {
    db.get(sql, (err, row) => {
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
  //console.log(isTeacherBool);
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE isTeacher = ${isTeacherBool}`;
    db.all(sql, (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        // console.log(resolve(rows))
        return resolve(rows);
      }
    });
  });
}

async function getAllTeachersOrStudentsPagination(
  isTeacherBool,
  page,
  limit,
  search,
  sortBy,
  sortDirection
) {
  return new Promise((resolve, reject) => {
    const offset = (page - 1) * limit;
    const searchQuery = `%${search}%`;

    const sql = `
      SELECT * FROM users
      WHERE isTeacher = ${isTeacherBool} AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)
      ORDER BY ${sortBy} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    db.all(
      sql,
      [searchQuery, searchQuery, searchQuery, limit, offset],
      (err, rows) => {
        if (err) {
          return reject(err);
        } else {
          const countSql = `SELECT COUNT(*) as count FROM users WHERE isTeacher = ${isTeacherBool} AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)`;
          db.get(
            countSql,
            [searchQuery, searchQuery, searchQuery],
            (err, countResult) => {
              if (err) {
                console.log(err);
                return reject(err);
              } else {
                return resolve({ users: rows, total: countResult.count });
              }
            }
          );
        }
      }
    );
  });
}

async function getTotalUsersCount(isTeacherBool, search) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) as count FROM users
      WHERE isTeacher = ${isTeacherBool}
      AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)`;

    const searchPattern = `%${search}%`;
    db.get(sql, [searchPattern, searchPattern, searchPattern], (err, row) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(row.count);
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
  if (user.email !== "" && user.email !== undefined) {
    const sql = `INSERT INTO users (firstName, lastName, email, password, grade, isTeacher) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      parseInt(user.grade),
      user.isTeacher,
    ]);
  } else {
    console.log("No email provided.");
  }
}

async function addStudentFromSpreadsheet(user) {
  if (user.email !== "" && user.email !== undefined) {
    const sql = `INSERT INTO users (firstName, lastName, email, password, grade, isTeacher) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      parseInt(user.grade),
      user.isTeacher,
    ], function (err) {
      if (err) {
        console.error(`Student Account Already Exists: ${user.firstName} ${user.lastName}`);
        return;
      }
      console.log(`Student added: ${user.firstName} ${user.lastName}`);
    });

  } else {
    console.log(`No email provided for: ${user.firstName} ${user.lastName}`);
  }
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
  const sql = `UPDATE clubs SET isApproved = true WHERE clubId = ?`;
  db.run(sql, [club], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });

  const sqlSelect = `SELECT * FROM clubs WHERE clubId = ?`;
  const clubObject = await get(sqlSelect, [club]);

  const teacherId = clubObject.primaryTeacherId;

  const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
  db.run(sqlAddId, [club, teacherId]);

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
      console.log(err);
    }

    console.log(`Row(s) updated: ${this.changes}`);
    return true;
  });
}

async function deleteAllClubs() {
  try {
    const sqlDelete = `DELETE FROM clubs`;

    await db.run(sqlDelete);

    console.log("All Clubs Deleted");
    return true;
  } catch (err) {
    console.error("Error deleting clubs:", err.message);
  }
}

// update a single club value
async function updateClubValue(clubId, key, value) {
  console.log(`clubId: ${clubId}, key: ${key}, value: ${value}`);
  const sql = `UPDATE clubs SET ${key} = ? WHERE clubId = ?`;
  db.run(sql, [value, clubId], function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
  });
}

async function updateUserValue(userId, key, value) {
  // if (value === null) {
  //   value = null
  // }
  const sql = `UPDATE users SET ${key} = ? WHERE userId = ?`;
  db.run(sql, [value, userId], function (err) {
    if (err) {
      return console.error(err.message);
    }
    // console.log(`Row(s) updated: ${this.changes}`);
  });
}

// get students with clubId
async function getTeachersOrStudentsInClub(clubId, userType) {
  const users = await getAllTeachersOrStudents(userType);

  const clubRoster = await users.filter(
    (user) => user.clubId === parseInt(clubId)
  );

  return clubRoster;
}
async function getAllUsersInClub(clubId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE clubId = ${clubId}`;
    db.all(sql, (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(rows);
      }
    });
  });
}
// for (let i = 333; i < 415; i++) {
//   getTeachersOrStudentsInClub(i, true)
// }

async function assignClub(student, club, update) {
  if (update) {
    const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
    await run(sqlAddId, [club, student]);
    return true;
  } else if (student.clubId !== null) {
    const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
    await run(sqlAddId, [club, student.userId]);
  } else {
    const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
    await run(sqlAddId, [club, student.userId]);
    return true;
    // console.log(`User with ID ${student.userId} updated with clubId ${club}`);
  }
}
async function assignClubToStudent(student, club) {
  const sqlAddId = `UPDATE users SET clubId = ? WHERE userId = ?`;
  await run(sqlAddId, [club, student]);
  return true;

  // console.log(`User with ID ${student.userId} updated with clubId ${club}`);
}

async function uploadAvatar(userId, newAvatarPath) {
  const normalizedPath = path.posix
    .normalize(newAvatarPath)
    .replace(/\\/g, "/");

  db.get("SELECT avatar FROM users WHERE userId = ?", [userId], (err, row) => {
    if (err) {
      console.error("Error fetching user:", err.message);
      return { message: "Database error" };
    }

    if (row && row.avatar) {
      const oldAvatarPath = row.avatar;

      // Delete the old avatar file
      fs.unlink(oldAvatarPath, (err) => {
        if (err) {
          console.error("No old Avatar found");
        }

        const sqlUpdate = "UPDATE users SET avatar = ? WHERE userId = ?";
        const params = [normalizedPath, userId];

        db.run(sqlUpdate, params, function (err) {
          if (err) {
            console.error("Error updating user:", err.message);
            return { message: "Database error" };
          }
          return true;
        });
      });
    } else {
      // No old avatar, just update the avatar path
      const sqlUpdate = "UPDATE users SET avatar = ? WHERE userId = ?";
      const params = [normalizedPath, userId];

      db.run(sqlUpdate, params, function (err) {
        if (err) {
          console.error("Error updating user:", err.message);
          return { message: "Database error" };
        }
        return true;
      });
    }
  });
  return true;
}
async function uploadCover(clubId, newAvatarPath) {
  const normalizedPath = path.posix
    .normalize(newAvatarPath)
    .replace(/\\/g, "/");

  db.get(
    "SELECT coverPhoto FROM clubs WHERE clubId = ?",
    [clubId],
    (err, row) => {
      if (err) {
        console.error("Error fetching user:", err.message);
        return { message: "Database error" };
      }

      if (row && row.coverPhoto) {
        const oldAvatarPath = row.coverPhoto;

        // Delete the old avatar file
        fs.unlink(oldAvatarPath, (err) => {
          if (err) {
            console.error("No old Avatar found");
          }

          const sqlUpdate = "UPDATE clubs SET coverPhoto = ? WHERE clubId = ?";
          const params = [normalizedPath, clubId];

          db.run(sqlUpdate, params, function (err) {
            if (err) {
              console.error("Error updating user:", err.message);
              return { message: "Database error" };
            }
            return true;
          });
        });
      } else {
        // No old avatar, just update the avatar path
        const sqlUpdate = "UPDATE clubs SET coverPhoto = ? WHERE clubId = ?";
        const params = [normalizedPath, clubId];

        db.run(sqlUpdate, params, function (err) {
          if (err) {
            console.error("Error updating user:", err.message);
            return { message: "Database error" };
          }
          return true;
        });
      }
    }
  );
  return true;
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

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error(
          "Error running SQL:",
          sql,
          "Params:",
          params,
          "Error:",
          err
        );
        reject(err);
      } else {
        console.log("SQL run successfully:", sql, "Params:", params);
        resolve(this);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error(
          "Error getting SQL:",
          sql,
          "Params:",
          params,
          "Error:",
          err
        );
        reject(err);
      } else {
        console.log(
          "SQL get successfully:",
          sql,
          "Params:",
          params,
          "Row:",
          row
        );
        resolve(row);
      }
    });
  });
}

function getRandomString(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function getRandomEmail() {
  const domains = ["example.com", "mail.com", "test.com"];
  return `${getRandomString(5)}@${domains[Math.floor(Math.random() * domains.length)]
    }`;
}

function getRandomGrade() {
  const grades = [9, 10, 11, 12];
  return grades[Math.floor(Math.random() * grades.length)];
}

async function getRandomPreferences() {
  const allClubs = await getAllClubs();

  const startNum = parseInt(allClubs[0].clubId);
  const numClubs = allClubs.length;
  const preferences = [];
  while (preferences.length < 5) {
    const num = Math.floor(Math.random() * numClubs) + startNum;
    if (!preferences.includes(num)) {
      preferences.push(num);
    }
  }
  return preferences.join(",");
}

async function createRandomGuys(numberOfAccounts) {
  let isTeacher = false;

  const sql = `INSERT INTO users (firstName, lastName, email, password, grade, clubPreferences, isTeacher) VALUES (?,?,?,?,?,?,?)`;

  for (let i = 0; i < numberOfAccounts; i++) {
    const res = await fetch("https://randomuser.me/api/?nat=us");
    const user = await res.json();
    console.log(
      `User ${user.results[0].name.first} ${user.results[0].name.last} Created`
    );
    const firstName = user.results[0].name.first;
    const lastName = user.results[0].name.last;
    const email = user.results[0].email;
    const password = getRandomString(10);
    const grade = getRandomGrade();
    const clubPreferences = await getRandomPreferences();


    await db.run(sql, [
      firstName,
      lastName,
      email,
      password,
      grade,
      clubPreferences,
      isTeacher,
    ]);
    const createdUser = {
      firstName,
      lastName,
      email,
      grade,
      clubPreferences,
      progress: ((i + 1) / numberOfAccounts) * 100,
    };
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        createdUser.type = "student";
        client.send(JSON.stringify(createdUser));
      }
    });
  }
  console.log(`${numberOfAccounts} random accounts created.`);
  return true;
}
async function createRandomTeachers(numberOfAccounts) {
  let isTeacher = true
  console.log(typeof numberOfAccounts);
  const sql = `INSERT INTO users (firstName, lastName, email, password, grade, clubPreferences, isTeacher) VALUES (?,?,?,?,?,?,?)`;

  for (let i = 0; i < parseInt(numberOfAccounts); i++) {
    const res = await fetch("https://randomuser.me/api/?nat=us");
    const user = await res.json();
    console.log(
      `User ${user.results[0].name.first} ${user.results[0].name.last} Created`
    );
    console.log(i);
    const firstName = user.results[0].name.first;
    const lastName = user.results[0].name.last;
    const email = user.results[0].email;
    const password = getRandomString(10);
    const grade = null
    const clubPreferences = null;
    let primaryTeacherId

    db.run(sql, [
      firstName,
      lastName,
      email,
      password,
      grade,
      clubPreferences,
      isTeacher,
    ], async function getId(err) {
      if (err) {
        console.error(err);
        return;
      }

      primaryTeacherId = this.lastID;
      console.log('LAST ID:', primaryTeacherId);
      await createRandomClubs(1, primaryTeacherId);
      // Further operations with primaryTeacherId should be inside this callback
      const createdUser = {
        firstName,
        lastName,
        email,
        grade,
        clubPreferences,
        progress: ((i + 1) / numberOfAccounts) * 100,
        primaryTeacherId, // Include primaryTeacherId in your createdUser object if needed
      };

      // Additional code related to createdUser or primaryTeacherId
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          createdUser.type = "teacher";
          client.send(JSON.stringify(createdUser));
        }
      });
    });





  }
  console.log(`${numberOfAccounts} random accounts created.`);
  return true;
}

async function deleteAllStudents() {
  try {
    const sqlDelete = `DELETE FROM users WHERE isTeacher = false`;

    const deleteResult = await db.run(sqlDelete);

    console.log("All Students Deleted");
    return true;
  } catch (err) {
    console.error("Error deleting non-teacher users:", err.message);
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to create a specified number of random clubs
async function createRandomClubs(numberOfClubs, teacherId) {
  const sqlInsert = `INSERT INTO clubs (clubName, clubDescription, coSponsorsNeeded, minSlots9, minSlots10, minSlots11, minSlots12, maxSlots, primaryTeacherId,isApproved) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  for (let i = 0; i < numberOfClubs; i++) {
    const response = await fetch(
      "https://random-word-api.herokuapp.com/word?number=2"
    );
    const clubNames = await response.json();
    const clubName = `${clubNames[0]} ${clubNames[1]} Club`;
    const clubDescription = getRandomString(20);
    const coSponsorsNeeded = 0;
    const maxSlots = 40;
    const requiredCoSponsors = 0;
    const primaryTeacherId = teacherId;

    const newClubInfo = {
      preferredClub: clubName,
      preferredClubDescription: clubDescription,
      coSponsorsNeeded: coSponsorsNeeded,
      minSlots9: 8,
      minSlots10: 8,
      minSlots11: 8,
      minSlots12: 8,
      maxCapacity: maxSlots,
      primaryTeacherId: primaryTeacherId,
      isApproved: 1
    };

    db.run(sqlInsert, [
      newClubInfo.preferredClub,
      newClubInfo.preferredClubDescription,
      newClubInfo.coSponsorsNeeded,
      newClubInfo.minSlots9,
      newClubInfo.minSlots10,
      newClubInfo.minSlots11,
      newClubInfo.minSlots12,
      newClubInfo.maxCapacity,
      newClubInfo.primaryTeacherId,
      newClubInfo.isApproved
    ], async function (err) {
      const createdClub = {
        clubName,
        progress: ((i + 1) / numberOfClubs) * 100,
      };

      await updateUserValue(newClubInfo.primaryTeacherId, 'clubId', this.lastID)
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          createdClub.type = "club";
          client.send(JSON.stringify(createdClub));
        }
      });
    });


  }

  console.log(`${numberOfClubs} random clubs created.`);
  return true;
}

async function getAttendanceFromDate(dateString) {
  console.log(typeof dateString);
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM attendance WHERE date = ?`;
    db.all(sql, [dateString], (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(rows);
      }
    });
  });
}

module.exports = {
  get,
  run,
  addClub,
  addUser,
  checkUser,
  closeDatabase,
  deleteUser,
  updateUser,
  updateUserValue,
  getAllTeachersOrStudents,
  getAllTeachersOrStudentsPagination,
  getUserInfo,
  getUser,
  getAllClubs,
  getAllUsersInClub,
  getClubInfo,
  getUnapprovedClubs,
  approveClub,
  updateClub,
  updateClubValue,
  deleteClub,
  getAllUsers,
  getUserByEmail,
  updateClubPrefs,
  removeClubFromUser,
  assignClub,
  uploadAvatar,
  uploadCover,
  deleteAllStudentClubs,
  createRandomClubs,
  createRandomGuys,
  deleteAllStudents,
  getTotalUsersCount,
  deleteAllClubs,
  getTeachersOrStudentsInClub,
  submitAttendance,
  checkAttendance,
  assignClubToStudent,
  getCoSponsors,
  setResetPasswordToken,
  checkResetPasswordToken,
  resetUserPassword,
  createRandomTeachers,
  getAttendanceFromDate,
  addStudentFromSpreadsheet
  // Export other database functions here
};
