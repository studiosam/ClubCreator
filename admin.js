const isAdmin = JSON.parse(localStorage.getItem("user"));
// if (isAdmin.isAdmin === 0) {
//     document.body.innerHTML = '<h1>NOT AN ADMIN</h1>';

// }
const approvedClubList = document.querySelector("#approvedClubList");
const clubProposals = document.querySelector("#clubProposalList");

(async () => {
  await getAllApprovedClubs();
})();
async function getAllApprovedClubs() {
  const response = await fetch("http://localhost:3000/getAllClubs");
  const clubs = await response.json();

  const filteredClubs = await clubs.filter((obj) => obj.isApproved !== 0);
  document.querySelector(".approved-clubs-badge").innerHTML =
    filteredClubs.length;
  if (filteredClubs.length === 0) {
    approvedClubList.innerHTML = "No Approved Clubs";
    return;
  }
  if (filteredClubs.length > 0) {
    approvedClubList.innerHTML = "";
  }
  filteredClubs.forEach((club) => {
    approvedClubList.innerHTML += `<form id="form${
      club.clubId
    }" <div class="uk-card uk-width-1-2@m approved-clubs">
    <div id="${
      club.clubId
    }" class=" uk-card uk-card-default uk-card-body uk-card-hover">
    <div class="uk-card-badge uk-label uk-label-success">Approved</div>
    <div class="uk-card-header">   
    <h2 class="roboto uk-text-bold uk-card-title blue"id="clubName">${
      club.clubName
    }</h2>
    <input type="hidden" name="clubName" value="${club.clubName}">
    </div> 
    <div class="uk-card-body">
        <p class= "uk-text-bold text-center" id="clubDescription">${
          club.clubDescription
        }</p>
        <input type="hidden" name="clubDescription" value="${
          club.clubDescription
        }">
        <input type="hidden" name="primaryTeacherId" value="${
          club.primaryTeacherId
        }">
        <div class="maxSlots">
        <span>Maximum Slots: </span><input name="maxSlots" id="clubId${
          club.clubId
        }-maxSlots" class="uk-input uk-form-width-small" type="number" value="${
      club.maxSlots
    }"></div>
        <div id="minSlotsWrapper">
        <p class="text-center uk-text-bold uk-margin-medium-top">Minimum Slots:</p>
        <div id="minSlots-${club.clubId}" class="minSlots">
        <div class="">
        <span class="">9th Grade: </span><input name="minSlots9" id = "${
          club.clubId
        }-minslots9" class = "slots9 uk-input uk-form-width-small" type="number" value="${
      club.minSlots9
    }">
        </div>
        <div class="">
        <span class="">10th Grade: </span><input name="minSlots10" id = "${
          club.clubId
        }-minslots10" class = "slots10 uk-input uk-form-width-small" type="number" value="${
      club.minSlots10
    }">
        </div>
        <div class="">
        <span class="">11th Grade: </span><input name="minSlots11" id = "${
          club.clubId
        }-minslots11" class = "slots11 uk-input uk-form-width-small" type="number" value="${
      club.minSlots11
    }">
        </div>
        <div class="">
        <span class="">12th Grade: </span><input name="minSlots12" id = "${
          club.clubId
        }-minslots12" class = "slots12 uk-input uk-form-width-small" type="number" value="${
      club.minSlots12
    }">
        </div>
        </div>
        </div>
        <p class="text-center uk-text-bold uk-margin-medium-top">Co-Sponsors:</p>
        <div class="coSponsors">
        <div class="coSponsors">
        <span>Requested: </span><input name="currentCosponsors" id = "clubId${
          club.clubId
        }-coSponsorsNeeded" class = "uk-input uk-width-1-2" type="number" value="${
      club.coSponsorsNeeded
    }">
    </div>
    <div class="coSponsors">
        <span>Needed: </span><input name="requiredCoSponsors" id = "clubId${
          club.clubId
        }-coSponsorsRequired" class = "uk-input uk-width-1-2" type="number" value="${
      club.coSponsorsNeeded - club.currentCoSponsors
    }">
    </div>
    </div>
    <div class="text-center approval">
    <span>Location: </span><input name="location" class = "clubId${
      club.clubId
    }-location uk-input uk-form-width-small" type="text">
    <span>Approved: </span><input name="isApproved" id="is-approved${
      club.clubId
    }" class ="isApproved" type="checkbox" checked>
    </div>
        
        
        
        </div>
        <div class="text-center">
        <button type="button" id="approve${
          club.clubId
        }" class="uk-button uk-button-secondary uk-width-1 approveBtn">Confirm</button>
        </div>
        </div>
  
        <div id="success"></div>
        </div></form>
        `;
  });

  document.querySelectorAll(".approveBtn").forEach((element) => {
    element.addEventListener("click", async (e) => {
      clubId = e.target.id.match(/\D(\d+)$/)[1];
      console.log(document.querySelector(`#is-approved${clubId}`).checked);
      let form = document.querySelector(`#form${clubId}`);
      let formData = new FormData(form);
      formData.set(
        "isApproved",
        document.querySelector(`#is-approved${clubId}`).checked
      );
      formData.set("clubId", clubId);
      const newClubData = new URLSearchParams(formData);

      await updateClubValue(newClubData);
    });
  });
  await getAllUnapprovedClubs(clubs);
}

async function updateClubValue(newClubData) {
  console.log("Updating club value");
  const response = await fetch("http://localhost:3000/updateClub", {
    method: "post",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: newClubData,
  });
  const responseStatus = await response.json();

  if (responseStatus.body === "Success") {
    console.log("Success");
    console.log(responseStatus);
    UIkit.notification({
      message: `Successfully updated ${responseStatus.changeData.clubName}!`,
      status: "success",
    });
    await getAllApprovedClubs();
  } else {
    UIkit.notification({
      message: `Error Updating ${responseStatus.changeData.clubName}!`,
      status: "danger",
    });
    console.log("Error");
  }
}

async function getAllUnapprovedClubs(clubs) {
  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 1);
  document.querySelector(".club-proposals-badge").innerHTML =
    filteredClubs.length;
  if (filteredClubs.length <= 0) {
    clubProposals.innerHTML = "";
    return;
  }
  if (filteredClubs.length > 0) {
    clubProposals.innerHTML = "";
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
        <button class="uk-button uk-button-primary uk-width-1" onclick="approveClub(${club.clubId},'${club.clubName}')">Approve</button>
        </div>
        </div>
        </div>
        `;
  });
}
async function approveClub(clubId, clubName) {
  const response = await fetch("http://localhost:3000/approveClub", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clubId: clubId,
      clubName: clubName,
    }),
  });
  const json = await response.json();
  console.log(json);
  if (json.body === "Success") {
    console.log("Success");
    UIkit.notification({
      message: `${json.clubInfo.clubName} Successfully Approved!`,
      status: "success",
    });
    await getAllApprovedClubs();
    console.log(json.clubInfo.clubName);
  }
}
