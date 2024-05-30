const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database.js"); // Import your database functions
const app = express();
const bcrypt = require("bcrypt");
const PORT = 3000;

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for allowing cross-origin requests
app.use(cors());

//API endpoint to get the teacher info
app.get("/getUserInfo", async (req, res) => {
  let email = req.query.email;
  try {
    const user = await db.getUserInfo(email);
    res.json(user);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching teachers");
  }
});

// //API endpoint to get the student info
app.get("/getAllStudents", async (req, res) => {
  let isTeacher = false;
  try {
    const student = await db.getAllTeachersOrStudents(isTeacher);
    student.forEach((student) => {
      console.log(`${student.firstName} ${student.lastName}`);
    });
    res.json(student);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching students");
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

app.post("/approveClub", async (req, res) => {

  const clubInfo = req.body;
  console.log('approveing');
  await db.approveClub(clubInfo.clubId);
  res.send(clubInfo);
});

app.post("/updateClub", async (req, res) => {
  const changeData = req.body;
  const success = await db.updateClub(changeData.clubId, changeData.newClubData);

  if (success) {
    res.send({ body: "Success", changeData });
  } else {
    res.send("Error");
  }


});

// POST route to handle form submission from clubCreation.html
app.post("/addClub", async (req, res) => {
  console.log("Received POST request to /addClub");
  const clubInfo = req.body;
  console.log(clubInfo);
  try {
    await db.addClub(clubInfo)
  } catch (err) { res.send({ body: err }) };
  res.send({ body: "Success", clubInfo });
});

app.post("/approveClub", async (req, res) => {
  const clubInfo = req.body;
  console.log(clubInfo);
  await db.approveClub(clubInfo.clubId);
  res.send(clubInfo);
});

//Create Account
app.post("/addAccount", async (req, res) => {
  console.log("Received POST request to /addAccount");

  const userInfo = req.body;
  console.log(userInfo);

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
      const userObject = await db.getUserInfo(email);
      delete userObject.password;
      res.send({ body: true, userObject });
    } else {
      res.send({ body: false, error: "You have entered a Wrong Password. Please try again." });
    }
  } else {
    res.send({ body: false, error: "This User Does Not Exist. Please create an account." });
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
