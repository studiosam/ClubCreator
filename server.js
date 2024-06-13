const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./database.js"); // Import your database functions
const app = express();
const bcrypt = require("bcrypt");
const multer = require("multer")
const PORT = 3000;

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for allowing cross-origin requests
app.use(cors());

//API endpoint to get the teacher info
app.get("/getUserInfo", async (req, res) => {
  let email = req.query.email;
  let userId = req.query.userId
  // console.log(email);
  // console.log(userId);
  try {
    if (userId) {
      const user = await db.getUserInfo(userId, 'userId');
      res.send(user);
    } else if (email) {
      const user = await db.getUserInfo(email, 'email');
      res.send(user);
    } else {
      res.status(400).send("Bad Request: Either userId or email must be provided.");
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
    res.json(allClubs);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching clubs");
  }
});
app.get("/getClubById", async (req, res) => {
  const clubId = req.query.club

  const clubInfo = await db.getClubInfo(clubId);
  res.json(clubInfo);

});

app.get("/club-info/:club", async (req, res) => {
  let clubId = req.params.club;
  if (req.query.view) {
    //console.log(req.query);
    const clubInfo = await db.getClubInfo(clubId);
    res.send(clubInfo);
  } else {
    res.redirect(`http://127.0.0.1:5500/club-info.html?club-id=${clubId}`);
  }
});
app.get("/users/:type", async (req, res) => {
  let isTeacher = false;
  let userType = req.params.type;
  if (userType === "teachers") {
    isTeacher = true;
  }

  try {
    const users = await db.getAllTeachersOrStudents(isTeacher);
    if (users.length > 0) {
      res.send(users);
    } else {
      res.send({ body: "No users found" });
    }
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching Users");
  }
});

app.post("/deleteClub", async (req, res) => {
  const clubId = req.body.clubId;
  const deleted = await db.deleteClub(clubId);
  if (deleted) {
    res.send({ body: "Success" });
  } else {
    res.send({ body: "Error" });
  }
});

app.post("/approveClub", async (req, res) => {
  const clubInfo = req.body;
  //console.log(clubInfo);
  await db.approveClub(clubInfo.clubId);

  res.send({ body: "Success", clubInfo });
});

app.post("/updateClub", async (req, res) => {
  const changeData = req.body;
  const clubInfo = await db.getClubInfo(changeData.clubId)
  const teacherIdToNull = clubInfo.primaryTeacherId
  await db.removeClubFromUser(teacherIdToNull)
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
app.post("/updateUser", async (req, res) => {
  const changeData = req.body;
  const updateUser = await db.updateUser(changeData)
  if (updateUser === "Success") {
    res.send({ body: "Success", updatedUserData: updateUser })
  } else {
    res.send({ body: "Error" })
  };
});

app.post("/setClubPrefs", async (req, res) => {
  const clubPrefs = req.body.clubOrder
  const studentId = req.body.student

  const updateUser = await db.updateClubPrefs(clubPrefs, studentId)
  //console.log(updateUser)
  res.send({ body: "Success", updatedUserData: updateUser });
});

// POST route to handle form submission from clubCreation.html
app.post("/addClub", async (req, res) => {
  console.log("Received POST request to /addClub");
  const clubInfo = req.body;
  //console.log(clubInfo);
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

  userInfo.isTeacher = userInfo.isTeacher == "true";

  const userCheckData = await db.checkUser(userInfo.email);

  if (userCheckData.userExists === true) {
    res.send("User already exists");
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
      const userObject = await db.getUserInfo(email, 'email');
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


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append the extension
  }
});
const upload = multer({ storage: storage });

app.post('/upload-avatar', upload.single('avatar'), async (req, res) => {

  const newAvatarPath = req.file.path;
  const user = parseInt(req.body.userId)

  const avatar = db.uploadAvatar(user, newAvatarPath)
  if (avatar) {
    res.send({ body: "Success", avatarPath: newAvatarPath });
  } else {
    res.send({ body: "Error" });
  }
})