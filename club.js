const form = document.querySelector("#clubCreation");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createClub();
});
if (document.querySelector("#cover-input")) {
  document.querySelector("#cover-input").addEventListener('input', () => {
    if (document.querySelector("#cover-input").value) {
      document.querySelector('#selected-confirmation').classList.remove('hidden')
    }
  })
}
async function createClub() {
  const user = JSON.parse(localStorage.getItem("user"));
  const formData = new FormData(form);
  formData.set("teacherId", user.userId);
  formData.set("requiredCosponsors", formData.get("coSponsorsNeeded"));

  // Remove URLSearchParams as it doesn't support file uploads
  const response = await fetch("http://127.0.0.1:3000/addClub", {
    method: "post",
    body: formData,
  });

  const responseStatus = await response.json();
  form.reset();
  if (responseStatus.body === "Success") {
    document.querySelector("#status-message").innerHTML = `${responseStatus.clubInfo.preferredClub} Successfully Created!`;
    document.querySelector("#status").classList.add("uk-alert-success");
    document.querySelector("#status").style.display = "block";
  } else {
    document.querySelector("#status-message").innerHTML = `Error : ${responseStatus.body}`;
    document.querySelector("#status").classList.add("uk-alert-danger");
    document.querySelector("#status").style.display = "block";
  }
}