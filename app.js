const STORAGE_KEY = "retzef-habits-v1";
const CLOUD_TOKEN_KEY = "retzef-github-token-v1";
const CLOUD_GIST_KEY = "retzef-github-gist-id-v1";
const CLOUD_FILE_NAME = "retzef-habit-data.json";
const GOAL_DAYS = [7, 30, 60, 100];
const dayLabels = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const colorOptions = ["#2f8f6f", "#4878c7", "#d86445", "#d7a528", "#7b62b3", "#2b8a9d", "#9a6a3a"];

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  todayTitle: document.querySelector("#todayTitle"),
  todaySummary: document.querySelector("#todaySummary"),
  todayRing: document.querySelector("#todayRing"),
  todayPercent: document.querySelector("#todayPercent"),
  prevDay: document.querySelector("#prevDay"),
  goToday: document.querySelector("#goToday"),
  nextDay: document.querySelector("#nextDay"),
  weekStrip: document.querySelector("#weekStrip"),
  todayHabits: document.querySelector("#todayHabits"),
  allHabits: document.querySelector("#allHabits"),
  statsGrid: document.querySelector("#statsGrid"),
  githubToken: document.querySelector("#githubToken"),
  saveGithubToken: document.querySelector("#saveGithubToken"),
  uploadCloud: document.querySelector("#uploadCloud"),
  downloadCloud: document.querySelector("#downloadCloud"),
  cloudStatus: document.querySelector("#cloudStatus"),
  monthGrid: document.querySelector("#monthGrid"),
  monthTitle: document.querySelector("#monthTitle"),
  dialog: document.querySelector("#habitDialog"),
  form: document.querySelector("#habitForm"),
  dialogMode: document.querySelector("#dialogMode"),
  habitId: document.querySelector("#habitId"),
  habitName: document.querySelector("#habitName"),
  habitTime: document.querySelector("#habitTime"),
  habitNote: document.querySelector("#habitNote"),
  dayPicker: document.querySelector("#dayPicker"),
  colorPicker: document.querySelector("#colorPicker"),
  deleteHabit: document.querySelector("#deleteHabit"),
  statsDialog: document.querySelector("#statsDialog"),
  closeStatsDialog: document.querySelector("#closeStatsDialog"),
  statsHabitName: document.querySelector("#statsHabitName"),
  habitStatsGrid: document.querySelector("#habitStatsGrid"),
  goalList: document.querySelector("#goalList"),
};

let habits = loadHabits();
let selectedDate = startOfDay(new Date());
let selectedDays = [0, 1, 2, 3, 4, 5, 6];
let selectedColor = colorOptions[0];
let cloudTimer = null;
let cloudBusy = false;

function start() {
  buildPickers();
  bindEvents();
  render();
  registerServiceWorker();
}

function loadHabits() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return [
    {
      id: crypto.randomUUID(),
      name: "שתיית מים",
      time: "בוקר",
      note: "כוס אחת לפני הקפה",
      days: [0, 1, 2, 3, 4, 5, 6],
      color: "#2f8f6f",
      records: {},
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "הליכה קצרה",
      time: "ערב",
      note: "גם 10 דקות נחשבות",
      days: [0, 1, 2, 3, 4],
      color: "#4878c7",
      records: {},
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "קריאה",
      time: "גמיש",
      note: "עמוד אחד לפחות",
      days: [0, 1, 2, 3, 4, 5, 6],
      color: "#d86445",
      records: {},
      createdAt: new Date().toISOString(),
    },
  ];
}

function saveHabits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function bindEvents() {
  document.querySelector("#openAdd").addEventListener("click", () => openHabitDialog());
  document.querySelector("#openAddSecondary").addEventListener("click", () => openHabitDialog());
  document.querySelector("#closeDialog").addEventListener("click", () => els.dialog.close());
  els.closeStatsDialog.addEventListener("click", () => els.statsDialog.close());
  els.prevDay.addEventListener("click", () => setSelectedDate(addDays(selectedDate, -1)));
  els.goToday.addEventListener("click", () => setSelectedDate(new Date()));
  els.nextDay.addEventListener("click", () => setSelectedDate(addDays(selectedDate, 1)));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  els.form.addEventListener("submit", handleSave);
  els.deleteHabit.addEventListener("click", handleDelete);
  els.saveGithubToken.addEventListener("click", handleSaveGithubToken);
  els.uploadCloud.addEventListener("click", () => uploadCloudData({ manual: true }));
  els.downloadCloud.addEventListener("click", downloadCloudData);
}

function buildPickers() {
  els.dayPicker.innerHTML = dayLabels
    .map((label, index) => `<button class="day-toggle" type="button" data-day="${index}">${label}</button>`)
    .join("");

  els.colorPicker.innerHTML = colorOptions
    .map(
      (color) =>
        `<button class="color-toggle" type="button" data-color="${color}" style="--swatch:${color}" aria-label="צבע ${color}"></button>`,
    )
    .join("");

  els.dayPicker.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const day = Number(button.dataset.day);
      selectedDays = selectedDays.includes(day)
        ? selectedDays.filter((item) => item !== day)
        : [...selectedDays, day].sort((a, b) => a - b);
      if (!selectedDays.length) selectedDays = [day];
      syncPickers();
    });
  });

  els.colorPicker.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedColor = button.dataset.color;
      syncPickers();
    });
  });
}

function setView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#view-${viewName}`).classList.add("active");

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });
}

function render() {
  const today = new Date();
  selectedDate = clampDateToTrackerRange(selectedDate);
  const selected = startOfDay(selectedDate);
  const selectedKey = dateKey(selected);
  const dueSelected = habits.filter((habit) => isHabitDue(habit, selected));
  const doneSelected = dueSelected.filter((habit) => getRecordStatus(habit, selectedKey) === "done");
  const percent = dueSelected.length ? Math.round((doneSelected.length / dueSelected.length) * 100) : 0;
  const isToday = isSameDate(selected, today);
  const firstAvailableDate = getTrackerStartDate();

  els.todayLabel.textContent = formatFullDate(selected);
  els.todayTitle.textContent = isToday ? "המשימות של היום" : "סימון יום נבחר";
  els.todaySummary.textContent = dueSelected.length
    ? `${doneSelected.length} מתוך ${dueSelected.length} סומנו בהצלחה ביום הזה`
    : "אין הרגלים מתוכננים ליום הזה.";
  els.todayPercent.textContent = `${percent}%`;
  els.todayRing.style.setProperty("--progress", `${percent * 3.6}deg`);
  els.prevDay.disabled = isSameDate(selected, firstAvailableDate);
  els.nextDay.disabled = isToday;
  els.goToday.disabled = isToday;

  renderDateStrip(selected, today, firstAvailableDate);
  renderHabitList(els.todayHabits, dueSelected, { todayOnly: true, date: selected });
  renderHabitList(els.allHabits, habits, { todayOnly: false, date: today });
  renderInsights(today);
  renderCloudPanel();
  saveHabits();
}

function renderDateStrip(selected, today, firstAvailableDate) {
  els.weekStrip.innerHTML = "";

  for (let day = startOfDay(today); day >= firstAvailableDate; day = addDays(day, -1)) {
    const key = dateKey(day);
    const due = habits.filter((habit) => isHabitDue(habit, day));
    const done = due.filter((habit) => getRecordStatus(habit, key) === "done");
    const pill = document.createElement("button");
    pill.className = "day-pill";
    pill.type = "button";
    pill.classList.toggle("selected", key === dateKey(selected));
    pill.classList.toggle("today", key === dateKey(today));
    pill.classList.toggle("done", due.length > 0 && done.length === due.length);
    pill.setAttribute("aria-label", `בחירת ${formatFullDate(day)}`);
    pill.innerHTML = `<span>${dayLabels[day.getDay()]}</span><strong>${day.getDate()}</strong>`;
    pill.addEventListener("click", () => setSelectedDate(day));
    els.weekStrip.appendChild(pill);
  }

  window.requestAnimationFrame(() => {
    els.weekStrip.querySelector(".day-pill.selected")?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  });
}

function renderHabitList(container, items, options) {
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `<div class="empty-state">אין כאן הרגלים עדיין. אפשר להוסיף הרגל קטן וברור בלחיצה על +.</div>`;
    return;
  }

  items.forEach((habit) => {
    const listDate = startOfDay(options.date ?? new Date());
    const key = dateKey(listDate);
    const canMark = isHabitDue(habit, listDate) && !isFutureDate(listDate);
    const status = getRecordStatus(habit, key);
    const done = status === "done";
    const missed = status === "missed";
    const card = document.createElement("article");
    card.className = "habit-card";
    card.style.setProperty("--habit-color", habit.color);

    const daysText = habit.days.length === 7 ? "כל יום" : habit.days.map((day) => dayLabels[day]).join(", ");
    const note = habit.note ? ` · ${escapeText(habit.note)}` : "";
    const doneLabel = canMark ? (done ? "ביטול סימון בוצע" : "סימון כבוצע") : "ההרגל לא מתוכנן ליום הזה";
    const missedLabel = canMark ? (missed ? "ביטול סימון X" : "סימון X") : "ההרגל לא מתוכנן ליום הזה";
    const stats = getHabitStats(habit);

    card.innerHTML = `
      <div class="habit-actions">
        <button class="habit-mark ${done ? "done" : ""}" type="button" data-action="done" aria-label="${doneLabel}" ${canMark ? "" : "disabled"}>
          <span aria-hidden="true">✓</span>
        </button>
        <button class="habit-mark miss ${missed ? "missed" : ""}" type="button" data-action="missed" aria-label="${missedLabel}" ${canMark ? "" : "disabled"}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div class="habit-title">
        <h3>${escapeText(habit.name)}</h3>
        <p>${habit.time} · ${daysText}${note}</p>
      </div>
      <div class="habit-meta">
        <span class="streak">${stats.currentStreak} ימים</span>
        <button class="text-link" type="button">עריכה</button>
        <button class="text-link" type="button" data-action="stats">סטטיסטיקה</button>
      </div>
    `;

    card.querySelector('[data-action="done"]').addEventListener("click", () => setHabitStatus(habit.id, "done", listDate));
    card.querySelector('[data-action="missed"]').addEventListener("click", () => setHabitStatus(habit.id, "missed", listDate));
    card.querySelector(".text-link").addEventListener("click", () => openHabitDialog(habit.id));
    card.querySelector('[data-action="stats"]').addEventListener("click", () => openStatsDialog(habit.id));

    if (!options.todayOnly || isHabitDue(habit, listDate)) {
      container.appendChild(card);
    }
  });
}

function renderInsights(today) {
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(today, -index));
  const dueInWeek = weekDates.flatMap((day) => habits.filter((habit) => isHabitDue(habit, day)).map((habit) => [habit, day]));
  const doneInWeek = dueInWeek.filter(([habit, day]) => getRecordStatus(habit, dateKey(day)) === "done").length;
  const weekPercent = dueInWeek.length ? Math.round((doneInWeek / dueInWeek.length) * 100) : 0;
  const bestHabit = [...habits].sort((a, b) => getHabitStats(b).currentStreak - getHabitStats(a).currentStreak)[0];
  const totalDone = habits.reduce((sum, habit) => sum + countRecords(habit, "done"), 0);
  const activeDays = new Set(
    habits.flatMap((habit) => Object.entries(habit.records).filter(([, record]) => isDoneRecord(record)).map(([key]) => key)),
  ).size;

  els.statsGrid.innerHTML = `
    <div class="stat-card"><strong>${weekPercent}%</strong><span>השלמה בשבעת הימים האחרונים</span></div>
    <div class="stat-card"><strong>${bestHabit ? getHabitStats(bestHabit).currentStreak : 0}</strong><span>הרצף הארוך הפעיל ביותר</span></div>
    <div class="stat-card"><strong>${totalDone}</strong><span>סימונים שבוצעו בסך הכל</span></div>
    <div class="stat-card"><strong>${activeDays}</strong><span>ימים עם התקדמות</span></div>
  `;

  renderMonth(today);
}

function renderMonth(today) {
  const monthName = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(today);
  els.monthTitle.textContent = monthName;
  els.monthGrid.innerHTML = "";

  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  for (let blank = 0; blank < first.getDay(); blank += 1) {
    els.monthGrid.appendChild(document.createElement("span"));
  }

  for (let dayNumber = 1; dayNumber <= last.getDate(); dayNumber += 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), dayNumber);
    const key = dateKey(day);
    const hasProgress = habits.some((habit) => getRecordStatus(habit, key) === "done");
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.classList.toggle("has-progress", hasProgress);
    cell.classList.toggle("today", key === dateKey(today));
    cell.textContent = dayNumber;
    els.monthGrid.appendChild(cell);
  }
}

function setHabitStatus(id, nextStatus, date = selectedDate) {
  const habit = habits.find((item) => item.id === id);
  if (!habit) return;
  const targetDate = startOfDay(date);
  if (!isHabitDue(habit, targetDate) || isFutureDate(targetDate)) return;
  const key = dateKey(targetDate);
  const currentStatus = getRecordStatus(habit, key);
  if (currentStatus === nextStatus) {
    delete habit.records[key];
  } else {
    habit.records[key] = nextStatus === "done" ? true : "missed";
  }
  render();
  scheduleCloudUpload();
}

function setSelectedDate(date) {
  selectedDate = clampDateToTrackerRange(date);
  render();
}

function openStatsDialog(id) {
  const habit = habits.find((item) => item.id === id);
  if (!habit) return;
  const stats = getHabitStats(habit);
  els.statsHabitName.textContent = habit.name;
  els.habitStatsGrid.innerHTML = `
    <div class="stat-card"><strong>${stats.currentStreak}</strong><span>רצף נוכחי</span></div>
    <div class="stat-card"><strong>${stats.bestStreak}</strong><span>רצף שיא</span></div>
    <div class="stat-card"><strong>${stats.last30Percent}%</strong><span>הצלחה ב־30 ימים</span></div>
    <div class="stat-card"><strong>${stats.doneCount}</strong><span>סך הצלחות</span></div>
    <div class="stat-card"><strong>${stats.missedCount}</strong><span>סימוני X</span></div>
    <div class="stat-card"><strong>${stats.activeDays}</strong><span>ימים פעילים</span></div>
  `;
  els.goalList.innerHTML = GOAL_DAYS.map((goal) => {
    const progress = Math.min(stats.currentStreak, goal);
    const percent = Math.round((progress / goal) * 100);
    const reached = stats.currentStreak >= goal;
    return `
      <div class="goal-row ${reached ? "reached" : ""}">
        <div>
          <strong>${goal} ימים ברצף</strong>
          <span>${reached ? "הושג" : `${progress} מתוך ${goal}`}</span>
        </div>
        <div class="goal-bar" aria-label="התקדמות ליעד ${goal} ימים">
          <span style="width:${percent}%"></span>
        </div>
      </div>
    `;
  }).join("");
  els.statsDialog.showModal();
}

function openHabitDialog(id = null) {
  const habit = habits.find((item) => item.id === id);
  els.form.reset();
  els.habitId.value = habit?.id ?? "";
  els.dialogMode.textContent = habit ? "עריכת הרגל" : "הרגל חדש";
  els.deleteHabit.hidden = !habit;
  selectedDays = habit ? [...habit.days] : [0, 1, 2, 3, 4, 5, 6];
  selectedColor = habit?.color ?? colorOptions[0];
  els.habitName.value = habit?.name ?? "";
  els.habitTime.value = habit?.time ?? "בוקר";
  els.habitNote.value = habit?.note ?? "";
  syncPickers();
  els.dialog.showModal();
  els.habitName.focus();
}

function syncPickers() {
  els.dayPicker.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", selectedDays.includes(Number(button.dataset.day)));
  });

  els.colorPicker.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.color === selectedColor);
  });
}

function handleSave(event) {
  event.preventDefault();
  const id = els.habitId.value || crypto.randomUUID();
  const existing = habits.find((habit) => habit.id === id);
  const nextHabit = {
    id,
    name: els.habitName.value.trim(),
    time: els.habitTime.value,
    note: els.habitNote.value.trim(),
    days: selectedDays,
    color: selectedColor,
    records: existing?.records ?? {},
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  habits = existing ? habits.map((habit) => (habit.id === id ? nextHabit : habit)) : [nextHabit, ...habits];
  els.dialog.close();
  render();
  scheduleCloudUpload();
}

function handleDelete() {
  const id = els.habitId.value;
  if (!id) return;
  habits = habits.filter((habit) => habit.id !== id);
  els.dialog.close();
  render();
  scheduleCloudUpload();
}

function renderCloudPanel() {
  const hasToken = Boolean(getGitHubToken());
  const gistId = localStorage.getItem(CLOUD_GIST_KEY);
  els.githubToken.placeholder = hasToken ? "Token שמור במכשיר הזה" : "Token עם הרשאת gist";
  els.uploadCloud.disabled = cloudBusy || !hasToken;
  els.downloadCloud.disabled = cloudBusy || !hasToken || !gistId;

  if (!hasToken) {
    setCloudStatus("לא מחובר לענן. צור GitHub token עם הרשאת gist והדבק אותו כאן.", "idle");
  } else if (gistId) {
    setCloudStatus("מחובר לענן. שינויים חדשים יועלו אוטומטית אחרי סימון או עריכה.", "ok");
  } else {
    setCloudStatus("Token שמור. לחץ חיבור כדי לבדוק את GitHub וליצור גיבוי ראשון.", "idle");
  }
}

async function handleSaveGithubToken() {
  const token = els.githubToken.value.trim();
  if (!token && getGitHubToken()) {
    await initializeCloudConnection(getGitHubToken());
    return;
  }
  if (!token) {
    setCloudStatus("צריך להדביק token לפני החיבור.", "error");
    return;
  }
  localStorage.setItem(CLOUD_TOKEN_KEY, token);
  els.githubToken.value = "";
  setCloudStatus("בודק את החיבור מול GitHub...", "idle");
  updateCloudButtons();
  await initializeCloudConnection(token);
}

async function initializeCloudConnection(token) {
  if (cloudBusy) return;
  setCloudBusy(true);
  try {
    const profile = await githubRequest("/user", { method: "GET", token });
    const gist = await findCloudGist(token);
    if (gist) {
      localStorage.setItem(CLOUD_GIST_KEY, gist.id);
      setCloudStatus(`מחובר כ־${profile.login}. נמצא גיבוי קיים, אפשר לטעון או לשמור אליו.`, "ok");
    } else {
      setCloudStatus(`מחובר כ־${profile.login}. יוצר גיבוי פרטי ראשון...`, "idle");
      setCloudBusy(false);
      await uploadCloudData({ manual: true });
      updateCloudButtons();
      return;
    }
  } catch (error) {
    localStorage.removeItem(CLOUD_TOKEN_KEY);
    localStorage.removeItem(CLOUD_GIST_KEY);
    setCloudStatus(`החיבור נכשל: ${friendlyGitHubError(error.message)}`, "error");
  } finally {
    setCloudBusy(false);
    updateCloudButtons();
  }
}

async function findCloudGist(token) {
  const gists = await githubRequest("/gists?per_page=100", { method: "GET", token });
  return gists.find((gist) => Boolean(gist.files?.[CLOUD_FILE_NAME]));
}

function scheduleCloudUpload() {
  if (!getGitHubToken()) return;
  window.clearTimeout(cloudTimer);
  cloudTimer = window.setTimeout(() => uploadCloudData({ manual: false }), 900);
}

async function uploadCloudData({ manual }) {
  const token = getGitHubToken();
  if (!token || cloudBusy) return;

  setCloudBusy(true);
  try {
    const payload = {
      app: "retzef",
      version: 1,
      updatedAt: new Date().toISOString(),
      habits,
    };
    const content = JSON.stringify(payload, null, 2);
    let gistId = localStorage.getItem(CLOUD_GIST_KEY);

    if (!gistId) {
      const gist = await githubRequest("/gists", {
        method: "POST",
        token,
        body: {
          description: "Retzef habit tracker cloud data",
          public: false,
          files: {
            [CLOUD_FILE_NAME]: { content },
          },
        },
      });
      gistId = gist.id;
      localStorage.setItem(CLOUD_GIST_KEY, gistId);
    } else {
      await githubRequest(`/gists/${gistId}`, {
        method: "PATCH",
        token,
        body: {
          files: {
            [CLOUD_FILE_NAME]: { content },
          },
        },
      });
    }

    setCloudStatus(manual ? "נשמר לענן בהצלחה." : "סונכרן לענן.", "ok");
  } catch (error) {
    setCloudStatus(`שמירה לענן נכשלה: ${friendlyGitHubError(error.message)}`, "error");
  } finally {
    setCloudBusy(false);
    updateCloudButtons();
  }
}

async function downloadCloudData() {
  const token = getGitHubToken();
  const gistId = localStorage.getItem(CLOUD_GIST_KEY);
  if (!token || !gistId || cloudBusy) return;
  if (!window.confirm("טעינה מהענן תחליף את הנתונים במכשיר הזה. להמשיך?")) return;

  setCloudBusy(true);
  try {
    const gist = await githubRequest(`/gists/${gistId}`, { method: "GET", token });
    const file = gist.files?.[CLOUD_FILE_NAME];
    if (!file?.content) throw new Error("לא נמצא קובץ נתונים ב־Gist.");

    const payload = JSON.parse(file.content);
    if (!Array.isArray(payload.habits)) throw new Error("קובץ הענן לא תקין.");

    habits = payload.habits;
    saveHabits();
    render();
    setCloudStatus("הנתונים נטענו מהענן.", "ok");
  } catch (error) {
    setCloudStatus(`טעינה מהענן נכשלה: ${friendlyGitHubError(error.message)}`, "error");
  } finally {
    setCloudBusy(false);
    updateCloudButtons();
  }
}

async function githubRequest(path, options) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `GitHub החזיר שגיאה ${response.status}`;
    try {
      const error = await response.json();
      if (error.message) message = error.message;
    } catch {
      // Keep the generic HTTP message.
    }
    throw new Error(message);
  }

  return response.json();
}

function getGitHubToken() {
  return localStorage.getItem(CLOUD_TOKEN_KEY);
}

function setCloudBusy(value) {
  cloudBusy = value;
  updateCloudButtons();
}

function updateCloudButtons() {
  els.saveGithubToken.disabled = cloudBusy;
  els.uploadCloud.disabled = cloudBusy || !getGitHubToken();
  els.downloadCloud.disabled = cloudBusy || !getGitHubToken() || !localStorage.getItem(CLOUD_GIST_KEY);
}

function setCloudStatus(message, state) {
  els.cloudStatus.textContent = message;
  els.cloudStatus.dataset.state = state;
}

function friendlyGitHubError(message) {
  if (message.includes("Bad credentials")) return "ה־token לא תקין או בוטל.";
  if (message.includes("Requires authentication")) return "צריך token עם הרשאת gist.";
  if (message.includes("Resource not accessible")) return "ל־token אין הרשאת gist.";
  if (message.includes("API rate limit")) return "GitHub חסם זמנית בגלל יותר מדי בקשות.";
  return message;
}

function isHabitDue(habit, date) {
  return habit.days.includes(date.getDay());
}

function getStreak(habit) {
  return getHabitStats(habit).currentStreak;
}

function getHabitStats(habit) {
  const records = habit.records ?? {};
  const currentStreak = getCurrentStreak(habit);
  const bestStreak = getBestStreak(habit);
  const dueLast30 = Array.from({ length: 30 }, (_, index) => addDays(new Date(), -index)).filter((day) =>
    isHabitDue(habit, day),
  );
  const doneLast30 = dueLast30.filter((day) => getRecordStatus(habit, dateKey(day)) === "done").length;
  const last30Percent = dueLast30.length ? Math.round((doneLast30 / dueLast30.length) * 100) : 0;
  const doneCount = Object.values(records).filter((record) => isDoneRecord(record)).length;
  const missedCount = Object.values(records).filter((record) => isMissedRecord(record)).length;
  const activeDays = new Set(Object.keys(records).filter((key) => getRecordStatus(habit, key) !== "none")).size;

  return { currentStreak, bestStreak, last30Percent, doneCount, missedCount, activeDays };
}

function getCurrentStreak(habit) {
  let streak = 0;
  let cursor = new Date();

  for (let checked = 0; checked < 370; checked += 1) {
    if (isHabitDue(habit, cursor)) {
      if (getRecordStatus(habit, dateKey(cursor)) !== "done") break;
      streak += 1;
    }
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function getBestStreak(habit) {
  const recordDates = Object.keys(habit.records ?? {}).sort();
  if (!recordDates.length) return 0;
  const firstDate = parseDateKey(recordDates[0]);
  const today = new Date();
  let best = 0;
  let current = 0;
  let cursor = firstDate;

  while (cursor <= today) {
    if (isHabitDue(habit, cursor)) {
      if (getRecordStatus(habit, dateKey(cursor)) === "done") {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }

  return best;
}

function countRecords(habit, status) {
  return Object.values(habit.records ?? {}).filter((record) =>
    status === "done" ? isDoneRecord(record) : isMissedRecord(record),
  ).length;
}

function getRecordStatus(habit, key) {
  const record = habit.records?.[key];
  if (isDoneRecord(record)) return "done";
  if (isMissedRecord(record)) return "missed";
  return "none";
}

function isDoneRecord(record) {
  return record === true || record === "done";
}

function isMissedRecord(record) {
  return record === false || record === "missed" || record === "x";
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getTrackerStartDate() {
  const dates = habits.flatMap((habit) => [
    habit.createdAt ? startOfDay(new Date(habit.createdAt)) : null,
    ...Object.keys(habit.records ?? {}).map(parseDateKey),
  ]);
  const validDates = dates.filter((date) => date instanceof Date && !Number.isNaN(date.getTime()));
  if (!validDates.length) return startOfDay(new Date());
  return startOfDay(new Date(Math.min(...validDates.map((date) => date.getTime()))));
}

function clampDateToTrackerRange(date) {
  const nextDate = startOfDay(date);
  const firstDate = getTrackerStartDate();
  const today = startOfDay(new Date());
  if (nextDate < firstDate) return firstDate;
  if (nextDate > today) return today;
  return nextDate;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDate(first, second) {
  return dateKey(first) === dateKey(second);
}

function isFutureDate(date) {
  return startOfDay(date) > startOfDay(new Date());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

start();
