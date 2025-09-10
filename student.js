async function getUser() {
  if (user) {
    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(user);
    if (user.isTeacher) {
      window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }
  } else {
    console.log(`Nobody is logged in`);
    window.location.href = "/";
  }
  await getStudentDashboard();
}

getUser();

async function getStudentDashboard() {
  console.log('CLUBID', user.clubId)
  if (user.clubId !== null) {
    await finishStudentDashboard();
  } else if (
    user.clubPreferences &&
    user.clubPreferences !== null &&
    user.clubPreferences !== ""
  ) {
    document.querySelector("#main-dashboard-panel").classList.add("hidden");
    document.querySelector(
      "#current-prefs"
    ).innerHTML = `<div class="uk-flex uk-flex-column uk-flex-middle">
    <h1>Current Club Selections</h1>
    <div style="width:auto">
    <ul class="uk-list uk-list-decimal" id="current-user-selections">
    </ul>
    </div>
    <button id="change-club-prefs" class="uk-button uk-button-primary uk-margin-top">Click Here To Change</button>
    </div>`;
    const currentClubs = user.clubPreferences.split(",").map((clubId) => {
      fetch(`http://${serverAddress}:3000/getClubById?club=${clubId}`)
        .then((response) => response.json())
        .then((club) => {
          document.querySelector(
            "#current-user-selections"
          ).innerHTML += `<li class="uk-text-large">${club.clubName}</li>`;
        });
    });
    document
      .querySelector("#change-club-prefs")
      .addEventListener("click", () => {
        finishStudentDashboard();
      });
  } else {
    await finishStudentDashboard();
  }
}

async function finishStudentDashboard() {
  document.querySelector("#main-dashboard-panel").classList.remove("hidden");
  document.querySelector("#current-prefs").classList.add("hidden");
  const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
  const respClubs = await response.json();

  const clubStudentCounts = await Promise.all(
    respClubs.map(async (club) => {
      const response = await fetch(
        `http://${serverAddress}:3000/get-students-in-club/${club.clubId}`
      );
      const studentCount = await response.json();
      return { ...club, studentCount };
    })
  );

  // Filter the clubs based on the specified conditions
  const clubs = clubStudentCounts.filter((club) => {
    const minSlotsGrade = club[`minSlots${user.grade}`];

    const totalMinSlots =
      club.minSlots9 + club.minSlots10 + club.minSlots11 + club.minSlots12;

    const hasAvailableSlots = club.studentCount.students.length < club.maxSlots;
    console.log(hasAvailableSlots);
    return minSlotsGrade > 0 || (totalMinSlots === 0 && hasAvailableSlots);
  });
  console.log(clubs)
  const myAssignedClub = await respClubs.filter(
    (obj) => obj.clubId === user.clubId
  );
  if (myAssignedClub.length > 0) {
    const myClubs = document.querySelector("#my-club");
    myAssignedClub.forEach((club) => {
      let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=005DB4&color=fff`;
      if (
        club.coverPhoto &&
        club.coverPhoto !== "NULL" &&
        club.coverPhoto !== "null" &&
        club.coverPhoto !== null
      ) {
        coverPhotoUrl = `${club.coverPhoto}`;
      }
      myClubs.innerHTML += `<a href="http://${serverAddress}/club-info.html?club-id=${club.clubId}" class="uk-link-text">
    <div class="club">
    <p class="uk-card-title roboto">${club.clubName}</p>
    <div class="club-thumbnail" style="background-image: url(&quot;${coverPhotoUrl}&quot;)">
    </div>
      <p class="dark">Room: ${club.room}</p>
      <p class="dark">${club.clubDescription}</p>
    </div></a><hr>
    `;
    });
  } else {
    const allClubs = document.querySelector("#my-club");
    document.querySelector(
      "#menuInstructions"
    ).innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">Please select your top 5 preferences for our club activities this semester.</h3>
        <p><strong class="red">You must select exactly 5 choices.</strong></p>`;

    clubs.forEach((club) => {
      const clubsplit = club.clubName.replaceAll(" ", "-");
      let coverPhotoUrl = `https://ui-avatars.com/api/?name=${clubsplit}&background=005DB4&color=fff`;
      console.log(coverPhotoUrl);
      if (
        club.coverPhoto &&
        club.coverPhoto !== "NULL" &&
        club.coverPhoto !== "null" &&
        club.coverPhoto !== null &&
        club.coverPhoto !== ""
      ) {
        coverPhotoUrl = `${club.coverPhoto}`;
      }
      allClubs.innerHTML += `<div class="student-club-wrapper"  style="background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('${coverPhotoUrl}'); background-size: cover; background-position: center" ><div class="club-choice"><input id="${club.clubId}-${club.clubName}" class="club-input" type="checkbox">
            <div id="${club.clubId}student-club-cover" class="student-club-cover"></div><a href="http://${serverAddress}:3000/club-info/${club.clubId}" class="uk-link-text">
        <div class="club">
          <p class="uk-card-title roboto" style="color:white">${club.clubName}</p>
          </div>
          <div>
          <p class="club-descripton" id="${club.clubId}club-description">${club.clubDescription}</p>
          </div>
        </div></a>
        
        </div>
        <hr>
        `;
    });
    document.querySelector(
      "#card-footer"
    ).innerHTML = `<div class="text-center"><button id="submit" class="uk-button uk-button-primary">Submit</button></div>`;
    document.querySelector("#submit").addEventListener("click", async () => {
      const checkedClubs = document.querySelectorAll(".club-input:checked");
      if (checkedClubs.length > 5) {
        UIkit.notification({
          message: "You may not select more than 5 clubs!",
          status: "danger",
          pos: "top-center",
          timeout: 5000,
        });
      } else if (checkedClubs.length < 5) {
        UIkit.notification({
          message: "You must select exactly 5 clubs",
          status: "danger",
          pos: "top-center",
          timeout: 5000,
        });
      } else {
        document.querySelector("#status").style.display = "none";
        document.querySelector("#status-message").innerHTML = "";
        console.log(checkedClubs);
        const clubIds = [];

        checkedClubs.forEach((club) => {
          clubIds.push({
            clubId: club.id.split("-")[0],
            clubName: club.id.split("-")[1],
            clubDescription: document.getElementById(
              `${club.id.split("-")[0]}club-description`
            ).innerHTML,
          });
        });
        selectedClubList(clubIds);
      }
    });
  }
}

function selectedClubList(clubs) {
  document.querySelector(
    "#card-footer"
  ).innerHTML = `<div class="text-center"><button id="submit-selections" class="uk-button uk-button-primary">Submit</button></div>`;
  const allClubs = document.querySelector("#my-club");
  allClubs.innerHTML = "";
  document.querySelector(
    "#menuInstructions"
  ).innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">Put the 5 clubs you chose in order from your favorite to the least favorite</h3>
        <p><strong class="red">Put your favorite club at the top.</strong></p>`;
  clubs.forEach((club) => {
    allClubs.innerHTML += `<div id="${club.clubId}" class="uk-sortable-handle uk-flex"><span style="margin-top: 9px" class="uk-margin-small-right uk-text-center" uk-icon="icon: table"></span><a href="http://${serverAddress}club-info/${club.clubId}" class="uk-link-text">
        <div id="student-club-wrapper">

          <p class="uk-card-title roboto">${club.clubName}</p>
          <p>${club.clubDescription}</p>
            
        </a>
        </div>
        <hr>
        </div>`;
  });
  document
    .querySelector("#submit-selections")
    .addEventListener("click", async () => {
      document
        .querySelector("#submit-selections").disabled = true
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user.userId;
      console.log("USERID", userId);
      const clubOrder = [];
      const clubList = document.querySelectorAll(".uk-sortable-handle");
      clubList.forEach((club) => {
        clubOrder.push(club.id);
      });
      console.log(clubOrder);
      const response = await fetch(
        `http://${serverAddress}:3000/setClubPrefs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clubOrder: clubOrder, student: userId }),
        }
      );
      const userResult = await response.json();
      console.log(userResult);
      if (userResult.body === "Success") {
        window.location.reload();
        UIkit.notification({
          message: "Your club preferences have been saved!",
          status: "success",
          pos: "top-center",
          timeout: 5000,
        });
      }
    });
}
