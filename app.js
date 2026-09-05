const SUPABASE_URL = "https://rwwyfzffwgrategohqpv.supabase.co";
const SUPABASE_KEY = "TU_PUBLISHABLE_KEY_ACTUAL";

const monthTitle = document.getElementById("monthTitle");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const adminBtn = document.getElementById("adminBtn");

const loginModal = document.getElementById("loginModal");
const closeLoginModal = document.getElementById("closeLoginModal");
const loginForm = document.getElementById("loginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const loginError = document.getElementById("loginError");

let currentDate = new Date();
let adminSession = null;

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function formatTime(time) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  let hour = parseInt(hourString, 10);

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${ampm}`;
}

async function loadShifts(year, month) {
  const startDate =
    `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const lastDay =
    new Date(year, month + 1, 0).getDate();

  const endDate =
    `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const url =
    `${SUPABASE_URL}/rest/v1/shifts` +
    `?select=id,shift_date,start_time,end_time,notes,team_members(name)` +
    `&shift_date=gte.${startDate}` +
    `&shift_date=lte.${endDate}` +
    `&order=shift_date.asc,start_time.asc`;

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Supabase error ${response.status}: ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Could not load shifts:", error);
    return [];
  }
}

async function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.textContent =
    `${monthNames[month]} ${year}`;

  const shifts = await loadShifts(year, month);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  let startDay = firstDay.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.classList.add("day", "empty");
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dayCell = document.createElement("div");
    dayCell.classList.add("day");

    const dayNumber = document.createElement("div");
    dayNumber.classList.add("day-number");
    dayNumber.textContent = day;

    dayCell.appendChild(dayNumber);

    const dateString =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayShifts = shifts.filter(
      (shift) => shift.shift_date === dateString
    );

    dayShifts.forEach((shift) => {
      const shiftElement = document.createElement("div");
      shiftElement.classList.add("shift");

      const employeeName =
        shift.team_members?.name || "Team Member";

      shiftElement.innerHTML = `
        <div class="shift-name">${employeeName}</div>
        <div class="shift-time">
          ${formatTime(shift.start_time)} -
          ${formatTime(shift.end_time)}
        </div>
      `;

      dayCell.appendChild(shiftElement);
    });

    calendarGrid.appendChild(dayCell);
  }
}

/* -------------------------
   ADMIN LOGIN
------------------------- */

function openLogin() {
  loginError.textContent = "";
  adminPassword.value = "";
  loginModal.classList.remove("hidden");
}

function closeLogin() {
  loginModal.classList.add("hidden");
}

async function signInAdmin(email, password) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.msg ||
      data.message ||
      "Invalid login."
    );
  }

  return data;
}

async function verifyAdmin(session) {
  const userId = session.user.id;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?id=eq.${userId}&select=id,display_name,role`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error("Unable to verify administrator.");
  }

  const admins = await response.json();

  return admins.length > 0;
}

function activateAdminMode(session) {
  adminSession = session;

  localStorage.setItem(
    "freedomBikeAdminSession",
    JSON.stringify(session)
  );

  adminBtn.textContent = "Admin Mode";
  adminBtn.classList.add("admin-active");

  closeLogin();
}

function restoreAdminSession() {
  const stored =
    localStorage.getItem("freedomBikeAdminSession");

  if (!stored) return;

  try {
    adminSession = JSON.parse(stored);

    if (adminSession?.access_token) {
      adminBtn.textContent = "Admin Mode";
      adminBtn.classList.add("admin-active");
    }
  } catch {
    localStorage.removeItem(
      "freedomBikeAdminSession"
    );
  }
}

adminBtn.addEventListener("click", () => {
  if (adminSession) {
    return;
  }

  openLogin();
});

closeLoginModal.addEventListener("click", closeLogin);

loginModal.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    closeLogin();
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "Signing in...";

  try {
    const session = await signInAdmin(
      adminEmail.value.trim(),
      adminPassword.value
    );

    const isAdmin = await verifyAdmin(session);

    if (!isAdmin) {
      throw new Error(
        "This account does not have administrator access."
      );
    }

    loginError.textContent = "";

    activateAdminMode(session);

  } catch (error) {
    console.error(error);
    loginError.textContent =
      error.message || "Login failed.";
  }
});

/* -------------------------
   CALENDAR CONTROLS
------------------------- */

prevMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(
    currentDate.getMonth() - 1
  );

  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(
    currentDate.getMonth() + 1
  );

  renderCalendar();
});

restoreAdminSession();
renderCalendar();
