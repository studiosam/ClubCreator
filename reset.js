const form = document.querySelector("#reset");
const error = document.querySelector('#error')
form.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
})

async function login() {
    console.log('login');
    const userEmail = form.email.value.toLowerCase().trim();
    const formData = new FormData(form);
    const jsonData = new URLSearchParams(formData);
    const response = await fetch(`http://${serverAddress}:3000/request-password-reset`, { method: "post", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: jsonData });
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
getUser()