const approvedClubList = document.querySelector("#approvedClubList");
const clubProposals = document.querySelector("#clubProposalList");
const socket = new WebSocket(`ws://${serverAddress}:8008`);
async function deleteAllUserClubs() {
  const response = await fetch(`http://${serverAddress}:3000/admin-erase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      isAdmin: user.isAdmin,
    }),
  });
  const clubs = await response.json();
  if (clubs.body === "Success") {
    UIkit.notification({
      message: "All User Clubs Deleted!",
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
  }
}
async function deleteAllClubs() {
  const response = await fetch(
    `http://${serverAddress}:3000/admin-erase-all-clubs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isAdmin: user.isAdmin,
      }),
    }
  );
  const clubs = await response.json();
  if (clubs.body === "Success") {
    UIkit.notification({
      message: "All Clubs Deleted!",
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
  }
}

async function deleteAllStudents() {
  const response = await fetch(
    `http://${serverAddress}:3000/admin-erase-students`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isAdmin: user.isAdmin,
      }),
    }
  );
  const clubs = await response.json();
  if (clubs.body === "Success") {
    UIkit.notification({
      message: "All Students Deleted!",
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
  }
}
async function createStudents() {
  const numOfStudents = document.querySelector("#num-of-rand-students").value;

  const response = await fetch(
    `http://${serverAddress}:3000/admin-create-students`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isAdmin: user.isAdmin,
        numOfStudents: numOfStudents,
      }),
    }
  );
  const clubs = await response.json();
  if (clubs.body === "Success") {
    UIkit.notification({
      message: `${numOfStudents} Random Students Created!`,
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
  }
}
async function createClubs() {
  const numOfClubs = document.querySelector("#num-of-rand-clubs").value;
  const response = await fetch(
    `http://${serverAddress}:3000/admin-create-clubs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isAdmin: user.isAdmin,
        numOfClubs: numOfClubs,
      }),
    }
  );
  const clubs = await response.json();
  if (clubs.body === "Success") {
    UIkit.notification({
      message: `${numOfClubs} Random Clubs Created!`,
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
  }
}

if (user.isAdmin === 0) {
  document.body.innerHTML = "<h1>NOT AN ADMIN</h1>";
}
let teachers;
(async () => {
  await getAllApprovedClubs();
})();
async function getAllApprovedClubs() {
  const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
  const clubs = await response.json();

  getAllUnapprovedClubs(clubs);

  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 0);

  document.querySelector(".approved-clubs-badge").innerHTML =
    filteredClubs.length;

  if (filteredClubs.length === 0) {
    approvedClubList.innerHTML = "No Approved Clubs";
  } else {
    approvedClubList.innerHTML = "";

    try {
      await Promise.all(
        filteredClubs.map(async (club) => {
          let teacherFirstName = "Select";
          let teacherLastName = "Teacher";
          let isPrimaryId = "red-boarder";

          if (club.primaryTeacherId !== null && club.primaryTeacherId !== 0) {
            let clubInfo = await fetch(
              `http://${serverAddress}:3000/getUserInfo?userId=${club.primaryTeacherId}`
            );
            if (!clubInfo.ok) {
              throw new Error(
                `Failed to fetch club info for club ID ${club.clubId}`
              );
            }

            teacherInfo = await clubInfo.json();
            isPrimaryId = "";
            teacherFirstName = teacherInfo.firstName;
            teacherLastName = teacherInfo.lastName;
          }
          const response = await fetch(
            `http://${serverAddress}:3000/get-cosponsors/${club.clubId}`
          );
          const coSponsors = await response.json();

          const currentCoSponsors = coSponsors.cosponsors.length;
          const coSponsorsStillNeeded =
            club.coSponsorsNeeded - currentCoSponsors;
          if (coSponsorsStillNeeded < 0) {
            isPrimaryId = "red-boarder";
          }
          approvedClubList.innerHTML += `<form class="approved-clubs uk-width-1-2@m" id="form${
            club.clubId
          }"><div id="club-${club.clubId}" class="uk-card ${isPrimaryId}">
    <div id="${
      club.clubId
    }" class=" uk-card uk-card-default uk-card-body uk-card-hover">
    <div class="uk-card-badge uk-label uk-label-success">Approved</div>
    <div class="uk-background-blend-multiply uk-background-secondary" id="cover-photo-card" style="background-image : url('${
      club.coverPhoto
    }')">   
    <a class="cover-card-text" href="http://${serverAddress}/club-info.html?club-id=${
            club.clubId
          }><p class="roboto uk-text-bold clubName" id="${
            club.clubId
          }clubName">${club.clubName}</p></a>
    <input type="hidden" name="clubName" value="${club.clubName}">
    </div> 
    <div class="uk-card-body">
        <p class= "uk-text-bold text-center" id="clubDescription">${
          club.clubDescription
        }</p>
        <input type="hidden" name="clubDescription" value="${
          club.clubDescription
        }">
      <div id="changeTeacher${club.clubId}" class="maxSlots uk-margin">
      <span>Primary Teacher: </span>
             <strong>${teacherFirstName || "Select"} ${
            teacherLastName || "Teacher"
          }</strong>
             <button type="button" onclick="changeTeacher(${
               club.clubId
             })" class="change">Change</button>
            </div>
            <div id="coSponsorsBlock${club.clubId}" class="maxSlots">
            <span>Current Co-Sponsors: </span>
            <ul class="uk-list co-sponsor-list" id="currentCosponsors${
              club.clubId
            }"></ul>
                        
            </div>
      <div id="addCoSponsor${club.clubId}" class="maxSlots uk-margin">
      <span>Add Co-Sponsor: </span>
             <button type="button" onclick="addCosponsor(${
               club.clubId
             })" class="change">Add</button>
            </div>
        
        <input id="hiddenTeacherId${
          club.clubId
        }" type="hidden" name="primaryTeacherId" value="${
            club.primaryTeacherId || null
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
        <div class="text-center">
        <span class="">9th Grade: </span><input name="minSlots9" id = "${
          club.clubId
        }-minslots9" class = "slots9 uk-input" type="number" value="${
            club.minSlots9
          }">
        </div>
        <div class="text-center">
        <span class="">10th Grade: </span><input name="minSlots10" id = "${
          club.clubId
        }-minslots10" class = "slots10 uk-input" type="number" value="${
            club.minSlots10
          }">
        </div>
        <div class="text-center">
        <span class="">11th Grade: </span><input name="minSlots11" id = "${
          club.clubId
        }-minslots11" class = "slots11 uk-input" type="number" value="${
            club.minSlots11
          }">
        </div>
        <div class="text-center">
        <span class="">12th Grade: </span><input name="minSlots12" id = "${
          club.clubId
        }-minslots12" class = "slots12 uk-input" type="number" value="${
            club.minSlots12
          }">
        </div>
        </div>
        </div>
        <p class="text-center uk-text-bold uk-margin-medium-top">Co-Sponsors:</p>
        <div class="coSponsors">
        <div class="coSponsors">
        <span>Total Required: </span><input name="coSponsorsNeeded" id = "clubId${
          club.coSponsorsNeeded
        }-coSponsorsNeeded" class = "uk-input uk-width-1-2" type="number" value="${
            club.coSponsorsNeeded
          }">
    </div>
      <div class="coSponsors">
      <span>Still Needed: </span><p id = "clubId${
        club.clubId
      }-coSponsorsRequired" class ="">${coSponsorsStillNeeded}</p>
      </div>
    </div>
    <div class="text-center approval">
    <span>Room: </span><input name="room" class = "clubId${
      club.clubId
    }-room uk-input uk-form-width-small" type="text" value="${club.room || ""}">
    <span>Approved: </span><input name="isApproved" id="is-approved${
      club.clubId
    }" class ="isApproved" type="checkbox" checked>
    </div>
        
        
        
        </div>
        <div class="text-center">
        <button type="button" id="approve${
          club.clubId
        }" class="uk-button uk-button-secondary uk-width-1 approveBtn">Confirm</button>
        <button class="delete" uk-toggle="target: #delete-confirmation" type="button">
        <img id="delete-link-${
          club.clubId
        }" src="/img/trash-can.png" width="40px">
        </button>
        </div>
        </div>
        </div></form>
        `;

          if (coSponsors.cosponsors.length > 0) {
            coSponsors.cosponsors.forEach((cosponsor) => {
              document.getElementById(
                `currentCosponsors${club.clubId}`
              ).innerHTML += `<li>${cosponsor.firstName} ${cosponsor.lastName}</li>`;
            });
            document.getElementById(
              `coSponsorsBlock${club.clubId}`
            ).innerHTML += `<button type="button" onclick="removeCoSponsor(${club.clubId}, ${club.primaryTeacherId}
              )" class="change">Remove</button>`;
          }
        })
      );
      // console.log("ready");
      await attachEventListeners();
    } catch (error) {
      console.error(error);
    }
  }
}

async function updateClubValue(newClubData) {
  console.log("Updating club value");
  const response = await fetch(`http://${serverAddress}:3000/updateClub`, {
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

//////////////
async function changeTeacher(club) {
  document.getElementById(`hiddenTeacherId${club}`).remove();
  const getTeachers = await fetch(
    `http://${serverAddress}:3000/getAllUsers?isTeacher=true`
  );
  teachers = await getTeachers.json();

  teachers = teachers.filter(
    (teacher) => teacher.clubId === null || teacher.clubId === club
  );

  document.getElementById(
    `changeTeacher${club}`
  ).innerHTML = `<span>Primary Teacher</span> <div class="uk-margin">
  <select id="teacherDrop${club}" name="primaryTeacherId" class="primaryTeacher uk-select uk-form-width-medium" aria-label="Select">
  </select>`;

  teachers.forEach((teacher) => {
    document.getElementById(
      `teacherDrop${club}`
    ).innerHTML += `<option value="${teacher.userId}">${teacher.userId} - ${teacher.firstName} ${teacher.lastName}</option>`;
  });
}
async function addCosponsor(club, teacher) {
  const list = document.getElementById(`addCoSponsor${club}`);
  const getTeachers = await fetch(
    `http://${serverAddress}:3000/getAllUsers?isTeacher=true`
  );
  teachers = await getTeachers.json();

  teachers = teachers.filter((teacher) => teacher.clubId === null);

  list.innerHTML = `<span>Co Sponsor</span> <div class="uk-margin">
  <select id="coSponsorDrop${club}" name="addedCoSponsor" class="primaryTeacher uk-select uk-form-width-medium" aria-label="Select">
  </select>`;

  teachers.forEach((teacher) => {
    document.getElementById(
      `coSponsorDrop${club}`
    ).innerHTML += `<option value="${teacher.userId}">${teacher.userId} - ${teacher.firstName} ${teacher.lastName}</option>`;
  });
}
async function removeCoSponsor(club, primeTeacher) {
  const list = document.getElementById(`currentCosponsors${club}`);
  const getTeachers = await fetch(
    `http://${serverAddress}:3000/getAllUsers?isTeacher=true`
  );
  teachers = await getTeachers.json();

  teachers = teachers.filter(
    (teacher) => teacher.clubId === club && teacher.userId !== primeTeacher
  );

  list.innerHTML = `<span>Co Sponsor</span> <div class="uk-margin">
  <select id="coSponsorDrop${club}" name="removedCoSponsor" class="primaryTeacher uk-select uk-form-width-medium" aria-label="Select">
  </select>`;

  teachers.forEach((teacher) => {
    document.getElementById(
      `coSponsorDrop${club}`
    ).innerHTML += `<option value="${teacher.userId}">${teacher.userId} - ${teacher.firstName} ${teacher.lastName}</option>`;
  });
}

////////////////////
async function getAllUnapprovedClubs(clubs) {
  // console.log(clubs);
  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 1);
  // console.log(filteredClubs);
  document.querySelector(".club-proposals-badge").innerHTML =
    filteredClubs.length;
  if (filteredClubs.length <= 0) {
    clubProposals.innerHTML = "";
    return;
  }
  if (filteredClubs.length > 0) {
    clubProposals.innerHTML = "";
  }
  filteredClubs.forEach(async (club) => {
    let clubInfo = await fetch(
      `http://${serverAddress}:3000/getUserInfo?userId=${club.primaryTeacherId}`
    );
    if (!clubInfo.ok) {
      throw new Error(`Failed to fetch club info for club ID ${club.clubId}`);
    }

    teacherInfo = await clubInfo.json();
    teacherFirstName = teacherInfo.firstName;
    teacherLastName = teacherInfo.lastName;
    clubProposals.innerHTML += `<div id="club-${club.clubId}" class="uk-card uk-width-1-2 club-proposals uk-container-expand">
    <div class="uk-card uk-card-default uk-card-body uk-card-hover">
    <div class="uk-card-badge uk-label uk-label-warning">Unapproved</div>
     <div class="uk-background-blend-multiply uk-background-secondary" id="cover-photo-card" style="background-image : url('${club.coverPhoto}')"> 
    <a href="http://${serverAddress}/club-info.html?club-id=${club.clubId}"><h2 class="roboto uk-card-title cover-card-text">${club.clubName}</h2></a>
    </div> 
    <div class="uk-card-body">
        <p class="uk-text-bold">${club.clubDescription}</p>
        <p class="text-center uk-text-bold">Submited By:</p>
        <p class="text-center uk-text-bold">${teacherFirstName} ${teacherLastName}</p>
        </div>
        <div class="uk-card-footer text-center">
        <button class="uk-button uk-button-primary uk-width-1-1" onclick="approveClub(${club.clubId},'${club.clubName}')">Approve</button>
        <div>
        <button class="delete" uk-toggle="target: #delete-confirmation" type="button">
        <img id="delete-link-${club.clubId}" src="/img/trash-can.png" width="40px">
        </button>
        </div>
        </div>
        </div>
        </div>
        `;
  });

  document.querySelectorAll(".delete").forEach((element) => {
    element.addEventListener("click", (e) => {
      console.log("Delete!");
      clubId = e.target.id.match(/\D(\d+)$/)[1];
      const clubName = document.querySelector(`#club-${clubId} h2`).innerHTML;
      document.querySelector(
        "#delete-confirmation-body"
      ).innerHTML = `<span class="red">Delete</span> ${clubName}?`;
      document
        .querySelector("#delete-btn")
        .setAttribute("onClick", `deleteClub(${clubId},"${clubName}")`);
    });
  });
}

async function deleteClub(clubId, clubName) {
  const response = await fetch(`http://${serverAddress}:3000/deleteClub`, {
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
  // console.log(json);
  if (json.body === "Success") {
    console.log("Success");
    UIkit.notification({
      message: `${clubName} has been deleted!`,
      status: "success",
    });
    await getAllApprovedClubs();
  }
}
async function approveClub(clubId, clubName) {
  const response = await fetch(`http://${serverAddress}:3000/approveClub`, {
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
  // console.log(json);
  if (json.body === "Success") {
    console.log("Success");
    UIkit.notification({
      message: `${json.clubInfo.clubName} Successfully Approved!`,
      status: "success",
    });
    await getAllApprovedClubs();
    // console.log(json.clubInfo.clubName);
  }
}

async function attachEventListeners() {
  document.querySelectorAll(".approveBtn").forEach((element) => {
    element.addEventListener("click", async (e) => {
      clubId = e.target.id.match(/\D(\d+)$/)[1];
      // console.log(document.querySelector(`#is-approved${clubId}`).checked);
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

  document.querySelectorAll(".delete").forEach((element) => {
    element.addEventListener("click", (e) => {
      console.log("Delete!");
      clubId = e.target.id.match(/\D(\d+)$/)[1];
      const clubName = document.getElementById(`${clubId}clubName`).textContent;
      console.log(clubName);
      document.querySelector(
        "#delete-confirmation-body"
      ).innerHTML = `<span class="red">Delete</span> ${clubName}?`;
      document
        .querySelector("#delete-btn")
        .setAttribute("onClick", `deleteClub(${clubId},"${clubName}")`);
    });
  });
}

async function assignClubs() {
  const respose = await fetch(
    `http://${serverAddress}:3000/admin-club-assignment`
  );
  const json = await respose.json();
  if (json.body === "Success") {
    console.log("Success");
    UIkit.notification({
      message: `Successfully assigned clubs!`,
      status: "success",
    });
    await getAllApprovedClubs();
  }
}

socket.onmessage = function (event) {
  const createdItem = JSON.parse(event.data);
  const createdItemContainer = document.getElementById("create-list");
  const progressBar = document.getElementById("progress-bar");
  progressBar.classList.remove("hidden");
  if (createdItem.type === "student") {
    progressBar.value = createdItem.progress;
    const studentHTML = `
    <div class="student">
      <p>Name: ${createdItem.firstName} ${createdItem.lastName}</p>
      <p>Email: ${createdItem.email}</p>
      <p>Grade: ${createdItem.grade}</p>
      <p>Club Preferences: ${createdItem.clubPreferences}</p>
    </div>
  `;
    createdItemContainer.innerHTML = studentHTML;
  } else if (createdItem.type === "club") {
    progressBar.value = createdItem.progress;
    const studentHTML = `
    <div class="student">
      <p>Name: ${createdItem.clubName}</p>
    </div>
  `;
    createdItemContainer.innerHTML = studentHTML;
  }
};
