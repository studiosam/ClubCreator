const form = document.querySelector("#createAccount");
const successMessage = document.querySelector("#success");
const successMessageBox = document.querySelector("#successDiv");
const password = document.querySelector("#password");
const confirmPassword = document.querySelector("#confirmPassword");
const isStudent = document.querySelector("#student");
const isTeacher = document.querySelector("#teacher");
const emailInput = document.querySelector('#email');

emailInput.addEventListener("keyup", () => {
  if (!emailInput.value.includes("@students.hcde.org")) {
    document.querySelector("#submit").disabled = true;
    document.querySelector("#incorrectEmailMessage").innerHTML = "Please use your school email address";
  } else {
    document.querySelector("#submit").disabled = false;
    document.querySelector("#incorrectEmailMessage").innerHTML = "";
  }
})

confirmPassword.addEventListener("keyup", () => {
  if (password.value !== confirmPassword.value) {
    successMessageBox.classList.add("uk-alert-danger");
    successMessageBox.style.display = "block";
    successMessage.innerHTML = "Passwords Do Not Match";
  } else {
    successMessageBox.style.display = "none";
    successMessage.innerHTML = "";
  }
});

password.addEventListener("keyup", () => {
  if (password.value !== confirmPassword.value) {
    successMessageBox.classList.add("uk-alert-danger");
    successMessageBox.style.display = "block";
    successMessage.innerHTML = "Passwords Do Not Match";
  } else {
    successMessageBox.style.display = "none";
    successMessage.innerHTML = "";
  }
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  createAccount();
});

async function createAccount() {
  const userEmail = form.email.value.toLowerCase();
  const formData = new FormData(form);
  formData.set("username", userEmail.toLowerCase().trim());
  const jsonData = new URLSearchParams(formData);
  console.log(jsonData);
  const response = await fetch(`http://${serverAddress}:3000/addAccount`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: jsonData,
  });
  const responseStatus = await response.json();
  console.log(responseStatus.body);
  if (responseStatus.body === "true") {
    successMessage.classList.remove("uk-alert-danger");
    successMessage.classList.add("uk-alert-primary");
    successMessageBox.style.display = "block";
    successMessage.innerHTML = `<div class="text-center"><p> ${responseStatus.user.email} 
        Account created successfully.
        </p>
        <a href="./index.html"><button class="uk-button uk-button-primary">Click here to log in</button></a>
        </div>`;
    form.remove();
  } else if (responseStatus.body === "User already exists") {
    successMessageBox.style.display = "block";
    successMessage.classList.remove("uk-alert-primary");
    successMessage.classList.add("uk-alert-danger");
    successMessage.innerHTML = `<div class="text-center"><p>ERROR: User already exists!
        </p>
        <a href="./index.html"><button class="uk-button uk-button-primary">Click here to log in</button></a>
        </div>`;
    console.log("failed login"); // handle failed login on screen
  } else if (responseStatus.body === "Invalid email address") {
    UIkit.notification({
      message: 'Invalid email address',
      status: 'danger',
      pos: 'top-center',
      timeout: 5000
    });
  }
}
