let params = new URL(document.location.toString()).searchParams;
const clubId = params.get("club-id");
console.log(clubId);
async function getClubInfo() {
  const response = await fetch(
    `http://127.0.0.1:3000/club-info/${clubId}?view=true`
  );
  const json = await response.json();
  console.log(json);
  document.querySelector("#clubName").innerHTML = json.clubInfo.clubName;
  document.querySelector("#clubDescription").innerHTML = json.clubInfo.clubName;
  const clubData = document.querySelector("#clubData");
  clubData.innerHTML += `
  <tr>
      <td>Club Id</td>
      <td>${json.clubInfo.clubId}</td>
  </tr>
    <tr>
      <td>Club Description</td>
      <td>${json.clubInfo.clubDescription}</td>
  </tr>
    <tr>
      <td>Location</td>
      <td>${json.clubInfo.location || "None"}</td>
  </tr>
    <tr>
      <td>Total Students</td>
      <td>${json.clubStudents.length}</td>
  </tr>
  `;
  json.clubStudents.forEach((student) => {
    document.querySelector("#club-students").innerHTML += `<div>
        <div id="${student.userId}" class="uk-card uk-card-default uk-card-body" uk-toggle="target: #${student.userId}; cls: student-attendance-card; animation: uk-animation-fade"><p>${student.firstName} ${student.lastName}</p></div>`;
  });

  // for (const [key, value] of Object.entries(json)) {
  //   clubData.innerHTML += `
  // <tr>
  //     <td>${key}</td>
  //     <td>${value}</td>
  // </tr>`;
  // }
}
getClubInfo();
