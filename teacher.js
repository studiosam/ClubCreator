

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

getUser();

async function getTeacherDashboard() {
  // Fetch all clubs
  const response = await fetch("http://localhost:3000/getAllClubs");
  const clubs = await response.json();

  // Filter clubs based on approval status and teacher ID
  const myApprovedClubs = clubs.filter(
    (obj) => obj.clubId === user.clubId && obj.isApproved === 1
  );

  const myUnapprovedClubs = clubs.filter(
    (obj) => obj.primaryTeacherId === user.userId && obj.isApproved === 0
  );

  const clubsThatNeedCosponsors = [];

  // Use map to create an array of promises
  const promises = clubs.map(async (obj) => {
    const response = await fetch(`http://localhost:3000/get-cosponsors/${obj.clubId}`);
    const currentCoSponsorsArray = await response.json();
    const currentCoSponsors = currentCoSponsorsArray.cosponsors.length;

    if (currentCoSponsors < obj.coSponsorsNeeded) {
      // Ensure we are working with plain objects
      const plainClub = { ...obj };
      clubsThatNeedCosponsors.push(plainClub);
    }
  });

  // Await all promises to complete
  await Promise.all(promises);

  // Update the DOM elements
  document.querySelector("#current-clubs").innerHTML =
    myApprovedClubs.length || 0;
  document.querySelector("#pending-clubs").innerHTML =
    myUnapprovedClubs.length || 0;

  // Select the DOM elements for updates
  const myClubs = document.querySelector("#my-clubs");
  const unApprovedClubs = document.querySelector("#unapproved-clubs");
  const coSponsorClubs = document.querySelector("#cosponsor-clubs");

  // Clear existing content
  myClubs.innerHTML = '';
  unApprovedClubs.innerHTML = '';
  coSponsorClubs.innerHTML = '';

  // Populate unapproved clubs
  myUnapprovedClubs.forEach((club) => {
    unApprovedClubs.innerHTML += `<a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a><hr>`;
  });

  // Populate approved clubs
  myApprovedClubs.forEach((club) => {
    myClubs.innerHTML += `<a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a><hr>`;
  });

  // Populate clubs that need co-sponsors
  clubsThatNeedCosponsors.forEach((club) => {
    if (club.requiredCoSponsors > 0 && club.isApproved === 1) {
      coSponsorClubs.innerHTML += `<a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
      <div class="club">
        <p class="uk-card-title roboto">${club.clubName}</p>
        <p>${club.clubDescription}</p>
        <button onclick="addToClub(${club.clubId})" id="${club.clubId}">Co-Sponsor Club</button>
      </div></a><hr>`;
    }
  });
}

async function addToClub(clubId) {
  const response = fetch(`http://127.0.0.1:3000/users/update/${user.userId}/${clubId}`);
}
