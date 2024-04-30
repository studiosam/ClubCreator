const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const PORT = 3000;

// Array to store club suggestions from teachers
let clubsThatNeedCoSponsors = [];
let clubsToBeApproved = [];
let approvedClubs = [];

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for allowing cross-origin requests
app.use(cors());


// Serve the index.html file for the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html")); // Adjust the path to your index.html
});

// Serve the clubCreation.html file
app.get("/clubCreation.html", (req, res) => {
  res.sendFile(path.join(__dirname, "clubCreation.html")); // Make sure the path matches your file structure
});

// API endpoint to get the list of clubs
app.get("/getClubsThatNeedCoSponsors", (req, res) => {
  res.json(clubsThatNeedCoSponsors); // Sends the array of clubs as JSON
});

// POST route to handle form submission from clubCreation.html
app.post("/submit", (req, res) => {
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

  if (newClub.coSponsorsNeeded > 0) {
    clubsThatNeedCoSponsors.push(newClub);
  }
  clubsToBeApproved.push(newClub);

  console.log(clubsToBeApproved);
  res.send("Club suggestion submitted successfully!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});