const isAdmin = JSON.parse(localStorage.getItem("user"));
// if (isAdmin.isAdmin === 0) {
//     document.body.innerHTML = '<h1>NOT AN ADMIN</h1>';

// }
const approvedClubList = document.querySelector("#approvedClubList");
const clubProposals = document.querySelector("#clubProposalList");

getAllApprovedClubs();

async function getAllApprovedClubs() {
  const response = await fetch("http://localhost:3000/getAllClubs");
  const clubs = await response.json();

  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 0);
  if (filteredClubs.length <= 0) {
    clubProposals.innerHTML = "No Approved Clubs";
  }

  filteredClubs.forEach((club) => {
    approvedClubList.innerHTML += `<div id="${club.clubId}">
        <p id="clubName">Club : ${club.clubName}</p>
        <p id="clubDescription">Club Description : ${club.clubDescription}</p>

        <span>Maximum Slots: </span><input id="maxSlots" style="width: 40px" type="number" value="${
          club.maxSlots
        }">
        <div id="minSlotsWrapper">
        <p>Minimum Slots:</p>
        <div id="minSlots">
        <span>9th Grade: </span><input class = "slots9" style="width: 40px" type="number" value="0">
        <span>10th Grade: </span><input class = "slots10" style="width: 40px" type="number" value="0">
        <span>11th Grade: </span><input class = "slots11" style="width: 40px" type="number" value="0">
        <span>12th Grade: </span><input class = "slots12" style="width: 40px" type="number" value="0">
        <span>Maximum Capacity: </span><input class = "maxSlots" style="width: 40px" type="number" value="0">
        <span>Location: </span><input class = "location" style="width: 40px" type="text">
        <span>Requested Co-Sponsors: </span><input class = "coSponsorsNeeded" style="width: 40px" type="number" value="0">
        <span>Needed Co-Sponsors: </span><input class = "coSponsorsRequired" style="width: 40px" type="number" value="${
          club.coSponsorsRequired - club.currentCoSponsors
        }">
        <span>Approved: </span><input class = "isApproved" style="width: 40px" type="checkbox" checked>
        
        </div>
        </div>
        <button id="approve${club.clubId}" class="approveBtn">Confirm</button>
        </div>`;
  });
  const minimumSlots = document.querySelectorAll("#minSlots input");
  document.querySelectorAll(".approveBtn").forEach((element) => {
    element.addEventListener("click", (e) => {
      clubId = e.target.parentElement.id;
      console.log(
        e.target.parentElement.children.minSlotsWrapper.children.minSlots
          .children
      );
      const newClubData = {
        clubId: clubId,
        clubName: "ass club",
        clubDescription: "gay",
        primaryTeacherId: 1,
        coSponsorsNeeded: 1,
        minSlots9:
          e.target.parentElement.children.minSlotsWrapper.children.minSlots
            .children[1],
        minSlots10:
          e.target.parentElement.children.minSlotsWrapper.children.minSlots
            .children[3],
        minSlots11:
          e.target.parentElement.children.minSlotsWrapper.children.minSlots
            .children[5],
        minSlots12:
          e.target.parentElement.children.minSlotsWrapper.children.minSlots
            .children[7],
        maxSlots: 5,
        location: null,
        requiredCoSponsors: 1,
        currentCoSponsors: null,
        isApproved: 1,
      };
      const clubToUpdate = clubs.filter(
        (obj) => obj.clubId === parseInt(clubId)
      );
      console.log(clubToUpdate);
      updateClubValue(clubId, clubToUpdate);
    });
  });
  getAllUnapprovedClubs(clubs);
}
//////////////FIXME///////////////////////////////
async function updateClubValue(clubId, newClubData) {
  const response = await fetch("http://localhost:3000/updateClub", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clubId: clubId,
      newClubData: newClubData,
    }),
  });
  const json = await response.json();
  console.log(json);
  if (json.status === 200) {
    console.log(json.message);
  } else {
    console.log(json.message);
  }
}
///////////////////////////////////////////////
async function getAllUnapprovedClubs(clubs) {
  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 1);

  if (filteredClubs.length <= 0) {
    clubProposals.innerHTML = "No Pending Club Approvals";
  }
  filteredClubs.forEach((club) => {
    clubProposals.innerHTML += `<div>
        <p>Club : ${club.clubName}</p>
        <p>Club Description : ${club.clubDescription}</p>
        <span>Max Slots: </span><input style="width: 40px" type="number" value="${club.maxSlots}">
        <button onclick="approveClub(${club.clubId})">Approve</button>
        </div>`;
  });
}
async function approveClub(clubId) {
  console.log(clubId);

  const response = await fetch("http://localhost:3000/approveClub", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clubId: clubId,
    }),
  });
  const json = await response.json();
}
