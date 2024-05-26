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
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html")); // Adjust the path to your index.html
});

// Serve the create-club.html file
app.get("/create-club.html", (req, res) => {
  res.sendFile(path.join(__dirname, "create-club.html")); // Make sure the path matches your file structure
});

// Serve the create-account.html file
app.get("/create-account.html", (req, res) => {
  res.sendFile(path.join(__dirname, "create-account.html")); // Make sure the path matches your file structure
});

// Serve the home-teacher.html file
app.get('/home-teacher.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'home-teacher.html'));
});

// API endpoint to get the list of clubs
app.get("/getClubsThatNeedCoSponsors", (req, res) => {
  db.getAllClubs((err, clubs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const clubsThatNeedCoSponsors = clubs.filter(club => club.coSponsorsNeeded > 0);
    res.json(clubsThatNeedCoSponsors); // Sends the array of clubs as JSON
  });
});

// POST route to handle form submission from clubCreation.html
app.post("/addClub", (req, res) => {
  console.log("Received POST request to /submit");

  const { teacherFirstName, teacherLastName, preferredClub, coSponsorsNeeded, maxCapacity } =
    req.body;

  if (
    !teacherFirstName ||
    !teacherLastName ||
    !preferredClub ||
    !coSponsorsNeeded ||
    !maxCapacity
  ) {
    return res.status(400).send("Something wrong");
  }

  const newClub = {
    teacherFirstName,
    teacherLastName,
    clubName: preferredClub,
    coSponsorsNeeded,
    maxCapacity
  };

  db.addClub(newClub, (err, result) => {
    if (err) {
      return res.status(500).send("Failed to add new club");
    }
    res.send("Club submitted successfully");
  })
});

//Create Account

app.post("/create", async (req, res) => {
  console.log("Received POST request to /create");

  const userInfo = req.body
  console.log(userInfo)

  userInfo.password = await encryptPassword(userInfo.password)



  const userCheckData = await db.checkUser(userInfo.email)

  if (userCheckData.userExists === true) {
    res.send("User already exists")
  } else {
    db.addUser(userInfo)
    res.send(userInfo)
  }
});

app.post("/login", async (req, res) => {

  const email = req.body.email.toLowerCase()
  const password = req.body.password
  console.log(email, password)
  const userCheckData = await db.checkUser(email)

  if (userCheckData.userExists === true) {
    const hashedPassword = userCheckData.password
    if (await bcrypt.compare(password, hashedPassword)) {
      console.log('Logged in successfully')
      res.redirect(`/home-teacher.html`)
    } else {
      res.send("Username and password not found")
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