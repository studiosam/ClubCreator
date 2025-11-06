const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database.js"); // Import your database functions
const ca = require("./clubAssignment.js");
const app = express();
const bcrypt = require("bcrypt");
const multer = require("multer");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const PORT = 3000;
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("os");
const sqlite3 = require("sqlite3").verbose();
const ip = require("ip");
const serverAddress = ip.address("public");
const content = `const serverAddress = '${serverAddress}'`;
fs.writeFile("./serverVariables.js", content, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Server address: ${serverAddress}`);
  }
});

// Prefix all console logs with local date/time for readability
(() => {
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => {
    try { origLog(`${new Date().toLocaleString()} -`, ...args); } catch (_) { origLog(...args); }
  };
  console.error = (...args) => {
    try { origErr(`${new Date().toLocaleString()} -`, ...args); } catch (_) { origErr(...args); }
  };
})();

// Lightweight logging helpers (stdout only)
function maskEmail(email) {
  try {
    if (!email) return "";
    const parts = String(email).split("@");
    if (parts.length < 2) return String(email);
    const user = parts[0];
    const domain = parts.slice(1).join("@");
    const maskedUser = user.length <= 2 ? `${user.charAt(0)}…` : `${user.slice(0, 2)}…`;
    return `${maskedUser}@${domain}`;
  } catch (_) {
    return "";
  }
}
function shortToken(token) {
  if (!token) return "";
  const t = String(token);
  return t.length <= 10 ? t : `${t.slice(0, 4)}…${t.slice(-4)}`;
}
// Disable structured JSON logs to console, but add a small file logger for specific events
function log() { /* no-op */ }
const logInfo = () => {};
const logWarn = () => {};
const logError = () => {};

// Append a line to a daily password-reset success log
async function logPasswordResetSuccess({ userId, email }) {
  try {
    await ensureBackupsDir();
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const file = `backups/password-reset-success-${day}.log`;
    const line = `${new Date().toLocaleString()} | userId=${userId} | email=${maskEmail(email)}`;
    await fsPromises.appendFile(file, line + "\n", "utf8");
  } catch (e) {
    console.log("Password reset log write failed:", String(e));
  }
}
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fsPromises.access("uploads/");
    } catch (err) {
      if (err && err.code === "ENOENT") {
        await fsPromises.mkdir("uploads/", { recursive: true });
      }
    }
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append the extension
  },
});
const upload = multer({ storage: storage });
// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for allowing cross-origin requests
app.use(cors());

// Assignment snapshots (for one-step rollback)
async function ensureBackupsDir() {
  try { await fsPromises.mkdir("backups", { recursive: true }); } catch (_) {}
}
function tsStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear().toString() + pad(d.getMonth()+1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}
async function snapshotAssignments({ reason = "", affectedUserIds = null } = {}) {
  try {
    await ensureBackupsDir();
    let users = await db.getAllUsers();
    if (Array.isArray(affectedUserIds) && affectedUserIds.length) {
      const set = new Set(affectedUserIds.map(String));
      users = users.filter((u) => set.has(String(u.userId)));
    }
    const entries = users.map((u) => ({ userId: u.userId, clubId: u.clubId, isTeacher: !!u.isTeacher }));
    const payload = { type: "clubAssignmentsSnapshot", createdAt: new Date().toISOString(), reason, total: entries.length, entries };
    const file = `backups/assignments-${tsStamp()}.json`;
    await fsPromises.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
    console.log(`Snapshot saved: ${file} (entries: ${entries.length})`);
  } catch (e) {
    console.log("Snapshot failed:", String(e));
  }
}

// ------------------------------
// Gentle in-memory rate limiting
// ------------------------------
const loginRate = new Map(); // key: email -> { fails: number[], blockUntil: number }
const resetRate = new Map(); // key: email -> { tries: number[], blockUntil: number }

const LOGIN_WINDOW_MS = 60 * 1000; // 1 minute
const LOGIN_MAX_ATTEMPTS = 5; // free attempts per minute
const LOGIN_BASE_COOLDOWN_MS = 30 * 1000; // +30s per attempt beyond threshold
const LOGIN_MAX_COOLDOWN_MS = 5 * 60 * 1000; // cap at 5 minutes

const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RESET_MAX_ATTEMPTS = 3;
const RESET_BASE_COOLDOWN_MS = 5 * 60 * 1000; // +5 minutes per extra
const RESET_MAX_COOLDOWN_MS = 15 * 60 * 1000; // cap at 15 minutes

function secondsLeft(ts) {
  return Math.max(0, Math.ceil((ts - Date.now()) / 1000));
}
function pruneWindow(arr, windowMs) {
  const cutoff = Date.now() - windowMs;
  return arr.filter((t) => t > cutoff);
}
function loginPrecheck(email) {
  const key = String(email || '').toLowerCase();
  const rec = loginRate.get(key);
  if (rec && rec.blockUntil && rec.blockUntil > Date.now()) {
    return secondsLeft(rec.blockUntil);
  }
  return 0;
}
function registerLoginFailure(email) {
  const key = String(email || '').toLowerCase();
  const rec = loginRate.get(key) || { fails: [], blockUntil: 0 };
  rec.fails = pruneWindow([ ...(rec.fails||[]), Date.now() ], LOGIN_WINDOW_MS);
  if (rec.fails.length > LOGIN_MAX_ATTEMPTS) {
    const over = rec.fails.length - LOGIN_MAX_ATTEMPTS;
    const cooldown = Math.min(LOGIN_BASE_COOLDOWN_MS * over, LOGIN_MAX_COOLDOWN_MS);
    rec.blockUntil = Date.now() + cooldown;
  }
  loginRate.set(key, rec);
  return rec.blockUntil ? secondsLeft(rec.blockUntil) : 0;
}
function registerLoginSuccess(email) {
  const key = String(email || '').toLowerCase();
  loginRate.delete(key);
}
function resetPrecheck(email) {
  const key = String(email || '').toLowerCase();
  const rec = resetRate.get(key);
  if (rec && rec.blockUntil && rec.blockUntil > Date.now()) {
    return secondsLeft(rec.blockUntil);
  }
  return 0;
}
function registerResetTry(email) {
  const key = String(email || '').toLowerCase();
  const rec = resetRate.get(key) || { tries: [], blockUntil: 0 };
  rec.tries = pruneWindow([ ...(rec.tries||[]), Date.now() ], RESET_WINDOW_MS);
  if (rec.tries.length > RESET_MAX_ATTEMPTS) {
    const over = rec.tries.length - RESET_MAX_ATTEMPTS;
    const cooldown = Math.min(RESET_BASE_COOLDOWN_MS * over, RESET_MAX_COOLDOWN_MS);
    rec.blockUntil = Date.now() + cooldown;
  }
  resetRate.set(key, rec);
  return rec.blockUntil ? secondsLeft(rec.blockUntil) : 0;
}

//API endpoint to get the teacher info
app.get("/getUserInfo", async (req, res) => {
  try {
    let email = req.query.email;
    let userId = req.query.userId;
    if (userId) {
      const user = await db.getUserInfo(userId, "userId");
      if (user !== undefined) {
        res.send(user)
      };
    } else if (email) {
      const user = await db.getUserInfo(email, "email");
      if (user !== undefined) {
        res.send(user);
      }

    } else {
      res
        .status(400)
        .send({ body: "Bad Request: Either userId or email must be provided." });
    }
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).send({ body: "Error fetching user info" });
  }
});

//API endpoint to get the student info
app.get("/getAllStudents", async (req, res) => {
  try {
    let isTeacher = false;
    const student = await db.getAllTeachersOrStudents(isTeacher);
    res.send(student);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching students");
  }
});

// Students with no club preferences selected
app.get("/students/no-preferences", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "userId"; // userId, firstName, lastName, email, grade, room, clubId
    const sortDirection = req.query.sortDirection === "desc" ? "DESC" : "ASC";

    const { users, total } = await db.getStudentsWithoutPreferencesPagination(
      page,
      limit,
      search,
      sortBy,
      sortDirection
    );
    const totalPages = Math.ceil(total / limit);
    res.send({ users, total, totalPages });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Error fetching students without preferences");
  }
});

// Students assigned to a club that is NOT in their preference list (admin only)
app.get("/students/assigned-not-in-list", async (req, res) => {
  try {
    const level = coerceAdminLevel(req.query && req.query.isAdmin);
    if (level < 1) return res.status(403).send({ body: 'Error', error: 'Not authorized' });

    const students = await db.getAllTeachersOrStudents(false);
    const clubs = await db.getAllClubs();
    const clubById = new Map((clubs || []).map(c => [String(c.clubId), c]));

    const normalizePrefs = (s) => {
      try {
        const arr = String(s.clubPreferences || '')
          .split(',')
          .map(v => String(v).trim())
          .filter(v => v && v !== '0');
        // de-duplicate
        const out = []; const seen = new Set();
        for (const id of arr) { if (!seen.has(id)) { seen.add(id); out.push(id); } }
        return out;
      } catch (_) { return []; }
    };

    const isOffCampus = (cid) => (typeof cid === 'number' && cid < 0);

    const list = [];
    for (const s of students) {
      const cid = s.clubId;
      if (cid == null) continue; // not assigned
      if (isOffCampus(cid)) continue; // ignore off-campus
      const prefs = normalizePrefs(s);
      const assignedKey = String(cid);
      const inList = prefs.some(p => String(p) === assignedKey);
      if (!inList) {
        const club = clubById.get(assignedKey);
        list.push({
          userId: s.userId,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          grade: s.grade,
          clubId: cid,
          clubName: club ? club.clubName : null,
          preferences: prefs
        });
      }
    }

    // Enrich with latest preferences set time from logs
    try {
      const latestMap = await getLatestPrefsMap();
      for (const r of list) {
        const k = String(r.userId);
        if (latestMap.has(k)) r.prefsLastSetAt = latestMap.get(k);
      }
    } catch (_) {}

    // sort by lastName then firstName
    list.sort((a,b)=> String(a.lastName||'').localeCompare(String(b.lastName||'')) || String(a.firstName||'').localeCompare(String(b.firstName||'')));

    res.send({ total: list.length, users: list });
  } catch (e) {
    res.status(500).send({ body: 'Error', error: 'Failed to compute list' });
  }
});

// Build latest preferences-set timestamp per userId by scanning JSONL and PM2 logs
async function getLatestPrefsMap() {
  const map = new Map(); // userId -> ISO string
  const upd = (uid, tsStr) => {
    if (!uid || !tsStr) return;
    let t = Date.parse(tsStr);
    if (!Number.isFinite(t)) {
      // Try to parse locale date like "10/23/2025, 1:12:03 PM"
      const d = new Date(tsStr);
      t = d && !isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (!t) return;
    const prev = map.get(String(uid));
    if (!prev || Date.parse(prev) < t) map.set(String(uid), new Date(t).toISOString());
  };

  try {
    await ensureBackupsDir();
    const files = await fsPromises.readdir('backups');
    const targets = files.filter(f => typeof f === 'string' && f.startsWith('prefs-history-') && f.endsWith('.log'))
                         .sort().reverse();
    for (const f of targets) {
      try {
        const raw = await fsPromises.readFile(`backups/${f}`, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const rec = JSON.parse(lines[i]);
            upd(rec && rec.userId, rec && rec.ts);
          } catch (_) {}
        }
      } catch (_) {}
    }
  } catch (_) {}

  // PM2 logs
  try {
    const logDir = process.env.PM2_LOG_DIR || (os.homedir ? (os.homedir() + (os.platform()==='win32' ? "\\.pm2\\logs" : "/.pm2/logs")) : "");
    if (logDir) {
      const lfiles = await fsPromises.readdir(logDir);
      const logTargets = lfiles.filter(f => /\.log$/i.test(f)).sort().reverse();
      for (const f of logTargets) {
        try {
          const raw = await fsPromises.readFile(path.join(logDir, f), 'utf8');
          const lines = raw.split(/\r?\n/).filter(l => l.includes('Set Club Prefs:'));
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            const m = line.match(/^(.*?)\s+-\s+Set Club Prefs: studentId\s+(\d+)\s+count\s+\d+\s+ids\s+([0-9,\s]+)/);
            if (!m) continue;
            const when = m[1].trim();
            const uid = m[2];
            upd(uid, when);
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
  return map;
}

// Chronic no-shows (admin only)
// Flags students whose absences > minMisses and absenceRate >= minRate (%),
// computed over all attendance, or limited by ?since=YYYY-MM-DD or ?days=N
app.get("/students/chronic-no-shows", async (req, res) => {
  try {
    const level = coerceAdminLevel(req.query && req.query.isAdmin);
    if (level < 1) return res.status(403).send({ body: 'Error', error: 'Not authorized' });

    const minMisses = Math.max(1, parseInt(req.query.minMisses, 10) || 3);
    // Optional: only apply minRate if provided explicitly
    const hasMinRate = req.query && Object.prototype.hasOwnProperty.call(req.query, 'minRate');
    const minRate = hasMinRate ? Math.min(100, Math.max(0, parseInt(req.query.minRate, 10) || 0)) : null;
    // Optional time window: ?since=YYYY-MM-DD or ?days=N (relative to today)
    const sinceParam = (req.query && req.query.since) ? String(req.query.since) : null;
    const daysParam = (req.query && req.query.days) ? parseInt(req.query.days, 10) : null;

    const rowsAll = await db.getAllAttendanceRecords();
    // Filter rows by date window if provided
    let rows = Array.isArray(rowsAll) ? rowsAll.slice() : [];
    const asDateStr = (dt) => {
      try {
        const d = new Date(dt);
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const da = String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${da}`;
      } catch(_) { return String(dt||''); }
    };
    let sinceDate = null;
    if (sinceParam && /^\d{4}-\d{2}-\d{2}$/.test(sinceParam)) {
      sinceDate = sinceParam;
    } else if (Number.isInteger(daysParam) && daysParam > 0) {
      const now = new Date();
      now.setDate(now.getDate() - (daysParam - 1));
      sinceDate = asDateStr(now);
    }
    if (sinceDate) {
      rows = rows.filter(r => String(r.date||'') >= sinceDate);
    }

    // Build unique set of club days across filtered rows
    const clubDays = new Set(rows.map(r => String(r.date||'').trim()).filter(Boolean));

    // Per-student aggregated counts with per-day tracking
    // userId -> { present, absent, lastPresent, dates: Set<date> }
    const counts = new Map();
    const norm = (raw) => String(raw||'').split(',').map(s=>s.trim()).filter(Boolean);
    for (const r of rows) {
      const d = String(r.date||'');
      const present = norm(r.studentsPresent);
      const absent = norm(r.studentsAbsent);
      for (const uid of present) {
        const rec = counts.get(uid) || { present:0, absent:0, lastPresent:null, dates:new Set() };
        rec.present++;
        rec.lastPresent = d && (!rec.lastPresent || d > rec.lastPresent) ? d : rec.lastPresent;
        if (d) rec.dates.add(d);
        counts.set(uid, rec);
      }
      for (const uid of absent) {
        const rec = counts.get(uid) || { present:0, absent:0, lastPresent:null, dates:new Set() };
        rec.absent++;
        // Do not update lastPresent on absences; we only track last present date
        if (d) rec.dates.add(d);
        counts.set(uid, rec);
      }
    }

    const students = await db.getAllTeachersOrStudents(false);

    const flagged = [];
    for (const s of students) {
      if (!s || s.isTeacher) continue; // students only
      const uid = String(s.userId);
      const base = counts.get(uid) || { present:0, absent:0, lastPresent:null, dates:new Set() };
      // Consider only on-campus students for unassigned counting (negative clubId = off-campus/opt-out)
      const onCampus = !(typeof s.clubId === 'number' && s.clubId < 0);
      const isUnassigned = onCampus && (s.clubId == null);
      let unassignedExtra = 0;
      if (isUnassigned) {
        const recordedDays = (base.dates && typeof base.dates.size === 'number') ? base.dates.size : 0;
        unassignedExtra = Math.max(0, clubDays.size - recordedDays);
      }
      const totalAbsent = (base.absent || 0) + unassignedExtra;
      const totalPresent = base.present || 0;
      const total = totalAbsent + totalPresent;
      if (!total) continue; // no club days under consideration
      const rate = Math.round((totalAbsent / total) * 100);
      const meetsMisses = totalAbsent >= minMisses;
      const meetsRate = (minRate == null) ? true : (rate >= minRate);
      if (meetsMisses && meetsRate) {
        flagged.push({
          userId: s.userId,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          grade: s.grade,
          clubId: s.clubId,
          present: totalPresent,
          absent: totalAbsent,
          unassignedAbsent: unassignedExtra,
          absenceRate: rate,
          lastDate: base.lastPresent
        });
      }
    }

    flagged.sort((a,b)=> (b.absenceRate - a.absenceRate) || (b.absent - a.absent) || String(a.lastName||'').localeCompare(String(b.lastName||'')) );

    res.send({
      generatedAt: new Date().toISOString(),
      thresholds: { minMisses, minRate: (minRate==null? undefined : minRate) },
      totalFlagged: flagged.length,
      items: flagged
    });
  } catch (e) {
    res.status(500).send({ body: 'Error', error: 'Failed to compute chronic no-shows' });
  }
});

// Students who are on-campus, have preferences, but are currently unassigned (admin only)
app.get("/students/unassigned-with-preferences", async (req, res) => {
  try {
    const level = coerceAdminLevel(req.query && req.query.isAdmin);
    if (level < 1) return res.status(403).send({ body: 'Error', error: 'Not authorized' });
    const students = await db.getAllTeachersOrStudents(false);
    const onCampus = students.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
    const unassigned = onCampus.filter((s) => s.clubId == null);
    const withPrefs = unassigned.filter((s) => {
      try { return !!(s && s.clubPreferences && String(s.clubPreferences).trim().length); } catch (_) { return false; }
    });
    res.send({ total: withPrefs.length, students: withPrefs });
  } catch (e) {
    res.status(500).send({ body: 'Error', error: 'Failed to fetch list' });
  }
});
app.get("/getAllStudentsPagination", async (req, res) => {
  try {
    let isTeacher = false;
    const student = await db.getAllTeachersOrStudentsPagination(isTeacher);

    res.json(student);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching students");
  }
});

app.get("/getAllUsers", async (req, res) => {
  try {
    let isTeacher = req.query.isTeacher || false;
    const users = await db.getAllTeachersOrStudents(isTeacher);

    res.json(users);
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching Users");
  }
});

app.get("/get-cosponsors/:club", async (req, res) => {
  try {
    const club = req.params.club;
    const cosponsors = await db.getCoSponsors(club);
    // console.log(cosponsors)
    res.send({ cosponsors: cosponsors });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /get-cosponsors/:club failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/get-students-in-club/:club", async (req, res) => {
  try {
    const club = req.params.club;
    const students = await db.getTeachersOrStudentsInClub(club, false);
    // console.log(cosponsors)
    res.send({ students });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /get-students-in-club/:club failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// API endpoint to get the list of clubs
app.get("/getUnapprovedClubs", async (req, res) => {
  try {
    const unApprovedClubs = await db.getUnapprovedClubs();
    res.json(unApprovedClubs);
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /getUnapprovedClubs failed: ${String(err)} at ${ts}`);
    res.send({ body: "Error fetching clubs" });
  }
});

app.get("/getAllClubs", async (req, res) => {
  try {
    const allClubs = await db.getAllClubs();
    res.send(allClubs);
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /getAllClubs failed: ${String(err)} at ${ts}`);
    res.send({ body: "Error fetching clubs" });
  }
});

// Fast clubs summary for clubsList: one request with teacher name and assigned counts
app.get("/clubs/summary", async (req, res) => {
  try {
    const clubs = await db.getAllClubs();
    const users = await db.getAllUsers(); // teachers + students
    const byId = new Map(users.map(u => [String(u.userId), u]));
    const students = users.filter(u => !u.isTeacher);
    const counts = new Map();
    for (const s of students) {
      const cid = s && s.clubId;
      if (cid == null) continue;
      const key = String(cid);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const summary = clubs.map(c => {
      const teacher = byId.get(String(c.primaryTeacherId)) || {};
      const assigned = counts.get(String(c.clubId)) || 0;
      const maxSlots = parseInt(c.maxSlots, 10);
      return {
        clubId: c.clubId,
        clubName: c.clubName,
        room: c.room || null,
        primaryTeacherId: c.primaryTeacherId,
        teacherFirstName: teacher.firstName || null,
        teacherLastName: teacher.lastName || null,
        maxSlots: Number.isNaN(maxSlots) ? null : maxSlots,
        assigned
      };
    });
    res.send({ clubs: summary });
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /clubs/summary failed: ${String(err)} at ${ts}`);
    res.status(500).send({ body: "Error fetching summary" });
  }
});

// Preferences completion stats for on-campus students
app.get("/stats/preferences-on-campus", async (req, res) => {
  try {
    const { total, withPrefs } = await db.getOnCampusPreferencesStats();
    const percent = total > 0 ? Math.round((withPrefs / total) * 100) : 0;
    res.send({ total, withPrefs, percent });
  } catch (e) {
    res.status(500).send({ body: "Error", error: "Failed to compute stats" });
  }
});

// Compute assignment metrics (overall, by grade, by club)
async function computeAssignmentMetrics() {
  // Load data
  const students = await db.getAllTeachersOrStudents(false);
  const teachers = await db.getAllTeachersOrStudents(true);
  const clubs = await db.getAllClubs();
  const clubMap = new Map((clubs || []).map((c) => [String(c.clubId), c]));

  // Helpers
  const normalizePrefs = (s) => {
    try {
      return String(s.clubPreferences || "")
        .split(",")
        .map((v) => String(v).trim())
        .filter((v) => v && v !== "0");
    } catch (_) { return []; }
  };
  const rankOf = (prefs, cid) => {
    const i = prefs.findIndex((x) => String(x) === String(cid));
    return i >= 0 ? i + 1 : 0; // 1..5, 0 means not in list
  };
  const grades = [9,10,11,12];

  // Demand by club and rank
  const demand = new Map(); // clubId -> {1:count,...5}
  for (const s of students) {
    if (typeof s.clubId === 'number' && s.clubId < 0) continue; // off-campus not part of demand
    const prefs = normalizePrefs(s);
    for (let r=1; r<=5; r++) {
      const cid = prefs[r-1];
      if (!cid) continue;
      const key = String(cid);
      const d = demand.get(key) || {1:0,2:0,3:0,4:0,5:0};
      d[r]++;
      demand.set(key, d);
    }
  }

  // Assignment stats
  const onCampus = students.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
  const assigned = onCampus.filter((s) => s.clubId != null);
  const unassigned = onCampus.filter((s) => s.clubId == null);
  const offCampus = students.filter((s) => typeof s.clubId === 'number' && s.clubId < 0);

  const ranks = [];
  const byGrade = new Map(); // grade -> {count, rankCounts, notInList, assigned}
  for (const s of assigned) {
    const prefs = normalizePrefs(s);
    const r = rankOf(prefs, s.clubId);
    ranks.push(r);
    const g = String(s.grade || '');
    const rec = byGrade.get(g) || { assigned:0, rankCounts:{1:0,2:0,3:0,4:0,5:0,0:0} };
    rec.assigned++;
    if (r>=1 && r<=5) rec.rankCounts[r]++;
    else rec.rankCounts[0]++;
    byGrade.set(g, rec);
  }

  const pct = (num, den) => (den > 0 ? Math.round((num/den)*100) : 0);
  const top1 = ranks.filter((r) => r===1).length;
  const top2 = ranks.filter((r) => r>0 && r<=2).length;
  const top3 = ranks.filter((r) => r>0 && r<=3).length;
  const notIn = ranks.filter((r) => r===0).length;
  const positiveRanks = ranks.filter(r=>r>0);
  const avgRank = positiveRanks.length ? (positiveRanks.reduce((a,b)=>a+b,0)/positiveRanks.length) : 0;
  const sortedRanks = ranks.filter(r=>r>0).sort((a,b)=>a-b);
  const medianRank = sortedRanks.length ? sortedRanks[Math.floor((sortedRanks.length-1)/2)] : 0;
  // Satisfaction index (1:100,2:80,3:60,4:40,5:20, else 0)
  const score = (r) => r===1?100:r===2?80:r===3?60:r===4?40:r===5?20:0;
  const satisfaction = ranks.length ? Math.round(sortedRanks.concat(ranks.filter(r=>r===0)).reduce((a,r)=>a+score(r),0)/ranks.length) : 0;

  // Build teacher counts per club (advisors/co-sponsors assigned to a club)
  const teacherCounts = new Map(); // clubId -> count
  try {
    for (const t of (teachers || [])) {
      const cid = t && t.clubId;
      if (cid == null) continue;
      if (typeof cid === 'number' && cid < 0) continue; // ignore negative/off-campus codes
      const key = String(cid);
      teacherCounts.set(key, (teacherCounts.get(key) || 0) + 1);
    }
  } catch (_) {}

  // Per-club stats
  const byClub = [];
  for (const c of clubs) {
    const cid = String(c.clubId);
    const roster = assigned.filter((s) => Number(s.clubId) === Number(c.clubId));
    const cap = parseInt(c.maxSlots,10); const capN = Number.isNaN(cap)?0:cap;
    const fillRatio = capN ? Math.round((roster.length/capN)*100) : null;
    const d = demand.get(cid) || {1:0,2:0,3:0,4:0,5:0};
    const gradeMix = {9:0,10:0,11:0,12:0};
    roster.forEach((s)=>{ const g=parseInt(s.grade,10); if(gradeMix[g]!=null) gradeMix[g]++; });
    const meetsMin = {
      9: capBool(gradeMix[9], c.minSlots9),
      10: capBool(gradeMix[10], c.minSlots10),
      11: capBool(gradeMix[11], c.minSlots11),
      12: capBool(gradeMix[12], c.minSlots12)
    };
    const tCount = teacherCounts.get(cid) || 0;
    const studentsPerTeacher = tCount > 0 ? Number((roster.length / tCount).toFixed(1)) : null;
    byClub.push({
      clubId: c.clubId,
      clubName: c.clubName,
      assigned: roster.length,
      capacity: capN,
      fillRatio,
      demand: d,
      gradeMix,
      meetsMin,
      teacherCount: tCount,
      studentsPerTeacher
    });
  }

  function capBool(actual, minReq) {
    const m = parseInt(minReq,10); if (Number.isNaN(m) || m<=0) return true; return actual >= m;
  }

  // Overall teacher coverage and student/teacher ratio (for clubs that have teachers)
  const totalTeachersWithClubs = Array.from(teacherCounts.values()).reduce((a,b)=>a+b,0);
  const overallStudentsPerTeacher = totalTeachersWithClubs>0 ? Number((assigned.length/totalTeachersWithClubs).toFixed(1)) : null;

  const out = {
    generatedAt: new Date().toISOString(),
    totals: {
      students: students.length,
      onCampus: onCampus.length,
      assigned: assigned.length,
      unassigned: unassigned.length,
      offCampus: offCampus.length,
      top1Rate: pct(top1, assigned.length),
      top2Rate: pct(top2, assigned.length),
      top3Rate: pct(top3, assigned.length),
      notInListRate: pct(notIn, assigned.length),
      avgRank: Number.isFinite(avgRank) ? Number(avgRank.toFixed(2)) : 0,
      medianRank,
      satisfaction,
      teachers: totalTeachersWithClubs,
      studentsPerTeacher: overallStudentsPerTeacher
    },
    byGrade: Array.from(byGrade.entries()).map(([g, rec]) => ({
      grade: g,
      assigned: rec.assigned,
      top1Rate: pct(rec.rankCounts[1], rec.assigned),
      top2Rate: pct(rec.rankCounts[1]+rec.rankCounts[2], rec.assigned),
      top3Rate: pct(rec.rankCounts[1]+rec.rankCounts[2]+rec.rankCounts[3], rec.assigned),
      notInListRate: pct(rec.rankCounts[0], rec.assigned)
    })),
    byClub
  };
  return out;
}

// Save metrics to backups and 'latest' file
async function saveMetricsSnapshot(metrics) {
  try { await fsPromises.mkdir('backups', { recursive: true }); } catch (_) {}
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const latest = 'backups/metrics-latest.json';
  const file = `backups/metrics-${ts}.json`;
  await fsPromises.writeFile(file, JSON.stringify(metrics, null, 2), 'utf-8');
  await fsPromises.writeFile(latest, JSON.stringify(metrics, null, 2), 'utf-8');
  return { file };
}

// Run metrics now (admin only)
function coerceAdminLevel(v) {
  if (v === true || v === 'true') return 1;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

app.post('/admin-metrics/run', async (req, res) => {
  try {
    const raw = req.body && req.body.isAdmin;
    const level = coerceAdminLevel(raw);
    if (level < 1) return res.status(403).send({ body: 'Error', error: 'Not authorized' });
    const m = await computeAssignmentMetrics();
    const { file } = await saveMetricsSnapshot(m);
    res.send({ body: 'Success', metrics: m, file });
  } catch (e) {
    res.status(500).send({ body: 'Error', error: 'Failed to compute metrics' });
  }
});

// Fetch latest metrics (admin only)
app.get('/admin-metrics/latest', async (req, res) => {
  try {
    const adminParam = req.query && req.query.isAdmin;
    const level = coerceAdminLevel(adminParam);
    if (level < 1) return res.status(403).send({ body: 'Error', error: 'Not authorized' });
    const latest = 'backups/metrics-latest.json';
    let fileRaw = null;
    try { fileRaw = await fsPromises.readFile(latest, 'utf-8'); } catch (_) {}
    if (fileRaw) {
      try { return res.send(JSON.parse(fileRaw)); } catch (_) {}
    }
    // Compute fresh if no latest
    const m = await computeAssignmentMetrics();
    await saveMetricsSnapshot(m);
    res.send(m);
  } catch (e) {
    res.status(500).send({ body: 'Error', error: 'Failed to load metrics' });
  }
});

app.get("/getClubById", async (req, res) => {
  try {
    const clubId = req.query.club;
    const clubInfo = await db.getClubInfo(clubId);
    res.json(clubInfo);
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /getClubById failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/club-info/:club", async (req, res) => {
  try {
    let clubId = parseInt(req.params.club);

    if (req.query.view) {
      //console.log(req.query);
      const clubInfo = await db.getClubInfo(clubId);
      const getAllStudents = await db.getAllUsers();

    const getClubStudents = getAllStudents.filter(
        (user) => Number(user.clubId) === Number(clubId) && !user.isTeacher
      );

      res.send({ clubInfo: clubInfo, clubStudents: getClubStudents });
    } else {
      res.redirect(`http://${serverAddress}/club-info.html?club-id=${clubId}`);
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /club-info/:club failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/users/delete/:id", async (req, res) => {
  try {
    const level = coerceAdminLevel(req.query && req.query.isAdmin);
    if (level < 1) return res.status(403).send({ body: "Error", error: "Not authorized" });
    let userId = req.params.id;
    const ts = new Date().toLocaleString();
    console.log(`Delete User Attempt: userId ${userId}`);
    const deleted = await db.deleteUser(userId);
    if (deleted) {
      console.log(`Delete User Success: userId ${userId}`);
      res.send({ body: "Success" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /users/delete/:id failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.get("/usersInfo/:user", async (req, res) => {
  try {
    let userId = req.params.user;
    const user = await db.getUser(userId);
    res.json(user);
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /usersInfo/:user failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
})

app.get("/users/update/:user/:club/", async (req, res) => {
  try {
    let userId = req.params.user;
    let clubId = req.params.club;
    const ts = new Date().toLocaleString();
    console.log(`Assign Club Attempt: userId ${userId} clubId ${clubId}`);
    const club = await db.getClubInfo(clubId);
    const user = await db.getUser(userId);
    // If target is a student, require admin; allow teacher self-assignment as before
    const level = coerceAdminLevel(req.query && req.query.isAdmin);
    if (!user || !user.isTeacher) {
      if (level < 1) return res.status(403).send({ body: "Error", error: "Not authorized" });
    }
    const actorId = (req.query && req.query.actorId) || null;
    const beforeClub = user ? user.clubId : null;
    await snapshotAssignments({ reason: `before users/update ${userId} -> ${clubId}`, affectedUserIds: [userId] });
    const allClubs = await db.getAllClubs();
    allClubs.forEach(async (club) => {
      if (club.primaryTeacherId === user.userId) {
        await db.updateClubValue(club.clubId, "primaryTeacherId", null);
        await db.updateClubValue(club.clubId, "isApproved", false);
      }
    }
    );

    const added = await db.assignClub(userId, clubId, user.isTeacher);
    if (added) {
      console.log(`Assign Club Success: userId ${user.userId} clubId ${clubId}`);
      try { await logAssignmentHistory({ actorId, targetUserId: user.userId, beforeClubId: beforeClub, afterClubId: clubId, actorLevel: level, route: '/users/update' }); } catch (_) {}
      res.send({ body: true, club });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /users/update/:user/:club failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.get("/users/updateStudentClub/:user/:club", async (req, res) => {
  try {
    const level = coerceAdminLevel(req.query && req.query.isAdmin);
    if (level < 1) return res.status(403).send({ body: "Error", error: "Not authorized" });
    let userId = req.params.user;
    let clubId = req.params.club;
    const ts = new Date().toLocaleString();
    console.log(`Assign Student Club Attempt: userId ${userId} clubId ${clubId}`);
    await snapshotAssignments({ reason: `before users/updateStudentClub ${userId} -> ${clubId}`, affectedUserIds: [userId] });
    const actorId = (req.query && req.query.actorId) || null;
    let beforeClub = null; try { const u = await db.getUser(userId); beforeClub = u && u.clubId; } catch (_) {}
    const added = await db.assignClubToStudent(userId, clubId);

    if (added) {
      console.log(`Assign Student Club Success: userId ${userId} clubId ${clubId}`);
      try { await logAssignmentHistory({ actorId, targetUserId: userId, beforeClubId: beforeClub, afterClubId: clubId, route: '/users/updateStudentClub' }); } catch (_) {}
      res.send({ body: "Success" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /users/updateStudentClub/:user/:club failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.get("/users/:type", async (req, res) => {
  try {
    let isTeacher = false;
    let userType = req.params.type;
    if (userType === "teachers") {
      isTeacher = true;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "userId";
    const sortDirection = req.query.sortDirection === "desc" ? "DESC" : "ASC";

    try {
      const { users, total } = await db.getAllTeachersOrStudentsPagination(
        isTeacher,
        page,
        limit,
        search,
        sortBy,
        sortDirection
      );
      const totalPages = Math.ceil(total / limit);

      res.send({ users, total, totalPages });
    } catch (err) {
      console.error("Error: ", err);
      res.status(500).send("Error fetching Users");
    }
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Error fetching Users");
  }
});

app.post("/deleteClub", async (req, res) => {
  try {
    const clubId = req.body.clubId;
    const ts = new Date().toLocaleString();
    console.log(`Delete Club Attempt: clubId ${clubId}`);
    const allUsers = await db.getAllUsersInClub(clubId);
    const usersInClub = allUsers.filter((user) => user.clubId === clubId);
    await snapshotAssignments({ reason: `before deleteClub ${clubId}`, affectedUserIds: usersInClub.map(u => u.userId) });
    const deleted = await db.deleteClub(clubId);
    if (deleted) {
      console.log(`Delete Club Success: clubId ${clubId}`);
      usersInClub.forEach(async (user) => {
        await db.updateUserValue(user.userId, "clubId", null);
      });

      res.send({ body: "Success" });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /deleteClub failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/approveClub", async (req, res) => {
  try {
    const clubInfo = req.body;
    const ts = new Date().toLocaleString();
    console.log(`Approve Club Attempt: clubId ${clubInfo.clubId}`);

    await db.approveClub(clubInfo.clubId);

    console.log(`Approve Club Success: clubId ${clubInfo.clubId}`);
    res.send({ body: "Success", clubInfo });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /approveClub failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/updateClub", async (req, res) => {
  try {
    const changeData = req.body;
    const ts = new Date().toLocaleString();
    console.log(`Update Club Attempt: clubId ${changeData.clubId}`);
    if (changeData.addedCoSponsor) {
      await db.updateUserValue(
        parseInt(changeData.addedCoSponsor),
        "clubId",
        changeData.clubId
      );
    }
    if (changeData.removedCoSponsor) {
      await db.updateUserValue(
        parseInt(changeData.removedCoSponsor),
        "clubId",
        null
      );
    }
    const clubInfo = await db.getClubInfo(changeData.clubId);
    const teacherIdToNull = clubInfo.primaryTeacherId;
    await db.removeClubFromUser(teacherIdToNull);
    if (changeData.isApproved === "true") {
      changeData.isApproved = true;
    } else if (changeData.isApproved === "false") {
      changeData.isApproved = false;
    }
    const success = await db.updateClub(changeData);

    if (success) {
      console.log(`Update Club Success: clubId ${changeData.clubId}`);
      res.send({ body: "Success", changeData });
    } else {
      res.send("Error");
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /updateClub failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/submit-attendance", async (req, res) => {
  try {
    const { presentStudents, absentStudents, clubId, date, submittedBy, submittedByName } = req.body;
    const ts = new Date();
    const tsLocal = ts.toLocaleString();
    console.log(`Submit Attendance: clubId ${clubId} date ${date} by ${submittedBy || 'unknown'}`);
    const success = await db.submitAttendance(
      presentStudents,
      absentStudents,
      clubId,
      date
    );
    if (success) {
      console.log(`Submit Attendance Success: clubId ${clubId} date ${date} by ${submittedBy || 'unknown'}`);
      res.send({ body: "Success", savedAt: tsLocal, submittedBy, submittedByName });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const timestamp = new Date().toLocaleString();
    console.log(`Route /submit-attendance failed: ${String(e)} at ${timestamp}`);
    res.send({ body: "Error" });
  }
});

app.get("/check-attendance/:club/:date", async (req, res) => {
  try {
    const clubId = req.params.club;

    const date = req.params.date;
    const ts = new Date().toLocaleString();
    console.log(`Check Attendance: clubId ${clubId} date ${date}`);

    const students = await db.checkAttendance(clubId, date);

    if (students) {
      console.log(`Check Attendance Success: clubId ${clubId} date ${date}`);
      res.send({ body: "Success", students: students });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /check-attendance/:club/:date failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/updateUser", async (req, res) => {
  try {
    const changeData = req.body;
    const ts = new Date().toLocaleString();
    console.log(`Update User Attempt: userId ${changeData.userId || changeData.id || 'unknown'}`);
    const updateUser = await db.updateUser(changeData);
    if (updateUser === "Success") {
      console.log(`Update User Success: userId ${changeData.userId || changeData.id || 'unknown'}`);
      res.send({ body: "Success", updatedUserData: updateUser });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /updateUser failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/setClubPrefs", async (req, res) => {
  try {
    const clubPrefs = req.body.clubOrder;
    const studentId = req.body.student;
    const ts = new Date().toLocaleString();
    const idsArray = Array.isArray(clubPrefs)
      ? clubPrefs
      : (clubPrefs || '')
          .toString()
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
    const idsJoined = idsArray.join(',');
    console.log(`Set Club Prefs: studentId ${studentId} count ${idsArray.length} ids ${idsJoined}`);
    // Load previous record for logging
    let before = null;
    try { before = await db.getUser(studentId); } catch (_) {}
    const updateUser = await db.updateClubPrefs(clubPrefs, studentId);
    // Append to preferences history log (JSONL per month)
    try {
      const after = before ? { ...before, clubPreferences: idsJoined } : null;
      await logPreferencesHistory({ studentId, beforePrefs: before && before.clubPreferences, afterPrefs: idsJoined });
    } catch (_) {}
    //console.log(updateUser)
    res.send({ body: "Success", updatedUserData: updateUser });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /setClubPrefs failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// Append a JSON line with a preferences change event
async function logPreferencesHistory({ studentId, beforePrefs, afterPrefs }) {
  try {
    await ensureBackupsDir();
    const user = await db.getUser(studentId);
    const day = new Date().toISOString().slice(0, 7); // YYYY-MM
    const file = `backups/prefs-history-${day}.log`;
    const rec = {
      ts: new Date().toISOString(),
      userId: user && user.userId ? user.userId : studentId,
      firstName: user && user.firstName,
      lastName: user && user.lastName,
      email: user && user.email,
      grade: user && user.grade,
      before: (beforePrefs || null),
      after: (afterPrefs || null)
    };
    await fsPromises.appendFile(file, JSON.stringify(rec) + "\n", 'utf8');
  } catch (e) {
    console.log('Preferences history log failed:', String(e));
  }
}

// Super-admin: search preferences history log files
app.get('/admin/prefs-history', async (req, res) => {
  try {
    const level = coerceAdminLevel(req.query && req.query.isAdmin);
    if (level < 2) return res.status(403).send({ body: 'Error', error: 'Not authorized' });
    const q = (req.query && req.query.q ? String(req.query.q) : '').toLowerCase();
    const limit = Math.min(500, Math.max(1, parseInt(req.query && req.query.limit, 10) || 200));
    await ensureBackupsDir();
    const files = await fsPromises.readdir('backups');
    const targets = files.filter(f => typeof f === 'string' && f.startsWith('prefs-history-') && f.endsWith('.log'))
                         .sort().reverse();
    const out = [];
    const pushRec = (rec) => {
      try {
        const hay = [rec.userId, rec.firstName, rec.lastName, rec.email, rec.before, rec.after]
          .map(v => String(v || '').toLowerCase()).join(' ');
        if (!q || hay.includes(q)) out.push(rec);
      } catch (_) {}
    };
    for (const f of targets) {
      try {
        const raw = await fsPromises.readFile(`backups/${f}`, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const rec = JSON.parse(lines[i]);
            pushRec(rec);
            if (out.length >= limit) break;
          } catch (_) {}
        }
        if (out.length >= limit) break;
      } catch (_) {}
    }
    // If still under limit, scan PM2 logs for historical entries
    if (out.length < limit) {
      try {
        const logDir = process.env.PM2_LOG_DIR || (os.homedir ? (os.homedir() + (os.platform()==='win32' ? "\\.pm2\\logs" : "/.pm2/logs")) : "");
        if (logDir) {
          const lfiles = await fsPromises.readdir(logDir);
          const logTargets = lfiles.filter(f => /\.log$/i.test(f)).sort().reverse();
          for (const f of logTargets) {
            try {
              const raw = await fsPromises.readFile(path.join(logDir, f), 'utf8');
              const lines = raw.split(/\r?\n/).filter(l => l.includes('Set Club Prefs:'));
              for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                const m = line.match(/^(.*?)\s+-\s+Set Club Prefs: studentId\s+(\d+)\s+count\s+\d+\s+ids\s+([0-9,\s]+)/);
                if (!m) continue;
                const when = m[1].trim();
                const uid = m[2];
                const afterPrefs = m[3].trim();
                let u = null; try { u = await db.getUser(uid); } catch (_) {}
                const rec = {
                  ts: new Date(when).toString() === 'Invalid Date' ? when : new Date(when).toISOString(),
                  userId: u && u.userId ? u.userId : parseInt(uid,10),
                  firstName: u && u.firstName,
                  lastName: u && u.lastName,
                  email: u && u.email,
                  grade: u && u.grade,
                  before: null,
                  after: afterPrefs
                };
                pushRec(rec);
                if (out.length >= limit) break;
              }
              if (out.length >= limit) break;
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
    // Enrich with current assigned club for each record
    try {
      const clubs = await db.getAllClubs();
      const clubById = new Map((clubs||[]).map(c => [String(c.clubId), c]));
      for (const rec of out) {
        try {
          const u = await db.getUser(rec.userId);
          if (u) {
            rec.clubId = u.clubId;
            const key = u.clubId==null ? null : String(u.clubId);
            const club = key ? clubById.get(key) : null;
            rec.clubName = club ? club.clubName : null;
          }
        } catch (_) {}
      }
    } catch (_) {}

    res.send({ total: out.length, items: out });
  } catch (e) {
    res.status(500).send({ body: 'Error', error: 'Failed to read prefs history' });
  }
});

// POST route to handle form submission from clubCreation.html
app.post("/addClub", upload.single("cover"), async (req, res) => {
  try {
    const clubInfo = req.body;
    const coverPath = req.file ? req.file.path : "NULL";
    clubInfo.cover = coverPath;
    const ts = new Date().toLocaleString();
    console.log(`Create Club Attempt: name '${clubInfo.preferredClub || clubInfo.clubName || 'unknown'}' teacherId ${clubInfo.teacherId || clubInfo.primaryTeacherId || 'unknown'}`);
    await db.addClub(clubInfo);
    console.log(`Create Club Success: name '${clubInfo.preferredClub || clubInfo.clubName || 'unknown'}'`);
    res.send({ body: "Success", clubInfo });
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /addClub failed: ${String(err)} at ${ts}`);
    res.send({ body: err });
  }
});

//Create Account
app.post("/addAccount", async (req, res) => {
  try {
    const ts0 = new Date().toLocaleString();
    console.log("Received POST request to /addAccount");

    const userInfo = req.body;
    //console.log(userInfo);
    userInfo.firstName = await capitalizeName(userInfo.firstName);
    userInfo.lastName = await capitalizeName(userInfo.lastName);
    userInfo.password = await encryptPassword(userInfo.password);
    userInfo.email = userInfo.email.toLowerCase().trim();
    userInfo.isTeacher = userInfo.isTeacher == "true";
    console.log(`Add Account Attempt: ${userInfo.email} isTeacher=${userInfo.isTeacher ? 1 : 0}`);

    const userCheckData = await db.checkUser(userInfo.email);
    if (userCheckData.userExists === true) {
      const ts = new Date().toLocaleString();
      console.log(`Add Account Blocked (exists): ${userInfo.email}`);
      res.send({ body: "User already exists" });
    } else {
      if (!userInfo.isTeacher) {
        console.log(userInfo.email)
        if (!userInfo.email.includes("@students.hcde.org")) {
          const ts = new Date().toLocaleString();
          console.log(`Add Account Blocked (invalid student domain): ${userInfo.email}`);
          res.send({ body: "Invalid email address" });
          return;
        }
      }
      db.addUser(userInfo);
      const ts2 = new Date().toLocaleString();
      console.log(`Add Account Success: ${userInfo.email} isTeacher=${userInfo.isTeacher ? 1 : 0}`);
      res.send({ body: "true", user: userInfo });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /addAccount failed: ${String(e)}`);
    res.send("Error. Contact admin")
  }
});

app.post("/getAttendanceFromDate", async (req, res) => {
  try {
    const ts = new Date().toLocaleString();
    const date = req.body.date;
    console.log(`Get Attendance From Date: date ${date}`);
    let attendance = await db.getAttendanceFromDate(date);
    const count = attendance ? attendance.length : 0;
    if (count === 0) {
      console.log(`No attendance data exists for date ${date}`);
      return res.status(404).send({ body: "NoData", attendance: [], message: "No attendance data exists for that date" });
    }
    console.log(`Get Attendance From Date Success: rows ${count}`);
    res.send({ body: "Success", attendance });
  } catch (e) {
    const timestamp = new Date().toLocaleString();
    console.log(`Route /getAttendanceFromDate failed: ${String(e)}`);
    res.status(500).send({ body: "Error" });
  }
})

app.post("/login", async (req, res) => {
  const timestamp = new Date().toLocaleString();
  try {
    const rawEmail = req.body.email;
    //console.log(`Login Attempt : ${rawEmail}`);
    const wait = loginPrecheck(rawEmail);
    if (wait > 0) {
      console.log(`Login Rate Limited : ${rawEmail} wait ${wait}s`);
      return res.send({ body: false, error: `Too many attempts. Please wait ${wait}s and try again.` });
    }
    logInfo("auth.login.attempt", { emailMasked: maskEmail(rawEmail) });
    const email = req.body.email.toLowerCase();
    const password = req.body.password;
    const userCheckData = await db.checkUser(email);

    if (userCheckData.userExists === true) {
      const hashedPassword = userCheckData.password;
      if (await bcrypt.compare(password, hashedPassword)) {
        const userObject = await db.getUserInfo(email, "email");
        delete userObject.password;
        logInfo("auth.login.success", { userId: userObject.userId, isTeacher: userObject.isTeacher });
        console.log(`Login Success : ${email}`);
        registerLoginSuccess(email);
        res.send({ body: true, userObject });
      } else {
        // Invalid password. Include role hint so client can tailor messaging
        logWarn("auth.login.failed", { emailMasked: maskEmail(email), reason: "invalid_password" });
        console.log(`Login Failed (invalid password) : ${email}`);
        registerLoginFailure(email);
        let isTeacher = null;
        try {
          const info = await db.getUserInfo(email, "email");
          isTeacher = info ? (parseInt(info.isTeacher, 10) === 1) : null;
        } catch (_) { /* ignore */ }
        res.send({
          body: false,
          error: "Your password is incorrect. Please try again.",
          isTeacher,
        });
      }
    } else {
      logWarn("auth.login.failed", { emailMasked: maskEmail(email), reason: "not_found" });
      console.log(`Login Failed (not found) : ${email}`);
      registerLoginFailure(email);
      res.send({
        body: false,
        error: "User not found",
      });
    }
  } catch (e) {
    logError("auth.login.error", { error: String(e) });
    console.log(`Login Error : ${String(e)}`);
    res.redirect("https://forms.gle/G9LTphV8L3rpDGkF7")
    console.log("This is the messed up error that was happening when the body was empty")
  }
});

app.post("/admin-erase", async (req, res) => {
  try {
    const level = parseInt(req.body && req.body.isAdmin, 10) || 0;
    if (level > 1) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Erase Student Clubs Attempt`);
      await snapshotAssignments({ reason: "before admin-erase (remove all student clubs)" });
      const deleted = await db.deleteAllStudentClubs();
      if (deleted) {
        console.log(`Admin Erase Student Clubs Success`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-erase failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/admin-erase-all-clubs", async (req, res) => {
  try {
    const level = parseInt(req.body && req.body.isAdmin, 10) || 0;
    if (level > 1) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Erase All Clubs Attempt`);
      await snapshotAssignments({ reason: "before admin-erase-all-clubs (delete all clubs)" });
      const deleted = await db.deleteAllClubs();
      if (deleted) {
        console.log(`Admin Erase All Clubs Success`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-erase-all-clubs failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// All club rosters (admin only)
app.get('/clubs/rosters', async (req, res) => {
  try {
    // Reuse same admin-gating pattern as metrics
    const adminParam = req.query && req.query.isAdmin;
    const level = (function coerce(v){ if (v === true || v === 'true') return 1; const n=Number(v); return Number.isFinite(n)&&n>0?n:0; })(adminParam);
    if (level < 1) return res.status(403).send({ body: 'Error', error: 'Not authorized' });

    const clubs = await db.getAllClubs();
    const users = await db.getAllUsers();

    // Map of userId -> user for teacher lookups
    const byId = new Map(users.map(u => [String(u.userId), u]));
    const students = users.filter(u => !u.isTeacher);

    // Group students by clubId
    const grouped = new Map();
    for (const s of students) {
      const cid = s && s.clubId;
      if (cid == null) continue;
      const key = String(cid);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({
        userId: s.userId,
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        grade: s.grade == null ? null : Number(s.grade)
      });
    }

    const rosters = clubs.map(c => {
      const teacher = byId.get(String(c.primaryTeacherId)) || {};
      const list = (grouped.get(String(c.clubId)) || []).sort((a,b)=>{
        const ln = String(a.lastName||'').localeCompare(String(b.lastName||''));
        if (ln !== 0) return ln;
        return String(a.firstName||'').localeCompare(String(b.firstName||''));
      });
      return {
        clubId: c.clubId,
        clubName: c.clubName,
        room: c.room || null,
        teacherFirstName: teacher.firstName || null,
        teacherLastName: teacher.lastName || null,
        students: list,
        count: list.length
      };
    }).filter(r => r.count > 0)
      .sort((a,b)=> String(a.clubName||'').localeCompare(String(b.clubName||'')));

    res.send({ generatedAt: new Date().toLocaleString(), rosters });
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /clubs/rosters failed: ${String(e)} at ${ts}`);
    res.status(500).send({ body: 'Error', error: 'Failed to fetch rosters' });
  }
});

// Restore last saved club assignments snapshot
app.post("/admin-restore-last-assignments", async (req, res) => {
  try {
    const level = parseInt(req.body && req.body.isAdmin, 10) || 0;
    if (level <= 1) {
      return res.status(403).send({ body: "Error", error: "Not authorized" });
    }
    await ensureBackupsDir();
    const files = await fsPromises.readdir("backups");
    const candidates = (files || [])
      .filter((f) => typeof f === "string" && f.startsWith("assignments-") && f.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a));
    if (!candidates.length) {
      return res.status(404).send({ body: "Error", error: "No snapshots found" });
    }
    const latest = candidates[0];
    const raw = await fsPromises.readFile(`backups/${latest}`, "utf8");
    let data;
    try { data = JSON.parse(raw); } catch (_) { return res.status(400).send({ body: "Error", error: "Invalid snapshot file" }); }
    const entries = Array.isArray(data.entries) ? data.entries : [];
    let applied = 0;
    for (const e of entries) {
      if (!e || typeof e.userId === "undefined") continue;
      const userId = e.userId;
      const clubId = (e.clubId === null || e.clubId === undefined || e.clubId === "") ? null : e.clubId;
      await db.updateUserValue(userId, "clubId", clubId);
      applied++;
    }
    console.log(`Assignments restored from ${latest} (applied ${applied})`);
    // Recompute metrics after restore so UI reflects latest assignments
    try {
      const metrics = await computeAssignmentMetrics();
      await saveMetricsSnapshot(metrics);
      console.log(`Admin Restore Metrics saved`);
    } catch (e) {
      console.log(`Metrics computation failed after restore: ${String(e)}`);
    }
    res.send({ body: "Success", file: latest, applied });
  } catch (e) {
    console.log("Restore failed:", String(e));
    res.status(500).send({ body: "Error", error: "Restore failed" });
  }
});

app.post("/admin-create-clubs", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      let teacherId = req.body.teacherId;
      const ts = new Date().toLocaleString();
      console.log(`Admin Create Clubs Attempt: count ${req.body.numOfClubs} teacherId ${teacherId}`);
      const created = await db.createRandomClubs(req.body.numOfClubs, teacherId);

      if (created) {
        console.log(`Admin Create Clubs Success: count ${req.body.numOfClubs}`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-create-clubs failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-students", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Create Students Attempt: count ${req.body.numOfStudents}`);
      const created = await db.createRandomGuys(req.body.numOfStudents);
      if (created) {
        console.log(`Admin Create Students Success: count ${req.body.numOfStudents}`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-create-students failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/admin-create-teachers", async (req, res) => {
  try {
    // console.log(req.body.numOfStudents);
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
      console.log(`Admin Create Teachers Attempt: count ${req.body.numOfTeachers}`);
      const created = await db.createRandomTeachers(req.body.numOfTeachers);
      if (created) {
        console.log(`Admin Create Teachers Success: count ${req.body.numOfTeachers}`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-create-teachers failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// Import teachers from an uploaded old SQLite database
app.post("/admin-import-teachers", upload.single("olddb"), async (req, res) => {
  try {
    const level = parseInt(req.body && req.body.isAdmin, 10) || 0;
    if (level <= 1) {
      return res.status(403).send({ body: "Error", error: "Not authorized" });
    }
    if (!req.file) {
      return res.status(400).send({ body: "Error", error: "No database file uploaded" });
    }
    const ts = new Date().toLocaleString();
    console.log(`Admin Import Teachers Begin: file ${req.file.path}`);

    const oldDbPath = req.file.path;
    const openOldDb = (p) =>
      new Promise((resolve, reject) => {
        const odb = new sqlite3.Database(p, sqlite3.OPEN_READONLY, (err) => {
          if (err) return reject(err);
          resolve(odb);
        });
      });
    let oldDb;
    try {
      oldDb = await openOldDb(oldDbPath);
    } catch (e) {
      console.error("Error opening old database:", e);
      return res.status(400).send({ body: "Error", error: "Cannot open uploaded database file" });
    }

    const selectTeachers = () =>
      new Promise((resolve, reject) => {
        oldDb.all("SELECT * FROM users WHERE isTeacher = 1", [], (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });

    const teachers = await selectTeachers();
    let imported = 0;
    let skipped = 0;

    for (const t of teachers) {
      // Prefer copying minimal safe fields; keep existing password hashes
      const sql = `INSERT OR IGNORE INTO users (firstName, lastName, avatar, grade, clubId, room, email, password, isTeacher, isAdmin, clubPreferences)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
      try {
        await db.run(sql, [
          t.firstName || null,
          t.lastName || null,
          t.avatar || null,
          t.grade ?? null,
          null, // do not carry over old clubId into fresh DB
          t.room || null,
          t.email || null,
          t.password || null,
          1,
          t.isAdmin ? 1 : 0,
          null,
        ]);
        imported++;
      } catch (e) {
        // Likely unique(email) conflict, treat as skipped
        skipped++;
      }
    }

    oldDb.close();
    console.log(`Admin Import Teachers Done: imported ${imported} skipped ${skipped}`);
    res.send({ body: "Success", imported, skipped });
  } catch (e) {
    console.error(e);
    res.status(500).send({ body: "Error", error: "Failed to import teachers" });
  }
});

// Import students from uploaded XLS file (drag-and-drop)
app.post("/admin-import-students-xls", upload.single("studentsXls"), async (req, res) => {
  try {
    const level = parseInt(req.body && req.body.isAdmin, 10) || 0;
    if (level <= 1) {
      return res.status(403).send({ body: "Error", error: "Not authorized" });
    }
    if (!req.file) {
      return res.status(400).send({ body: "Error", error: "No XLS file uploaded" });
    }
    const ts = new Date().toLocaleString();
    console.log(`Admin Import Students Begin: file ${req.file.path}`);
    const node_xj = require("xls-to-json");

    const parseXls = (filePath) =>
      new Promise((resolve, reject) => {
        node_xj(
          {
            input: filePath,
            output: null,
            rowsToSkip: 0,
            allowEmptyKey: false,
          },
          (err, result) => {
            if (err) return reject(err);
            resolve(result || []);
          }
        );
      });

    const records = await parseXls(req.file.path);
    console.log(`Admin Import Students Parsed: rows ${records.length}`);

    const encryptPassword = (password) => bcrypt.hash(password, 10);

    const formatDOBToMMDDYYYY = (dob) => {
      if (!dob) return "";
      const s = dob.toString().trim();
      const m = s.match(/(\d{1,2})\D(\d{1,2})\D(\d{2,4})/);
      if (!m) return s.replace(/\D/g, "");
      let month = m[1].padStart(2, "0");
      let day = m[2].padStart(2, "0");
      let year = m[3];
      if (year.length === 2) {
        year = parseInt(year, 10) >= 70 ? `19${year}` : `20${year}`;
      } else {
        year = year.padStart(4, "0");
      }
      return `${month}${day}${year}`;
    };

    // Preprocess + hash in parallel (limited by libuv threadpool)
    // Helpers to read fields robustly regardless of header variations
    const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const getField = (row, candidates) => {
      const map = new Map(Object.keys(row).map((k) => [normalizeKey(k), k]));
      for (const name of candidates) {
        const hit = map.get(normalizeKey(name));
        if (hit) return row[hit];
      }
      return undefined;
    };

    const candidates = records.filter((r) => getField(r, ['First_Name','First Name','First']) );
    const prepared = await Promise.all(
      candidates.map(async (student) => {
        // Preserve names exactly as provided (no case/spacing changes)
        const firstName = (getField(student, ['First_Name','First Name','First']) ?? '').toString();
        const lastName = (getField(student, ['Last_Name','Last Name','Last']) ?? '').toString();
        const emailRaw = getField(student, ['Student_Email_DONOTUSE','Student_Email','Student Email','Email']) ?? '';
        const email = String(emailRaw).toLowerCase();
        const gradeRaw = getField(student, ['Grade_Level','Grade Level','Grade']);
        const grade = gradeRaw === '' || gradeRaw == null ? null : parseInt(gradeRaw);
        const dob = (getField(student, ['DOB','Date of Birth']) ?? '').toString();
        const passwordDate = formatDOBToMMDDYYYY(dob);
        const firstThree = firstName.replace("'", "").substring(0, 3).toLowerCase();
        const passwordPlain = `${passwordDate}${firstThree}`;
        const password = await encryptPassword(passwordPlain);
        // Off-campus detection (tolerate stray edge spaces, but do not store modified)
        const homeRoomRaw = (getField(student, ['Home_Room','Home Room','Homeroom','HomeRoom']) ?? '').toString();
        // Normalize only for comparison; do not store modified text
        const norm = homeRoomRaw.toLowerCase().replace(/\./g, '').replace(/\s+/g,' ').trim();
        const offCampus = (
          norm === 'may, olivia laura-ann' ||
          norm === 'may olivia laura-ann' ||
          norm.includes('gsp') ||
          norm.includes('univ high') ||
          norm.includes('university high') ||
          norm.includes('chatt st') ||
          norm.includes('iea student; do not withdraw') ||
          norm.includes('mechatronics @ vw') ||
          norm.includes('opportunity high')
        );
        return { firstName, lastName, email, grade, password, offCampus };
      })
    );

    // 1) Insert new rows (does not overwrite existing rows)
    const { imported, skipped } = await db.addStudentsBulk(prepared);

    // Log a quick count for visibility when importing
    try {
      const offCount = prepared.filter(s=>s.offCampus).length;
      console.log(`Import Students: detected off-campus rows ${offCount}`);
      if (offCount === 0) {
        // Log a small sample of distinct homeroom headers/values for troubleshooting
        const sample = records.slice(0,3).map(r => ({ keys: Object.keys(r).slice(0,6) }));
        console.log('Import hint: first row keys sample', sample);
      }
    } catch (_) {}

    // 2) Update existing (and newly inserted) rows with latest name/grade (do not touch password, club prefs, roles)
    await db.run("BEGIN");
    try {
      for (const s of prepared) {
        if (!s.email) continue;
        await db.run(
          "UPDATE users SET firstName = ?, lastName = ?, grade = ? WHERE email = ? AND isTeacher = 0",
          [s.firstName, s.lastName, s.grade == null || Number.isNaN(s.grade) ? null : s.grade, s.email]
        );
      }
      await db.run("COMMIT");
    } catch (e) {
      await db.run("ROLLBACK");
      throw e;
    }

    // 3) Off-campus toggling every import
    const offSet = prepared.filter((s) => s.offCampus && s.email).map((s) => s.email);
    const onSet = prepared.filter((s) => !s.offCampus && s.email).map((s) => s.email);

    // Helper to run IN() batches safely
    async function runInBatches(emails, sqlBase, batchSize = 500) {
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        if (!batch.length) continue;
        const placeholders = batch.map(() => '?').join(',');
        // Ensure parameter values are lowercase to match LOWER(email)
        const params = batch.map((e) => String(e).toLowerCase());
        await db.run(sqlBase.replace('@@IN@@', placeholders), params);
      }
    }

    // Set clubId = -1 for off-campus (overrides existing assignment)
    await runInBatches(
      offSet,
      "UPDATE users SET clubId = -1 WHERE isTeacher = 0 AND LOWER(email) IN (@@IN@@)"
    );

    // Clear clubId from -1 back to NULL for those no longer off-campus
    await runInBatches(
      onSet,
      "UPDATE users SET clubId = NULL WHERE isTeacher = 0 AND clubId = -1 AND LOWER(email) IN (@@IN@@)"
    );
    console.log(`Admin Import Students Done: imported ${imported} skipped ${skipped}`);
    res.send({ body: "Success", imported, skipped });
  } catch (e) {
    console.error(e);
    res.status(500).send({ body: "Error", error: "Failed to import students" });
  }
});

app.post("/admin-erase-students", async (req, res) => {
  try {
    if (req.body.isAdmin) {
      const ts = new Date().toLocaleString();
    console.log(`Admin Erase All Students Attempt`);
      const deleted = await db.deleteAllStudents();
      if (deleted) {
        console.log(`Admin Erase All Students Success`);
        res.send({ body: "Success" });
      }
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-erase-students failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.get("/admin-club-assignment", async (req, res) => {
  try {
    const level = parseInt(req.query && req.query.isAdmin, 10) || 0;
    if (level <= 1) {
      return res.status(403).send({ body: "Error", error: "Not authorized" });
    }
    const ts = new Date().toLocaleString();
    console.log(`Admin Club Assignment Begin`);
    // Count currently assigned on-campus students before run
    let assignedBefore = 0;
    try {
      const all = await db.getAllTeachersOrStudents(false);
      const onCampus = all.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
      assignedBefore = onCampus.filter((s) => s.clubId != null).length;
    } catch (_) {}
    await snapshotAssignments({ reason: "before admin-club-assignment" });
    const clubAssignment = await ca.main();
    if (clubAssignment) {
      // Compute and persist metrics after assignment run
      try {
        const metrics = await computeAssignmentMetrics();
        await saveMetricsSnapshot(metrics);
        console.log(`Admin Club Assignment Metrics saved`);
      } catch (e) {
        console.log(`Metrics computation failed after assignment: ${String(e)}`);
      }
      // Count assigned after run and compute how many were placed this time
      let assignedAfter = assignedBefore;
      try {
        const all2 = await db.getAllTeachersOrStudents(false);
        const onCampus2 = all2.filter((s) => !(typeof s.clubId === 'number' && s.clubId < 0));
        assignedAfter = onCampus2.filter((s) => s.clubId != null).length;
      } catch (_) {}
      const placed = Math.max(0, assignedAfter - assignedBefore);
      console.log(`Admin Club Assignment Success — placed ${placed} students (assigned total: ${assignedAfter})`);
      try { await logAssignmentRunSummary({ placed, before: assignedBefore, after: assignedAfter }); } catch (_) {}
      res.send({ body: "Success", placed, assignedTotal: assignedAfter, assignedBefore });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /admin-club-assignment failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

// Append one-line summary for each assignment run
async function logAssignmentRunSummary({ placed, before, after }) {
  try {
    await ensureBackupsDir();
    const month = new Date().toISOString().slice(0,7); // YYYY-MM
    const file = `backups/assign-run-summary-${month}.log`;
    const rec = {
      ts: new Date().toISOString(),
      placed: Number(placed||0),
      assignedBefore: Number(before||0),
      assignedAfter: Number(after||0)
    };
    await fsPromises.appendFile(file, JSON.stringify(rec) + "\n", 'utf8');
  } catch (e) {
    console.log('Assign run summary log failed:', String(e));
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

async function encryptPassword(password) {
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Return the hashed password
    return hashedPassword;
  } catch (error) {
    console.error("Error encrypting password:", error);
  }
}

async function capitalizeName(name) {
  try {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  } catch (e) {
    console.log(e);
    console.log("Can't capitalizeName(name)");
    res.send("Error. Contact admin")
  }
}

app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    const newAvatarPath = req.file.path;
    const user = parseInt(req.body.userId);
    const ts = new Date().toLocaleString();
    console.log(`Upload Avatar Attempt: userId ${user}`);

    const avatar = await db.uploadAvatar(user, newAvatarPath);
    if (avatar) {
      console.log(`Upload Avatar Success: userId ${user} path ${newAvatarPath}`);
      res.send({ body: "Success", avatarPath: newAvatarPath });
    } else {
      res.send({ body: "Error" });
    }
  } catch (e) {
    const ts = new Date().toLocaleString();
    console.log(`Route /upload-avatar failed: ${String(e)} at ${ts}`);
    res.send("Error. Contact admin")
  }
});

app.post("/upload-cover-photo", upload.single("cover"), async (req, res) => {
  try {
    const newAvatarPath = req.file.path;
    const club = parseInt(req.body.clubId);
    const ts = new Date().toLocaleString();
    console.log(`Upload Cover Attempt: clubId ${club}`);

    const avatar = await db.uploadCover(club, newAvatarPath);
    if (avatar) {
      console.log(`Upload Cover Success: clubId ${club} path ${newAvatarPath}`);
      res.send({ body: "Success", avatarPath: newAvatarPath });
    } else {
      res.send({ body: "Error" });
    }
  } catch (err) {
    const ts = new Date().toLocaleString();
    console.log(`Route /upload-cover-photo failed: ${String(err)} at ${ts}`);
    res.send({ body: "Error can't upload photo" });
  }
});

app.get("/check-reset-email", async (req, res) => {
  try {

    const email = req.query.email.toLowerCase();

    const userExists = await db.checkUser(email);
    const exists = userExists !== "User does not exist" && userExists && userExists.userExists === true;
    // Intentionally do not log this pre-check to console to reduce noise
    // Only surface logs when emails are sent or resets succeed/fail
    // Return minimal info consumed by the login page for teacher link display
    if (exists) {
      res.send({ body: { exists: true, isTeacher: userExists.isTeacher } });
    } else {
      res.send({ body: "User does not exist" });
    }
  } catch (e) {
    // Suppress noisy pre-check errors in logs; client will handle UI state
    res.send("Error. Contact admin")
  }
});

app.post("/request-password-confirm", async (req, res) => {
  try {
    const password = req.body.password;
    const userToken = req.body.token;
    // Do not log begin event; only log success/failure outcomes
    const databaseInfo = await db.checkResetPasswordToken(userToken);
    if (!databaseInfo) {
      console.log(`Reset Confirm Invalid Token : token ${shortToken(userToken)}`);
      logWarn("reset.confirm.invalid", { token: shortToken(userToken) });
      return res.status(400).send({ body: "Error", reason: "Invalid token" });
    }
    const databaseToken = databaseInfo.token;
    // Validate token and expiration (must be in the future)
    const exp = databaseInfo && databaseInfo.expiration;
    let expMs = 0;
    if (typeof exp === 'number') {
      expMs = exp;
    } else if (typeof exp === 'string') {
      const n = parseInt(exp, 10);
      expMs = Number.isNaN(n) ? Date.parse(exp) : n;
    } else if (exp instanceof Date) {
      expMs = exp.getTime();
    }
    const notExpired = !!expMs && expMs > Date.now();
    if (databaseInfo.token === databaseToken && notExpired) {
      // Ensure only teachers can reset passwords
      const userRecord = await db.getUser(databaseInfo.user_id);
      if (!userRecord || parseInt(userRecord.isTeacher, 10) !== 1) {
        console.log(`Reset Confirm Not Permitted : userId ${databaseInfo.user_id}`);
        logWarn("reset.confirm.notPermitted", { userId: databaseInfo.user_id, token: shortToken(userToken) });
        return res.status(403).send({ body: "Error", reason: "Not permitted" });
      }
      const newPass = await encryptPassword(password);

      const updateUser = await db.resetUserPassword(
        databaseInfo.user_id,
        newPass
      );
      // Invalidate the token after successful reset
      try {
        await db.deleteResetPasswordToken(userToken);
      } catch (e) {
        logError("reset.confirm.tokenDelete.error", { userId: databaseInfo.user_id, error: String(e) });
      }
      // Persistent log entry for successful password resets
      try { await logPasswordResetSuccess({ userId: databaseInfo.user_id, email: userRecord && userRecord.email }); } catch (_) {}
      console.log(`Reset Confirm Success : userId ${databaseInfo.user_id}`);
      logInfo("reset.confirm.success", { userId: databaseInfo.user_id, token: shortToken(userToken) });
      return res.send({ body: "Success" });
    } else {
      console.log(`Reset Confirm Expired : token ${shortToken(userToken)}`);
      logWarn("reset.confirm.expired", { token: shortToken(userToken), expMs, now: Date.now() });
      return res.status(400).send({ body: "Error", reason: "Expired token" });
    }
  } catch (err) {
    // Log only as an outcome (unsuccessful reset)
    console.log(`Reset Confirm Error : ${String(err)}`);
    res.send({ body: "Error" });
  }
});

app.post("/request-password-reset", async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const userObject = await db.getUserByEmail(email);
    const userId = userObject && userObject.userId;
    // Do not log request initiation; only log send success/failure
    const resetWait = resetPrecheck(email);
    if (resetWait > 0) {
      return res.send({ body: "Error", error: `Too many reset requests. Please wait ${resetWait}s and try again.` });
    }
    // record this request toward rate limits regardless of role
    registerResetTry(email);
    logInfo("reset.request.begin", { emailMasked: maskEmail(email), userId });
    // Only teachers can receive reset codes (isTeacher stored as 0/1)
    if (userObject && userId && parseInt(userObject.isTeacher, 10) === 1) {
      const token = crypto.randomBytes(20).toString("hex");
      const expiration = Date.now() + 8 * 60 * 60 * 1000; // store as epoch ms (8 hours from now)
      const sendTokenToDatabase = await db.setResetPasswordToken(
        userId,
        token,
        expiration
      );

      // Send email with the token

      const transporter = nodemailer.createTransport({
        host: `gbs423.com`,
        port: 465,
        secure: true, // use SSL
        auth: {
          user: "form@gbs423.com",
          pass: "Wafflesthedog6969!",
        },
      });

      const resetLink = `http://${serverAddress}/reset-password.html?token=${token}`;
      const plainText = `Hello ${userObject.firstName},\n\nYou requested a password reset.\n\nReset your password using this link (expires in 8 hours):\n${resetLink}\n\nIf you did not request a password change, you can ignore this email.`;
      const htmlBody = `
        <div style="padding:24px; background-color:#0a0a0a; color:#ffffff; font-size:16px; line-height:1.5;">
          <h2 style="margin-top:0; color:#ffffff;">Hello ${userObject.firstName},</h2>
          <p>You requested a password reset.</p>
          <p><a style="color:#0f7ae5;" href="${resetLink}">Click here to reset your password</a></p>
          <p style="color:#cbd5e1;">This link expires in 8 hours.</p>
          <p style="color:#9ca3af;">If you did not request a password change, you can ignore this email.</p>
        </div>`;

      const mailOptions = {
        from: "RBHS Club Creator Password Reset <form@gbs423.com>",
        to: email,
        subject: "RBHS Clubs Password Reset (expires in 8 hours)",
        text: plainText,
        html: htmlBody,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(`Reset Email Error : ${email} error=${String(err)}`);
          logError("reset.request.emailError", { emailMasked: maskEmail(email), userId, error: String(err) });
          throw err;
        }
        console.log(`Reset Email Sent : ${email} messageId=${info && (info.messageId || info.response)}`);
        logInfo("reset.request.sent", {
          emailMasked: maskEmail(email),
          userId,
          token: shortToken(token),
          messageId: info && (info.messageId || info.response)
        });
        res.send({ body: "Success", email: email });
      });
    } else {
      // Do not send a token; indicate not allowed (no console log)
      return res.send({ body: "NotTeacher" });
    }
  } catch (err) {
    // Log only if helpful; keep minimal
    console.log(`Reset Request Error : ${String(err)}`);
    res.send({ body: "Error" });
  }
});
