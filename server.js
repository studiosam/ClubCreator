const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database.js");  // Import your database functions
const app = express();
const bcrypt = require('bcrypt');
const PORT = 3000;

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for allowing cross-origin requests
app.use(cors());

// Serve the index.html file for the root URL
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "index.html")); // Adjust the path to your index.html
// });

// // Serve the create-club.html file
// app.get("/create-club.html", (req, res) => {
//   res.sendFile(path.join(__dirname, "create-club.html")); // Make sure the path matches your file structure
// });

// // Serve the create-account.html file
// app.get("/create-account.html", (req, res) => {
//   res.sendFile(path.join(__dirname, "create-account.html")); // Make sure the path matches your file structure
// });

// // Serve the home-teacher.html file
// app.get('/home-teacher.html', (req, res) => {
//   res.sendFile(path.join(__dirname, 'home-teacher.html'));
// });

// //API endpoint to get the teacher info
// app.get("/getAllTeachers", async (req, res) => {
//   let isTeacher = true;
//   try {
//     const teachers = await db.getAllUsers(isTeacher);
//     teachers.forEach((teacher) => {
//       console.log(`${teacher.firstName} ${teacher.lastName}`);

//     })
//     res.json(teachers);
//   } catch (err) {
//     console.error("Error: ", err);
//     res.status(500).send("Error fetching teachers");
//   }
// });

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
    const student = await db.getAllUsers(isTeacher);
    student.forEach((student) => {
      console.log(`${student.firstName} ${student.lastName}`);

    })
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

app.post("/updateClubInfo", async (req, res) => {
  const clubInfo = req.body;
  console.log(clubInfo);
  await db.updateClub(clubInfo.clubId);
  res.send(clubInfo);
})

// POST route to handle form submission from clubCreation.html
app.post("/addClub", async (req, res) => {
  console.log("Received POST request to /addClub");
  const clubInfo = req.body;
  console.log(clubInfo);
  await db.addClub(clubInfo);
  res.redirect('./home-admin.html');
})

app.post("/approveClub", async (req, res) => {
  const clubInfo = req.body;
  console.log(clubInfo);
  await db.approveClub(clubInfo.clubId);
  res.send(clubInfo);
})

//Create Account
app.post("/addAccount", async (req, res) => {
  console.log("Received POST request to /addAccount");

  const userInfo = req.body
  console.log(userInfo)

  userInfo.password = await encryptPassword(userInfo.password)

  userInfo.isTeacher = (userInfo.isTeacher == "true")

  const userCheckData = await db.checkUser(userInfo.email)

  if (userCheckData.userExists === true) {
    res.send("User already exists")
  } else {
    db.addUser(userInfo);
    res.send({ body: 'true', user: userInfo });
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.email.toLowerCase()
  const password = req.body.password
  const userCheckData = await db.checkUser(email)

  if (userCheckData.userExists === true) {
    const hashedPassword = userCheckData.password
    if (await bcrypt.compare(password, hashedPassword)) {
      const userObject = await db.getUserInfo(email);
      delete userObject.password;
      res.send({ body: true, userObject });
    } else {
      res.send({ body: false })
    }
  }
})

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
    console.error('Error encrypting password:', error);
  }
}