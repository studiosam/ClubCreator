const myClubs = document.querySelector("#my-clubs");
const unApprovedClubs = document.querySelector("#unapproved-clubs");
const coSponsorClubs = document.querySelector("#cosponsor-clubs");
loadPage()
async function loadPage() {
  const userUpdate = await fetch(
    `http://${serverAddress}:3000/getUserInfo?userId=${JSON.parse(localStorage.getItem("user")).userId
    }`
  )
  const json = await userUpdate.json()
  console.log(json)
  localStorage.setItem("user", JSON.stringify(json));
  localStorage.setItem("user_timestamp", String(Date.now()));

  const user = JSON.parse(localStorage.getItem("user"));
  console.log(user);
  if (document.querySelector(".avatar")) {
    if (user.avatar) {
      document.querySelectorAll(".avatar").forEach((avatar) => {
        avatar.src = user.avatar;
      });
    } else {
      document.querySelectorAll(".avatar").forEach((avatar) => {
        avatar.src = `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=005DB4&color=fff`;
      });
    }
  }
  document.querySelector(
    "#user-name"
  ).innerHTML = `${user.firstName} ${user.lastName}`;

  if (user) {
    if (user.isAdmin) {
      const level = Number(user.isAdmin || 0) || 0;
      const role = level > 1 ? 'SUPERADMIN' : 'ADMIN';
      document.querySelector("#user-name").classList.add("gold");
      document.querySelector("#user-name").innerHTML += `<div><a href="home-admin.html">${role}</a></div>`;
      document.querySelector("#homepage-link").href = "home-teacher.html";
    } else if (user.isTeacher) {
      document.querySelector(
        "#user-name"
      ).innerHTML += `<div style="text-align:right"class="blue"><span>Teacher</span></div>`;
      document.querySelector("#homepage-link").href = "home-teacher.html";
    } else {
      document.querySelector('#create-link').remove()
      document.querySelector('#account-settings').remove()
      console.log("student");
      document.querySelector(
        "#user-name"
      ).innerHTML += `<div style="text-align:right"class="blue"><span>Student</span></div>`;
      document.querySelector("#homepage-link").href = "home-student.html";
    }

  }
  await getUser();
}
async function buildAdminMenu() {
  const menu = document.querySelector(".dash-nav");
  menu.innerHTML += `<div class= "text-center"><hr class="uk-margin-medium-right uk-margin-top"></div>
  <li><a class="gold" href="home-admin.html"><span uk-icon="icon: settings"></span>Admin Home</a></li>
  <li><a class="gold" href="/users-students.html"><span uk-icon="icon: pencil"></span>Students</a></li>
  <li><a class="gold" href="/users-teachers.html"><span uk-icon="icon: database"></span>Teachers</a></li>
`;
}

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("user_timestamp");
  console.log("User has been cleared from local storage");
  window.location.href = "./index.html";
}

async function getUser() {
  if (user) {
    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(user);
    if (!user.isTeacher) {
      window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }

    //getTeacherDashboard();
  } else {
    console.log(`Nobody is logged in`);
    window.location.href = "/";
  }
  await getTeacherDashboard();
}



async function getTeacherDashboard() {
  // Fetch all clubs

  const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
  const clubs = await response.json();
  // Filter clubs based on approval status and teacher ID
  const myApprovedClubs = clubs.filter(
    (obj) => obj.clubId === user.clubId && obj.isApproved === 1
  );

  const myUnapprovedClubs = clubs.filter((obj) => obj.isApproved === 0);

  const clubsThatNeedCosponsors = [];

  // Use map to create an array of promises
  const promises = clubs.map(async (obj) => {
    const response2 = await fetch(
      `http://${serverAddress}:3000/get-cosponsors/${obj.clubId}`
    );
    const currentCoSponsorsArray = await response2.json();
    const currentCoSponsors = currentCoSponsorsArray.cosponsors.length;

    if (currentCoSponsors < obj.coSponsorsNeeded) {
      // Ensure we are working with plain objects
      const plainClub = { ...obj };
      return plainClub;
    }
    return null;
  });
  const results = await Promise.all(promises);
  results.forEach((result) => {
    if (result != null) {
      clubsThatNeedCosponsors.push(result);
    }
  });

  // Show a lightweight pending notice inside My Club if your club isn't approved yet
  const myPendingClub = clubs.find((obj) => obj.clubId === user.clubId && obj.isApproved === 0);

  // Select the DOM elements for updates

  // Clear existing content
  myClubs.innerHTML = "";
  unApprovedClubs.innerHTML = "";
  coSponsorClubs.innerHTML = "";

  // Pending badge/notice in My Club card
  if (myPendingClub) {
    const coverPhotoUrl = (myPendingClub.coverPhoto && myPendingClub.coverPhoto !== "NULL" && myPendingClub.coverPhoto !== "null")
      ? `${myPendingClub.coverPhoto}`
      : `https://ui-avatars.com/api/?name=${myPendingClub.clubName}&background=005DB4&color=fff`;
    myClubs.innerHTML += `
      <div class="co-sponser-wrapper">
        <div class="club-thumbnail" style="background-image: url('${coverPhotoUrl}')"></div>
        <a href="http://${serverAddress}:3000/club-info/${myPendingClub.clubId}" class="uk-link-text" title="Click to view roster and edit attendance">
          <div class="club">
            <p class="uk-card-title roboto">${myPendingClub.clubName}
              <span class="uk-badge uk-margin-small-left" title="Awaiting admin review">Pending</span>
            </p>
            <p>${myPendingClub.clubDescription || ''}</p>
          </div>
        </a>
      </div>
      <hr>
    `;
  }

  // Populate unapproved clubs
  myUnapprovedClubs.forEach((club) => {
    let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=005DB4&color=fff`;
    if (
      club.coverPhoto &&
      club.coverPhoto !== "NULL" &&
      club.coverPhoto !== "null" &&
      club.coverPhoto !== null
    ) {
      coverPhotoUrl = `${club.coverPhoto}`;
    }
    unApprovedClubs.innerHTML += `<div class="co-sponser-wrapper">
    <div class="club-thumbnail" style="background-image: url(&quot;${coverPhotoUrl}&quot;)">
    </div>
    <a href="http://${serverAddress}:3000/club-info/${club.clubId}" class="uk-link-text" title="Click to view roster and edit attendance">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a></div><hr>`;
  });

  // Populate approved clubs
  myApprovedClubs.forEach((club) => {
    let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=005DB4&color=fff`;
    if (
      club.coverPhoto &&
      club.coverPhoto !== "NULL" &&
      club.coverPhoto !== "null" &&
      club.coverPhoto !== null
    ) {
      coverPhotoUrl = `${club.coverPhoto}`;
    }
    myClubs.innerHTML += `<div style="background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('${coverPhotoUrl}'); background-size:cover; background-position:center;" class="co-sponser-wrapper">
    <div class="club-thumbnail">
    </div>
    <a href="http://${serverAddress}:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto" style="color: white">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a></div><hr>`;
  });
  await displayClubsThatNeedCosponsors(clubsThatNeedCosponsors);

  // Hide sections with no content to show
  try {
    const pendingSection = document.getElementById('pending');
    const cosponsorSection = document.getElementById('co-sponsor');

    const hasPending = String(unApprovedClubs.innerHTML || '').trim().length > 0;
    const hasCosponsor = String(coSponsorClubs.innerHTML || '').trim().length > 0;

    if (pendingSection) pendingSection.style.display = hasPending ? '' : 'none';
    if (cosponsorSection) cosponsorSection.style.display = hasCosponsor ? '' : 'none';
  } catch (_) { /* no-op */ }
}

async function displayClubsThatNeedCosponsors(clubsThatNeedCosponsors) {
  // Populate clubs that need co-sponsors
  for (const club of clubsThatNeedCosponsors) {
    if (club.clubId !== user.clubId) {
      const response = await fetch(
        `http://${serverAddress}:3000/get-cosponsors/${club.clubId}`
      );
      const coSponsors = await response.json();
      console.log("coSponsors", coSponsors);
      const numCoSponsors = coSponsors.cosponsors.length;
      console.log("numCoSponsors", numCoSponsors);
      const requiresCoSponsor = club.coSponsorsNeeded - numCoSponsors > 0;
      console.log("requiresCoSponsor", requiresCoSponsor);
      if (requiresCoSponsor && club.isApproved === 1) {
        let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=005DB4&color=fff`;
        if (club.coverPhoto) {
          coverPhotoUrl = `${club.coverPhoto}`;
        }
        coSponsorClubs.innerHTML += `<div style="background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('${coverPhotoUrl}'); background-size:cover; background-position:center;" class="co-sponser-wrapper">
            <div class="club-thumbnail">
    </div>
        <a href="http://${serverAddress}:3000/club-info/${club.clubId}" class="uk-link-text">
        
        <div class="club">
        
          <p class="uk-card-title roboto" style="color: white">${club.clubName}</p>
          <p>${club.clubDescription}</p>
          <button class="uk-button uk-button-primary" onclick="addToClub(${club.clubId})" id="${club.clubId}">Co-Sponsor Club</button>
        </div></a></div><hr>`;
      }
    }
  }
}

async function addToClub(clubId) {
  const response = fetch(
    `http://${serverAddress}:3000/users/update/${user.userId}/${clubId}?actorId=${encodeURIComponent(user.userId)}`
  );
}
