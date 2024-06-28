const form = document.querySelector("#reset");
const urlLink = new URLSearchParams(window.location.search.replace("?", ""));
const token = urlLink.get("token");
const successMessage = document.querySelector("#success");
const successMessageBox = document.querySelector("#successDiv");
const password = document.querySelector("#password");
const confirmPassword = document.querySelector("#confirmPassword");
const resetButton = document.querySelector("#reset-btn");
console.log(token);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  reset();
});

async function reset() {
  const password = form.password.value;
  const formData = new FormData(form);
  formData.set("token", token);
  const jsonData = new URLSearchParams(formData);
  const response = await fetch(
    `http://${serverAddress}:3000/request-password-confirm`,
    {
      method: "post",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: jsonData,
    }
  );
  const responseStatus = await response.json();
  console.log(responseStatus);
  if (responseStatus && responseStatus.body === "Success") {
    UIkit.notification({
      message: "Password Reset Successfully!",
      status: "success",
      pos: "top-center",
      timeout: 5000,
    });
    form.innerHTML = `<p class="text-center uk-text-success">Password Successfully Reset!</p><a class="uk-text-large" href="http://${serverAddress}/index.html">Return To Login Screen</a>`;
  } else {
    UIkit.notification({
      message: "Error Resetting Password",
      status: "danger",
      pos: "top-center",
      timeout: 5000,
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

confirmPassword.addEventListener("keyup", () => {
  if (password.value !== confirmPassword.value) {
    resetButton.disabled = true;
    successMessageBox.classList.add("uk-alert-danger");
    successMessageBox.style.display = "block";
    successMessage.innerHTML = "Passwords Do Not Match";
  } else {
    resetButton.disabled = false;
    successMessageBox.style.display = "none";
    successMessage.innerHTML = "";
  }
});
password.addEventListener("keyup", () => {
  if (password.value !== confirmPassword.value) {
    resetButton.disabled = true;
    successMessageBox.classList.add("uk-alert-danger");
    successMessageBox.style.display = "block";
    successMessage.innerHTML = "Passwords Do Not Match";
  } else {
    resetButton.disabled = false;
    successMessageBox.style.display = "none";
    successMessage.innerHTML = "";
  }
});

getUser();
