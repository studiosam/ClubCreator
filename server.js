const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database.js"); // Import your database functions
const ca = require("./clubAssignment.js");
const app = express();
const bcrypt = require("bcrypt");
const multer = require("multer");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const PORT = 3000;
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const sqlite3 = require("sqlite3").verbose();
const ip = require("ip");
const serverAddress = ip.address("public");
const content = `const serverAddress = '${serverAddress}'`;
fs.writeFile("./serverVariables.js", content, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Server address: ${serverAddress}`);
  }
});

// Prefix all console logs with local date/time for readability
(() => {
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => {
    try { origLog(`${new Date().toLocaleString()} -`, ...args); } catch (_) { origLog(...args); }
  };
  console.error = (...args) => {
    try { origErr(`${new Date().toLocaleString()} -`, ...args); } catch (_) { origErr(...args); }
  };
})();

// Lightweight logging helpers (stdout only)
function maskEmail(email) {
  try {
    if (!email) return "";
    const parts = String(email).split("@");
    if (parts.length < 2) return String(email);
    const user = parts[0];
    const domain = parts.slice(1).join("@");
    const maskedUser = user.length <= 2 ? `${user.charAt(0)}…` : `${user.slice(0, 2)}…`;
    return `${maskedUser}@${domain}`;
  } catch (_) {
    return "";
  }
}
function shortToken(token) {
  if (!token) return "";
  const t = String(token);
  return t.length <= 10 ? t : `${t.slice(0, 4)}…${t.slice(-4)}`;
}
// Disable structured JSON logs; keep human-friendly console lines only
function log() { /* no-op */ }
const logInfo = () => {};
const logWarn = () => {};
const logError = () => {};
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fsPromises.access("uploads/");
    } catch (err) {
      if (err && err.code === "ENOENT") {
        await fsPromises.mkdir("uploads/", { recursive: true });
      }
    }
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append the extension
  },
});
const upload = multer({ storage: storage });
// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for allowing cross-origin requests
app.use(cors());

// ------------------------------
// Gentle in-memory rate limiting
// ------------------------------
const loginRate = new Map(); // key: email -> { fails: number[], blockUntil: number }
const resetRate = new Map(); // key: email -> { tries: number[], blockUntil: number }

const LOGIN_WINDOW_MS = 60 * 1000; // 1 minute
const LOGIN_MAX_ATTEMPTS = 5; // free attempts per minute
const LOGIN_BASE_COOLDOWN_MS = 30 * 1000; // +30s per attempt beyond threshold
const LOGIN_MAX_COOLDOWN_MS = 5 * 60 * 1000; // cap at 5 minutes

const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RESET_MAX_ATTEMPTS = 3;
const RESET_BASE_COOLDOWN_MS = 5 * 60 * 1000; // +5 minutes per extra
const RESET_MAX_COOLDOWN_MS = 15 * 60 * 1000; // cap at 15 minutes

function secondsLeft(ts) {
  return Math.max(0, Math.ceil((ts - Date.now()) / 1000));
}
function pruneWindow(arr, windowMs) {
  const cutoff = Date.now() - windowMs;
  return arr.filter((t) => t > cutoff);
}
function loginPrecheck(email) {
  const key = String(email || '').toLowerCase();
  const rec = loginRate.get(key);
  if (rec && rec.blockUntil && rec.blockUntil > Date.now()) {
    return secondsLeft(rec.blockUntil);
  }
  return 0;
}
function registerLoginFailure(email) {
  const key = String(email || '').toLowerCase();
  const rec = loginRate.get(key) || { fails: [], blockUntil: 0 };
  rec.fails = pruneWindow([ ...(rec.fails||[]), Date.now() ], LOGIN_WINDOW_MS);
  if (rec.fails.length > LOGIN_MAX_ATTEMPTS) {
    const over = rec.fails.length - LOGIN_MAX_ATTEMPTS;
    const cooldown = Math.min(LOGIN_BASE_COOLDOWN_MS * over, LOGIN_MAX_COOLDOWN_MS);
    rec.blockUntil = Date.now() + cooldown;
  }
  loginRate.set(key, rec);
  return rec.blockUntil ? secondsLeft(rec.blockUntil) : 0;
}
function registerLoginSuccess(email) {
  const key = String(email || '').toLowerCase();
  loginRate.delete(key);
}
function resetPrecheck(email) {
  const key = String(email || '').toLowerCase();
  const rec = resetRate.get(key);
  if (rec && rec.blockUntil && rec.blockUntil > Date.now()) {
    return secondsLeft(rec.blockUntil);
  }
  return 0;
}
function registerResetTry(email) {
  const key = String(email || '').toLowerCase();
  const rec = resetRate.get(key) || { tries: [], blockUntil: 0 };
  rec.tries = pruneWindow([ ...(rec.tries||[]), Date.now() ], RESET_WINDOW_MS);
  if (rec.tries.length > RESET_MAX_ATTEMPTS) {
    const over = rec.tries.length - RESET_MAX_ATTEMPTS;
    const cooldown = Math.min(RESET_BASE_COOLDOWN_MS * over, RESET_MAX_COOLDOWN_MS);
    rec.blockUntil = Date.now() + cooldown;
  }
  resetRate.set(key, rec);
  return rec.blockUntil ? secondsLeft(rec.blockUntil) : 0;
}

//API endpoint to get the teacher info
app.get("/getUserInfo", async (req, res) => {
  try {
    let email = req.query.email;
    let userId = req.query.userId;
    if (userId) {
      const user = await db.getUserInfo(userId, "userId");
      if (user !== undefined) {
        res.send(user)
      };
    } else if (email) {
      const user = await db.getUserInfo(email, "email");
      if (user !== undefined) {
        res.send(user);
      }

    } else {
      res
        .status(400)
        .send({ body: "Bad Request: Either userId or email must be provided." });
    }
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).send({ body: "Error fetching user info" });
  }
});

//API endpoint to get the student info
app.get("/getAllStudents", async (req, res) => {
  try {
    let isTeacher = false;
    const student = await db.getAllTeachersOrStudents(isTeacher);
    res.send(student);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching students");
  }
});
app.get("/getAllStudentsPagination", async (req, res) => {
  try {
    let isTeacher = false;
    const student = await db.getAllTeachersOrStudentsPagination(isTeacher);

    res.json(student);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching students");
  }
});

app.get("/getAllUsers", async (req, res) => {
  try {
    let isTeacher = req.query.isTeacher || false;
    const users = await db.getAllTeachersOrStudents(isTeacher);

    res.json(users);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching Users");
  }
});

app.get("/get-cosponsors/:club", async (req, res) => {
  try {
    const club = req.params.club;
    const cosponsors = await db.getCoSponsors(club);
    // console.log(cosponsors)
    res.send({ cosponsors: cosponsors });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /get-cosponsors/:club failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/get-students-in-club/:club", async (req, res) => {
  try {
    const club = req.params.club;
    const students = await db.getTeachersOrStudentsInClub(club, false);
    // console.log(cosponsors)
    res.send({ students });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /get-students-in-club/:club failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// API endpoint to get the list of clubs
app.get("/getUnapprovedClubs", async (req, res) => {
  try {
    const unApprovedClubs = await db.getUnapprovedClubs();
    res.json(unApprovedClubs);
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /getUnapprovedClubs failed: ${String(err)} at ${ts}`);
    res.send({ body: "Error fetching clubs" });
  }
});

app.get("/getAllClubs", async (req, res) => {
  try {
    const allClubs = await db.getAllClubs();
    res.send(allClubs);
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /getAllClubs failed: ${String(err)} at ${ts}`);
    res.send({ body: "Error fetching clubs" });
  }
});

app.get("/getClubById", async (req, res) => {
  try {
    const clubId = req.query.club;
    const clubInfo = await db.getClubInfo(clubId);
    res.json(clubInfo);
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /getClubById failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/club-info/:club", async (req, res) => {
  try {
    let clubId = parseInt(req.params.club);

    if (req.query.view) {
      //console.log(req.query);
      const clubInfo = await db.getClubInfo(clubId);
      const getAllStudents = await db.getAllUsers();

      const getClubStudents = getAllStudents.filter(
        (user) => user.clubId === clubId && !user.isTeacher
      );

      res.send({ clubInfo: clubInfo, clubStudents: getClubStudents });
    } else {
      res.redirect(`http://${serverAddress}/club-info.html?club-id=${clubId}`);
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /club-info/:club failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/users/delete/:id", async (req, res) => {
  try {
    let userId = req.params.id;
    const ts = new Date().toLocaleString();
    console.log(`Delete User Attempt: userId ${userId}`);
    const deleted = await db.deleteUser(userId);
    if (deleted) {
      console.log(`Delete User Success: userId ${userId}`);
      res.send({ body: "Success" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /users/delete/:id failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.get("/usersInfo/:user", async (req, res) => {
  try {
    let userId = req.params.user;
    const user = await db.getUser(userId);
    res.json(user);
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /usersInfo/:user failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
})

app.get("/users/update/:user/:club/", async (req, res) => {
  try {
    let userId = req.params.user;
    let clubId = req.params.club;
    const ts = new Date().toLocaleString();
    console.log(`Assign Club Attempt: userId ${userId} clubId ${clubId}`);
    const club = await db.getClubInfo(clubId);
    const user = await db.getUser(userId);
    const allClubs = await db.getAllClubs();
    allClubs.forEach(async (club) => {
      if (club.primaryTeacherId === user.userId) {
        await db.updateClubValue(club.clubId, "primaryTeacherId", null);
        await db.updateClubValue(club.clubId, "isApproved", false);
      }
    }
    );

    const added = await db.assignClub(userId, clubId, user.isTeacher);
    if (added) {
      console.log(`Assign Club Success: userId ${user.userId} clubId ${clubId}`);
      res.send({ body: true, club });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /users/update/:user/:club failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.get("/users/updateStudentClub/:user/:club", async (req, res) => {
  try {
    let userId = req.params.user;
    let clubId = req.params.club;
    const ts = new Date().toLocaleString();
    console.log(`Assign Student Club Attempt: userId ${userId} clubId ${clubId}`);

    const added = await db.assignClubToStudent(userId, clubId);

    if (added) {
      console.log(`Assign Student Club Success: userId ${userId} clubId ${clubId}`);
      res.send({ body: "Success" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /users/updateStudentClub/:user/:club failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.get("/users/:type", async (req, res) => {
  try {
    let isTeacher = false;
    let userType = req.params.type;
    if (userType === "teachers") {
      isTeacher = true;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "userId";
    const sortDirection = req.query.sortDirection === "desc" ? "DESC" : "ASC";

    try {
      const { users, total } = await db.getAllTeachersOrStudentsPagination(
        isTeacher,
        page,
        limit,
        search,
        sortBy,
        sortDirection
      );
      const totalPages = Math.ceil(total / limit);

      res.send({ users, total, totalPages });
    } catch (err) {
      console.error("Error: ", err);
      res.status(500).send("Error fetching Users");
    }
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching Users");
  }
});

app.post("/deleteClub", async (req, res) => {
  try {
    const clubId = req.body.clubId;
    const ts = new Date().toLocaleString();
    console.log(`Delete Club Attempt: clubId ${clubId}`);
    const allUsers = await db.getAllUsersInClub(clubId);
    const usersInClub = allUsers.filter((user) => user.clubId === clubId);
    const deleted = await db.deleteClub(clubId);
    if (deleted) {
      console.log(`Delete Club Success: clubId ${clubId}`);
      usersInClub.forEach(async (user) => {
        await db.updateUserValue(user.userId, "clubId", null);
      });

      res.send({ body: "Success" });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /deleteClub failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/approveClub", async (req, res) => {
  try {
    const clubInfo = req.body;
    const ts = new Date().toLocaleString();
    console.log(`Approve Club Attempt: clubId ${clubInfo.clubId}`);

    await db.approveClub(clubInfo.clubId);

    console.log(`Approve Club Success: clubId ${clubInfo.clubId}`);
    res.send({ body: "Success", clubInfo });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /approveClub failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/updateClub", async (req, res) => {
  try {
    const changeData = req.body;
    const ts = new Date().toLocaleString();
    console.log(`Update Club Attempt: clubId ${changeData.clubId}`);
    if (changeData.addedCoSponsor) {
      await db.updateUserValue(
        parseInt(changeData.addedCoSponsor),
        "clubId",
        changeData.clubId
      );
    }
    if (changeData.removedCoSponsor) {
      await db.updateUserValue(
        parseInt(changeData.removedCoSponsor),
        "clubId",
        null
      );
    }
    const clubInfo = await db.getClubInfo(changeData.clubId);
    const teacherIdToNull = clubInfo.primaryTeacherId;
    await db.removeClubFromUser(teacherIdToNull);
    if (changeData.isApproved === "true") {
      changeData.isApproved = true;
    } else if (changeData.isApproved === "false") {
      changeData.isApproved = false;
    }
    const success = await db.updateClub(changeData);

    if (success) {
      console.log(`Update Club Success: clubId ${changeData.clubId}`);
      res.send({ body: "Success", changeData });
    } else {
      res.send("Error");
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /updateClub failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/submit-attendance", async (req, res) => {
  try {
    const { presentStudents, absentStudents, clubId, date } = req.body;
    const ts = new Date().toLocaleString();
    console.log(`Submit Attendance: clubId ${clubId} date ${date}`);
    const success = await db.submitAttendance(
      presentStudents,
      absentStudents,
      clubId,
      date
    );
    if (success) {
      console.log(`Submit Attendance Success: clubId ${clubId} date ${date}`);
      res.send({ body: "Success" });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const timestamp = new Date().toLocaleString();
    console.log(`Route /submit-attendance failed: ${String(e)} at ${timestamp}`);
    res.send("Error. Contact admin")
  }
});

app.get("/check-attendance/:club/:date", async (req, res) => {
  try {
    const clubId = req.params.club;

    const date = req.params.date;
    const ts = new Date().toLocaleString();
    console.log(`Check Attendance: clubId ${clubId} date ${date}`);

    const students = await db.checkAttendance(clubId, date);

    if (students) {
      console.log(`Check Attendance Success: clubId ${clubId} date ${date}`);
      res.send({ body: "Success", students: students });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /check-attendance/:club/:date failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/updateUser", async (req, res) => {
  try {
    const changeData = req.body;
    const ts = new Date().toLocaleString();
    console.log(`Update User Attempt: userId ${changeData.userId || changeData.id || 'unknown'}`);
    const updateUser = await db.updateUser(changeData);
    if (updateUser === "Success") {
      console.log(`Update User Success: userId ${changeData.userId || changeData.id || 'unknown'}`);
      res.send({ body: "Success", updatedUserData: updateUser });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /updateUser failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/setClubPrefs", async (req, res) => {
  try {
    const clubPrefs = req.body.clubOrder;
    const studentId = req.body.student;
    const ts = new Date().toLocaleString();
    console.log(`Set Club Prefs: studentId ${studentId} count ${Array.isArray(clubPrefs) ? clubPrefs.length : (clubPrefs || '').toString().split(',').filter(Boolean).length}`);
    const updateUser = await db.updateClubPrefs(clubPrefs, studentId);
    //console.log(updateUser)
    res.send({ body: "Success", updatedUserData: updateUser });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /setClubPrefs failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// POST route to handle form submission from clubCreation.html
app.post("/addClub", upload.single("cover"), async (req, res) => {
  try {
    const clubInfo = req.body;
    const coverPath = req.file ? req.file.path : "NULL";
    clubInfo.cover = coverPath;
    const ts = new Date().toLocaleString();
    console.log(`Create Club Attempt: name '${clubInfo.preferredClub || clubInfo.clubName || 'unknown'}' teacherId ${clubInfo.teacherId || clubInfo.primaryTeacherId || 'unknown'}`);
    await db.addClub(clubInfo);
    console.log(`Create Club Success: name '${clubInfo.preferredClub || clubInfo.clubName || 'unknown'}'`);
    res.send({ body: "Success", clubInfo });
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /addClub failed: ${String(err)} at ${ts}`);
    res.send({ body: err });
  }
});

//Create Account
app.post("/addAccount", async (req, res) => {
  try {
    const ts0 = new Date().toLocaleString();
    console.log("Received POST request to /addAccount");

    const userInfo = req.body;
    //console.log(userInfo);
    userInfo.firstName = await capitalizeName(userInfo.firstName);
    userInfo.lastName = await capitalizeName(userInfo.lastName);
    userInfo.password = await encryptPassword(userInfo.password);
    userInfo.email = userInfo.email.toLowerCase().trim();
    userInfo.isTeacher = userInfo.isTeacher == "true";
    console.log(`Add Account Attempt: ${userInfo.email} isTeacher=${userInfo.isTeacher ? 1 : 0}`);

    const userCheckData = await db.checkUser(userInfo.email);
    if (userCheckData.userExists === true) {
      const ts = new Date().toLocaleString();
      console.log(`Add Account Blocked (exists): ${userInfo.email}`);
      res.send({ body: "User already exists" });
    } else {
      if (!userInfo.isTeacher) {
        console.log(userInfo.email)
        if (!userInfo.email.includes("@students.hcde.org")) {
          const ts = new Date().toLocaleString();
          console.log(`Add Account Blocked (invalid student domain): ${userInfo.email}`);
          res.send({ body: "Invalid email address" });
          return;
        }
      }
      db.addUser(userInfo);
      const ts2 = new Date().toLocaleString();
      console.log(`Add Account Success: ${userInfo.email} isTeacher=${userInfo.isTeacher ? 1 : 0}`);
      res.send({ body: "true", user: userInfo });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /addAccount failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/getAttendanceFromDate", async (req, res) => {
  try {
    const ts = new Date().toLocaleString();
    console.log(`Get Attendance From Date: date ${req.body.date}`);
    let attendance = await db.getAttendanceFromDate(req.body.date);
    console.log(`Get Attendance From Date Success: rows ${attendance ? attendance.length : 0}`);
    res.send({ attendance: attendance });
  } catch (e) {
    const timestamp = new Date().toLocaleString();
    console.log(`Route /getAttendanceFromDate failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
})

app.post("/login", async (req, res) => {
  const timestamp = new Date().toLocaleString();
  try {
    const rawEmail = req.body.email;
    console.log(`Login Attempt : ${rawEmail}`);
    const wait = loginPrecheck(rawEmail);
    if (wait > 0) {
      console.log(`Login Rate Limited : ${rawEmail} wait ${wait}s`);
      return res.send({ body: false, error: `Too many attempts. Please wait ${wait}s and try again.` });
    }
    logInfo("auth.login.attempt", { emailMasked: maskEmail(rawEmail) });
    const email = req.body.email.toLowerCase();
    const password = req.body.password;
    const userCheckData = await db.checkUser(email);

    if (userCheckData.userExists === true) {
      const hashedPassword = userCheckData.password;
      if (await bcrypt.compare(password, hashedPassword)) {
        const userObject = await db.getUserInfo(email, "email");
        delete userObject.password;
        logInfo("auth.login.success", { userId: userObject.userId, isTeacher: userObject.isTeacher });
        console.log(`Login Success : ${email}`);
        registerLoginSuccess(email);
        res.send({ body: true, userObject });
      } else {

        logWarn("auth.login.failed", { emailMasked: maskEmail(email), reason: "invalid_password" });
        console.log(`Login Failed (invalid password) : ${email}`);
        registerLoginFailure(email);
        res.send({
          body: false,
          error: "Your password is incorrect. Please try again.",
        });
      }
    } else {
      logWarn("auth.login.failed", { emailMasked: maskEmail(email), reason: "not_found" });
      console.log(`Login Failed (not found) : ${email}`);
      registerLoginFailure(email);
      res.send({
        body: false,
        error: "User not found",
      });
    }
  } catch (e) {
    logError("auth.login.error", { error: String(e) });
    console.log(`Login Error : ${String(e)}`);
    res.redirect("https://forms.gle/G9LTphV8L3rpDGkF7")
    console.log("This is the messed up error that was happening when the body was empty")
  }
});

app.post("/admin-erase", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Erase Student Clubs Attempt`);
      const deleted = await db.deleteAllStudentClubs();
      if (deleted) {
        console.log(`Admin Erase Student Clubs Success`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-erase failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/admin-erase-all-clubs", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Erase All Clubs Attempt`);
      const deleted = await db.deleteAllClubs();
      if (deleted) {
        console.log(`Admin Erase All Clubs Success`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-erase-all-clubs failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-clubs", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      let teacherId = req.body.teacherId;
      const ts = new Date().toLocaleString();
      console.log(`Admin Create Clubs Attempt: count ${req.body.numOfClubs} teacherId ${teacherId}`);
      const created = await db.createRandomClubs(req.body.numOfClubs, teacherId);

      if (created) {
        console.log(`Admin Create Clubs Success: count ${req.body.numOfClubs}`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-create-clubs failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-students", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Create Students Attempt: count ${req.body.numOfStudents}`);
      const created = await db.createRandomGuys(req.body.numOfStudents);
      if (created) {
        console.log(`Admin Create Students Success: count ${req.body.numOfStudents}`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-create-students failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-teachers", async (req, res) => {
  try {
    // console.log(req.body.numOfStudents);
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Create Teachers Attempt: count ${req.body.numOfTeachers}`);
      const created = await db.createRandomTeachers(req.body.numOfTeachers);
      if (created) {
        console.log(`Admin Create Teachers Success: count ${req.body.numOfTeachers}`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-create-teachers failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// Import teachers from an uploaded old SQLite database
app.post("/admin-import-teachers", upload.single("olddb"), async (req, res) => {
  try {
    const adminFlag = String(req.body.isAdmin || "").toLowerCase();
    const isAdmin = ["true", "1", "yes", "on"].includes(adminFlag);
    if (!isAdmin) {
      return res.status(403).send({ body: "Error", error: "Not authorized" });
    }
    if (!req.file) {
      return res.status(400).send({ body: "Error", error: "No database file uploaded" });
    }
    const ts = new Date().toLocaleString();
    console.log(`Admin Import Teachers Begin: file ${req.file.path}`);

    const oldDbPath = req.file.path;
    const openOldDb = (p) =>
      new Promise((resolve, reject) => {
        const odb = new sqlite3.Database(p, sqlite3.OPEN_READONLY, (err) => {
          if (err) return reject(err);
          resolve(odb);
        });
      });
    let oldDb;
    try {
      oldDb = await openOldDb(oldDbPath);
    } catch (e) {
      console.error("Error opening old database:", e);
      return res.status(400).send({ body: "Error", error: "Cannot open uploaded database file" });
    }

    const selectTeachers = () =>
      new Promise((resolve, reject) => {
        oldDb.all("SELECT * FROM users WHERE isTeacher = 1", [], (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });

    const teachers = await selectTeachers();
    let imported = 0;
    let skipped = 0;

    for (const t of teachers) {
      // Prefer copying minimal safe fields; keep existing password hashes
      const sql = `INSERT OR IGNORE INTO users (firstName, lastName, avatar, grade, clubId, room, email, password, isTeacher, isAdmin, clubPreferences)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
      try {
        await db.run(sql, [
          t.firstName || null,
          t.lastName || null,
          t.avatar || null,
          t.grade ?? null,
          null, // do not carry over old clubId into fresh DB
          t.room || null,
          t.email || null,
          t.password || null,
          1,
          t.isAdmin ? 1 : 0,
          null,
        ]);
        imported++;
      } catch (e) {
        // Likely unique(email) conflict, treat as skipped
        skipped++;
      }
    }

    oldDb.close();
    console.log(`Admin Import Teachers Done: imported ${imported} skipped ${skipped}`);
    res.send({ body: "Success", imported, skipped });
  } catch (e) {
    console.error(e);
    res.status(500).send({ body: "Error", error: "Failed to import teachers" });
  }
});

// Import students from uploaded XLS file (drag-and-drop)
app.post("/admin-import-students-xls", upload.single("studentsXls"), async (req, res) => {
  try {
    const adminFlag = String(req.body.isAdmin || "").toLowerCase();
    const isAdmin = ["true", "1", "yes", "on"].includes(adminFlag);
    if (!isAdmin) {
      return res.status(403).send({ body: "Error", error: "Not authorized" });
    }
    if (!req.file) {
      return res.status(400).send({ body: "Error", error: "No XLS file uploaded" });
    }
    const ts = new Date().toLocaleString();
    console.log(`Admin Import Students Begin: file ${req.file.path}`);
    const node_xj = require("xls-to-json");

    const parseXls = (filePath) =>
      new Promise((resolve, reject) => {
        node_xj(
          {
            input: filePath,
            output: null,
            rowsToSkip: 0,
            allowEmptyKey: false,
          },
          (err, result) => {
            if (err) return reject(err);
            resolve(result || []);
          }
        );
      });

    const records = await parseXls(req.file.path);
    console.log(`Admin Import Students Parsed: rows ${records.length}`);

    const encryptPassword = (password) => bcrypt.hash(password, 10);

    const formatDOBToMMDDYYYY = (dob) => {
      if (!dob) return "";
      const s = dob.toString().trim();
      const m = s.match(/(\d{1,2})\D(\d{1,2})\D(\d{2,4})/);
      if (!m) return s.replace(/\D/g, "");
      let month = m[1].padStart(2, "0");
      let day = m[2].padStart(2, "0");
      let year = m[3];
      if (year.length === 2) {
        year = parseInt(year, 10) >= 70 ? `19${year}` : `20${year}`;
      } else {
        year = year.padStart(4, "0");
      }
      return `${month}${day}${year}`;
    };

    // Preprocess + hash in parallel (limited by libuv threadpool)
    const candidates = records.filter((r) => r.First_Name);
    const prepared = await Promise.all(
      candidates.map(async (student) => {
        const firstName = (student.First_Name || "").toString();
        const lastName = (student.Last_Name || "").toString();
        const email = (student.Student_Email_DONOTUSE || "").toString().toLowerCase();
        const gradeRaw = student.Grade_Level;
        const grade =
          gradeRaw === "" || gradeRaw == null ? null : parseInt(gradeRaw);
        const dob = (student.DOB || "").toString();
        const passwordDate = formatDOBToMMDDYYYY(dob);
        const firstThree = firstName.replace("'", "").substring(0, 3).toLowerCase();
        const passwordPlain = `${passwordDate}${firstThree}`;
        const password = await encryptPassword(passwordPlain);
        return { firstName, lastName, email, grade, password };
      })
    );

    const { imported, skipped } = await db.addStudentsBulk(prepared);
    console.log(`Admin Import Students Done: imported ${imported} skipped ${skipped}`);
    res.send({ body: "Success", imported, skipped });
  } catch (e) {
    console.error(e);
    res.status(500).send({ body: "Error", error: "Failed to import students" });
  }
});

app.post("/admin-erase-students", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
    console.log(`Admin Erase All Students Attempt`);
      const deleted = await db.deleteAllStudents();
      if (deleted) {
        console.log(`Admin Erase All Students Success`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-erase-students failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/admin-club-assignment", async (req, res) => {
  try {
    const ts = new Date().toLocaleString();
    console.log(`Admin Club Assignment Begin`);
    const clubAssignment = await ca.main();
    if (clubAssignment) {
      console.log(`Admin Club Assignment Success`);
      res.send({ body: "Success" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-club-assignment failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

async function encryptPassword(password) {
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Return the hashed password
    return hashedPassword;
  } catch (error) {
    console.error("Error encrypting password:", error);
  }
}

async function capitalizeName(name) {
  try {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  } catch (e) {
    console.log(e);
    console.log("Can't capitalizeName(name)");
    res.send("Error. Contact admin")
  }
}

app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    const newAvatarPath = req.file.path;
    const user = parseInt(req.body.userId);
    const ts = new Date().toLocaleString();
    console.log(`Upload Avatar Attempt: userId ${user}`);

    const avatar = await db.uploadAvatar(user, newAvatarPath);
    if (avatar) {
      console.log(`Upload Avatar Success: userId ${user} path ${newAvatarPath}`);
      res.send({ body: "Success", avatarPath: newAvatarPath });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /upload-avatar failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/upload-cover-photo", upload.single("cover"), async (req, res) => {
  try {
    const newAvatarPath = req.file.path;
    const club = parseInt(req.body.clubId);
    const ts = new Date().toLocaleString();
    console.log(`Upload Cover Attempt: clubId ${club}`);

    const avatar = await db.uploadCover(club, newAvatarPath);
    if (avatar) {
      console.log(`Upload Cover Success: clubId ${club} path ${newAvatarPath}`);
      res.send({ body: "Success", avatarPath: newAvatarPath });
    } else {
      res.send({ body: "Error" });
    }
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /upload-cover-photo failed: ${String(err)} at ${ts}`);
    res.send({ body: "Error can't upload photo" });
  }
});

app.get("/check-reset-email", async (req, res) => {
  try {

    const email = req.query.email.toLowerCase();

    const userExists = await db.checkUser(email);
    const exists = userExists !== "User does not exist" && userExists && userExists.userExists === true;
    const ts = new Date().toLocaleString();
    console.log(`Check Reset Email : ${email} exists=${exists} at ${ts}`);
    logInfo("reset.checkEmail", { emailMasked: maskEmail(email), exists });
    res.send({ body: userExists });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Check Reset Email Error : ${String(e)} at ${ts}`);
    logError("reset.checkEmail.error", { error: String(e) });
    res.send("Error. Contact admin")
  }
});

app.post("/request-password-confirm", async (req, res) => {
  try {
    const password = req.body.password;
    const userToken = req.body.token;
    const ts = new Date().toLocaleString();
    console.log(`Reset Confirm Begin : token ${shortToken(userToken)}`);
    logInfo("reset.confirm.begin", { token: shortToken(userToken) });
    const databaseInfo = await db.checkResetPasswordToken(userToken);
    if (!databaseInfo) {
      console.log(`Reset Confirm Invalid Token : token ${shortToken(userToken)}`);
      logWarn("reset.confirm.invalid", { token: shortToken(userToken) });
      return res.status(400).send({ body: "Error", reason: "Invalid token" });
    }
    const databaseToken = databaseInfo.token;
    // Validate token and expiration (must be in the future)
    const exp = databaseInfo && databaseInfo.expiration;
    let expMs = 0;
    if (typeof exp === 'number') {
      expMs = exp;
    } else if (typeof exp === 'string') {
      const n = parseInt(exp, 10);
      expMs = Number.isNaN(n) ? Date.parse(exp) : n;
    } else if (exp instanceof Date) {
      expMs = exp.getTime();
    }
    const notExpired = !!expMs && expMs > Date.now();
    if (databaseInfo.token === databaseToken && notExpired) {
      // Ensure only teachers can reset passwords
      const userRecord = await db.getUser(databaseInfo.user_id);
      if (!userRecord || parseInt(userRecord.isTeacher, 10) !== 1) {
        console.log(`Reset Confirm Not Permitted : userId ${databaseInfo.user_id}`);
        logWarn("reset.confirm.notPermitted", { userId: databaseInfo.user_id, token: shortToken(userToken) });
        return res.status(403).send({ body: "Error", reason: "Not permitted" });
      }
      const newPass = await encryptPassword(password);

      const updateUser = await db.resetUserPassword(
        databaseInfo.user_id,
        newPass
      );
      // Invalidate the token after successful reset
      try {
        await db.deleteResetPasswordToken(userToken);
      } catch (e) {
        logError("reset.confirm.tokenDelete.error", { userId: databaseInfo.user_id, error: String(e) });
      }
      console.log(`Reset Confirm Success : userId ${databaseInfo.user_id}`);
      logInfo("reset.confirm.success", { userId: databaseInfo.user_id, token: shortToken(userToken) });
      return res.send({ body: "Success" });
    } else {
      console.log(`Reset Confirm Expired : token ${shortToken(userToken)}`);
      logWarn("reset.confirm.expired", { token: shortToken(userToken), expMs, now: Date.now() });
      return res.status(400).send({ body: "Error", reason: "Expired token" });
    }
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Reset Confirm Error : ${String(err)}`);
    logError("reset.confirm.error", { error: String(err) });
    res.send({ body: "Error" });
  }
});

app.post("/request-password-reset", async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const userObject = await db.getUserByEmail(email);
    const userId = userObject && userObject.userId;
    const ts = new Date().toLocaleString();
    console.log(`Reset Requested : ${email}`);
    const resetWait = resetPrecheck(email);
    if (resetWait > 0) {
      console.log(`Reset Rate Limited : ${email} wait ${resetWait}s`);
      return res.send({ body: "Error", error: `Too many reset requests. Please wait ${resetWait}s and try again.` });
    }
    // record this request toward rate limits regardless of role
    registerResetTry(email);
    logInfo("reset.request.begin", { emailMasked: maskEmail(email), userId });
    // Only teachers can receive reset codes (isTeacher stored as 0/1)
    if (userObject && userId && parseInt(userObject.isTeacher, 10) === 1) {
      const token = crypto.randomBytes(20).toString("hex");
      const expiration = Date.now() + 8 * 60 * 60 * 1000; // store as epoch ms (8 hours from now)
      const sendTokenToDatabase = await db.setResetPasswordToken(
        userId,
        token,
        expiration
      );

      // Send email with the token

      const transporter = nodemailer.createTransport({
        host: `gbs423.com`,
        port: 465,
        secure: true, // use SSL
        auth: {
          user: "form@gbs423.com",
          pass: "Wafflesthedog6969!",
        },
      });

      const resetLink = `http://${serverAddress}/reset-password.html?token=${token}`;
      const plainText = `Hello ${userObject.firstName},\n\nYou requested a password reset.\n\nReset your password using this link (expires in 8 hours):\n${resetLink}\n\nIf you did not request a password change, you can ignore this email.`;
      const htmlBody = `
        <div style="padding:24px; background-color:#0a0a0a; color:#ffffff; font-size:16px; line-height:1.5;">
          <h2 style="margin-top:0; color:#ffffff;">Hello ${userObject.firstName},</h2>
          <p>You requested a password reset.</p>
          <p><a style="color:#0f7ae5;" href="${resetLink}">Click here to reset your password</a></p>
          <p style="color:#cbd5e1;">This link expires in 8 hours.</p>
          <p style="color:#9ca3af;">If you did not request a password change, you can ignore this email.</p>
        </div>`;

      const mailOptions = {
        from: "RBHS Club Creator Password Reset <form@gbs423.com>",
        to: email,
        subject: "RBHS Clubs Password Reset (expires in 8 hours)",
        text: plainText,
        html: htmlBody,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(`Reset Email Error : ${email} error=${String(err)}`);
          logError("reset.request.emailError", { emailMasked: maskEmail(email), userId, error: String(err) });
          throw err;
        }
        console.log(`Reset Email Sent : ${email} messageId=${info && (info.messageId || info.response)}`);
        logInfo("reset.request.sent", {
          emailMasked: maskEmail(email),
          userId,
          token: shortToken(token),
          messageId: info && (info.messageId || info.response)
        });
        res.send({ body: "Success", email: email });
      });
    } else {
      // Do not send a token; indicate not allowed
      console.log(`Reset Request Blocked (not teacher) : ${email}`);
      logWarn("reset.request.notTeacher", { emailMasked: maskEmail(email), userId, isTeacher: userObject ? userObject.isTeacher : undefined });
      return res.send({ body: "NotTeacher" });
    }
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Reset Request Error : ${String(err)}`);
    logError("reset.request.error", { error: String(err) });
    res.send({ body: "Error" });
  }
});
