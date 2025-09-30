
let params = new URL(document.location.toString()).searchParams;
const clubId = params.get("club-id");
const attendancebutton = document.querySelector("#attendance-submission");
const printRosterButton = document.querySelector(".printbtn");
const rosterDiv = document.querySelector("#club-students");

// Safely read the current user without relying on userData.js load order
const currentUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch (_) {
    return null;
  }
})();

// Immediately hide attendance legend for non-teachers/admins to avoid any flash
try {
  const isStaff = !!(currentUser && (currentUser.isTeacher || currentUser.isAdmin));
  if (!isStaff) {
    const keyEl = document.getElementById("attendance-key");
    if (keyEl) {
      keyEl.classList.add("hidden");
      keyEl.setAttribute("hidden", "true");
      keyEl.setAttribute("aria-hidden", "true");
      keyEl.style.display = "none";
    }
    const instr = document.getElementById("attendance-instructions");
    if (instr) {
      instr.classList.add("hidden");
      instr.setAttribute("hidden", "true");
      instr.setAttribute("aria-hidden", "true");
      instr.style.display = "none";
    }
  }
} catch (_) { /* no-op */ }

printRosterButton.addEventListener('click', () => {
  let divContents = rosterDiv.innerHTML;
  if (divContents !== '') {
    let a = window.open('', '');
    a.document.write('<html>');
    a.document.write('<body>');
    a.document.write(divContents);
    a.document.write('</body></html>');
    a.document.close();
    a.print();
  }
})


async function getClubInfo() {
  const response = await fetch(
    `http://${serverAddress}:3000/club-info/${clubId}?view=true`
  );
  const json = await response.json();
  console.log(json.clubInfo.primaryTeacherId)
  const getTeacherResponse = await fetch(`http://${serverAddress}:3000/usersInfo/${json.clubInfo.primaryTeacherId}`)
  const teacherJson = await getTeacherResponse.json();

  document.querySelector("#clubName").innerHTML = `<div><p>${json.clubInfo.clubName}</p></div>`;
  const coverPhotoDisplay = document.querySelector("#cover-photo");
  coverPhotoDisplay.style.backgroundImage = `url("${json.clubInfo.coverPhoto}")`;
  const clubData = document.querySelector("#clubData");
  json.clubStudents.sort((a, b) => {
    if (a.lastName < b.lastName) {
      return -1;
    }
    if (a.lastName > b.lastName) {
      return 1;
    }
    return 0;
  });
  clubData.innerHTML += `

    <tr>
      <td>${json.clubInfo.clubName}</td>
      <td>${teacherJson.firstName} ${teacherJson.lastName}</td>
  </tr>
    <tr>
      <td>Club Description</td>
      <td>${json.clubInfo.clubDescription}</td>
  </tr>
    <tr>
      <td>Room</td>
      <td>${json.clubInfo.room || "None"}</td>
  </tr>`;
  if (
    (currentUser && currentUser.isTeacher && currentUser.clubId === json.clubInfo.clubId) ||
    (currentUser && currentUser.isAdmin)
  ) {
    const photoUpload = document.querySelector("#cover-photo-upload");
    photoUpload.innerHTML = `<form id="uploadForm" enctype="multipart/form-data">
                    <div class="uk-margin uk-flex uk-flex-column" uk-margin>
                        <div>
                            <button id="changeCoverPhoto" type="button" class="uk-button uk-button-secondary uk-margin-small-top">Change Cover Photo</button>
                        </div>
                        <div id="cover-upload" class="hidden text-center uk-placeholder">
                             <div uk-form-custom="target: true">

                                <input id="cover-input" type="file" name="cover" accept="image/*"
                                    aria-label="Custom controls" required />
                                <button class="uk-button uk-button-default upload-button" type="button"
                                    tabindex="-1">Select</button>

                            </div>
                            <button type="submit" class="uk-button uk-button-primary">Upload</button>
                            <p id="selected-confirmation" class="hidden"><span class="green" uk-icon="check"></span>File Selected!</p>
                        </div>
                    </div>
                </form>`;
    document
      .querySelector("#changeCoverPhoto")
      .addEventListener("click", () => {
        document.querySelector("#cover-upload").classList.remove("hidden");
      });
    const date = await getCurrentDate();
    const response = await fetch(
      `http://${serverAddress}:3000/check-attendance/${json.clubInfo.clubId}/${date}`
    );
    const attendance = await response.json();
    let studentsPresent = [];
    if (attendance.students.length > 0) {
      studentsPresent = attendance.students[0].studentsPresent;
      const studentsPresentArray = studentsPresent.split(",");

      document.querySelector("#students-title").innerHTML = "Students";
      attendancebutton.innerHTML = `<button onclick="submitAttendace(${json.clubInfo.clubId})" class="btn-modern btn-primary">Submit Attendance</button>`;

      clubData.innerHTML += `
      <tr>
      <td>Total Students</td>
      <td>${json.clubStudents.length}</td>
  </tr>
  `;

      json.clubStudents.forEach((student) => {
        document.querySelector("#club-students").innerHTML += `<div>
        <div id="${student.userId}" class="student-attendance-absent uk-card uk-card-default uk-card-body student" uk-toggle="target: #${student.userId}; cls: student-attendance-card; animation: uk-animation-fade"><p>${student.firstName} ${student.lastName}</p></div>`;
      });
      if (studentsPresent.length > 0) {
        studentsPresentArray.forEach((student) => {
          document
            .getElementById(`${student}`)
            .classList.add("student-attendance-card");
        });
      }
    } else {
      document.querySelector("#students-title").innerHTML = "Students";
      attendancebutton.innerHTML = `<button onclick="submitAttendace(${json.clubInfo.clubId})" class="btn-modern btn-primary">Submit Attendance</button>`;
      json.clubStudents.forEach((student) => {
        document.querySelector("#club-students").innerHTML += `<div>
        <div id="${student.userId}" class="uk-card uk-card-default uk-card-body student student-attendance-card" uk-toggle="target: #${student.userId}; cls: student-attendance-card; animation: uk-animation-fade"><p>${student.firstName} ${student.lastName}</p></div>`;
      });
      if (studentsPresent.length > 0) {
        studentsPresentArray.forEach((student) => {
          document
            .getElementById(`${student}`)
            .classList.add("student-attendance-card");
        });
      }
    }
  }
  else {
    // Non-teachers/admins: hide legend and entire roster section
    const key = document.getElementById("attendance-key");
    if (key) {
      key.classList.add("hidden");
      key.setAttribute("hidden", "true");
      key.setAttribute("aria-hidden", "true");
      key.style.display = "none";
    }

    const instr = document.getElementById("attendance-instructions");
    if (instr) {
      instr.classList.add("hidden");
      instr.setAttribute("hidden", "true");
      instr.setAttribute("aria-hidden", "true");
      instr.style.display = "none";
    }

    const studentsTitle = document.getElementById("students-title");
    if (studentsTitle) {
      studentsTitle.classList.add("hidden");
      studentsTitle.setAttribute("hidden", "true");
      studentsTitle.setAttribute("aria-hidden", "true");
      studentsTitle.style.display = "none";
    }

    const roster = document.getElementById("club-students");
    if (roster) {
      roster.innerHTML = ""; // ensure no names are present
      roster.classList.add("hidden");
      roster.setAttribute("hidden", "true");
      roster.setAttribute("aria-hidden", "true");
      roster.style.display = "none";
    }

    const actions = document.getElementById("attendance-actions");
    if (actions) {
      actions.classList.add("hidden");
      actions.setAttribute("hidden", "true");
      actions.setAttribute("aria-hidden", "true");
      actions.style.display = "none";
    }

    // Ensure no attendance submission control is shown
    attendancebutton.innerHTML = "";
  }
  if (document.querySelector("#cover-input")) {
    document.querySelector("#cover-input").addEventListener("input", () => {
      if (document.querySelector("#cover-input").value) {
        document
          .querySelector("#selected-confirmation")
          .classList.remove("hidden");
      }
    });
  }
  const uploadFormEl = document.getElementById("uploadForm");
  if (uploadFormEl) {
    uploadFormEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      formData.set("clubId", json.clubInfo.clubId);
      const response = await fetch(
        `http://${serverAddress}:3000/upload-cover-photo`,
        {
          method: "POST",
          body: formData,
        }
      );
      const result = await response.json();
      console.log(result);
      if (result.body === "Success") {
        UIkit.notification({
          message: "Avatar Successfully Updated!",
          status: "success",
          pos: "top-center",
          timeout: 5000,
        });
        const avatarImg = document.getElementById("upload-avatar");
        if (avatarImg) avatarImg.src = result.avatarPath;
      }
    });
  }
}
getClubInfo();

async function submitAttendace(clubId) {
  const presentStudentArray = [];
  const absentStudentArray = [];
  const allStudents = document.querySelectorAll(".student");
  allStudents.forEach((student) => {
    const presentStudent = student.classList.contains(
      "student-attendance-card"
    );
    if (presentStudent) {
      presentStudentArray.push(student.id);
    } else {
      absentStudentArray.push(student.id);
    }
  });
  const presentStudents = presentStudentArray.join(",");
  const absentStudents = absentStudentArray.join(",");

  // Create a new Date object for the current date and time
  date = await getCurrentDate();

  const response = await fetch(
    `http://${serverAddress}:3000/submit-attendance`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        presentStudents: presentStudents,
        absentStudents: absentStudents,
        clubId: clubId,
        date: date,
      }),
    }
  );

  const success = await response.json();
  console.log(success);
  if (success.body === "Success") {
    UIkit.notification({
      message: "Attendance Successfully Submitted",
      status: "success",
      pos: "bottom-right",
      timeout: 5000,
    });
  } else {
    UIkit.notification({
      message: "Attendance Submission Failed",
      status: "danger",
      pos: "bottom-right",
      timeout: 5000,
    });
  }
}

async function getCurrentDate() {
  const now = new Date();

  // Get the year, month, and day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-indexed, so add 1 and pad with zero if needed
  const day = String(now.getDate()).padStart(2, "0"); // Pad day with leading zero if needed

  // Format the date as YYYY-MM-DD
  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}
