const form = document.querySelector("#reset");
const error = document.querySelector('#error')
const urlLink = new URLSearchParams(window.location.search.replace("?", ""))
const token = urlLink.get('token')
console.log(token)
form.addEventListener("submit", (event) => {
    event.preventDefault();
    reset();
})

async function reset() {

    const password = form.password.value
    const formData = new FormData(form);
    formData.set('token', token)
    const jsonData = new URLSearchParams(formData);
    const response = await fetch(`http://${serverAddress}:3000/request-password-confirm`, { method: "post", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: jsonData });
    const responseStatus = await response.json();
    console.log(responseStatus);

}

function logout() {
    localStorage.removeItem("user");
    console.log("User has been cleared from local storage");
    window.location.href = "./index.html";
}

function setUser(userInfo) {
    const user = JSON.stringify(userInfo);
    localStorage.setItem("user", user);
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

confirmPassword.addEventListener("change", () => {
    if (password.value !== confirmPassword.value) {
        successMessageBox.classList.add("uk-alert-danger");
        successMessageBox.style.display = "block";
        successMessage.innerHTML = "passowrds don't match";
    } else {
        successMessageBox.style.display = "none";
        successMessage.innerHTML = "";
    }
});
password.addEventListener("change", () => {
    if (password.value !== confirmPassword.value) {
        successMessageBox.style.display = "block";
        successMessage.innerHTML = "passwords don't match";
    } else {
        successMessageBox.style.display = "none";
        successMessage.innerHTML = "";
    }
});

getUser()