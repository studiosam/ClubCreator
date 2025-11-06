
let params = new URL(document.location.toString()).searchParams;
const clubId = params.get("club-id");
const attendancebutton = document.querySelector("#attendance-submission");
const printRosterButton = document.querySelector(".printbtn");
const rosterDiv = document.querySelector("#club-students");
let clubRosterCache = { clubName: "", students: [] };
let attendanceDirty = false;
let pendingNavHref = null;
let allowLeaveUnsaved = false;

// Safely read the current user without relying on userData.js load order
const currentUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch (_) {
    return null;
  }
  // Wire submit button handler
  try {
    const submitBtn = document.getElementById('attendance-submit');
    if (submitBtn) submitBtn.addEventListener('click', () => submitAttendace(json.clubInfo.clubId));
  } catch (_) {}
  // Reset dirty state after initial render
  attendanceDirty = false;
  const statusEl0 = document.getElementById('attendance-saved-status');
  if (statusEl0) statusEl0.textContent = '';
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

// Intercept in-app link clicks for a friendlier unsaved warning
try {
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    // ignore anchors that open in new tab or JS void links
    const href = a.getAttribute('href');
    const target = a.getAttribute('target');
    if (!href || href.startsWith('#') || (target && target === '_blank')) return;
    if (attendanceDirty) {
      e.preventDefault();
      pendingNavHref = a.href;
      try { UIkit.modal('#unsaved-modal').show(); } catch (_) {}
    }
  });
  // Use delegated handler so it works even if modal is injected after scripts
  document.addEventListener('click', (ev) => {
    const leave = ev.target && (ev.target.id === 'unsaved-leave' || ev.target.closest && ev.target.closest('#unsaved-leave'));
    if (!leave) return;
    ev.preventDefault();
    allowLeaveUnsaved = true; // suppress beforeunload prompt
    try { UIkit.modal('#unsaved-modal').hide(); } catch (_) {}
    const go = pendingNavHref; pendingNavHref = null;
    if (go) window.location.href = go;
  });
} catch (_) { /* no-op */ }

printRosterButton.addEventListener('click', async () => {
  try {
    // Prefer cached list from last fetch
    let list = Array.isArray(clubRosterCache.students) ? clubRosterCache.students.slice() : [];
    let clubName = clubRosterCache.clubName || (document.getElementById('clubName')?.textContent || 'Club Roster');

    // Fallback: derive from DOM if cache is empty
    if (!list.length) {
      const nodes = Array.from(document.querySelectorAll('#club-students .student p'));
      list = nodes.map(n => {
        const t = (n.textContent || '').trim();
        const [first = '', last = ''] = t.split(/\s+/);
        return { firstName: first, lastName: last };
      });
    }

    // Normalize and sort by lastName, then firstName
    const lines = list
      .map(s => ({ first: String(s.firstName||'').trim(), last: String(s.lastName||'').trim() }))
      .sort((a,b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first))
      .map(s => `${s.last}, ${s.first}`.replace(/^,\s*/, ''));

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Club Roster — ${clubName}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
  h1 { margin: 0 0 12px 0; }
  .meta { color: #666; margin: 0 0 16px 0; }
  ol { padding-left: 20px; }
  @media print { button { display:none; } }
  button { margin-bottom: 16px; }
  li { line-height: 1.5; }
  .count { font-weight: 600; }
</style></head>
<body>
  <button onclick="window.print()">Print</button>
  <h1>${clubName} — Roster</h1>
  <p class="meta">Total <span class="count">${lines.length}</span></p>
  <ol>
    ${lines.map(n => `<li>${n}</li>`).join('')}
  </ol>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      alert('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  } catch (e) {
    console.error('Failed to prepare roster printout', e);
  }
});


async function getClubInfo() {
  const response = await fetch(
    `http://${serverAddress}:3000/club-info/${clubId}?view=true`
  );
  const json = await response.json();
  try {
    const clubName = (json && json.clubInfo && json.clubInfo.clubName) ? String(json.clubInfo.clubName) : '';
    if (clubName) {
      document.title = `RBHS Clubs - ${clubName}`;
    } else {
      document.title = 'RBHS Clubs';
    }
  } catch (_) {
    document.title = 'RBHS Clubs';
  }
  console.log(json.clubInfo.primaryTeacherId)
  const getTeacherResponse = await fetch(`http://${serverAddress}:3000/usersInfo/${json.clubInfo.primaryTeacherId}`)
  const teacherJson = await getTeacherResponse.json();

  document.querySelector("#clubName").innerHTML = `<div><p>${json.clubInfo.clubName}</p></div>`;
  // cache for printing
  clubRosterCache.clubName = json.clubInfo.clubName || '';
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
  clubRosterCache.students = json.clubStudents.map(s => ({ firstName: s.firstName, lastName: s.lastName }));
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
      attendancebutton.innerHTML = `<button id="attendance-submit" class="btn-modern btn-primary">Submit Attendance</button><div id="attendance-saved-status" class="uk-text-meta uk-margin-small-top"></div>`;

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
      attendancebutton.innerHTML = `<button id="attendance-submit" class="btn-modern btn-primary">Submit Attendance</button><div id="attendance-saved-status" class="uk-text-meta uk-margin-small-top"></div>`;
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
  // Wire submit button handler
  try {
    const submitBtn = document.getElementById('attendance-submit');
    if (submitBtn) submitBtn.addEventListener('click', () => submitAttendace(json.clubInfo.clubId));
  } catch (_) {}
  // Reset dirty state after initial render
  attendanceDirty = false;
  const statusEl0 = document.getElementById('attendance-saved-status');
  if (statusEl0) statusEl0.textContent = '';
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

  // Button UX: disable and show spinner
  const btn = document.getElementById('attendance-submit');
  let btnHtml = null;
  try {
    if (btn) {
      btn.disabled = true;
      btn.classList.add('uk-disabled');
      btnHtml = btn.innerHTML;
      btn.innerHTML = '<span uk-spinner></span> Saving...';
    }
  } catch (_) {}

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
        submittedBy: (currentUser && currentUser.userId) || null,
        submittedByName: currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : null,
      }),
    }
  );

  const success = await response.json();
  console.log(success);
  if (success.body === "Success") {
    attendanceDirty = false;
    const statusEl = document.getElementById('attendance-saved-status');
    const when = success.savedAt || new Date().toLocaleTimeString();
    const who = success.submittedByName || (currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : '');
    if (statusEl) statusEl.textContent = `Saved at ${when}${who ? ` by ${who}` : ''}`;
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
  // Re-enable button regardless of outcome
  try {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('uk-disabled');
      if (btnHtml != null) btn.innerHTML = btnHtml;
    }
  } catch (_) {}
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

// Mark dirty on any roster click; warn on page unload
try {
  if (rosterDiv) {
    rosterDiv.addEventListener('click', (e) => {
      const card = e.target.closest('.student');
      if (card && rosterDiv.contains(card)) {
        attendanceDirty = true;
        const statusEl = document.getElementById('attendance-saved-status');
        if (statusEl) statusEl.textContent = 'Unsaved changes';
      }
    });
  }
  window.addEventListener('beforeunload', (e) => {
    if (attendanceDirty && !allowLeaveUnsaved) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
} catch (_) { /* no-op */ }
