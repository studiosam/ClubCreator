const form = document.querySelector("#clubCreation");
const user = JSON.parse(localStorage.getItem("user"));
document.querySelector(
  "#user-name"
).innerHTML = `${user.firstName} ${user.lastName}`;
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createClub();
});

async function createClub() {
  console.log(
    "whatever ass i don't know just something you're taking so loooooooooOOOOOOOOOOng dude PLEASE/nI KNEW IT"
  );
  const user = JSON.parse(localStorage.getItem("user"));
  const formData = new FormData(form);
  formData.set("teacherId", user.userId);
  const jsonData = new URLSearchParams(formData);
  const response = await fetch("http://127.0.0.1:3000/addClub", {
    method: "post",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: jsonData,
  });
  const responseStatus = await response.json();
  form.reset();
  if (responseStatus.body === "Success") {
    document.querySelector(
      "#status-message"
    ).innerHTML = `${responseStatus.clubInfo.preferredClub} Successfully Created!`;
    document.querySelector("#status").classList.add("uk-alert-success");
    document.querySelector("#status").style.display = "block";
  } else {
    document.querySelector(
      "#status-message"
    ).innerHTML = `Error : ${responseStatus.body}`;
    document.querySelector("#status").classList.add("uk-alert-danger");

    document.querySelector("#status").style.display = "block";
  }
}

function logout() {
  localStorage.removeItem("user");
  console.log("User has been cleared from local storage");
  window.location.href = "./index.html";
}