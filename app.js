const STORAGE_KEY = "retzef-habits-v1";
const READING_STORAGE_KEY = "retzef-reading-v1";
const CLOUD_TOKEN_KEY = "retzef-github-token-v1";
const CLOUD_GIST_KEY = "retzef-github-gist-id-v1";
const CLOUD_FILE_NAME = "retzef-habit-data.json";
const LOCAL_UPDATED_KEY = "retzef-local-updated-at-v1";
const SCREEN_TIME_ENDPOINT = "https://script.google.com/macros/s/AKfycbyLZh6huB1jR-sB52F5gf-vuo8ozelARbpC2wQPo2jLj-aicdiAb2z7zKC5vz7b2Rp9Qw/exec";
const SCREEN_TIME_HABIT_ID = "screen-time-under-3-hours-v1";
const SCREEN_TIME_AUTOMATION_TYPE = "screen-time-under-hours";
const SCREEN_TIME_HABIT_NAME = "שימוש בטלפון - פחות מ־3 שעות";
const GOAL_DAYS = [7, 30, 60, 100];
const DAILY_READING_GOAL = 5;
const dayLabels = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const colorOptions = ["#2f8f6f", "#4878c7", "#d86445", "#d7a528", "#7b62b3", "#2b8a9d", "#9a6a3a"];

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  todayTitle: document.querySelector("#todayTitle"),
  todaySummary: document.querySelector("#todaySummary"),
  todayRing: document.querySelector("#todayRing"),
  todayPercent: document.querySelector("#todayPercent"),
  scoreValue: document.querySelector("#scoreValue"),
  scoreDone: document.querySelector("#scoreDone"),
  scoreMissed: document.querySelector("#scoreMissed"),
  prevDay: document.querySelector("#prevDay"),
  goToday: document.querySelector("#goToday"),
  nextDay: document.querySelector("#nextDay"),
  weekStrip: document.querySelector("#weekStrip"),
  todayHabits: document.querySelector("#todayHabits"),
  allHabits: document.querySelector("#allHabits"),
  statsGrid: document.querySelector("#statsGrid"),
  googleAccount: document.querySelector("#googleAccount"),
  googleAvatar: document.querySelector("#googleAvatar"),
  googleName: document.querySelector("#googleName"),
  googleEmail: document.querySelector("#googleEmail"),
  connectGoogle: document.querySelector("#connectGoogle"),
  syncGoogle: document.querySelector("#syncGoogle"),
  disconnectGoogle: document.querySelector("#disconnectGoogle"),
  googleCloudStatus: document.querySelector("#googleCloudStatus"),
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
  habitTrackingModes: document.querySelectorAll('input[name="trackingMode"]'),
  habitTypes: document.querySelectorAll('input[name="habitType"]'),
  habitCountsTowardScore: document.querySelector("#habitCountsTowardScore"),
  dayPicker: document.querySelector("#dayPicker"),
  colorPicker: document.querySelector("#colorPicker"),
  deleteHabit: document.querySelector("#deleteHabit"),
  statsDialog: document.querySelector("#statsDialog"),
  closeStatsDialog: document.querySelector("#closeStatsDialog"),
  statsHabitName: document.querySelector("#statsHabitName"),
  habitStatsGrid: document.querySelector("#habitStatsGrid"),
  goalList: document.querySelector("#goalList"),
  statsPrevMonth: document.querySelector("#statsPrevMonth"),
  statsNextMonth: document.querySelector("#statsNextMonth"),
  habitCalendarTitle: document.querySelector("#habitCalendarTitle"),
  habitCalendarWeekdays: document.querySelector("#habitCalendarWeekdays"),
  habitCalendarGrid: document.querySelector("#habitCalendarGrid"),
  openAddBook: document.querySelector("#openAddBook"),
  readingScore: document.querySelector("#readingScore"),
  readingTotalPages: document.querySelector("#readingTotalPages"),
  readingElapsedDays: document.querySelector("#readingElapsedDays"),
  dailyReadingSummary: document.querySelector("#dailyReadingSummary"),
  dailyReadingValue: document.querySelector("#dailyReadingValue"),
  dailyReadingBar: document.querySelector("#dailyReadingBar"),
  bookList: document.querySelector("#bookList"),
  bookDialog: document.querySelector("#bookDialog"),
  bookForm: document.querySelector("#bookForm"),
  bookDialogMode: document.querySelector("#bookDialogMode"),
  closeBookDialog: document.querySelector("#closeBookDialog"),
  bookId: document.querySelector("#bookId"),
  bookTitle: document.querySelector("#bookTitle"),
  bookAuthor: document.querySelector("#bookAuthor"),
  bookTotalPages: document.querySelector("#bookTotalPages"),
  bookInitialPageLabel: document.querySelector("#bookInitialPageLabel"),
  bookInitialPage: document.querySelector("#bookInitialPage"),
  deleteBook: document.querySelector("#deleteBook"),
  pageDialog: document.querySelector("#pageDialog"),
  pageForm: document.querySelector("#pageForm"),
  closePageDialog: document.querySelector("#closePageDialog"),
  pageBookTitle: document.querySelector("#pageBookTitle"),
  pageBookId: document.querySelector("#pageBookId"),
  bookCurrentPage: document.querySelector("#bookCurrentPage"),
};

let habits = loadHabits();
let readingData = loadReadingData();
let selectedDate = startOfDay(new Date());
let selectedDays = [0, 1, 2, 3, 4, 5, 6];
let selectedColor = colorOptions[0];
let cloudTimer = null;
let cloudBusy = false;
let googleTimer = null;
let googleBusy = false;
let googleUser = null;
let googleCloudReady = false;
let dayRefreshTimer = null;
let statsHabitId = null;
let statsCalendarMonth = startOfMonth(new Date());
let screenTimeSyncPromise = null;

function start() {
  buildPickers();
  bindEvents();
  render();
  syncScreenTimeBonus();
  initializeGoogleCloud();
  scheduleNextDayRefresh();
  registerServiceWorker();
}

function loadHabits() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const normalized = normalizeHabits(parsed);
        if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
          localStorage.setItem(LOCAL_UPDATED_KEY, new Date().toISOString());
        }
        return normalized;
      }
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
      trackingMode: "streak",
      countsTowardScore: true,
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
      trackingMode: "streak",
      countsTowardScore: true,
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
      trackingMode: "streak",
      countsTowardScore: true,
      records: {},
      createdAt: new Date().toISOString(),
    },
  ];
}

function normalizeHabits(items) {
  return items.map(normalizeHabit);
}

function normalizeHabit(habit) {
  const percentageDefault = isPercentageMigrationHabit(habit?.name);
  const forcePercentage = isForcedPercentageHabit(habit?.name);
  const isBonus = habit?.isBonus === true;
  const normalizedDays = Array.isArray(habit?.days)
    ? [...new Set(habit.days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
    : [];
  const trackingMode = forcePercentage
    ? "percentage"
    : habit?.trackingMode === "percentage" || habit?.trackingMode === "streak"
      ? habit.trackingMode
      : percentageDefault ? "percentage" : "streak";
  const countsTowardScore = isBonus
    ? true
    : forcePercentage
    ? false
    : typeof habit?.countsTowardScore === "boolean"
      ? habit.countsTowardScore
      : !percentageDefault;

  return {
    ...habit,
    id: habit?.id || crypto.randomUUID(),
    name: String(habit?.name || "הרגל ללא שם"),
    time: String(habit?.time || "גמיש"),
    note: String(habit?.note || ""),
    days: normalizedDays.length ? normalizedDays : [0, 1, 2, 3, 4, 5, 6],
    color: habit?.color || colorOptions[0],
    trackingMode,
    isBonus,
    countsTowardScore,
    records: habit?.records && typeof habit.records === "object" ? habit.records : {},
    createdAt: habit?.createdAt || new Date().toISOString(),
  };
}

function isPercentageMigrationHabit(name) {
  const words = String(name || "")
    .trim()
    .split(/[^\u0590-\u05ff]+/)
    .filter(Boolean);
  return words.includes("טלפון") || words.includes("חצי");
}

function isForcedPercentageHabit(name) {
  const compactName = String(name || "").trim().replaceAll(" ", "");
  return compactName === "ק.ר";
}

function saveHabits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function loadReadingData() {
  const saved = localStorage.getItem(READING_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed?.books)) {
        return {
          startedAt: parsed.startedAt ?? null,
          books: parsed.books.map(normalizeBook),
        };
      }
    } catch {
      localStorage.removeItem(READING_STORAGE_KEY);
    }
  }
  return { startedAt: null, books: [] };
}

function normalizeBook(book) {
  const startPage = Math.max(0, Math.round(Number(book.startPage) || 0));
  const savedCurrentPage = Number(book.currentPage);
  const currentPage = Math.max(0, Math.round(Number.isFinite(savedCurrentPage) ? savedCurrentPage : startPage));
  const totalPages = Number(book.totalPages) > 0 ? Math.round(Number(book.totalPages)) : null;
  return {
    id: book.id || crypto.randomUUID(),
    title: String(book.title || "ספר ללא שם"),
    author: String(book.author || ""),
    totalPages,
    startPage,
    currentPage: totalPages ? Math.min(currentPage, totalPages) : currentPage,
    pageLog: book.pageLog && typeof book.pageLog === "object" ? book.pageLog : {},
    createdAt: book.createdAt || new Date().toISOString(),
  };
}

function saveReadingData() {
  localStorage.setItem(READING_STORAGE_KEY, JSON.stringify(readingData));
}

function bindEvents() {
  document.querySelector("#openAdd").addEventListener("click", () => openHabitDialog());
  document.querySelector("#openAddSecondary").addEventListener("click", () => openHabitDialog());
  document.querySelector("#closeDialog").addEventListener("click", () => els.dialog.close());
  els.closeStatsDialog.addEventListener("click", () => els.statsDialog.close());
  els.statsPrevMonth.addEventListener("click", () => changeStatsCalendarMonth(-1));
  els.statsNextMonth.addEventListener("click", () => changeStatsCalendarMonth(1));
  els.prevDay.addEventListener("click", () => setSelectedDate(addDays(selectedDate, -1)));
  els.goToday.addEventListener("click", () => setSelectedDate(new Date()));
  els.nextDay.addEventListener("click", () => setSelectedDate(addDays(selectedDate, 1)));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  els.form.addEventListener("submit", handleSave);
  els.habitTypes.forEach((input) => input.addEventListener("change", syncHabitTypeControls));
  els.deleteHabit.addEventListener("click", handleDelete);
  els.connectGoogle.addEventListener("click", handleConnectGoogle);
  els.syncGoogle.addEventListener("click", () => reconcileGoogleCloud({ manual: true }));
  els.disconnectGoogle.addEventListener("click", handleDisconnectGoogle);
  els.saveGithubToken.addEventListener("click", handleSaveGithubToken);
  els.uploadCloud.addEventListener("click", () => uploadCloudData({ manual: true }));
  els.downloadCloud.addEventListener("click", downloadCloudData);
  els.openAddBook.addEventListener("click", () => openBookDialog());
  els.closeBookDialog.addEventListener("click", () => els.bookDialog.close());
  els.bookForm.addEventListener("submit", handleBookSave);
  els.deleteBook.addEventListener("click", handleBookDelete);
  els.closePageDialog.addEventListener("click", () => els.pageDialog.close());
  els.pageForm.addEventListener("submit", handlePageUpdate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncScreenTimeBonus();
  });
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

  els.todayLabel.textContent = formatFullDate(selected);
  els.todayTitle.textContent = isToday ? "המשימות של היום" : "סימון יום נבחר";
  els.todaySummary.textContent = dueSelected.length
    ? `${doneSelected.length} מתוך ${dueSelected.length} סומנו בהצלחה ביום הזה`
    : "אין הרגלים מתוכננים ליום הזה.";
  els.todayPercent.textContent = `${percent}%`;
  els.todayRing.style.setProperty("--progress", `${percent * 3.6}deg`);
  const firstAvailableDate = getTrackerStartDate();
  els.prevDay.disabled = isSameDate(selected, firstAvailableDate);
  els.nextDay.disabled = isToday;
  els.goToday.disabled = isToday;

  renderDateStrip(selected, today, firstAvailableDate);
  renderScore(today);
  renderHabitList(els.todayHabits, dueSelected, { todayOnly: true, date: selected });
  renderHabitList(els.allHabits, habits, { todayOnly: false, date: today });
  renderReading(today);
  renderInsights(today);
  renderCloudPanel();
  saveHabits();
  saveReadingData();
}

function renderScore(today) {
  const summary = getScoreSummary(today);
  els.scoreValue.textContent = summary.score.toLocaleString("he-IL");
  els.scoreDone.textContent = summary.done.toLocaleString("he-IL");
  els.scoreMissed.textContent = summary.missed.toLocaleString("he-IL");
}

function renderReading(today) {
  const stats = getReadingStats(today);
  els.readingScore.textContent = stats.score.toLocaleString("he-IL");
  els.readingTotalPages.textContent = stats.totalPages.toLocaleString("he-IL");
  els.readingElapsedDays.textContent = stats.elapsedDays.toLocaleString("he-IL");
  els.dailyReadingValue.textContent = `${stats.todayPages}/${DAILY_READING_GOAL}`;
  els.dailyReadingSummary.textContent = stats.todayPages >= DAILY_READING_GOAL
    ? `${stats.todayPages} עמודים היום · היעד הושג`
    : `${stats.todayPages} מתוך ${DAILY_READING_GOAL} עמודים`;
  els.dailyReadingBar.style.width = `${Math.min(100, (stats.todayPages / DAILY_READING_GOAL) * 100)}%`;

  els.bookList.innerHTML = "";
  if (!readingData.books.length) {
    els.bookList.innerHTML = `<div class="empty-state">עדיין אין ספרים במעקב. הוסף ספר כדי להתחיל לצבור נקודות קריאה.</div>`;
    return;
  }

  readingData.books.forEach((book) => {
    const pagesRead = Math.max(0, book.currentPage - book.startPage);
    const completed = Boolean(book.totalPages && book.currentPage >= book.totalPages);
    const progress = book.totalPages ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)) : null;
    const card = document.createElement("article");
    card.className = `book-card${completed ? " completed" : ""}`;
    card.innerHTML = `
      <div class="book-heading">
        <div>
          <h3>${escapeText(book.title)}</h3>
          <p>${book.author ? escapeText(book.author) : "ספר נוכחי"}</p>
        </div>
        <span class="book-status">${completed ? "הושלם" : `${pagesRead} נקודות`}</span>
      </div>
      <div class="book-page-line">
        <strong>עמוד ${book.currentPage.toLocaleString("he-IL")}${book.totalPages ? ` מתוך ${book.totalPages.toLocaleString("he-IL")}` : ""}</strong>
        ${progress === null ? "" : `<span>${progress}%</span>`}
      </div>
      ${progress === null ? "" : `<div class="book-progress" aria-label="${progress}% מהספר"><span style="width:${progress}%"></span></div>`}
      <div class="book-controls">
        <div class="page-stepper" aria-label="עדכון עמוד בצעד אחד">
          <button type="button" data-action="decrease" aria-label="הפחתת עמוד" ${book.currentPage <= 0 ? "disabled" : ""}>−</button>
          <output dir="ltr">${book.currentPage.toLocaleString("he-IL")}</output>
          <button type="button" data-action="increase" aria-label="הוספת עמוד" ${completed ? "disabled" : ""}>+</button>
        </div>
        <div class="book-actions">
          <button class="text-link" type="button" data-action="progress">עדכון עמוד</button>
          <button class="text-link" type="button" data-action="edit">עריכה</button>
        </div>
      </div>
    `;

    card.querySelector('[data-action="decrease"]').addEventListener("click", () => updateBookPage(book.id, book.currentPage - 1));
    card.querySelector('[data-action="increase"]').addEventListener("click", () => updateBookPage(book.id, book.currentPage + 1));
    card.querySelector('[data-action="progress"]').addEventListener("click", () => openPageDialog(book.id));
    card.querySelector('[data-action="edit"]').addEventListener("click", () => openBookDialog(book.id));
    els.bookList.appendChild(card);
  });
}

function getReadingStats(today = new Date()) {
  const totalPages = readingData.books.reduce(
    (sum, book) => sum + Math.max(0, book.currentPage - book.startPage),
    0,
  );
  const elapsedDays = readingData.startedAt
    ? Math.max(0, calendarDayNumber(today) - calendarDayNumber(new Date(readingData.startedAt)))
    : 0;
  const todayKey = dateKey(today);
  const todayPages = Math.max(
    0,
    readingData.books.reduce((sum, book) => sum + (Number(book.pageLog?.[todayKey]) || 0), 0),
  );
  return { totalPages, elapsedDays, todayPages, score: totalPages - elapsedDay…6274 tokens truncated…edAt: reading.startedAt ?? null,
    books: reading.books.map(normalizeBook),
  };
}

function touchLocalData() {
  localStorage.setItem(LOCAL_UPDATED_KEY, new Date().toISOString());
}

async function syncScreenTimeBonus() {
  if (screenTimeSyncPromise) return screenTimeSyncPromise;
  screenTimeSyncPromise = performScreenTimeSync();

  try {
    return await screenTimeSyncPromise;
  } finally {
    screenTimeSyncPromise = null;
  }
}

async function performScreenTimeSync() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(SCREEN_TIME_ENDPOINT, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Screen Time sync failed (${response.status})`);

    const payload = await response.json();
    if (!payload?.ok || Number(payload.thresholdHours) !== 3) {
      throw new Error(payload?.error || "Screen Time response is invalid");
    }

    const todayKey = dateKey(new Date());
    const isValidPastDate = (key) => /^\d{4}-\d{2}-\d{2}$/.test(key) && key <= todayKey;
    const measuredDates = [...new Set((payload.measuredDates ?? []).map(String).filter(isValidPastDate))].sort();
    const successDates = [...new Set((payload.successDates ?? []).map(String).filter(isValidPastDate))].sort();
    const successSet = new Set(successDates);
    const existingIndex = habits.findIndex((habit) =>
      habit.id === SCREEN_TIME_HABIT_ID
      || habit.automation?.type === SCREEN_TIME_AUTOMATION_TYPE
      || habit.name === SCREEN_TIME_HABIT_NAME,
    );
    const existing = existingIndex >= 0 ? habits[existingIndex] : null;
    const records = { ...(existing?.records ?? {}) };
    const previouslySynced = Array.isArray(existing?.automation?.syncedSuccessDates)
      ? existing.automation.syncedSuccessDates.map(String)
      : [];

    previouslySynced.forEach((key) => {
      if (!successSet.has(key) && isDoneRecord(records[key])) delete records[key];
    });
    successDates.forEach((key) => {
      records[key] = "done";
    });

    const firstMeasuredDate = measuredDates[0] || todayKey;
    const nextHabit = normalizeHabit({
      ...(existing ?? {}),
      id: existing?.id || SCREEN_TIME_HABIT_ID,
      name: existing?.name || SCREEN_TIME_HABIT_NAME,
      time: existing?.time || "גמיש",
      note: existing?.note || "מתעדכן אוטומטית מ־Screen Time",
      days: existing?.days || [0, 1, 2, 3, 4, 5, 6],
      color: existing?.color || "#d7a528",
      trackingMode: "percentage",
      isBonus: true,
      countsTowardScore: true,
      records,
      createdAt: existing?.createdAt || `${firstMeasuredDate}T00:00:00`,
      automation: {
        type: SCREEN_TIME_AUTOMATION_TYPE,
        thresholdHours: 3,
        sourceFileId: "1aWX3cTO9io576eCRU9DysCW50IX7ivfM",
        sourceUpdatedAt: String(payload.sourceUpdatedAt || ""),
        syncedSuccessDates: successDates,
      },
    });

    if (existing && JSON.stringify(nextHabit) === JSON.stringify(existing)) return false;
    if (existingIndex >= 0) habits = habits.map((habit, index) => (index === existingIndex ? nextHabit : habit));
    else habits = [nextHabit, ...habits];

    touchLocalData();
    render();
    scheduleCloudUpload();
    return true;
  } catch (error) {
    console.warn("Screen Time sync unavailable", error);
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

function updateGoogleCloudPanel() {
  const connected = Boolean(googleUser);
  els.googleAccount.hidden = !connected;
  els.connectGoogle.hidden = connected;
  els.syncGoogle.hidden = !connected;
  els.disconnectGoogle.hidden = !connected;
  els.connectGoogle.disabled = googleBusy || !googleCloudReady;
  els.syncGoogle.disabled = googleBusy;
  els.disconnectGoogle.disabled = googleBusy;
  els.connectGoogle.parentElement.classList.toggle("connected", connected);

  if (connected) {
    els.googleName.textContent = googleUser.displayName || "חשבון Google";
    els.googleEmail.textContent = googleUser.email || "";
    els.googleAvatar.src = googleUser.photoURL || "";
  }
}

function setGoogleBusy(value) {
  googleBusy = value;
  updateGoogleCloudPanel();
}

function setGoogleCloudStatus(message, state) {
  els.googleCloudStatus.textContent = message;
  els.googleCloudStatus.dataset.state = state;
}

function friendlyFirebaseError(error) {
  const code = error?.code ?? "";
  if (code.includes("popup-closed-by-user")) return "חלון ההתחברות נסגר לפני הסיום.";
  if (code.includes("popup-blocked")) return "הדפדפן חסם את חלון ההתחברות.";
  if (code.includes("cancelled-popup-request")) return "חלון התחברות אחר כבר פתוח.";
  if (code.includes("web-storage-unsupported")) return "הדפדפן חוסם שמירת התחברות. יש לאפשר קובצי Cookie.";
  if (code.includes("operation-not-supported-in-this-environment")) {
    return "לא ניתן לפתוח התחברות במצב הגלישה הנוכחי. יש לפתוח את האתר ישירות ב־Safari.";
  }
  if (code.includes("unauthorized-domain")) return "כתובת האפליקציה עדיין לא מורשית ב־Firebase.";
  if (code.includes("permission-denied")) return "אין הרשאה לקרוא או לשמור את הנתונים.";
  if (code.includes("network-request-failed") || code.includes("unavailable")) return "אין כרגע חיבור תקין לאינטרנט.";
  return error?.message || "אירעה שגיאה לא צפויה.";
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
  if (getGitHubToken()) {
    window.clearTimeout(cloudTimer);
    cloudTimer = window.setTimeout(() => uploadCloudData({ manual: false }), 900);
  }
  if (googleUser) {
    window.clearTimeout(googleTimer);
    googleTimer = window.setTimeout(() => uploadGoogleData({ manual: false }), 900);
  }
}

async function uploadCloudData({ manual }) {
  const token = getGitHubToken();
  if (!token || cloudBusy) return;

  setCloudBusy(true);
  try {
    const payload = {
      app: "retzef",
      version: 4,
      updatedAt: new Date().toISOString(),
      habits,
      reading: readingData,
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

    const normalizedHabits = normalizeHabits(payload.habits);
    const migrated = JSON.stringify(normalizedHabits) !== JSON.stringify(payload.habits);
    habits = normalizedHabits;
    applyReadingPayload(payload.reading);
    saveHabits();
    saveReadingData();
    render();
    if (migrated) {
      touchLocalData();
      scheduleCloudUpload();
    }
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
  const last30Percent = getSuccessPercentForPeriod(habit, 30);
  const doneCount = Object.values(records).filter((record) => isDoneRecord(record)).length;
  const missedCount = Object.values(records).filter((record) => isMissedRecord(record)).length;
  const markedCount = doneCount + missedCount;
  const activeDays = new Set(Object.keys(records).filter((key) => getRecordStatus(habit, key) !== "none")).size;
  const eligibleHabitDays = getEligibleHabitDays(habit);
  const eligibleDays = eligibleHabitDays.length;
  const successPercent = markedCount ? Math.round((doneCount / markedCount) * 1000) / 10 : 0;

  return { currentStreak, bestStreak, last30Percent, successPercent, doneCount, missedCount, markedCount, activeDays, eligibleDays };
}

function getEligibleHabitDays(habit, period = null) {
  const today = startOfDay(new Date());
  const habitStart = getHabitStartDate(habit);
  const periodStart = period ? addDays(today, -(period - 1)) : habitStart;
  const firstDay = periodStart > habitStart ? periodStart : habitStart;
  const days = [];

  for (let cursor = firstDay; cursor <= today; cursor = addDays(cursor, 1)) {
    if (isHabitDue(habit, cursor)) days.push(cursor);
  }
  return days;
}

function getHabitStartDate(habit) {
  const created = startOfDay(new Date(habit.createdAt));
  const firstRecordKey = Object.keys(habit.records ?? {}).sort()[0];
  const firstRecord = firstRecordKey ? parseDateKey(firstRecordKey) : null;
  if (Number.isNaN(created.getTime())) return firstRecord ?? startOfDay(new Date());
  return firstRecord && firstRecord < created ? firstRecord : created;
}

function getSuccessPercentForPeriod(habit, period) {
  const today = startOfDay(new Date());
  const firstKey = dateKey(addDays(today, -(period - 1)));
  const lastKey = dateKey(today);
  const records = Object.entries(habit.records ?? {}).filter(([key, record]) =>
    key >= firstKey && key <= lastKey && (isDoneRecord(record) || isMissedRecord(record)),
  );
  if (!records.length) return 0;
  const done = records.filter(([, record]) => isDoneRecord(record)).length;
  return Math.round((done / records.length) * 1000) / 10;
}

function formatPercent(value) {
  return Number(value || 0).toFixed(1);
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

function getScoreSummary(untilDate = new Date()) {
  const lastKey = dateKey(startOfDay(untilDate));
  let done = 0;
  let missed = 0;

  habits.forEach((habit) => {
    if (habit.countsTowardScore === false) return;
    Object.entries(habit.records ?? {}).forEach(([key, record]) => {
      if (key > lastKey) return;
      if (isDoneRecord(record)) done += 1;
      if (!habit.isBonus && isMissedRecord(record)) missed += 1;
    });
  });

  return { done, missed, score: done - missed * 5 };
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

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
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

function calendarDayNumber(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
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
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    if (hadController) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    navigator.serviceWorker
      .register("sw.js?v=31")
      .then((registration) => registration.update())
      .catch(() => {});
  }
}

start();

