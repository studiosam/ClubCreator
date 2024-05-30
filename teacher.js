function getUser() {
    const user = JSON.parse(localStorage.getItem("user"))
    if (user) {
        console.log(`User: ${user.firstName} ${user.lastName}`);
        console.log(user)
        if (!user.isTeacher) {
            window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
        }
        const userInfo = document.querySelector("#userInfo");
        userInfo.innerHTML = `
        <p id="name">
            Welcome, ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}!
        </p>
        <p id="email">
            Email: ${user.email}
        </p>
        <p id="club">
            Club: ${user.club}
        </p>
        `
    } else {
        console.log(`Nobody is logged in`);
    }
}

getUser()

function logout() {
    localStorage.removeItem("user");
    console.log("User has been cleared from local storage");
    window.location.href = "./index.html";
}