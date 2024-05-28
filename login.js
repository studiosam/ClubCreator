const form = document.querySelector("#login");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    login();
})

async function login() {
    const userEmail = form.email.value;
    const formData = new FormData(form);
    formData.set("username", userEmail.toLowerCase().trim());
    const jsonData = new URLSearchParams(formData);
    const response = await fetch("http://127.0.0.1:3000/login", { method: "post", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: jsonData });
    const responseStatus = await response.json();
    if (responseStatus.body) {
        const user = responseStatus.userObject;
        setUser(user);
        if (user.isTeacher) {
            window.location.href = `./home-teacher.html`;
        } else {
            window.location.href = `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
        }
    } else {
        console.log("failed login"); // handle failed login on screen
    }
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

function getUser() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        console.log(`User: ${user}`);
    } else {
        console.log(`Nobody is logged in`);
    }
}
