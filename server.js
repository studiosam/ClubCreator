const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs").promises;
const db = require("./database.js"); // Import your database functions
const ca = require("./clubAssignment.js");
const app = express();
const bcrypt = require("bcrypt");
const multer = require("multer");
const PORT = 3000;
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.access("uploads/");
    } catch (err) {
      if (err.code === "ENOENT") {
        await fs.mkdir("uploads/", { recursive: true });
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

//API endpoint to get the teacher info
app.get("/getUserInfo", async (req, res) => {
  let email = req.query.email;
  let userId = req.query.userId;
  // console.log(email);
  // console.log(userId);
  try {
    if (userId) {
      const user = await db.getUserInfo(userId, "userId");
      res.send(user);
    } else if (email) {
      const user = await db.getUserInfo(email, "email");
      res.send(user);
    } else {
      res
        .status(400)
        .send("Bad Request: Either userId or email must be provided.");
    }
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).send("Error fetching user info");
  }
});

//API endpoint to get the student info
app.get("/getAllStudents", async (req, res) => {
  let isTeacher = false;
  try {
    const student = await db.getAllTeachersOrStudents(isTeacher);
    res.send(student);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching students");
  }
});
app.get("/getAllStudentsPagination", async (req, res) => {
  let isTeacher = false;
  try {
    const student = await db.getAllTeachersOrStudentsPagination(isTeacher);

    res.json(student);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching students");
  }
});

app.get("/getAllUsers", async (req, res) => {

  let isTeacher = req.query.isTeacher || false;
  try {
    const users = await db.getAllTeachersOrStudents(isTeacher);

    res.json(users);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching Users");
  }
});

app.get("/get-cosponsors/:club", async (req, res) => {
  const club = req.params.club;
  const cosponsors = await db.getCoSponsors(club)
  // console.log(cosponsors)
  res.send({ "cosponsors": cosponsors });
});
app.get("/get-students-in-club/:club", async (req, res) => {
  const club = req.params.club;
  const students = await db.getTeachersOrStudentsInClub(club, false)
  // console.log(cosponsors)
  res.send({ students });
});

// API endpoint to get the list of clubs
app.get("/getUnapprovedClubs", async (req, res) => {
  try {
    const unApprovedClubs = await db.getUnapprovedClubs();
    res.json(unApprovedClubs);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching clubs");
  }
});
app.get("/getAllClubs", async (req, res) => {
  try {
    const allClubs = await db.getAllClubs();
    res.send(allClubs);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching clubs");
  }
});
app.get("/getClubById", async (req, res) => {
  const clubId = req.query.club;

  const clubInfo = await db.getClubInfo(clubId);
  res.json(clubInfo);
});

app.get("/club-info/:club", async (req, res) => {
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
    res.redirect(`http://127.0.0.1:5500/club-info.html?club-id=${clubId}`);
  }
});

app.get("/users/delete/:id", async (req, res) => {
  let userId = req.params.id;
  const deleted = await db.deleteUser(userId);
  if (deleted) {
    console.log(`Deleted user ${userId}`);
    res.send({ body: "Success" });
  }
});

app.get("/users/update/:user/:club", async (req, res) => {
  let userId = req.params.user;
  let clubId = req.params.club;
  const club = await db.getClubInfo(clubId);
  const user = await db.getUser(userId);
  const allClubs = await db.getAllClubs();
  allClubs.forEach(async (club) => {
    if (club.primaryTeacherId === user.userId) {
      await db.updateClubValue(club.clubId, 'primaryTeacherId', null)
      await db.updateClubValue(club.clubId, 'isApproved', false)
    }
  })



  const added = await db.assignClub(userId, clubId, user.isTeacher);
  if (added) {
    console.log(`Club ${clubId} added to user ${user.userId}`);
    res.send({ body: "Success" });
  }
});
app.get("/users/updateStudentClub/:user/:club", async (req, res) => {
  let userId = req.params.user;
  let clubId = req.params.club;

  const added = await db.assignClubToStudent(userId, clubId);

  if (added) {
    console.log(`Club ${clubId} added to user ${userId.userId}`);
    res.send({ body: "Success" });
  }
});

app.get("/users/:type", async (req, res) => {
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
});

app.post("/deleteClub", async (req, res) => {
  const clubId = req.body.clubId;
  const allUsers = await db.getAllUsersInClub(clubId);
  const usersInClub = allUsers.filter((user) =>
    user.clubId === clubId
  )
  const deleted = await db.deleteClub(clubId);
  if (deleted) {
    usersInClub.forEach(async (user) => {
      await db.updateUserValue(user.userId, 'clubId', null);
    })

    res.send({ body: "Success" });
  } else {
    res.send({ body: "Error" });
  }
});

app.post("/approveClub", async (req, res) => {
  const clubInfo = req.body;

  await db.approveClub(clubInfo.clubId);

  res.send({ body: "Success", clubInfo });
});

app.post("/updateClub", async (req, res) => {
  const changeData = req.body;
  if (changeData.addedCoSponsor) {
    await db.updateUserValue(parseInt(changeData.addedCoSponsor), 'clubId', changeData.clubId)
  }
  if (changeData.removedCoSponsor) {
    await db.updateUserValue(parseInt(changeData.removedCoSponsor), 'clubId', null)
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
    res.send({ body: "Success", changeData });
  } else {
    res.send("Error");
  }
});

app.post("/submit-attendance", async (req, res) => {
  const { presentStudents,
    absentStudents,
    clubId,
    date
  } = req.body
  const success = await db.submitAttendance(presentStudents, absentStudents, clubId, date);
  if (success) {
    res.send({ body: "Success" });
  } else {
    res.send({ body: "Error" });
  }
});

app.get("/check-attendance/:club/:date", async (req, res) => {
  const clubId = req.params.club;

  const date = req.params.date;

  const students = await db.checkAttendance(clubId, date);

  if (students) {
    res.send({ body: "Success", students: students });
  } else {
    res.send({ body: "Error" });
  }
});

app.post("/updateUser", async (req, res) => {
  const changeData = req.body;
  const updateUser = await db.updateUser(changeData);
  if (updateUser === "Success") {
    res.send({ body: "Success", updatedUserData: updateUser });
  } else {
    res.send({ body: "Error" });
  }
});

app.post("/setClubPrefs", async (req, res) => {
  const clubPrefs = req.body.clubOrder;
  const studentId = req.body.student;
  const updateUser = await db.updateClubPrefs(clubPrefs, studentId);
  //console.log(updateUser)
  res.send({ body: "Success", updatedUserData: updateUser });
});

// POST route to handle form submission from clubCreation.html
app.post("/addClub", upload.single("cover"), async (req, res) => {
  console.log("Received POST request to /addClub");
  const clubInfo = req.body;
  const coverPath = req.file ? req.file.path : "NULL";
  clubInfo.cover = coverPath
  console.log(clubInfo);
  try {
    await db.addClub(clubInfo);
  } catch (err) {
    res.send({ body: err });
  }
  res.send({ body: "Success", clubInfo });
});

//Create Account
app.post("/addAccount", async (req, res) => {
  console.log("Received POST request to /addAccount");

  const userInfo = req.body;
  //console.log(userInfo);
  userInfo.firstName = await capitalizeName(userInfo.firstName);
  userInfo.lastName = await capitalizeName(userInfo.lastName);
  userInfo.password = await encryptPassword(userInfo.password);
  userInfo.email = userInfo.email.toLowerCase().trim()
  userInfo.isTeacher = userInfo.isTeacher == "true";

  const userCheckData = await db.checkUser(userInfo.email);

  if (userCheckData.userExists === true) {
    res.send({ body: "User already exists" });
  } else {
    db.addUser(userInfo);
    res.send({ body: "true", user: userInfo });
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.email.toLowerCase();
  const password = req.body.password;
  const userCheckData = await db.checkUser(email);

  if (userCheckData.userExists === true) {
    const hashedPassword = userCheckData.password;
    if (await bcrypt.compare(password, hashedPassword)) {
      const userObject = await db.getUserInfo(email, "email");
      delete userObject.password;
      res.send({ body: true, userObject });
    } else {
      res.send({
        body: false,
        error: "You have entered a Wrong Password. Please try again.",
      });
    }
  } else {
    res.send({
      body: false,
      error: "This User Does Not Exist. Please create an account.",
    });
  }
});

app.post("/admin-erase", async (req, res) => {
  if (req.body.isAdmin) {
    const deleted = await db.deleteAllStudentClubs();
    if (deleted) {
      res.send({ body: "Success" });
    }
  }
});

app.post("/admin-erase-all-clubs", async (req, res) => {
  if (req.body.isAdmin) {
    const deleted = await db.deleteAllClubs();
    if (deleted) {
      res.send({ body: "Success" });
    }
  }
});

app.post("/admin-create-clubs", async (req, res) => {
  if (req.body.isAdmin) {
    const created = await db.createRandomClubs(req.body.numOfClubs);

    if (created) {
      res.send({ body: "Success" });
    }
  }
});

app.post("/admin-create-students", async (req, res) => {
  // console.log(req.body.numOfStudents);
  if (req.body.isAdmin) {
    const created = await db.createRandomGuys(req.body.numOfStudents);
    if (created) {
      res.send({ body: "Success" });
    }
  }
});

app.post("/admin-erase-students", async (req, res) => {
  if (req.body.isAdmin) {
    const deleted = await db.deleteAllStudents();
    if (deleted) {
      res.send({ body: "Success" });
    }
  }
});
app.get("/admin-club-assignment", async (req, res) => {
  const clubAssignment = await ca.main();
  if (clubAssignment) {
    res.send({ body: "Success" });
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
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}



app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  const newAvatarPath = req.file.path;
  const user = parseInt(req.body.userId);

  const avatar = await db.uploadAvatar(user, newAvatarPath);
  if (avatar) {
    res.send({ body: "Success", avatarPath: newAvatarPath });
  } else {
    res.send({ body: "Error" });
  }
});

app.post("/upload-cover-photo", upload.single("cover"), async (req, res) => {
  const newAvatarPath = req.file.path;
  const club = parseInt(req.body.clubId);

  const avatar = await db.uploadCover(club, newAvatarPath);
  if (avatar) {
    res.send({ body: "Success", avatarPath: newAvatarPath });
  } else {
    res.send({ body: "Error" });
  }
});
