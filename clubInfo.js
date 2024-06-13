let params = new URL(document.location.toString()).searchParams;
const clubId = params.get("club-id");
console.log(clubId);
async function getClubInfo() {
  const response = await fetch(
    `http://127.0.0.1:3000/club-info/${clubId}?view=true`
  );
  const json = await response.json();
  console.log(json);
  document.querySelector("#clubName").innerHTML = json.clubName;
  document.querySelector("#clubDescription").innerHTML = json.clubName;
  const clubData = document.querySelector("#clubData");
  for (const [key, value] of Object.entries(json)) {
    clubData.innerHTML += `
  <tr>
      <td>${key}</td>
      <td>${value}</td>
  </tr>`;
  }
}
getClubInfo();
