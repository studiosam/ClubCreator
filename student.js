async function getUser() {
  if (user) {
    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(user);
    if (user.isTeacher) {
      window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }
  } else {
    console.log(`Nobody is logged in`);
    window.location.href = "/";
  }
  await getStudentDashboard();
}

getUser();

async function getStudentDashboard() {
  console.log('CLUBID', user.clubId)
  if (user.clubId !== null) {
    await finishStudentDashboard();
  } else if (
    user.clubPreferences &&
    user.clubPreferences !== null &&
    user.clubPreferences !== ""
  ) {
    renderPrefsOnDashboard(user.clubPreferences);
  } else {
    await finishStudentDashboard();
  }
}

async function finishStudentDashboard() {
  document.querySelector("#main-dashboard-panel").classList.remove("hidden");
  document.querySelector("#current-prefs").classList.add("hidden");
  // Clear any prior reorder or selection UI to avoid mixing views
  const myClubEl = document.querySelector("#my-club");
  if (myClubEl) myClubEl.innerHTML = "";
  const footerEl = document.querySelector("#card-footer");
  if (footerEl) footerEl.innerHTML = "";
  const response = await fetch(`http://${serverAddress}:3000/getAllClubs`);
  const respClubs = await response.json();

  const clubStudentCounts = await Promise.all(
    respClubs.map(async (club) => {
      const response = await fetch(
        `http://${serverAddress}:3000/get-students-in-club/${club.clubId}`
      );
      const studentCount = await response.json();
      return { ...club, studentCount };
    })
  );

  // Filter the clubs: do NOT show clubs that are already full
  const clubs = clubStudentCounts.filter((club) => {
    const cap = parseInt(club.maxSlots, 10);
    const count = (club.studentCount && club.studentCount.students) ? club.studentCount.students.length : 0;
    // Enforce capacity strictly:
    // - cap > 0: allow only if count < cap
    // - cap <= 0: treat as closed (students cannot pick these clubs)
    // - non-numeric/missing cap: allow
    const hasAvailableSlots = Number.isFinite(cap) ? (cap > 0 && count < cap) : true;
    return hasAvailableSlots;
  });
  console.log(clubs)
  const myAssignedClub = await respClubs.filter(
    (obj) => obj.clubId === user.clubId
  );
  if (myAssignedClub.length > 0) {
    const myClubs = document.querySelector("#my-club");
    myAssignedClub.forEach((club) => {
      let coverPhotoUrl = `https://ui-avatars.com/api/?name=${club.clubName}&background=005DB4&color=fff`;
      if (
        club.coverPhoto &&
        club.coverPhoto !== "NULL" &&
        club.coverPhoto !== "null" &&
        club.coverPhoto !== null
      ) {
        coverPhotoUrl = `${club.coverPhoto}`;
      }
      myClubs.innerHTML += `<a href="http://${serverAddress}/club-info.html?club-id=${club.clubId}" class="uk-link-text">
    <div class="club">
    <p class="uk-card-title roboto">${club.clubName}</p>
    <div class="club-thumbnail" style="background-image: url(&quot;${coverPhotoUrl}&quot;)">
    </div>
      <p class="dark">Room: ${club.room}</p>
      <p class="dark">${club.clubDescription}</p>
    </div></a><hr>
    `;
    });

    // If the student has an assigned club but no saved preferences, show guidance
    try {
      const hasPrefs = !!(user && user.clubPreferences && String(user.clubPreferences).trim() !== "");
      if (!hasPrefs) {
        const menu = document.querySelector("#menuInstructions");
        if (menu) {
          menu.innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">My Club</h3>
            <p class="uk-margin-remove-top">Please select your club preferences for next semester (required). Click <strong>Select New Club Preferences</strong> at the bottom and choose exactly <strong>5</strong> clubs in order.</p>`;
        }
      }
    } catch (_) { /* no-op */ }

    // Show current club preferences below the assigned club (if available)
    try {
      if (user && user.clubPreferences && String(user.clubPreferences).trim() !== "") {
        const ids = String(user.clubPreferences).split(",").filter(Boolean);
        myClubs.innerHTML += `
          <div id="current-pref-section" class="uk-margin-top">
            <h3 class="uk-card-title roboto">Your Current Club Preferences</h3>
            <ol id="assigned-pref-list" class="uk-list uk-list-decimal"></ol>
          </div>`;
        const ul = document.getElementById("assigned-pref-list");
        for (const clubId of ids) {
          try {
            const resp = await fetch(`http://${serverAddress}:3000/getClubById?club=${clubId}`);
            const club = await resp.json();
            if (ul) ul.innerHTML += `<li class="uk-text-large">${club && club.clubName ? club.clubName : `Club ${clubId}`}</li>`;
          } catch (_) {
            if (ul) ul.innerHTML += `<li class="uk-text-large">Club ${clubId}</li>`;
          }
        }
      }
    } catch (_) { /* no-op */ }
    // Allow assigned students to select new preferences for next semester
    const footer = document.querySelector("#card-footer");
    if (footer) {
      footer.innerHTML = `<div class="text-center"><button id="select-new-preferences" class="uk-button uk-button-primary">Select New Club Preferences</button></div>`;
      const btn = document.getElementById("select-new-preferences");
      if (btn) {
        btn.addEventListener("click", () => {
          renderSelectionChecklist(clubs);
        });
      }
    }
  } else {
    renderSelectionChecklist(clubs);
  }
}

function selectedClubList(clubs) {
  document.querySelector(
    "#card-footer"
  ).innerHTML = `<div class="text-center"><button id="submit-selections" class="uk-button uk-button-primary">Submit</button></div>`;
  const allClubs = document.querySelector("#my-club");
  allClubs.innerHTML = "";
  document.querySelector(
    "#menuInstructions"
  ).innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">Put the 5 clubs you chose in order from your favorite to the least favorite</h3>
        <p><strong class="red">Put your favorite club at the top.</strong></p>`;
  clubs.forEach((club) => {
    allClubs.innerHTML += `
      <div id="${club.clubId}" class="reorder-item uk-flex uk-flex-middle">
        <span class="uk-margin-small-right uk-text-center uk-sortable-handle reorder-handle" uk-icon="icon: table"></span>
        <div class="student-reorder-card reorder-card">
          <p class="uk-card-title roboto">${club.clubName}</p>
          <p class="club-descripton">${club.clubDescription}</p>
        </div>
      </div>
    `;
  });
  // Ensure the sortable placeholder matches dragged item height to prevent container shrink
  try {
    const container = document.querySelector('#my-club');
    if (container) {
      if (container._phObserver) { try { container._phObserver.disconnect(); } catch (_) {} }
      const applyLock = () => {
        const ph = container.querySelector('.uk-sortable-placeholder');
        const dragRow = document.querySelector('.uk-sortable-drag');
        const w = Math.ceil(container.getBoundingClientRect().width);
        if (ph) {
          ph.style.width = `${w}px`;
          ph.style.maxWidth = `${w}px`;
        }
        if (dragRow) {
          // Lock width of the floating dragged element to the list width
          dragRow.style.width = `${w}px`;
          dragRow.style.maxWidth = `${w}px`;
          dragRow.style.boxSizing = 'border-box';
          const dragCard = dragRow.querySelector('.reorder-card');
          if (dragCard) {
            dragCard.style.width = '100%';
            dragCard.style.boxSizing = 'border-box';
          }
        }
      };
      const obs = new MutationObserver(applyLock);
      obs.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      container._phObserver = obs;
      window.addEventListener('pointermove', applyLock, { passive: true });
      window.addEventListener('pointerup', applyLock, { passive: true });

      // Explicitly lock the container/card width during drag to avoid shrink
      const lockOnPointerDown = (e) => {
        if (!(e && e.target && e.target.closest('.uk-sortable-handle'))) return;
        const card = container.closest('.uk-card');
        const cw = Math.ceil(container.getBoundingClientRect().width);
        [container, card].forEach((el) => {
          if (el) {
            el.style.width = `${cw}px`;
            el.style.maxWidth = `${cw}px`;
            el.style.boxSizing = 'border-box';
          }
        });
        applyLock();
      };
      const unlockOnPointerUp = () => {
        const card = container.closest('.uk-card');
        [container, card].forEach((el) => {
          if (el) {
            el.style.width = '';
            el.style.maxWidth = '';
          }
        });
      };
      container.addEventListener('pointerdown', lockOnPointerDown, { passive: true });
      window.addEventListener('pointerup', unlockOnPointerUp, { passive: true });
      window.addEventListener('pointercancel', unlockOnPointerUp, { passive: true });
    }
  } catch (_) { /* no-op */ }
  document
    .querySelector("#submit-selections")
    .addEventListener("click", async () => {
      document
        .querySelector("#submit-selections").disabled = true
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user.userId;
      console.log("USERID", userId);
      // Read the order from the reordered items themselves, not the handles
      const clubOrder = Array.from(document.querySelectorAll('#my-club .reorder-item'))
        .map((el) => el && el.id ? String(el.id).trim() : '')
        .filter((id) => id !== '' && /^\d+$/.test(id));
      console.log(clubOrder);
      const response = await fetch(
        `http://${serverAddress}:3000/setClubPrefs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clubOrder: clubOrder, student: userId }),
        }
      );
      const userResult = await response.json();
      console.log(userResult);
      if (userResult.body === "Success") {
        const csv = clubOrder.join(",");
        // Update global user object and localStorage immediately
        try {
          if (window.user) { window.user.clubPreferences = csv; }
          const stored = JSON.parse(localStorage.getItem("user") || "null");
          if (stored) {
            stored.clubPreferences = csv;
            localStorage.setItem("user", JSON.stringify(stored));
          }
        } catch (_) { /* no-op */ }
        // Show success popup and render the current prefs view without a hard reload
        if (window.UIkit && UIkit.notification) {
          UIkit.notification({
            message: "Your club preferences have been saved!",
            status: "success",
            pos: "top-center",
            timeout: 3000,
          });
        }
        renderCurrentPrefsView(csv);
      }
    });
}

// Render the initial 5-choice selection checklist (reused for assigned students)
function renderSelectionChecklist(clubs) {
  const allClubs = document.querySelector("#my-club");
  if (allClubs) allClubs.innerHTML = "";
  const menu = document.querySelector("#menuInstructions");
  if (menu) menu.innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">Please select your top 5 preferences for our club activities this semester.</h3>
        <p><strong class=\"red\">You must select exactly 5 choices.</strong></p>`;

  clubs.forEach((club) => {
    const clubsplit = club.clubName.replaceAll(" ", "-");
    let coverPhotoUrl = `https://ui-avatars.com/api/?name=${clubsplit}&background=005DB4&color=fff`;
    if (
      club.coverPhoto &&
      club.coverPhoto !== "NULL" &&
      club.coverPhoto !== "null" &&
      club.coverPhoto !== null &&
      club.coverPhoto !== ""
    ) {
      coverPhotoUrl = `${club.coverPhoto}`;
    }
    if (allClubs) {
      allClubs.innerHTML += `<div class="student-club-wrapper"  style="background: linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url('${coverPhotoUrl}'); background-size: cover; background-position: center" >
        <div class="club-choice">
          <input class="club-input" type="checkbox" data-club-id="${club.clubId}" data-club-name="${club.clubName}">
        </div>
        <div class="club">
          <p class="uk-card-title roboto" style="color:white">${club.clubName}</p>
          <p class="club-descripton">${club.clubDescription}</p>
        </div>
      </div>`;
    }
  });
  const footer = document.querySelector("#card-footer");
  if (footer) footer.innerHTML = `<div class="text-center"><button id="submit" class="uk-button uk-button-primary">Submit</button></div>`;
  const submitBtn = document.querySelector("#submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const checkedClubs = document.querySelectorAll(".club-input:checked");
      if (checkedClubs.length > 5) {
        UIkit.notification({
          message: "You may not select more than 5 clubs!",
          status: "danger",
          pos: "top-center",
          timeout: 5000,
        });
      } else if (checkedClubs.length < 5) {
        UIkit.notification({
          message: "You must select exactly 5 clubs",
          status: "danger",
          pos: "top-center",
          timeout: 5000,
        });
      } else {
        const clubIds = [];
        checkedClubs.forEach((input) => {
          const wrapper = input.closest('.student-club-wrapper');
          const descEl = wrapper ? wrapper.querySelector('.club-descripton') : null;
          clubIds.push({
            clubId: input.getAttribute('data-club-id'),
            clubName: input.getAttribute('data-club-name'),
            clubDescription: descEl ? descEl.textContent : ''
          });
        });
        selectedClubList(clubIds);
      }
    });
  }
}

// Render the read-only "current selections" panel with banner and list
async function renderCurrentPrefsView(prefCsv) {
  const mainPanel = document.querySelector("#main-dashboard-panel");
  if (mainPanel) mainPanel.classList.add("hidden");
  const container = document.querySelector("#current-prefs");
  if (!container) return;
  // Ensure the container is visible in case it was hidden earlier
  container.classList.remove("hidden");
  container.innerHTML = `
    <div class="uk-container uk-container-small uk-margin-top">
      <div class="uk-alert-primary" uk-alert>
        <p>You have already selected your club preferences. If you would like to change them, you may select exactly 5 clubs again.</p>
      </div>
      <div class="uk-flex uk-flex-column uk-flex-middle">
        <h1>Current Club Selections</h1>
        <div class="uk-width-1-1 uk-width-2-3@m" style="max-width: 900px;">
          <ul class="uk-list uk-list-decimal" id="current-user-selections"></ul>
        </div>
        <div class="uk-margin-top uk-flex uk-flex-middle uk-flex-center" style="gap:12px;">
          <button id="change-club-prefs" class="uk-button uk-button-primary">Dashboard</button>
        </div>
      </div>
    </div>`;
  const ids = String(prefCsv).split(",").filter(Boolean);
  // Populate list with club names IN ORDER
  for (const clubId of ids) {
    try {
      const resp = await fetch(`http://${serverAddress}:3000/getClubById?club=${clubId}`);
      const club = await resp.json();
      const ul = document.querySelector("#current-user-selections");
      if (ul) ul.innerHTML += `<li class="uk-text-large">${club && club.clubName ? club.clubName : `Club ${clubId}`}</li>`;
    } catch (_) {
      const ul = document.querySelector("#current-user-selections");
      if (ul) ul.innerHTML += `<li class="uk-text-large">Club ${clubId}</li>`;
    }
  }
  const changeBtn = document.querySelector("#change-club-prefs");
  if (changeBtn) {
    changeBtn.addEventListener("click", () => {
      renderPrefsOnDashboard(prefCsv);
    });
  }
}

// Show the main dashboard with the student's current preferences in order
async function renderPrefsOnDashboard(prefCsv) {
  const mainPanel = document.querySelector("#main-dashboard-panel");
  if (mainPanel) mainPanel.classList.remove("hidden");
  const currentPrefsPanel = document.querySelector("#current-prefs");
  if (currentPrefsPanel) currentPrefsPanel.classList.add("hidden");

  // Clear existing UI
  const myClubEl = document.querySelector("#my-club");
  if (myClubEl) myClubEl.innerHTML = "";
  const footerEl = document.querySelector("#card-footer");
  if (footerEl) footerEl.innerHTML = "";

  // Heading and instructions
  const menu = document.querySelector("#menuInstructions");
  if (menu) {
    menu.innerHTML = `<h3 id="menuHeading" class="uk-card-title roboto">Your Current Club Preferences</h3>
      <p class="uk-margin-remove-top">Listed in order from favorite to least favorite.</p>`;
  }

  // Build ordered list of current preferences
  const ids = String(prefCsv).split(",").filter(Boolean);
  const list = document.createElement("ol");
  list.className = "uk-list uk-list-decimal";

  // Fetch names and render IN ORDER (5 items, sequential for determinism)
  for (const clubId of ids) {
    try {
      const resp = await fetch(`http://${serverAddress}:3000/getClubById?club=${clubId}`);
      const club = await resp.json();
      const li = document.createElement("li");
      li.className = "uk-text-large";
      li.textContent = club && club.clubName ? club.clubName : `Club ${clubId}`;
      list.appendChild(li);
    } catch (_) {
      const li = document.createElement("li");
      li.className = "uk-text-large";
      li.textContent = `Club ${clubId}`;
      list.appendChild(li);
    }
  }

  if (myClubEl) {
    const wrapper = document.createElement("div");
    wrapper.id = "student-club-wrapper";
    wrapper.appendChild(list);
    myClubEl.appendChild(wrapper);
  }

  // Add the "Select New Club Preferences" action like assigned students
  if (footerEl) {
    footerEl.innerHTML = `<div class="text-center"><button id="select-new-preferences" class="uk-button uk-button-primary">Select New Club Preferences</button></div>`;
    const btn = document.getElementById("select-new-preferences");
    if (btn) {
      btn.addEventListener("click", async () => {
        // Reuse the same selection builder used elsewhere
        try {
          const resp = await fetch(`http://${serverAddress}:3000/getAllClubs`);
          const all = await resp.json();
          // Apply same filtering rules as finishStudentDashboard
          const clubStudentCounts = await Promise.all(
            all.map(async (club) => {
              const r = await fetch(`http://${serverAddress}:3000/get-students-in-club/${club.clubId}`);
              const studentCount = await r.json();
              return { ...club, studentCount };
            })
          );
          const eligible = clubStudentCounts.filter((club) => {
            const minSlotsGrade = club[`minSlots${user.grade}`];
            const totalMinSlots = club.minSlots9 + club.minSlots10 + club.minSlots11 + club.minSlots12;
            const hasAvailableSlots = club.studentCount.students.length < club.maxSlots;
            return minSlotsGrade > 0 || (totalMinSlots === 0 && hasAvailableSlots);
          });
          renderSelectionChecklist(eligible);
        } catch (_) {
          renderSelectionChecklist([]);
        }
      });
    }
  }
}
