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
    approvedClubList.innerHTML += `<div class="uk-card uk-width-1-2@m approved-clubs">
    <div id="${club.clubId}" class=" uk-card uk-card-default uk-card-body uk-card-hover">
    <div class="uk-card-badge uk-label uk-label-success">Approved</div>
    <div class="uk-card-header">   
    <h2 class="roboto uk-text-bold uk-card-title blue"id="clubName">${club.clubName}</h2>
    </div> 
    <div class="uk-card-body">
        <p class= "uk-text-bold" id="clubDescription">${club.clubDescription}</p>

        <span>Maximum Slots: </span><input id="clubId${club.clubId}-maxSlots" class="uk-input uk-form-width-small" type="number" value="${club.maxSlots
      }">
        <div id="minSlotsWrapper">
        <p class="uk-text-bold uk-margin-medium-top">Minimum Slots:</p>
        <div id="minSlots" uk-flex uk-flex-center>
        <div class="uk-align-center">
        <span class="">9th Grade: </span><input id = "${club.clubId}-minslots9" class = "slots9 uk-input uk-form-width-small" type="number" value="${club.minSlots9}">
        </div>
        <div class="uk-align-center">
        <span class="">10th Grade: </span><input id = "${club.clubId}-minslots10" class = "slots10 uk-input uk-form-width-small" type="number" value="${club.minSlots10}">
        </div>
        <div class="uk-align-center">
        <span class="">11th Grade: </span><input id = "${club.clubId}-minslots11" class = "slots11 uk-input uk-form-width-small" type="number" value="${club.minSlots11}">
        </div>
        <div class="uk-align-center">
        <span class="">12th Grade: </span><input id = "${club.clubId}-minslots12" class = "slots12 uk-input uk-form-width-small" type="number" value="${club.minSlots12}">
        </div>
        </div>
        </div>
        <span>Location: </span><input class = "clubId${club.clubId}-location uk-input uk-form-width-small" type="text">
        <span>Requested Co-Sponsors: </span><input id = "clubId${club.clubId}-coSponsorsNeeded" class = "uk-input uk-form-width-small" type="number" value="${club.coSponsorsNeeded}">
        <span>Needed Co-Sponsors: </span><input id = "clubId${club.clubId}-coSponsorsRequired" class = "uk-input uk-form-width-small" type="number" value="${club.coSponsorsNeeded - club.currentCoSponsors
      }">
        <span>Approved: </span><input id="is-approved${club.clubId}" class ="isApproved uk-checkbox" type="checkbox" checked>
        
        
        </div>
        <div class="text-center">
        <button id="approve${club.clubId}" class="uk-button uk-button-secondary uk-width-1 approveBtn">Confirm</button>
        </div>
        </div>
  
        <div id="success"></div>
        </div>
        `;
  });
  document.querySelectorAll(".approveBtn").forEach((element) => {
    element.addEventListener("click", async (e) => {
      clubId = e.target.parentElement.parentElement.id;
      // console.log(e.target.parentElement.children[2].children.minSlotsWrapper.children.minSlots.children[0].children);
      // console.log(e.target.parentElement.parentElement.children[2].children[`is-approved${clubId}`].checked);
      // console.log(`clubId${clubId}`)
      const newClubData = {
        clubId: clubId,
        clubName: e.target.parentElement.parentElement.children[1].children.clubName.textContent,
        clubDescription: e.target.parentElement.parentElement.children[2].children.clubDescription.textContent,
        //Need to change this to something
        primaryTeacherId: 1,
        /////////////////////
        coSponsorsNeeded: parseInt(e.target.parentElement.parentElement.children[2].children[`clubId${clubId}-coSponsorsRequired`].value),
        minSlots9: parseInt(
          e.target.parentElement.parentElement.children[2].children.minSlotsWrapper.children.minSlots
            .children[0].children[`${clubId}-minslots9`].value
        ),
        minSlots10: parseInt(
          e.target.parentElement.parentElement.children[2].children.minSlotsWrapper.children.minSlots
            .children[1].children[`${clubId}-minslots10`].value
        ),
        minSlots11: parseInt(
          e.target.parentElement.parentElement.children[2].children.minSlotsWrapper.children.minSlots
            .children[2].children[`${clubId}-minslots11`].value
        ),
        minSlots12: parseInt(
          e.target.parentElement.parentElement.children[2].children.minSlotsWrapper.children.minSlots
            .children[3].children[`${clubId}-minslots12`].value
        ),
        maxSlots: parseInt(e.target.parentElement.parentElement.children[2].children[`clubId${clubId}-maxSlots`].value),
        /// Need to change this to something/////////
        location: null,
        ///////////////////////
        requiredCoSponsors: parseInt(e.target.parentElement.parentElement.children[2].children[`clubId${clubId}-coSponsorsNeeded`].value),
        /// Need to change this to something/////////
        currentCoSponsors: null,
        /////////////////
        isApproved: e.target.parentElement.parentElement.children[2].children[`is-approved${clubId}`].checked,
      };
      const clubToUpdate = clubs.filter(
        (obj) => obj.clubId === parseInt(clubId)
      );
      console.log(newClubData);
      await updateClubValue(clubId, newClubData);
    });
  });
  getAllUnapprovedClubs(clubs);
}

async function updateClubValue(clubId, newClubData) {
  console.log('Updating club value');
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
  if (json.body === "Success") {
    console.log('Success');
    console.log(json);
    document.querySelector('#success').innerHTML = `Successfully updated ${json.changeData.newClubData.clubName}!`
  } else {
    console.log('Error');
  }
}

async function getAllUnapprovedClubs(clubs) {
  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 1);

  if (filteredClubs.length <= 0) {
    clubProposals.innerHTML = "No Pending Club Approvals";
  }
  filteredClubs.forEach((club) => {
    clubProposals.innerHTML += `<div class="uk-card uk-width-1-3@m club-proposals">
    <div class="uk-card uk-card-default uk-card-body uk-card-hover">
    <div class="uk-card-badge uk-label uk-label-warning">Unapproved</div>
    <div class="uk-card-header">   
    <h2 class="roboto uk-text-bold uk-card-title">${club.clubName}</h2>
    </div> 
    <div class="uk-card-body">
        <p class="uk-text-bold">${club.clubDescription}</p>
        <span>Max Slots: </span><input class="uk-input uk-form-width-small" type="number" value="${club.maxSlots}">
        </div>
        <div class="uk-card-footer text-center">
        <button class="uk-button uk-button-primary uk-width-1" onclick="approveClub(${club.clubId})">Approve</button>
        </div>
        </div>
        </div>
        `;
  });
}
async function approveClub(clubId) {
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
