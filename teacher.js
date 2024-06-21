const myClubs = document.querySelector("#my-clubs");
const unApprovedClubs = document.querySelector("#unapproved-clubs");
const coSponsorClubs = document.querySelector("#cosponsor-clubs");

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
    (obj) => obj.isApproved === 0
  );

  const clubsThatNeedCosponsors = [];

  // Use map to create an array of promises
  const promises = clubs.map(async (obj) => {
    const response2 = await fetch(`http://localhost:3000/get-cosponsors/${obj.clubId}`);
    const currentCoSponsorsArray = await response2.json();
    const currentCoSponsors = currentCoSponsorsArray.cosponsors.length;

    if (currentCoSponsors < obj.coSponsorsNeeded) {
      // Ensure we are working with plain objects
      const plainClub = { ...obj };
      return plainClub

    }
    return null;

  })
  const results = await Promise.all(promises)
  results.forEach((result) => {
    if (result != null) {
      clubsThatNeedCosponsors.push(result)
    }
  })
  // Update the DOM elements
  document.querySelector("#current-clubs").innerHTML =
    myApprovedClubs.length || 0;
  document.querySelector("#pending-clubs").innerHTML =
    myUnapprovedClubs.length || 0;

  // Select the DOM elements for updates


  // Clear existing content
  myClubs.innerHTML = '';
  unApprovedClubs.innerHTML = '';
  coSponsorClubs.innerHTML = '';

  // Populate unapproved clubs
  myUnapprovedClubs.forEach((club) => {
    let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=0D8ABC&color=fff`;
    if (club.coverPhoto) {
      coverPhotoUrl = `${club.coverPhoto}`;
    }
    unApprovedClubs.innerHTML += `<div class="co-sponser-wrapper">
    <img width="150px" src="${coverPhotoUrl || ""}">
    <a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a></div><hr>`;
  });

  // Populate approved clubs
  myApprovedClubs.forEach((club) => {
    let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=0D8ABC&color=fff`;
    if (club.coverPhoto) {
      coverPhotoUrl = `${club.coverPhoto}`;
    }
    myClubs.innerHTML += `<div class="co-sponser-wrapper">
    <img width="150px" src="${coverPhotoUrl || ""}">
    <a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
    <div class="club">
      <p class="uk-card-title roboto">${club.clubName}</p>
      <p>${club.clubDescription}</p>
    </div></a></div><hr>`;
  });
  displayClubsThatNeedCosponsors(clubsThatNeedCosponsors)
}

async function displayClubsThatNeedCosponsors(clubsThatNeedCosponsors) {
  // Populate clubs that need co-sponsors
  for (const club of clubsThatNeedCosponsors) {
    if (club.clubId !== user.clubId) {
      const response = await fetch(`http://localhost:3000/get-cosponsors/${club.clubId}`);
      const coSponsors = await response.json();
      console.log('coSponsors', coSponsors)
      const numCoSponsors = coSponsors.cosponsors.length;
      console.log('numCoSponsors', numCoSponsors)
      const requiresCoSponsor = (club.coSponsorsNeeded - numCoSponsors) > 0
      console.log('requiresCoSponsor', requiresCoSponsor)
      if (requiresCoSponsor && club.isApproved === 1) {
        let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=0D8ABC&color=fff`;
        if (club.coverPhoto) {
          coverPhotoUrl = `${club.coverPhoto}`;
        }
        coSponsorClubs.innerHTML += `<div class="co-sponser-wrapper">
        <img width="150px" src="${coverPhotoUrl || ""}">
        <a href="http://127.0.0.1:3000/club-info/${club.clubId}" class="uk-link-text">
        
        <div class="club">
        
          <p class="uk-card-title roboto">${club.clubName}</p>
          <p>${club.clubDescription}</p>
          <button class="uk-button uk-button-primary" onclick="addToClub(${club.clubId})" id="${club.clubId}">Co-Sponsor Club</button>
        </div></a></div><hr>`;
      }
    }
  }
}


async function addToClub(clubId) {
  const response = fetch(`http://127.0.0.1:3000/users/update/${user.userId}/${clubId}`);
}
