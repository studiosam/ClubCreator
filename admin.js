const approvedClubList = document.querySelector("#approvedClubList");
const clubProposals = document.querySelector("#clubProposalList");
const socket = new WebSocket(`ws://${serverAddress}:8008`);
let oldDbFile = null;
let xlsFile = null;
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
async function createTeachers() {
  const numOfTeachers = document.querySelector("#num-of-rand-teachers").value;

  const response = await fetch(
    `http://${serverAddress}:3000/admin-create-teachers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isAdmin: user.isAdmin,
        numOfTeachers: numOfTeachers,
      }),
    }
  );
  const clubs = await response.json();
  if (clubs.body === "Success") {
    UIkit.notification({
      message: `${numOfTeachers} Random Teachers Created!`,
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
        teacherId: user.userId,
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
  if (approvedClubList) {
    await getAllApprovedClubs();
  }
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
          let clubStatus = "Not Ready";
          if (club.primaryTeacherId !== null && club.primaryTeacherId !== 0) {
            let clubInfo = await fetch(
              `http://${serverAddress}:3000/getUserInfo?userId=${club.primaryTeacherId}`
            );
            if (!clubInfo.status == 200) {
              console.log(`Failed to fetch club info for club ID ${club.clubId}`)
            } else {
              teacherInfo = await clubInfo.json();
              isPrimaryId = "";
              teacherFirstName = teacherInfo.firstName;
              teacherLastName = teacherInfo.lastName;
            }
          } else {
            console.log(`Failed to fetch club info for club ID ${club.clubId}`)
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

          if (club.room !== null && club.room !== "") {
            locationNeeded = "blue";
          } else {
            locationNeeded = "red";
          }
          if (coSponsorsStillNeeded > 0) {
            usersNeeded = "red";
          } else {
            usersNeeded = "blue";
          }
          if (usersNeeded === "blue" && locationNeeded === "blue") {
            isPrimaryId = "blue-boarder";
            clubStatus = "Ready";
            badgeType = "uk-label";
          } else {
            club.room = null;
            isPrimaryId = "red-boarder";
            badgeType = "uk-label-danger";
          }
          approvedClubList.innerHTML += `<form class="approved-clubs uk-width-1-2@m" id="form${club.clubId
            }"><div id="club-${club.clubId}" class="uk-card ${isPrimaryId}">
    <div id="${club.clubId
            }" class=" uk-card uk-card-default uk-card-body uk-card-hover">
    <div class="uk-card-badge uk-label ${badgeType}">${clubStatus}</div>
    <div class="uk-background-blend-multiply uk-background-secondary" id="cover-photo-card" style="background-image : url('${club.coverPhoto
            }')">   
    <a class="cover-card-text" href="http://${serverAddress}/club-info.html?club-id=${club.clubId
            }"><p class="roboto uk-text-bold clubName" id="${club.clubId
            }clubName">${club.clubName}</p></a>
    <input type="hidden" name="clubName" value="${club.clubName}">
    </div> 
    <div class="text-center uk-margin-medium-top">
    <span class="${locationNeeded}" uk-icon="icon:location; ratio:1.5"uk-tooltip="title:Room: ${club.room || "None"
            }"></span>
    <span class="${usersNeeded}" uk-icon="icon:users; ratio:1.5" uk-tooltip="${coSponsorsStillNeeded} Co-Sponsors Still Needed"></span>
    <button type="button" id="club-edit-button-${club.clubId
            }" class="uk-button uk-button-primary edit-club-button">Edit Club</button>
    </div>
    <div id="club-card-body-${club.clubId}" class="uk-card-body hidden">
        <p class= "uk-text-bold text-center" id="clubDescription">${club.clubDescription
            }</p>
        <input type="hidden" name="clubDescription" value="${club.clubDescription
            }">
      <div id="changeTeacher${club.clubId}" class="maxSlots uk-margin">
      <span>Primary Teacher: </span>
             <strong>${teacherFirstName || "Select"} ${teacherLastName || "Teacher"
            }</strong>
             <button type="button" onclick="changeTeacher(${club.clubId
            })" class="change">Change</button>
            </div>
            <div id="coSponsorsBlock${club.clubId}" class="maxSlots">
            <span>Current Co-Sponsors: </span>
            <ul class="uk-list co-sponsor-list" id="currentCosponsors${club.clubId
            }"></ul>
                        
            </div>
      <div id="addCoSponsor${club.clubId}" class="maxSlots uk-margin">
      <span>Add Co-Sponsor: </span>
             <button type="button" onclick="addCosponsor(${club.clubId
            })" class="change">Add</button>
            </div>
        
        <input id="hiddenTeacherId${club.clubId
            }" type="hidden" name="primaryTeacherId" value="${club.primaryTeacherId || null
            }">
        <div class="maxSlots">
        <span>Maximum Slots: </span><input name="maxSlots" id="clubId${club.clubId
            }-maxSlots" class="uk-input uk-form-width-small" type="number" value="${club.maxSlots
            }"></div>
        <div id="minSlotsWrapper">
        <p class="text-center uk-text-bold uk-margin-medium-top">Minimum Slots:</p>
        <div id="minSlots-${club.clubId}" class="minSlots">
        <div class="text-center">
        <span class="">9th Grade: </span><input name="minSlots9" id = "${club.clubId
            }-minslots9" class = "slots9 uk-input" type="number" value="${club.minSlots9
            }">
        </div>
        <div class="text-center">
        <span class="">10th Grade: </span><input name="minSlots10" id = "${club.clubId
            }-minslots10" class = "slots10 uk-input" type="number" value="${club.minSlots10
            }">
        </div>
        <div class="text-center">
        <span class="">11th Grade: </span><input name="minSlots11" id = "${club.clubId
            }-minslots11" class = "slots11 uk-input" type="number" value="${club.minSlots11
            }">
        </div>
        <div class="text-center">
        <span class="">12th Grade: </span><input name="minSlots12" id = "${club.clubId
            }-minslots12" class = "slots12 uk-input" type="number" value="${club.minSlots12
            }">
        </div>
        </div>
        </div>
        <p class="text-center uk-text-bold uk-margin-medium-top">Co-Sponsors:</p>
        <div class="coSponsors">
        <div class="coSponsors">
        <span>Total Required: </span><input name="coSponsorsNeeded" id = "clubId${club.coSponsorsNeeded
            }-coSponsorsNeeded" class = "uk-input uk-width-1-2" type="number" value="${club.coSponsorsNeeded
            }">
    </div>
      <div class="coSponsors">
      <span>Still Needed: </span><p id = "clubId${club.clubId
            }-coSponsorsRequired" class ="">${coSponsorsStillNeeded}</p>
      </div>
    </div>
    <div class="text-center approval">
    <span>Room: </span><input name="room" class = "clubId${club.clubId
            }-room uk-input uk-form-width-small" type="text" value="${club.room || ""}">
    <span>Approved: </span><input name="isApproved" id="is-approved${club.clubId
            }" class ="isApproved" type="checkbox" checked>
    </div>
        
        <div class="text-center">
        <button type="button" id="approve${club.clubId
            }" class="uk-button uk-button-secondary uk-width-1 approveBtn">Confirm</button>
        <button class="delete" uk-toggle="target: #delete-confirmation" type="button">
        <img id="delete-link-${club.clubId
            }" src="/img/trash-can.png" width="40px">
        </button>
        </div>
        
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

  teachers = teachers.filter((teacher) => teacher.clubId === null || teacher.clubId === "");

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
  const filteredClubs = clubs.filter((obj) => obj.isApproved !== 1);

  // Update the badge count
  document.querySelector(".club-proposals-badge").innerHTML = filteredClubs.length;

  // Clear the proposals list
  clubProposals.innerHTML = "";

  if (filteredClubs.length === 0) {
    return; // Nothing to display, so exit early
  }

  for (const club of filteredClubs) {
    let teacherFirstName = "No";
    let teacherLastName = "Teacher";

    try {
      if (club.primaryTeacherId) {
        const response = await fetch(
          `http://${serverAddress}:3000/getUserInfo?userId=${club.primaryTeacherId}`
        );

        if (response.status === 200) {
          const teacherInfo = await response.json();
          teacherFirstName = teacherInfo.firstName || "No";
          teacherLastName = teacherInfo.lastName || "Teacher";
        } else {
          console.log(`Failed to fetch club info for club ID ${club.clubId}`);
        }
      } else {
        console.log(`Primary teacher ID is null for club ID ${club.clubId}`);
      }
    } catch (error) {
      console.log(`Failed to fetch club info for club ID ${club.clubId}: ${error.message}`);
    }

    // Render the club proposal
    clubProposals.innerHTML += `
      <div id="club-${club.clubId}" class="uk-card uk-width-1-2 club-proposals uk-container-expand">
        <div class="uk-card uk-card-default uk-card-body uk-card-hover">
          <div class="uk-card-badge uk-label uk-label-warning">Unapproved</div>
          <div class="uk-background-blend-multiply uk-background-secondary" id="cover-photo-card" style="background-image : url('${club.coverPhoto}')"> 
            <a href="http://${serverAddress}/club-info.html?club-id=${club.clubId}">
              <h2 id="${club.clubId}clubName" class="roboto uk-card-title cover-card-text">${club.clubName}</h2>
            </a>
          </div> 
          <div class="uk-card-body">
            <p class="uk-text-bold">${club.clubDescription}</p>
            <p class="text-center uk-text-bold">Submitted By:</p>
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
      </div>`;
  }

  // Add event listeners for delete buttons
  document.querySelectorAll(".delete").forEach((element) => {
    element.addEventListener("click", (e) => {
      const clubId = e.target.id.match(/\D(\d+)$/)[1];
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
  document.querySelectorAll(".edit-club-button").forEach((element) => {
    element.addEventListener("click", async (e) => {
      clubId = e.target.id.match(
        `(?<=button-)(.+?)((?<![^a-zA-Z0-9_\u4e00-\u9fa5])(?=[^a-zA-Z0-9_\u4e00-\u9fa5])|(?<=[^a-zA-Z0-9_\u4e00-\u9fa5])(?![^a-zA-Z0-9_\u4e00-\u9fa5])|$)`
      )[1];

      document
        .getElementById(`club-card-body-${clubId}`)
        .classList.remove("hidden");
      e.target.style.display = "none";
    });
  });

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

// --- Import Handlers ---
function setupImportUI() {
  const olddbDrop = document.getElementById("olddb-drop");
  const xlsDrop = document.getElementById("xls-drop");
  const olddbInput = document.getElementById("olddb-input");
  const xlsInput = document.getElementById("xls-input");
  const olddbSelected = document.getElementById("olddb-selected");
  const xlsSelected = document.getElementById("xls-selected");

  if (olddbDrop && olddbInput) {
    ;["dragover", "drop"].forEach((evt) => {
      olddbDrop.addEventListener(evt, (e) => e.preventDefault());
    });
    olddbDrop.addEventListener("drop", (e) => {
      oldDbFile = e.dataTransfer.files[0];
      olddbSelected.textContent = oldDbFile ? `Selected: ${oldDbFile.name}` : "";
    });
    olddbInput.addEventListener("change", (e) => {
      oldDbFile = e.target.files[0];
      olddbSelected.textContent = oldDbFile ? `Selected: ${oldDbFile.name}` : "";
    });
    document
      .getElementById("import-teachers-btn")
      .addEventListener("click", importTeachersFromOldDb);
  }

  if (xlsDrop && xlsInput) {
    ;["dragover", "drop"].forEach((evt) => {
      xlsDrop.addEventListener(evt, (e) => e.preventDefault());
    });
    xlsDrop.addEventListener("drop", (e) => {
      xlsFile = e.dataTransfer.files[0];
      xlsSelected.textContent = xlsFile ? `Selected: ${xlsFile.name}` : "";
    });
    xlsInput.addEventListener("change", (e) => {
      xlsFile = e.target.files[0];
      xlsSelected.textContent = xlsFile ? `Selected: ${xlsFile.name}` : "";
    });
    document
      .getElementById("import-students-btn")
      .addEventListener("click", importStudentsFromXls);
  }
}

async function importTeachersFromOldDb() {
  if (!oldDbFile) {
    UIkit.notification({ message: "Please select an old DB file", status: "warning" });
    return;
  }
  const statusEl = document.getElementById("import-status");
  if (statusEl) statusEl.innerHTML = '<div class="uk-alert-primary" uk-alert>Uploading old database…</div>';
  const formData = new FormData();
  formData.append("olddb", oldDbFile);
  formData.append("isAdmin", user.isAdmin ? "true" : "false");
  let result;
  const res = await fetch(`http://${serverAddress}:3000/admin-import-teachers`, {
    method: "POST",
    body: formData,
  });
  try { result = await res.json(); } catch (e) { result = { body: "Error", error: "Invalid server response" }; }
  if (res.ok && result.body === "Success") {
    console.log("Success");
    UIkit.notification({
      message: `Imported ${result.imported} teachers (skipped ${result.skipped})`,
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
    if (statusEl) statusEl.innerHTML = `<div class="uk-alert-success" uk-alert>Imported ${result.imported} teachers (skipped ${result.skipped})</div>`;
  } else {
    const msg = result && result.error ? result.error : res.statusText || "Import failed";
    UIkit.notification({ message: `Teacher import failed: ${msg}`, status: "danger", pos: "top-center" });
    if (statusEl) statusEl.innerHTML = `<div class=\"uk-alert-danger\" uk-alert>Teacher import failed: ${msg}</div>`;
  }
}

async function importStudentsFromXls() {
  if (!xlsFile) {
    UIkit.notification({ message: "Please select an XLS file", status: "warning" });
    return;
  }
  const statusEl = document.getElementById("import-status");
  if (statusEl) statusEl.innerHTML = '<div class="uk-alert-primary" uk-alert>Uploading student spreadsheet…</div>';
  const formData = new FormData();
  formData.append("studentsXls", xlsFile);
  formData.append("isAdmin", user.isAdmin ? "true" : "false");
  let result;
  const res = await fetch(`http://${serverAddress}:3000/admin-import-students-xls`, {
    method: "POST",
    body: formData,
  });
  try { result = await res.json(); } catch (e) { result = { body: "Error", error: "Invalid server response" }; }
  if (res.ok && result.body === "Success") {
    UIkit.notification({
      message: `Imported ${result.imported} students (skipped ${result.skipped})`,
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
    if (statusEl) statusEl.innerHTML = `<div class="uk-alert-success" uk-alert>Imported ${result.imported} students (skipped ${result.skipped})</div>`;
  } else {
    const msg = result && result.error ? result.error : res.statusText || "Import failed";
    UIkit.notification({ message: `Student import failed: ${msg}`, status: "danger", pos: "top-center" });
    if (statusEl) statusEl.innerHTML = `<div class=\"uk-alert-danger\" uk-alert>Student import failed: ${msg}</div>`;
  }
}

// Initialize on admin page load
document.addEventListener("DOMContentLoaded", setupImportUI);
