const form = document.querySelector("#reset");
const error = document.querySelector("#error");
const emailInput = document.querySelector("#email");
const resetButton = document.querySelector("#reset-submit");
const check = document.querySelector("#check");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  login();
});
emailInput.addEventListener("keyup", async (event) => {
  let email = event.target.value;
  const response = await fetch(
    `http://${serverAddress}:3000/check-reset-email?email=${email}`
  );
  const json = await response.json();
  if (json.body !== "User does not exist") {
    emailInput.classList.remove("uk-form-danger");
    emailInput.classList.add("uk-form-success");
    check.classList.remove("hidden");
    resetButton.disabled = false;
  } else {
    check.classList.add("hidden");
    resetButton.disabled = true;
    emailInput.classList.remove("uk-form-success");
    emailInput.classList.add("uk-form-danger");
  }
});
async function login() {
  console.log("login");
  const formData = new FormData(form);
  const jsonData = new URLSearchParams(formData);
  const response = await fetch(
    `http://${serverAddress}:3000/request-password-reset`,
    {
      method: "post",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: jsonData,
    }
  );
  const responseStatus = await response.json();
  console.log(responseStatus);
  if (responseStatus && responseStatus.body === "Success") {
    form.reset();
    UIkit.notification({
      message: "Reset Email Sent!",
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
  } else {
    UIkit.notification({
      message: "Error Sending Email. Please try again",
      status: "danger",
      pos: "top-center",
      timeout: 10000,
    });
  }
}

async function getUser() {
  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    console.log(`${user}`);
    if (user.isTeacher) {
      window.location.href = "./home-teacher.html";
    } else {
      window.location.href = "./home-student.html";
    }
  } else {
    console.log(`Nobody is logged in`);
  }
}
getUser();
