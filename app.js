const SUPABASE_URL = "https://rwwyfzffwgrategohqpv.supabase.co";
const SUPABASE_KEY = "sb_publishable_jHaJaaGSaYoj-tBTggfXwA_T-p6chM4";

const monthTitle = document.getElementById("monthTitle");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const adminBtn = document.getElementById("adminBtn");

let currentDate = new Date();

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
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const lastDay = new Date(year, month + 1, 0).getDate();

  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;

  const url =
    `${SUPABASE_URL}/rest/v1/shifts` +
    `?select=id,shift_date,start_time,end_time,notes,team_members(name)` +
    `&shift_date=gte.${startDate}` +
    `&shift_date=lte.${endDate}` +
    `&order=shift_date.asc,start_time.asc`;

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
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

  monthTitle.textContent = `${monthNames[month]} ${year}`;

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

    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    const dayShifts = shifts.filter(
      (shift) => shift.shift_date === dateString
    );

    dayShifts.forEach((shift) => {
      const shiftElement = document.createElement("div");
      shiftElement.classList.add("shift");

      const employeeName =
        shift.team_members && shift.team_members.name
          ? shift.team_members.name
          : "Team Member";

      shiftElement.innerHTML = `
        <div class="shift-name">${employeeName}</div>
        <div class="shift-time">
          ${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}
        </div>
      `;

      dayCell.appendChild(shiftElement);
    });

    calendarGrid.appendChild(dayCell);
  }
}

prevMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

adminBtn.addEventListener("click", () => {
  alert("Admin login is the next step.");
});

renderCalendar();
