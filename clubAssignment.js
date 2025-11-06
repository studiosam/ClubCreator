const fetch = require("node-fetch");
const {
  updateClubValue,
  assignClub,
  getTeachersOrStudentsInClub,
  assignClubToStudent,
} = require("./database.js");
const ip = require("ip");
const serverAddress = ip.address("public");
const content = `const serverAddress = '${serverAddress}'`;
//get object of all user ids and preference arrays
async function getStudents() {
  const response = await fetch(`http://${serverAddress}:3000/getAllStudents`);

  const users = await response.json();
  return users;
}

//get object of all user ids and preference arrays of students without clubs

//loop through all students' first choices and apply sorting algorithm
async function choiceLoop(thisStudent) {
  //if random student
  if (thisStudent.clubPreferences) {
    for (
      let choiceNumber = 0;
      choiceNumber < thisStudent.clubPreferences.split(",").length;
      choiceNumber++
    ) {
      const thisStudentChoice = await getChoice(thisStudent, choiceNumber);
      if (!thisStudentChoice) continue; // skip invalid/zero preferences
      // console.log(`This student Choice = ${thisStudentChoice}`)
      const choiceClubObject = await getClubById(thisStudentChoice);
      if (!choiceClubObject) continue; // preference points to non-existent/blocked club
      // console.log(`Choice Club Object = ${choiceClubObject}`)
      const clubRoster = await getTeachersOrStudentsInClub(
        choiceClubObject.clubId,
        thisStudent.isTeacher
      );
      // console.log(`Choice Club Roster = ${clubRoster}`)
      const studentGrade = thisStudent.grade;
      // console.log(`Student Grade = ${studentGrade}`)
      const gradeKey = `minSlots${studentGrade}`;
      // console.log(`Grade Key = ${gradeKey}`)
      const gradeSlotsAvailable = choiceClubObject[gradeKey];
      // console.log(`Slots available in this club for that grade = ${gradeSlotsAvailable}`)
      const studentsInSameGrade = clubRoster.filter(
        (student) => student.grade === thisStudent.grade
      ).length;
      // console.log(`Students in same grade in this club = ${studentsInSameGrade}`)
      const maxSlotsAvailable = choiceClubObject[`maxSlots`];
      // console.log(choiceClubObject);
      // Use current roster to evaluate grade minima satisfaction (treat null/NaN minima as 0)
      const min9 = parseInt(choiceClubObject.minSlots9, 10) || 0;
      const min10 = parseInt(choiceClubObject.minSlots10, 10) || 0;
      const min11 = parseInt(choiceClubObject.minSlots11, 10) || 0;
      const min12 = parseInt(choiceClubObject.minSlots12, 10) || 0;
      const counts = { 9: 0, 10: 0, 11: 0, 12: 0 };
      for (const m of clubRoster) {
        const g = parseInt(m.grade, 10);
        if (counts[g] != null) counts[g]++;
      }
      const allMinSatisfied = (counts[9] >= min9) && (counts[10] >= min10) && (counts[11] >= min11) && (counts[12] >= min12);
      const gradeMin = (studentGrade === 9 ? min9 : studentGrade === 10 ? min10 : studentGrade === 11 ? min11 : min12);
      const belowMinForGrade = studentsInSameGrade < gradeMin;
      const studentsInClub = clubRoster.length;
      const capacityLeft = maxSlotsAvailable - studentsInClub;
      // PASS 1 policy: seniors-first (then juniors, etc.) without grade minima gating; use capacity only
      if (
        capacityLeft > 0 &&
        thisStudent.clubId === null
      ) {
        await assignClub(thisStudent, choiceClubObject.clubId);
        //recalculate minSlots per grade level
        return true;
      } else {
        //add student Id to the queue array
        // console.log('No Slots Bitch')
        console.log("No Slots Available");
      }
    }
  }
}

//loop through all students' first choices and apply sorting algorithm
async function choiceLoopNoGrade(thisStudent) {
  //if random student
  if (thisStudent.clubPreferences) {
    for (
      let choiceNumber = 0;
      choiceNumber < thisStudent.clubPreferences.split(",").length;
      choiceNumber++
    ) {
      const thisStudentChoice = await getChoice(thisStudent, choiceNumber);
      if (!thisStudentChoice) continue;
      const choiceClubObject = await getClubById(thisStudentChoice);
      if (!choiceClubObject) continue;
      const maxSlotsAvailable = choiceClubObject[`maxSlots`];
      // console.log(choiceClubObject);
      const studentRoster = await getTeachersOrStudentsInClub(
        choiceClubObject.clubId,
        thisStudent.isTeacher
      );
      const studentsInClub = studentRoster.length;
      // console.log(gradeSlotsAvailable)
      if (studentsInClub < maxSlotsAvailable && thisStudent.clubId === null) {
        await assignClub(thisStudent, choiceClubObject.clubId);
        return true;
      } else {
        console.log("No Slots Available");
      }
    }
  }
}

//get club object for student's choice
async function getClubById(id) {
  try {
    const cid = String(id || '').trim();
    if (!cid || cid === '0') return null; // treat 0 as intentionally unused choice
    const response = await fetch(`http://${serverAddress}:3000/getClubById?club=${cid}`);
    if (!response.ok) return null;
    // Even if the row is missing, res.json(null) is valid JSON; guard parse errors anyway
    try { return await response.json(); } catch (_) { return null; }
  } catch (_) {
    return null;
  }
}

//get the choice of the random student
async function getChoice(student, ordinant) {
  // console.log(student.clubPreferences)
  if (student.clubPreferences) {
    const choice = String(student.clubPreferences.split(",")[ordinant] || '').trim();
    if (!choice || choice === '0') return null;
    console.log(
      `${student.firstName} ${student.lastName} has a choice of club ${choice}`
    );
    return choice;
  }
}

//select students in grade-descending groups (12 -> 9), shuffled within each grade
async function getRandomStudentOrder() {
  // Exclude off-campus (clubId < 0) and only include students without a club yet
  const studentsAll = await getStudents();
  const onCampus = studentsAll.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const unassigned = onCampus.filter((s) => (s.clubId === null) || (Number(s.clubId) === 0));
  if (!unassigned.length) return "No Students Without Clubs";

  const byGrade = { 12: [], 11: [], 10: [], 9: [] };
  for (const s of unassigned) {
    const g = parseInt(s.grade, 10);
    if (g === 12) byGrade[12].push(s);
    else if (g === 11) byGrade[11].push(s);
    else if (g === 10) byGrade[10].push(s);
    else if (g === 9) byGrade[9].push(s);
    else byGrade[9].push(s); // unknown grades treated last
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const ordered = [12, 11, 10, 9]
    .flatMap((g) => shuffle(byGrade[g]))
    .map((s) => [s]); // keep existing [student] shape used elsewhere

  return ordered.length ? ordered : "No Students Without Clubs";
}

async function choiceRound(studentOrder) {
  for (let i = 0; i < studentOrder.length; i++) {
    if (studentOrder[i][0].clubId !== null) {
      return "Already Has Club";
    } else {
      const choice = await choiceLoop(studentOrder[i][0]);
      // console.log('Choice', choice);
    }
  }
}

async function choiceRoundNoGrade(studentOrder) {
  for (let i = 0; i < studentOrder.length; i++) {
    if (studentOrder[i][0].clubId !== null) {
      return "Already Has Club";
    } else {
      const choice = await choiceLoopNoGrade(studentOrder[i][0]);
      // console.log('Choice', choice);
    }
  }
}

async function main() {
  // Protect students who had a club before this run (do not change them)
  const baseline = await getStudents();
  const protectedSet = new Set(
    baseline
      .filter((s) => s && s.clubId != null && !(typeof s.clubId === 'number' && s.clubId < 0))
      .map((s) => String(s.userId))
  );

  // New ranked assignment: per rank (1..5), seniors-first by grade, with two phases (min-aware, then capacity-only)
  const ran = await rankedAssignmentByGrade(protectedSet);

  // Fallback pass: try to place remaining students using augmenting-path swaps
  try {
    const placedViaFallback = await augmentingPathFallback(protectedSet);
    console.log(`Augmenting fallback placed ${placedViaFallback} students`);
  } catch (e) {
    console.log("Augmenting fallback error:", e && e.message ? e.message : String(e));
  }
  // Final capacity enforcement: prune any overfull clubs and try to re-place evicted students
  try {
    await pruneOverCapacityAndReallocate(protectedSet);
  } catch (e) {
    console.log("Capacity prune error:", e && e.message ? e.message : String(e));
  }
  // Finally, nudge underfilled clubs (e.g., below 30% of capacity) by placing
  // currently unassigned students who listed those clubs in their preferences.
  try {
    const boosted = await fillLowCapacityClubs(protectedSet, 0.30);
    if (boosted && boosted.totalPlaced) {
      console.log(`Low-capacity fill placed ${boosted.totalPlaced} students across ${boosted.clubsAffected} clubs`);
    }
  } catch (e) {
    console.log("Low-capacity fill error:", e && e.message ? e.message : String(e));
  }
  // 4th pass: move from 100% full clubs into <30% clubs when students expressed interest
  try {
    const moved = await rebalanceFullToLow(protectedSet, 0.50);
    if (moved && moved.totalMoved) {
      console.log(`Rebalance full->low moved ${moved.totalMoved} students across ${moved.clubsAffected} clubs`);
    }
  } catch (e) {
    console.log("Rebalance full->low error:", e && e.message ? e.message : String(e));
  }
  // 5th pass: as a final nudge, fill clubs below 40% by moving students (from any club)
  // who listed those clubs, while respecting protected students and grade minima.
  try {
    const anyMoved = await rebalanceAnyToLow(protectedSet, 0.40);
    if (anyMoved && anyMoved.totalMoved) {
      console.log(`Rebalance any->low moved ${anyMoved.totalMoved} students across ${anyMoved.clubsAffected} clubs`);
    }
  } catch (e) {
    console.log("Rebalance any->low error:", e && e.message ? e.message : String(e));
  }
  // FINAL pass: ensure every on-campus student WITH preferences is assigned somewhere
  // using any available capacity (ignoring preference rank at this point). This
  // never overfills a club and leaves students without preferences untouched.
  try {
    const forced = await forcePlaceRemaining(protectedSet);
    if (forced && forced.placed) {
      console.log(`Force-placed ${forced.placed} students into available clubs; remaining unassigned (with prefs): ${forced.remaining}`);
    }
  } catch (e) {
    console.log("Force-place error:", e && e.message ? e.message : String(e));
  }
  return true;
}

module.exports = {
  main,
};

// -------------------- Fallback placement helpers --------------------

async function augmentingPathFallback(protectedSet) {
  // Load current students and clubs
  const allStudents = await getStudents();
  const onCampus = allStudents.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const unplacedRaw = onCampus.filter((s) => s.clubId === null && hasAnyPrefs(s));
  if (!unplacedRaw.length) return 0;
  // Prioritize older grades first so they keep higher preferences (12 -> 9)
  const gradeRank = (g) => { const n = parseInt(g, 10); return Number.isNaN(n) ? -1 : n; };
  const unplaced = [...unplacedRaw].sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade));

  const clubs = await fetch(`http://${serverAddress}:3000/getAllClubs`).then((r) => r.json());
  // Build capacity + roster map
  const capacity = new Map(clubs.map((c) => [String(c.clubId), safeInt(c.maxSlots)]));
  const roster = new Map(); // clubId -> Set(userId)
  for (const c of clubs) {
    const members = await getTeachersOrStudentsInClub(c.clubId, false);
    roster.set(String(c.clubId), new Set((members || []).map((m) => m.userId)));
  }

  // Name/index helpers for logging clarity
  const studentById = new Map(onCampus.map((s) => [String(s.userId), s]));
  const clubById = new Map(clubs.map((c) => [String(c.clubId), c]));
  const nameOf = (uid) => {
    const st = studentById.get(String(uid));
    return st ? `${st.firstName} ${st.lastName}` : `User ${uid}`;
  };
  const clubNameOf = (cid) => {
    const c = clubById.get(String(cid));
    return c && c.clubName ? c.clubName : `Club ${cid}`;
  };

  const prefs = new Map(); // userId -> [clubId strings]
  for (const s of onCampus) prefs.set(String(s.userId), readPrefs(s));

  // Rank guard: do not worsen displaced student's rank by more than this delta
  const RANK_WORSENING_LIMIT = 1; // e.g., moving from choice 2 -> 3 allowed; 2 -> 4 blocked

  let placedCount = 0;
  for (const s of unplaced) {
    let path = null;
    // Allow displacement caps increasing: first only 9th graders, then 10th, then 11th, then 12th
    for (const cap of [9, 10, 11, 12]) {
      path = await findAugmentingPath(String(s.userId), prefs, roster, capacity, studentById, cap, RANK_WORSENING_LIMIT, protectedSet);
      if (path) break;
    }
    if (!path) {
      console.log(`Fallback: could not place ${s.firstName} ${s.lastName} in any chosen club`);
      continue;
    }
    // Apply chain moves (excluding the first element which is the initial target club for s)
    // Path is array of club nodes from initial target to terminal club with free capacity
    // Each node carries displacedStudentId assigned into that node.clubId
    for (let i = path.length - 1; i >= 1; i--) {
      const node = path[i];
      const prev = path[i - 1];
      const studentId = node.displacedStudentId; // move this student into node.clubId
      const toClub = node.clubId;
      const fromClub = prev.clubId;
      const beforeRank = prefRank(prefs, studentId, fromClub);
      const afterRank = prefRank(prefs, studentId, toClub);
      console.log(
        `Fallback move: ${nameOf(studentId)} from ${clubNameOf(fromClub)} (choice ${rankLabel(beforeRank)}) ` +
        `to ${clubNameOf(toClub)} (choice ${rankLabel(afterRank)})`
      );
      await assignClubToStudent(studentId, toClub);
      moveInMemory(roster, studentId, fromClub, toClub);
    }
    // Finally assign the original student to the first node's clubId
    const first = path[0];
    const finalRank = prefRank(prefs, s.userId, first.clubId);
    console.log(
      `Fallback place: ${nameOf(s.userId)} into ${clubNameOf(first.clubId)} (choice ${rankLabel(finalRank)})`
    );
    await assignClubToStudent(s.userId, first.clubId);
    addToClub(roster, String(first.clubId), s.userId);
    placedCount++;
  }
  return placedCount;
}

function hasAnyPrefs(s) {
  try { return !!(s && s.clubPreferences && String(s.clubPreferences).trim().length); } catch (_) { return false; }
}
function readPrefs(s) {
  const raw = String((s && s.clubPreferences) || '')
    .split(',')
    .map((v) => String(v).trim())
    .filter((v) => v && v !== '0'); // ignore intentionally disabled choices
  // De-duplicate while preserving order
  const seen = new Set();
  const out = [];
  for (const id of raw) { if (!seen.has(id)) { seen.add(id); out.push(id); } }
  return out;
}
function safeInt(v) { const n = parseInt(v, 10); return Number.isNaN(n) ? 0 : n; }

function remaining(capacity, roster, clubId) {
  const cap = capacity.get(String(clubId)) || 0;
  const size = (roster.get(String(clubId)) || new Set()).size;
  return Math.max(0, cap - size);
}
function addToClub(roster, clubId, userId) {
  const k = String(clubId); const set = roster.get(k) || new Set(); set.add(userId); roster.set(k, set);
}
function moveInMemory(roster, userId, fromClub, toClub) {
  const f = roster.get(String(fromClub)); if (f) f.delete(userId);
  addToClub(roster, toClub, userId);
}

async function findAugmentingPath(startUserId, prefs, roster, capacity, studentById, maxDisplaceGrade, rankLimit, protectedSet) {
  // BFS alternating over clubs via displaced students
  const startPrefs = prefs.get(String(startUserId)) || [];
  const visitedClubs = new Set();
  const visitedStudents = new Set([String(startUserId)]);
  const queue = [];
  // Node structure: { clubId: string, displacedStudentId: string, prev: Node|null }
  for (const c of startPrefs) {
    queue.push({ clubId: String(c), displacedStudentId: String(startUserId), prev: null });
    visitedClubs.add(String(c));
  }
  while (queue.length) {
    const node = queue.shift();
    // If this club has space, success
    if (remaining(capacity, roster, node.clubId) > 0) {
      // Build chain back to root
      const chain = [];
      let p = node;
      while (p) { chain.push(p); p = p.prev; }
      chain.reverse();
      return chain;
    }
    // Otherwise, try displacing someone in this club who can move to another preferred club
    const occupants = Array.from(roster.get(String(node.clubId)) || new Set());
    // Sort occupants to prefer displacing younger students first
    const ordered = occupants
      .map((uid) => {
        const st = studentById.get(String(uid));
        return { uid: String(uid), grade: parseInt(st && st.grade, 10) || 999 };
      })
      .sort((a, b) => a.grade - b.grade); // 9 -> 12
    for (const { uid: occId, grade } of ordered) {
      const sid = String(occId);
      if (visitedStudents.has(sid)) continue;
      if (protectedSet && protectedSet.has(sid)) continue; // do not displace pre-assigned students
      if (typeof maxDisplaceGrade === 'number' && grade > maxDisplaceGrade) continue; // respect cap
      visitedStudents.add(sid);
      const choices = prefs.get(sid) || [];
      for (const c2 of choices) {
        const cid = String(c2);
        if (cid === String(node.clubId)) continue; // don't loop back immediately
        if (visitedClubs.has(cid)) continue;
        // Rank-aware guard: only allow move if new rank is not worse by more than rankLimit
        const currentRank = prefRank(prefs, sid, node.clubId);
        const nextRank = prefRank(prefs, sid, cid);
        if (currentRank > 0 && nextRank > 0 && typeof rankLimit === 'number') {
          if (nextRank > currentRank + rankLimit) continue;
        }
        visitedClubs.add(cid);
        queue.push({ clubId: cid, displacedStudentId: sid, prev: node });
      }
    }
  }
  return null;
}

function prefRank(prefsMap, userId, clubId) {
  const arr = prefsMap.get(String(userId)) || [];
  const idx = arr.findIndex((x) => String(x) === String(clubId));
  return idx >= 0 ? idx + 1 : 0; // 1..5, 0 means not in list
}
function rankLabel(n) { return n > 0 ? String(n) : 'not in list'; }

// -------------------- Ranked seniors-first assignment --------------------
async function rankedAssignmentByGrade(protectedSet) {
  // Load all students and clubs
  const allStudents = await getStudents();
  const clubs = await fetch(`http://${serverAddress}:3000/getAllClubs`).then((r) => r.json());

  // Filter students
  const onCampus = allStudents.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const unassignedSet = new Set(onCampus.filter((s) => (s.clubId == null) || (Number(s.clubId) === 0)).map((s) => String(s.userId)));
  if (unassignedSet.size === 0) return true;

  // Build prefs map
  const prefs = new Map();
  for (const s of onCampus) prefs.set(String(s.userId), readPrefs(s));

  // Club data
  const cap = new Map(clubs.map((c) => [String(c.clubId), parseInt(c.maxSlots, 10) || 0]));
  const minima = new Map(clubs.map((c) => [String(c.clubId), {
    9: parseInt(c.minSlots9, 10) || 0,
    10: parseInt(c.minSlots10, 10) || 0,
    11: parseInt(c.minSlots11, 10) || 0,
    12: parseInt(c.minSlots12, 10) || 0,
  }]));

  // In-memory roster counts from current assignments + detailed rosters
  const counts = new Map(); // cid -> { total, byGrade:{9,10,11,12} }
  const rosterMap = new Map(); // cid -> [userId]
  for (const c of clubs) { counts.set(String(c.clubId), { total: 0, byGrade: {9:0,10:0,11:0,12:0} }); rosterMap.set(String(c.clubId), []); }
  for (const s of onCampus) {
    const cid = s.clubId;
    if (cid == null || Number(cid) < 0) continue;
    const key = String(cid);
    const rec = counts.get(key);
    if (!rec) continue;
    rec.total += 1;
    const g = parseInt(s.grade, 10);
    if (rec.byGrade[g] != null) rec.byGrade[g] += 1;
    const list = rosterMap.get(key) || [];
    list.push(String(s.userId));
    rosterMap.set(key, list);
  }

  const byId = new Map(onCampus.map((s) => [String(s.userId), s]));
  const gradesOrder = [12, 11, 10, 9];
  const choiceAt = (uid, r) => {
    const a = prefs.get(String(uid)) || [];
    return a[r-1] ? String(a[r-1]) : null;
  };
  const shuffle = (arr) => { for (let i=arr.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; };

  function capacityLeft(cid) {
    const rec = counts.get(String(cid));
    const mx = cap.get(String(cid)) || 0;
    return mx - (rec ? rec.total : 0);
  }
  function minimaSatisfied(cid) {
    const rec = counts.get(String(cid));
    const req = minima.get(String(cid));
    if (!rec || !req) return true;
    return rec.byGrade[9] >= req[9] && rec.byGrade[10] >= req[10] && rec.byGrade[11] >= req[11] && rec.byGrade[12] >= req[12];
  }

  async function assign(uid, cid) {
    // Hard cap guard to never exceed club capacity
    const mx = cap.get(String(cid)) || 0;
    const rec0 = counts.get(String(cid));
    if (!rec0 || rec0.total >= mx) return false;
    await assignClubToStudent(uid, cid);
    const s = byId.get(String(uid));
    const g = parseInt(s && s.grade, 10);
    const rec = counts.get(String(cid));
    if (rec) {
      rec.total += 1; if (rec.byGrade[g] != null) rec.byGrade[g] += 1;
    }
    unassignedSet.delete(String(uid));
    const list = rosterMap.get(String(cid)) || [];
    list.push(String(uid));
    rosterMap.set(String(cid), list);
    return true;
  }

  async function unassign(uid, fromCid) {
    // Mark unassigned in DB and local state so ranked pass can re-place
    await assignClubToStudent(uid, null);
    const s = byId.get(String(uid));
    const g = parseInt(s && s.grade, 10);
    const rec = counts.get(String(fromCid));
    if (rec) {
      rec.total = Math.max(0, rec.total - 1);
      if (rec.byGrade[g] != null) rec.byGrade[g] = Math.max(0, rec.byGrade[g] - 1);
    }
    const list = rosterMap.get(String(fromCid)) || [];
    const idx = list.indexOf(String(uid));
    if (idx >= 0) list.splice(idx, 1);
    rosterMap.set(String(fromCid), list);
    unassignedSet.add(String(uid));
  }

  // Strict cap: if any club already exceeds capacity, evict extras that are NOT protected
  // Do not prune a grade below its minimum for that club
  for (const c of clubs) {
    const cid = String(c.clubId);
    const mx = cap.get(cid) || 0;
    let roster = (rosterMap.get(cid) || []).slice();
    if (mx <= 0) {
      // No capacity means all non-protected students should be unassigned and re-placed elsewhere
      for (const uid of roster) { if (!protectedSet.has(String(uid))) await unassign(uid, cid); }
      continue;
    }
    // Compute how many non-protected can be evicted to reach capacity
    while (roster.length > mx) {
      // Pick one to evict: lowest grade first; within grade, worst rank for this club
      const req = minima.get(cid) || {9:0,10:0,11:0,12:0};
      const recNow = counts.get(cid) || { byGrade:{9:0,10:0,11:0,12:0}, total:0 };
      const scored = roster
        .filter((uid) => !protectedSet.has(String(uid)))
        .map((uid) => {
          const s = byId.get(String(uid));
          const g = parseInt(s && s.grade, 10) || 9;
          const r = prefRank(prefs, uid, cid) || 99; // 99 if not in list
          return { uid, g, r };
        });
      // Respect grade minima: only consider candidates from grades currently above their min
      const viable = scored.filter((x) => (recNow.byGrade[x.g] || 0) > (req[x.g] || 0));
      if (!viable.length) break; // cannot evict without violating minima; leave over capacity
      viable.sort((a, b) => (a.g - b.g) || (b.r - a.r)); // 9->12, then worse rank first
      const victim = viable[0];
      await unassign(victim.uid, cid);
      roster = rosterMap.get(cid) || [];
    }
  }

  // For each rank 1..5
  for (let r = 1; r <= 5; r++) {
    // Build grade buckets of candidates with an r-th choice
    const bucketsA = {12:[],11:[],10:[],9:[]};
    const bucketsB = {12:[],11:[],10:[],9:[]};
    for (const uid of Array.from(unassignedSet)) {
      const s = byId.get(String(uid));
      if (!s) continue;
      const cid = choiceAt(uid, r);
      if (!cid) continue;
      const g = parseInt(s.grade, 10);
      const gg = (g===12||g===11||g===10||g===9) ? g : 9;
      bucketsA[gg].push({ uid, cid });
      bucketsB[gg].push({ uid, cid });
    }
    // Shuffle within grade
    gradesOrder.forEach((g)=>{ shuffle(bucketsA[g]); shuffle(bucketsB[g]); });

    // Phase A: meet minima first (only if not all minima satisfied)
    for (const g of gradesOrder) {
      for (const item of bucketsA[g]) {
        const { uid, cid } = item;
        if (!unassignedSet.has(String(uid))) continue;
        if (capacityLeft(cid) <= 0) continue;
        const rec = counts.get(String(cid));
        const req = minima.get(String(cid));
        if (!rec || !req) continue;
        const allMet = minimaSatisfied(cid);
        if (allMet) continue; // Phase A only helps when minima not yet satisfied
        if (rec.byGrade[g] < req[g]) {
          await assign(uid, cid);
        }
      }
    }

    // Phase B: capacity-only fill at this rank
    for (const g of gradesOrder) {
      for (const item of bucketsB[g]) {
        const { uid, cid } = item;
        if (!unassignedSet.has(String(uid))) continue;
        if (capacityLeft(cid) <= 0) continue;
        await assign(uid, cid);
      }
    }
  }

  return true;
}

// Fill underfilled clubs (< threshold of capacity) using unassigned students
// who selected those clubs in their preferences. Seniors-first, then by better
// rank for that club. Does not move already-assigned students and respects the
// protectedSet.
async function fillLowCapacityClubs(protectedSet, threshold = 0.30) {
  const clubs = await fetch(`http://${serverAddress}:3000/getAllClubs`).then(r=>r.json());
  const allStudents = await getStudents();
  const onCampus = allStudents.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const byId = new Map(onCampus.map((s) => [String(s.userId), s]));
  const prefs = new Map(onCampus.map((s) => [String(s.userId), readPrefs(s)]));

  // Build current counts
  const counts = new Map(); // cid -> total count (students only)
  for (const c of clubs) {
    const members = await getTeachersOrStudentsInClub(c.clubId, false);
    counts.set(String(c.clubId), (members || []).length);
  }

  // Unassigned pool
  const unassigned = onCampus.filter(s => ((s.clubId == null) || (Number(s.clubId) === 0)) && !protectedSet.has(String(s.userId)));
  const gradesOrder = [12, 11, 10, 9];

  // Helper: get preference rank for a club for a given student (1..5 or 0)
  const prefRankFor = (uid, cid) => prefRank(prefs, uid, cid);

  let totalPlaced = 0;
  let clubsAffected = 0;
  for (const c of clubs) {
    const cid = String(c.clubId);
    const cap = parseInt(c.maxSlots, 10);
    if (!Number.isFinite(cap) || cap <= 0) continue;
    const current = counts.get(cid) || 0;
    const ratio = current / cap;
    if (ratio >= threshold) continue;
    // Compute target count to reach threshold (ceil)
    const target = Math.min(cap, Math.ceil(threshold * cap));
    let need = Math.max(0, target - current);
    if (need <= 0) continue;

    // Collect eligible unassigned who picked this club at any rank
    const eligible = unassigned
      .filter(s => (prefs.get(String(s.userId)) || []).some(x => String(x) === cid))
      .map(s => ({
        uid: String(s.userId),
        grade: parseInt(s.grade, 10) || 9,
        rank: prefRankFor(String(s.userId), cid) || 99
      }));
    if (!eligible.length) continue;
    // Sort: seniors-first (12->9), then better rank (1->5)
    eligible.sort((a, b) => (b.grade - a.grade) || (a.rank - b.rank));

    let placedHere = 0;
    for (const e of eligible) {
      if (need <= 0) break;
      // capacity check live
      const now = counts.get(cid) || 0;
      if (now >= cap) break;
      await assignClubToStudent(e.uid, cid);
      counts.set(cid, now + 1);
      // Remove from unassigned pool
      const idx = unassigned.findIndex(s => String(s.userId) === e.uid);
      if (idx >= 0) unassigned.splice(idx, 1);
      placedHere++; totalPlaced++; need--;
    }
    if (placedHere > 0) clubsAffected++;
  }
  return { totalPlaced, clubsAffected };
}

// Move students from 100% full clubs to < threshold clubs when they listed the target in prefs.
// Prefer moving younger students first and only when target rank <= current rank to avoid worsening choice.
// Do not violate source grade minima and never move protected students.
async function rebalanceFullToLow(protectedSet, threshold = 0.30) {
  const clubs = await fetch(`http://${serverAddress}:3000/getAllClubs`).then(r=>r.json());
  const allStudents = await getStudents();
  const onCampus = allStudents.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const byId = new Map(onCampus.map((s) => [String(s.userId), s]));
  const prefs = new Map(onCampus.map((s) => [String(s.userId), readPrefs(s)]));

  // Build per-club counts and by-grade counts
  const counts = new Map(); // cid -> { total, byGrade }
  for (const c of clubs) counts.set(String(c.clubId), { total: 0, byGrade: {9:0,10:0,11:0,12:0} });
  for (const s of onCampus) {
    const cid = s.clubId;
    if (cid == null || Number(cid) < 0) continue;
    const rec = counts.get(String(cid));
    if (!rec) continue;
    rec.total++;
    const g = parseInt(s.grade,10); if (rec.byGrade[g]!=null) rec.byGrade[g]++;
  }
  const minima = new Map(clubs.map((c) => [String(c.clubId), {
    9: parseInt(c.minSlots9, 10) || 0,
    10: parseInt(c.minSlots10, 10) || 0,
    11: parseInt(c.minSlots11, 10) || 0,
    12: parseInt(c.minSlots12, 10) || 0,
  }]));
  const cap = new Map(clubs.map((c)=>[String(c.clubId), parseInt(c.maxSlots,10)||0]));

  // Identify targets (< threshold) and sources (100% full)
  const targets = clubs
    .map(c=>({ cid:String(c.clubId), cap:cap.get(String(c.clubId))||0, total:(counts.get(String(c.clubId))||{total:0}).total }))
    .filter(x=> x.cap>0 && (x.total/x.cap) < threshold)
    .sort((a,b)=> (a.total/a.cap) - (b.total/b.cap));
  const sources = new Set(
    clubs
      .map(c=>({ cid:String(c.clubId), cap:cap.get(String(c.clubId))||0, total:(counts.get(String(c.clubId))||{total:0}).total }))
      .filter(x=> x.cap>0 && x.total >= x.cap)
      .map(x=>x.cid)
  );

  if (!targets.length || !sources.size) return { totalMoved: 0, clubsAffected: 0 };

  const gradesOrderAsc = [9,10,11,12]; // move younger first
  let totalMoved = 0; let clubsAffected = 0;

  for (const t of targets) {
    const targetCid = t.cid; const targetCap = t.cap; let targetTotal = t.total;
    const targetNeeded = Math.min(targetCap, Math.ceil(threshold*targetCap));
    let need = Math.max(0, targetNeeded - targetTotal);
    if (need <= 0) continue;

    // For each source club
    for (const srcCid of Array.from(sources)) {
      if (need <= 0) break;
      // Live update from counts
      const srcCap = cap.get(srcCid) || 0;
      const srcRec = counts.get(srcCid) || { total:0, byGrade:{9:0,10:0,11:0,12:0} };
      if (!(srcRec.total >= srcCap)) continue; // skip if no longer full after moves

      const srcMin = minima.get(srcCid) || {9:0,10:0,11:0,12:0};

      // Gather candidates in this source who listed target
      // Prefer younger first, then better rank for target than current rank for source
      // and do not move protected
      const candidates = onCampus
        .filter(s => String(s.clubId) === srcCid && !protectedSet.has(String(s.userId)))
        .map(s => ({ uid:String(s.userId), grade: parseInt(s.grade,10)||9, srcCid }))
        .filter(e => (prefs.get(e.uid) || []).some(x => String(x) === targetCid))
        .map(e => {
          const curRank = prefRank(prefs, e.uid, srcCid) || 99;
          const tgtRank = prefRank(prefs, e.uid, targetCid) || 99;
          return { ...e, curRank, tgtRank };
        })
        .filter(e => e.tgtRank <= e.curRank + 4); // allow up to +4 worse rank when rebalancing

      if (!candidates.length) continue;
      // Order: youngest first, then best target rank, then worst current rank
      candidates.sort((a,b)=> (a.grade - b.grade) || (a.tgtRank - b.tgtRank) || (b.curRank - a.curRank));

      for (const cand of candidates) {
        if (need <= 0) break;
        // Check source grade minima won't be violated
        const g = cand.grade;
        const srcNow = counts.get(srcCid) || { total:0, byGrade:{9:0,10:0,11:0,12:0} };
        if ((srcNow.byGrade[g] || 0) <= (srcMin[g] || 0)) continue; // cannot move
        // Check target capacity live
        const tgtNow = counts.get(targetCid) || { total:0, byGrade:{9:0,10:0,11:0,12:0} };
        if (tgtNow.total >= targetCap) break;

        await assignClubToStudent(cand.uid, targetCid);
        // update counts
        srcNow.total = Math.max(0, srcNow.total - 1);
        srcNow.byGrade[g] = Math.max(0, (srcNow.byGrade[g]||0) - 1);
        counts.set(srcCid, srcNow);
        tgtNow.total += 1; tgtNow.byGrade[g] = (tgtNow.byGrade[g]||0) + 1;
        counts.set(targetCid, tgtNow);

        // Update onCampus state for this student
        const sRef = byId.get(cand.uid); if (sRef) sRef.clubId = Number(targetCid);
        need--; targetTotal++;
        totalMoved++;
      }
    }
    if (targetTotal > t.total) clubsAffected++;
  }
  return { totalMoved, clubsAffected };
}

// Final rebalance: from any club to low-capacity targets (< threshold),
// provided the student listed the target club, is not protected, the move
// does not violate source grade minima, and target has capacity.
// Allow up to +4 worse preference rank.
async function rebalanceAnyToLow(protectedSet, threshold = 0.40) {
  const clubs = await fetch(`http://${serverAddress}:3000/getAllClubs`).then(r=>r.json());
  const allStudents = await getStudents();
  const onCampus = allStudents.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const byId = new Map(onCampus.map((s) => [String(s.userId), s]));
  const prefs = new Map(onCampus.map((s) => [String(s.userId), readPrefs(s)]));

  // Build counts and minima
  const counts = new Map(); // cid -> { total, byGrade }
  for (const c of clubs) counts.set(String(c.clubId), { total: 0, byGrade: {9:0,10:0,11:0,12:0} });
  for (const s of onCampus) {
    const cid = s.clubId; if (cid == null || Number(cid) < 0) continue;
    const rec = counts.get(String(cid)); if (!rec) continue;
    rec.total++; const g = parseInt(s.grade,10); if (rec.byGrade[g]!=null) rec.byGrade[g]++;
  }
  const minima = new Map(clubs.map((c) => [String(c.clubId), {
    9: parseInt(c.minSlots9, 10) || 0,
    10: parseInt(c.minSlots10, 10) || 0,
    11: parseInt(c.minSlots11, 10) || 0,
    12: parseInt(c.minSlots12, 10) || 0,
  }]));
  const cap = new Map(clubs.map((c)=>[String(c.clubId), parseInt(c.maxSlots,10)||0]));

  // Targets < threshold
  const targets = clubs
    .map(c=>({ cid:String(c.clubId), cap:cap.get(String(c.clubId))||0, total:(counts.get(String(c.clubId))||{total:0}).total }))
    .filter(x=> x.cap>0 && (x.total/x.cap) < threshold)
    .sort((a,b)=> (a.total/a.cap) - (b.total/b.cap));

  let totalMoved = 0; let clubsAffected = 0;
  const gradesAsc = [9,10,11,12]; // move younger first overall

  for (const t of targets) {
    const targetCid = t.cid; const targetCap = t.cap; let targetTotal = t.total;
    const targetNeeded = Math.min(targetCap, Math.ceil(threshold * targetCap));
    let need = Math.max(0, targetNeeded - targetTotal);
    if (need <= 0) continue;

    // Build global candidate list across all source clubs
    const candidates = onCampus
      .filter(s => s.clubId != null && String(s.clubId) !== targetCid && !protectedSet.has(String(s.userId)))
      .filter(s => (prefs.get(String(s.userId)) || []).some(x => String(x) === targetCid))
      .map(s => {
        const uid = String(s.userId);
        const grade = parseInt(s.grade,10)||9;
        const curCid = String(s.clubId);
        const curRank = prefRank(prefs, uid, curCid) || 99;
        const tgtRank = prefRank(prefs, uid, targetCid) || 99;
        return { uid, grade, curCid, curRank, tgtRank };
      })
      .filter(e => e.tgtRank <= e.curRank + 4); // allow up to +4 worse

    if (!candidates.length) continue;

    // Sort by younger first, then better target rank, then worse current rank
    candidates.sort((a,b)=> (a.grade - b.grade) || (a.tgtRank - b.tgtRank) || (b.curRank - a.curRank));

    let placedHere = 0;
    for (const cand of candidates) {
      if (need <= 0) break;
      // Check source minima and target capacity
      const srcRec = counts.get(cand.curCid) || { total:0, byGrade:{9:0,10:0,11:0,12:0} };
      const srcMin = minima.get(cand.curCid) || {9:0,10:0,11:0,12:0};
      if ((srcRec.byGrade[cand.grade] || 0) <= (srcMin[cand.grade] || 0)) continue; // can't move
      const tgtRec = counts.get(targetCid) || { total:0, byGrade:{9:0,10:0,11:0,12:0} };
      if (tgtRec.total >= targetCap) break;

      await assignClubToStudent(cand.uid, targetCid);
      // Update counts
      srcRec.total = Math.max(0, srcRec.total - 1);
      srcRec.byGrade[cand.grade] = Math.max(0, (srcRec.byGrade[cand.grade]||0) - 1);
      counts.set(cand.curCid, srcRec);
      tgtRec.total += 1; tgtRec.byGrade[cand.grade] = (tgtRec.byGrade[cand.grade]||0) + 1;
      counts.set(targetCid, tgtRec);
      // Update student record
      const sRef = byId.get(cand.uid); if (sRef) sRef.clubId = Number(targetCid);
      need--; targetTotal++;
      placedHere++; totalMoved++;
    }
    if (placedHere > 0) clubsAffected++;
  }

  return { totalMoved, clubsAffected };
}

// As a last resort, place any remaining on-campus students who HAVE preferences
// into any club that still has capacity. Seniors-first ordering. Does not move
// existing students and respects capacity constraints. Students without prefs
// are not touched.
async function forcePlaceRemaining(protectedSet) {
  const clubs = await fetch(`http://${serverAddress}:3000/getAllClubs`).then(r=>r.json());
  const allStudents = await getStudents();
  const onCampus = allStudents.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));

  // Build capacity and current student counts
  const cap = new Map(clubs.map(c => [String(c.clubId), safeInt(c.maxSlots)]));
  const count = new Map();
  for (const c of clubs) {
    const members = await getTeachersOrStudentsInClub(c.clubId, false);
    count.set(String(c.clubId), (members || []).length);
  }

  const unassigned = onCampus.filter(s => s.clubId == null && hasAnyPrefs(s));
  if (!unassigned.length) return { placed: 0, remaining: 0 };

  // Seniors first
  unassigned.sort((a,b) => (parseInt(b.grade,10)||0) - (parseInt(a.grade,10)||0));

  const prefs = new Map(onCampus.map((s) => [String(s.userId), readPrefs(s)]));

  function remaining(cid) { const mx = cap.get(String(cid))||0; const n = count.get(String(cid))||0; return mx - n; }

  let placed = 0;
  for (const s of unassigned) {
    // Try their preferences first (in case capacity changed); else pick any club with most remaining space
    const choices = prefs.get(String(s.userId)) || [];
    let target = choices.find(cid => remaining(cid) > 0);
    if (!target) {
      // pick club with max remaining capacity
      let best = null; let bestRem = -1;
      for (const c of clubs) {
        const cid = String(c.clubId);
        const rem = remaining(cid);
        if (rem > bestRem) { bestRem = rem; best = cid; }
      }
      if (bestRem > 0) target = best;
    }
    if (target) {
      await assignClubToStudent(s.userId, target);
      count.set(String(target), (count.get(String(target))||0) + 1);
      placed++;
    }
  }
  const stillUnassigned = onCampus.filter(ss => ss.clubId == null && hasAnyPrefs(ss)).length - placed;
  return { placed, remaining: Math.max(0, stillUnassigned) };
}

// After all assignment passes, ensure no club exceeds capacity.
// Evict extras with youngest-first policy, then try to re-place evicted students
// by rank (1..5), seniors-first, capacity-only.
async function pruneOverCapacityAndReallocate(protectedSet) {
  const clubs = await fetch(`http://${serverAddress}:3000/getAllClubs`).then((r) => r.json());
  const allStudents = await getStudents();
  const onCampus = allStudents.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const byId = new Map(onCampus.map((s) => [String(s.userId), s]));
  const prefs = new Map(onCampus.map((s) => [String(s.userId), readPrefs(s)]));
  const clubMap = new Map(clubs.map((c) => [String(c.clubId), c]));
  const cap = new Map(clubs.map((c) => [String(c.clubId), parseInt(c.maxSlots, 10) || 0]));
  const minima = new Map(clubs.map((c) => [String(c.clubId), {
    9: parseInt(c.minSlots9, 10) || 0,
    10: parseInt(c.minSlots10, 10) || 0,
    11: parseInt(c.minSlots11, 10) || 0,
    12: parseInt(c.minSlots12, 10) || 0,
  }]));
  const nameOf = (uid) => {
    const st = byId.get(String(uid));
    return st ? `${st.firstName} ${st.lastName}` : `User ${uid}`;
  };
  const clubNameOf = (cid) => {
    const c = clubMap.get(String(cid));
    return c && c.clubName ? c.clubName : `Club ${cid}`;
  };

  // Build current rosters from DB
  const rosterMap = new Map(); // cid -> [studentIds]
  for (const c of clubs) {
    const members = await getTeachersOrStudentsInClub(c.clubId, false);
    const students = (members || []).map(m => m.userId);
    rosterMap.set(String(c.clubId), students.map(String));
  }

  // Evict extras per club
  const evicted = [];
  for (const c of clubs) {
    const cid = String(c.clubId);
    const mx = cap.get(cid) || 0;
    let roster = rosterMap.get(cid) || [];
    if (mx <= 0) {
      for (const uid of roster) { if (!protectedSet.has(String(uid))) { evicted.push({ uid, from: cid }); await assignClubToStudent(uid, null); } }
      rosterMap.set(cid, []);
      continue;
    }
    if (roster.length <= mx) continue;
    let over = roster.length - mx;
    // Build current grade counts
    const gradeCounts = {9:0,10:0,11:0,12:0};
    for (const uid of roster) {
      const s = byId.get(String(uid));
      const g = parseInt(s && s.grade, 10) || 9;
      if (gradeCounts[g] != null) gradeCounts[g]++;
    }
    const req = minima.get(cid) || {9:0,10:0,11:0,12:0};
    // Evict only non-protected and only from grades above their minima
    while (over > 0) {
      const candidates = roster
        .filter((uid) => !protectedSet.has(String(uid)))
        .map((uid) => {
          const s = byId.get(String(uid));
          const g = parseInt(s && s.grade, 10) || 9;
          const r = prefRank(prefs, uid, cid) || 99;
          return { uid: String(uid), g, r };
        })
        .filter((c) => (gradeCounts[c.g] || 0) > (req[c.g] || 0));
      if (!candidates.length) {
        console.log(`Capacity prune halted for ${clubNameOf(cid)}: would violate grade minima or all are protected.`);
        break;
      }
      candidates.sort((a, b) => (a.g - b.g) || (b.r - a.r));
      const v = candidates[0];
      evicted.push({ uid: v.uid, from: cid });
      console.log(`Capacity prune: removing ${nameOf(v.uid)} from ${clubNameOf(cid)} (grade ${v.g}, choice ${rankLabel(v.r)})`);
      await assignClubToStudent(v.uid, null);
      // update state
      const idx = roster.indexOf(String(v.uid)); if (idx>=0) roster.splice(idx,1);
      rosterMap.set(cid, roster);
      gradeCounts[v.g] = Math.max(0, (gradeCounts[v.g]||0) - 1);
      over = roster.length - mx;
    }
  }

  if (!evicted.length) return true;

  // Try to re-place evicted students by rank 1..5, seniors-first, capacity-only
  const gradesOrder = [12, 11, 10, 9];
  const unplaced = new Set(evicted.map(e => String(e.uid)));
  const choiceAt = (uid, r) => {
    const a = prefs.get(String(uid)) || [];
    return a[r-1] ? String(a[r-1]) : null;
  };
  const capacityLeft = async (cid) => {
    const members = await getTeachersOrStudentsInClub(cid, false);
    const mx = cap.get(String(cid)) || 0;
    return mx - ((members || []).length);
  };

  for (let r = 1; r <= 5; r++) {
    for (const g of gradesOrder) {
      // Collect evicted in this grade; no need to shuffle (order is small)
      const list = Array.from(unplaced).filter(uid => {
        const s = byId.get(String(uid));
        return (parseInt(s && s.grade, 10) || 9) === g;
      });
      for (const uid of list) {
        const cid = choiceAt(uid, r);
        if (!cid) continue;
        const left = await capacityLeft(cid);
        if (left > 0) {
          await assignClubToStudent(uid, cid);
          console.log(`Capacity reassign: ${nameOf(uid)} -> ${clubNameOf(cid)} (choice ${r})`);
          unplaced.delete(String(uid));
        }
      }
    }
  }

  // Log any that remain unplaced (should be few)
  if (unplaced.size) {
    for (const uid of Array.from(unplaced)) {
      console.log(`Capacity prune remainder: ${nameOf(uid)} could not be placed within choices (left unassigned)`);
    }
  }
  return true;
}
