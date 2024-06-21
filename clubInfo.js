let params = new URL(document.location.toString()).searchParams;
const clubId = params.get("club-id");
const attendancebutton = document.querySelector('#attendance-submission')

async function getClubInfo() {
  const response = await fetch(
    `http://127.0.0.1:3000/club-info/${clubId}?view=true`
  );
  const json = await response.json();
  document.querySelector("#clubName").innerHTML = json.clubInfo.clubName;
  document.querySelector("#clubDescription").innerHTML = json.clubInfo.clubName;
  const coverPhotoDisplay = document.querySelector("#cover-photo")
  coverPhotoDisplay.style.backgroundImage = `url("${json.clubInfo.coverPhoto}")`;
  const clubData = document.querySelector("#clubData");
  clubData.innerHTML += `

    <tr>
      <td>Club Description</td>
      <td>${json.clubInfo.clubDescription}</td>
  </tr>
    <tr>
      <td>Room</td>
      <td>${json.clubInfo.room || "None"}</td>
  </tr>`
  if ((user.clubId === json.clubInfo.clubId && user.isTeacher) || user.isAdmin) {

    const photoUpload = document.querySelector("#cover-photo-upload");
    photoUpload.innerHTML = `<form id="uploadForm" enctype="multipart/form-data">
                    <div class="uk-margin uk-flex uk-flex-column" uk-margin>
                        <div>
                            <p class="text-center">Change Cover Photo</p>
                        </div>
                        <div id="cover-upload">
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
    const date = await getCurrentDate()
    const response = await fetch(`http://127.0.0.1:3000/check-attendance/${json.clubInfo.clubId}/${date}`)
    const attendance = await response.json()

    if (attendance.students.length > 0) {

      const studentsPresent = attendance.students[0].studentsPresent
      const studentsPresentArray = studentsPresent.split(',')


      document.querySelector('#students-title').innerHTML = 'Students'
      attendancebutton.innerHTML = `<button onclick="submitAttendace(${json.clubInfo.clubId})" class="uk-button uk-button-primary uk-margin-medium-top">Submit Attendance</button>`


      clubData.innerHTML += `
      <tr>
      <td>Total Students</td>
      <td>${json.clubStudents.length}</td>
  </tr>
  `;

      json.clubStudents.forEach((student) => {
        console.log(student)
        document.querySelector("#club-students").innerHTML += `<div>
        <div id="${student.userId}" class="uk-card uk-card-default uk-card-body student" uk-toggle="target: #${student.userId}; cls: student-attendance-card; animation: uk-animation-fade"><p>${student.firstName} ${student.lastName}</p></div>`;
      });
      if (studentsPresent.length > 0) {
        studentsPresentArray.forEach((student) => {
          document.getElementById(`${student}`).classList.add('student-attendance-card')
        })
      }
    } else {
      document.querySelector('#students-title').innerHTML = 'Students'
      attendancebutton.innerHTML = `<button onclick="submitAttendace(${json.clubInfo.clubId})" class="uk-button uk-button-primary uk-margin-medium-top">Submit Attendance</button>`
      json.clubStudents.forEach((student) => {
        console.log(student)
        document.querySelector("#club-students").innerHTML += `<div>
        <div id="${student.userId}" class="uk-card uk-card-default uk-card-body student" uk-toggle="target: #${student.userId}; cls: student-attendance-card; animation: uk-animation-fade"><p>${student.firstName} ${student.lastName}</p></div>`;
      });
      if (studentsPresent.length > 0) {
        studentsPresentArray.forEach((student) => {
          document.getElementById(`${student}`).classList.add('student-attendance-card')
        })
      }

    }
  }
  if (document.querySelector("#cover-input")) {
    document.querySelector("#cover-input").addEventListener('input', () => {
      if (document.querySelector("#cover-input").value) {
        document.querySelector('#selected-confirmation').classList.remove('hidden')
      }
    })
  }
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    formData.set('clubId', json.clubInfo.clubId)
    const response = await fetch('http://127.0.0.1:3000/upload-cover-photo', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    console.log(result)
    if (result.body === "Success") {
      UIkit.notification({
        message: "Avatar Successfully Updated!",
        status: "success",
        pos: "top-center",
        timeout: 5000,
      });
      document.getElementById('upload-avatar').src = result.avatarPath;
    }
  });
}
getClubInfo();

async function submitAttendace(clubId) {
  const presentStudentArray = [];
  const absentStudentArray = [];
  const allStudents = document.querySelectorAll('.student')
  allStudents.forEach((student) => {
    const presentStudent = student.classList.contains('student-attendance-card')
    if (presentStudent) {
      presentStudentArray.push(student.id)
    } else {
      absentStudentArray.push(student.id);
    }
  })
  const presentStudents = presentStudentArray.join(',')
  const absentStudents = absentStudentArray.join(',')

  // Create a new Date object for the current date and time
  date = await getCurrentDate()

  const response = await fetch(`http://localhost:3000/submit-attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ presentStudents: presentStudents, absentStudents: absentStudents, clubId: clubId, date: date })
  });
}

async function getCurrentDate() {
  const now = new Date();

  // Get the year, month, and day
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed, so add 1 and pad with zero if needed
  const day = String(now.getDate()).padStart(2, '0'); // Pad day with leading zero if needed

  // Format the date as YYYY-MM-DD
  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}

