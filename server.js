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
    console.log(e);
    console.log("Can't /get-cosponsors/:club");
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
    console.log(e);
    console.log("Can't /get-students-in-club/:club")
    res.send("Error. Contact admin")
  }
});

// API endpoint to get the list of clubs
app.get("/getUnapprovedClubs", async (req, res) => {
  try {
    const unApprovedClubs = await db.getUnapprovedClubs();
    res.json(unApprovedClubs);
  } catch (err) {
    console.log("Error: ", err);
    console.log("Can't /getUnapprovedClubs")
    res.send({ body: "Error fetching clubs" });
  }
});

app.get("/getAllClubs", async (req, res) => {
  try {
    const allClubs = await db.getAllClubs();
    res.send(allClubs);
  } catch (err) {
    console.log("Error: ", err);
    console.log("Can't /getAllClubs")
    res.send({ body: "Error fetching clubs" });
  }
});

app.get("/getClubById", async (req, res) => {
  try {
    const clubId = req.query.club;
    const clubInfo = await db.getClubInfo(clubId);
    res.json(clubInfo);
  } catch (e) {
    console.log(e);
    console.log("Can't /getClubById");
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
    console.log(e);
    console.log("Can't /club-info/:club");
    res.send("Error. Contact admin")
  }
});

app.get("/users/delete/:id", async (req, res) => {
  try {
    let userId = req.params.id;
    const deleted = await db.deleteUser(userId);
    if (deleted) {
      console.log(`Deleted user ${userId}`);
      res.send({ body: "Success" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /users/delete/:id");
    res.send("Error. Contact admin")
  }
});

app.get("/usersInfo/:user", async (req, res) => {
  try {
    let userId = req.params.user;
    const user = await db.getUser(userId);
    res.json(user);
  } catch (e) {
    console.log(e);
    console.log("Can't /usersInfo/:user");
    res.send("Error. Contact admin")
  }
})

app.get("/users/update/:user/:club/", async (req, res) => {
  try {
    let userId = req.params.user;
    let clubId = req.params.club;
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
      console.log(`Club ${clubId} added to user ${user.userId}`);
      res.send({ body: true, club });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /users/update/:user/:club");
    res.send("Error. Contact admin")
  }
});

app.get("/users/updateStudentClub/:user/:club", async (req, res) => {
  try {
    let userId = req.params.user;
    let clubId = req.params.club;

    const added = await db.assignClubToStudent(userId, clubId);

    if (added) {
      console.log(`Club ${clubId} added to user ${userId.userId}`);
      res.send({ body: "Success" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /users/updateStudentClub/:user/:club");
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
    const allUsers = await db.getAllUsersInClub(clubId);
    const usersInClub = allUsers.filter((user) => user.clubId === clubId);
    const deleted = await db.deleteClub(clubId);
    if (deleted) {
      usersInClub.forEach(async (user) => {
        await db.updateUserValue(user.userId, "clubId", null);
      });

      res.send({ body: "Success" });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /deleteClub");
    res.send("Error. Contact admin")
  }
});

app.post("/approveClub", async (req, res) => {
  try {
    const clubInfo = req.body;

    await db.approveClub(clubInfo.clubId);

    res.send({ body: "Success", clubInfo });
  } catch (e) {
    console.log(e);
    console.log("Can't /approveClub");
    res.send("Error. Contact admin")
  }
});

app.post("/updateClub", async (req, res) => {
  try {
    const changeData = req.body;
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
      res.send({ body: "Success", changeData });
    } else {
      res.send("Error");
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /updateClub");
    res.send("Error. Contact admin")
  }
});

app.post("/submit-attendance", async (req, res) => {
  try {
    const { presentStudents, absentStudents, clubId, date } = req.body;
    const success = await db.submitAttendance(
      presentStudents,
      absentStudents,
      clubId,
      date
    );
    if (success) {
      res.send({ body: "Success" });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /submit-attendance");
    res.send("Error. Contact admin")
  }
});

app.get("/check-attendance/:club/:date", async (req, res) => {
  try {
    const clubId = req.params.club;

    const date = req.params.date;

    const students = await db.checkAttendance(clubId, date);

    if (students) {
      res.send({ body: "Success", students: students });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /check-attendance/:club/:date");
    res.send("Error. Contact admin")
  }
});

app.post("/updateUser", async (req, res) => {
  try {
    const changeData = req.body;
    const updateUser = await db.updateUser(changeData);
    if (updateUser === "Success") {
      res.send({ body: "Success", updatedUserData: updateUser });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /updateUser");
    res.send("Error. Contact admin")
  }
});

app.post("/setClubPrefs", async (req, res) => {
  try {
    const clubPrefs = req.body.clubOrder;
    const studentId = req.body.student;
    const updateUser = await db.updateClubPrefs(clubPrefs, studentId);
    //console.log(updateUser)
    res.send({ body: "Success", updatedUserData: updateUser });
  } catch (e) {
    console.log(e);
    console.log("Can't /setClubPrefs");
    res.send("Error. Contact admin")
  }
});

// POST route to handle form submission from clubCreation.html
app.post("/addClub", upload.single("cover"), async (req, res) => {
  try {
    const clubInfo = req.body;
    const coverPath = req.file ? req.file.path : "NULL";
    clubInfo.cover = coverPath;
    await db.addClub(clubInfo);
    res.send({ body: "Success", clubInfo });
  } catch (err) {
    res.send({ body: err });
  }
});

//Create Account
app.post("/addAccount", async (req, res) => {
  try {
    console.log("Received POST request to /addAccount");

    const userInfo = req.body;
    //console.log(userInfo);
    userInfo.firstName = await capitalizeName(userInfo.firstName);
    userInfo.lastName = await capitalizeName(userInfo.lastName);
    userInfo.password = await encryptPassword(userInfo.password);
    userInfo.email = userInfo.email.toLowerCase().trim();
    userInfo.isTeacher = userInfo.isTeacher == "true";

    const userCheckData = await db.checkUser(userInfo.email);
    console.log(userInfo.isTeacher);
    if (userCheckData.userExists === true) {
      res.send({ body: "User already exists" });
    } else {
      if (!userInfo.isTeacher) {
        console.log(userInfo.email)
        if (!userInfo.email.includes("@students.hcde.org")) {
          res.send({ body: "Invalid email address" });
          return;
        }
      }
      db.addUser(userInfo);
      res.send({ body: "true", user: userInfo });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /addAccount");
    res.send("Error. Contact admin")
  }
});

app.post("/getAttendanceFromDate", async (req, res) => {
  try {
    let attendance = await db.getAttendanceFromDate(req.body.date);
    res.send({ attendance: attendance });
  } catch (e) {
    console.log(e);
    console.log("Can't /getAttendanceFromDate");
    res.send("Error. Contact admin")
  }
})

app.post("/login", async (req, res) => {
  try {
    console.log(`Login Attempt : ${req.body.email}`);
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
  } catch (e) {
    console.log(e);
    res.redirect("https://forms.gle/G9LTphV8L3rpDGkF7")
    console.log("This is the messed up error that was happening when the body was empty")
  }
});

app.post("/admin-erase", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const deleted = await db.deleteAllStudentClubs();
      if (deleted) {
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /admin-erase");
    res.send("Error. Contact admin")
  }
});

app.post("/admin-erase-all-clubs", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const deleted = await db.deleteAllClubs();
      if (deleted) {
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /admin-erase-all-clubs");
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-clubs", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      let teacherId = req.body.teacherId;
      const created = await db.createRandomClubs(req.body.numOfClubs, teacherId);

      if (created) {
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /admin-create-clubs");
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-students", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const created = await db.createRandomGuys(req.body.numOfStudents);
      if (created) {
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /admin-create-students");
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-teachers", async (req, res) => {
  try {
    // console.log(req.body.numOfStudents);
    if (req.body.isAdmin) {
      const created = await db.createRandomTeachers(req.body.numOfTeachers);
      if (created) {
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /admin-create-teachers");
    res.send("Error. Contact admin")
  }
});

app.post("/admin-erase-students", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const deleted = await db.deleteAllStudents();
      if (deleted) {
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /admin-erase-students");
    res.send("Error. Contact admin")
  }
});

app.get("/admin-club-assignment", async (req, res) => {
  try {
    const clubAssignment = await ca.main();
    if (clubAssignment) {
      res.send({ body: "Success" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /admin-club-assignment");
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

    const avatar = await db.uploadAvatar(user, newAvatarPath);
    if (avatar) {
      res.send({ body: "Success", avatarPath: newAvatarPath });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    console.log(e);
    console.log("Can't /upload-avatar");
    res.send("Error. Contact admin")
  }
});

app.post("/upload-cover-photo", upload.single("cover"), async (req, res) => {
  try {
    const newAvatarPath = req.file.path;
    const club = parseInt(req.body.clubId);

    const avatar = await db.uploadCover(club, newAvatarPath);
    if (avatar) {
      res.send({ body: "Success", avatarPath: newAvatarPath });
    } else {
      res.send({ body: "Error" });
    }
  } catch (err) {
    console.log(err);
    res.send({ body: "Error can't upload photo" });
  }
});

app.get("/check-reset-email", async (req, res) => {
  try {

    const email = req.query.email.toLowerCase();

    const userExists = await db.checkUser(email);
    res.send({ body: userExists });
  } catch (e) {
    console.log(e);
    res.send("Error. Contact admin")
  }
});

app.post("/request-password-confirm", async (req, res) => {
  try {
    const password = req.body.password;
    const userToken = req.body.token;
    const databaseInfo = await db.checkResetPasswordToken(userToken);
    const databaseToken = databaseInfo.token;
    if (databaseInfo.token === databaseToken) {
      const newPass = await encryptPassword(password);

      const updateUser = await db.resetUserPassword(
        databaseInfo.user_id,
        newPass
      );
      res.send({ body: "Success" });
    }
  } catch (err) {
    console.log(err);
    res.send({ body: "Error" });
  }
});

app.post("/request-password-reset", async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const userObject = await db.getUserByEmail(email);
    const userId = userObject.userId;
    if (userId) {
      const token = crypto.randomBytes(20).toString("hex");
      const expiration = new Date(Date.now() + 3600000); // 1 hour from now
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

      const mailOptions = {
        from: "RBHS Club Creator Password Reset <form@gbs423.com>",
        to: email,
        subject: "Password Reset",
        html: `<div style="padding-top:50px;height:100vh ;background-color:#0e0e11; color:white; font-size:1.5rem; text-align:center">
  <div><img src="https://upload.wikimedia.org/wikipedia/en/0/0d/Logo_for_Red_Bank_High_School.png"></div>
  <h1>Hello ${userObject.firstName}!</h1>
        <p>You requested a password reset. Please follow the link below to reset your password:</p>
  <a style="text-decoration:none; color:#0f7ae5" href="http://${serverAddress}/reset-password.html?token=${token}">Click Here To Reset Password</a>
  <p style="color:goldenrod">If you did not request a password change, you may ignore this email.</p>
        </div>`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) throw err;
        console.log(info);
        res.send({ body: "Success", email: email });
      });
    }
  } catch (err) {
    console.log(err);
    res.send({ body: "Error" });
  }
});
