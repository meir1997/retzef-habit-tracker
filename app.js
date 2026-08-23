const STORAGE_KEY = "retzef-habits-v1";
const READING_STORAGE_KEY = "retzef-reading-v1";
const CLOUD_TOKEN_KEY = "retzef-github-token-v1";
const CLOUD_GIST_KEY = "retzef-github-gist-id-v1";
const CLOUD_FILE_NAME = "retzef-habit-data.json";
const LOCAL_UPDATED_KEY = "retzef-local-updated-at-v1";
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
  habitCountsTowardScore: document.querySelector("#habitCountsTowardScore"),
  dayPicker: document.querySelector("#dayPicker"),
  colorPicker: document.querySelector("#colorPicker"),
  deleteHabit: document.querySelector("#deleteHabit"),
  statsDialog: document.querySelector("#statsDialog"),
  closeStatsDialog: document.querySelector("#closeStatsDialog"),
  statsHabitName: document.querySelector("#statsHabitName"),
  habitStatsGrid: document.querySelector("#habitStatsGrid"),
  goalList: document.querySelector("#goalList"),
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

function start() {
  buildPickers();
  bindEvents();
  render();
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
  const normalizedDays = Array.isArray(habit?.days)
    ? [...new Set(habit.days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
    : [];
  const trackingMode = habit?.trackingMode === "percentage" || habit?.trackingMode === "streak"
    ? habit.trackingMode
    : percentageDefault ? "percentage" : "streak";
  const countsTowardScore = typeof habit?.countsTowardScore === "boolean"
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
  els.prevDay.addEventListener("click", () => setSelectedDate(addDays(selectedDate, -1)));
  els.goToday.addEventListener("click", () => setSelectedDate(new Date()));
  els.nextDay.addEventListener("click", () => setSelectedDate(addDays(selectedDate, 1)));

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  els.form.addEventListener("submit", handleSave);
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
  return { totalPages, elapsedDays, todayPages, score: totalPages - elapsedDays * DAILY_READING_GOAL };
}

function openBookDialog(id = null) {
  const book = readingData.books.find((item) => item.id === id);
  els.bookForm.reset();
  els.bookId.value = book?.id ?? "";
  els.bookDialogMode.textContent = book ? "עריכת ספר" : "ספר חדש";
  els.bookTitle.value = book?.title ?? "";
  els.bookAuthor.value = book?.author ?? "";
  els.bookTotalPages.value = book?.totalPages ?? "";
  els.bookInitialPage.value = book?.startPage ?? 0;
  els.bookInitialPageLabel.hidden = Boolean(book);
  els.deleteBook.hidden = !book;
  els.bookDialog.showModal();
  els.bookTitle.focus();
}

function handleBookSave(event) {
  event.preventDefault();
  const id = els.bookId.value || crypto.randomUUID();
  const existing = readingData.books.find((book) => book.id === id);
  const totalPagesValue = Math.max(0, Math.round(Number(els.bookTotalPages.value) || 0));
  const totalPages = totalPagesValue || null;

  if (existing) {
    const previousPage = existing.currentPage;
    existing.title = els.bookTitle.value.trim();
    existing.author = els.bookAuthor.value.trim();
    existing.totalPages = totalPages;
    if (totalPages && existing.currentPage > totalPages) {
      existing.currentPage = totalPages;
      recordBookPageChange(existing, existing.currentPage - previousPage);
    }
  } else {
    const enteredPage = Math.max(0, Math.round(Number(els.bookInitialPage.value) || 0));
    const initialPage = totalPages ? Math.min(enteredPage, totalPages) : enteredPage;
    readingData.books.unshift({
      id,
      title: els.bookTitle.value.trim(),
      author: els.bookAuthor.value.trim(),
      totalPages,
      startPage: initialPage,
      currentPage: initialPage,
      pageLog: {},
      createdAt: new Date().toISOString(),
    });
    if (!readingData.startedAt) readingData.startedAt = new Date().toISOString();
  }

  els.bookDialog.close();
  commitReadingChange();
}

function handleBookDelete() {
  const id = els.bookId.value;
  const book = readingData.books.find((item) => item.id === id);
  if (!book) return;
  if (!window.confirm(`למחוק את “${book.title}” ואת נקודות הקריאה שלו?`)) return;
  readingData.books = readingData.books.filter((item) => item.id !== id);
  els.bookDialog.close();
  commitReadingChange();
}

function openPageDialog(id) {
  const book = readingData.books.find((item) => item.id === id);
  if (!book) return;
  els.pageBookId.value = book.id;
  els.pageBookTitle.textContent = book.title;
  els.bookCurrentPage.value = book.currentPage;
  els.bookCurrentPage.max = book.totalPages ?? "";
  els.pageDialog.showModal();
  els.bookCurrentPage.focus();
  els.bookCurrentPage.select();
}

function handlePageUpdate(event) {
  event.preventDefault();
  updateBookPage(els.pageBookId.value, Number(els.bookCurrentPage.value));
  els.pageDialog.close();
}

function updateBookPage(id, nextPageValue) {
  const book = readingData.books.find((item) => item.id === id);
  if (!book) return;
  let nextPage = Math.max(0, Math.round(Number(nextPageValue) || 0));
  if (book.totalPages) nextPage = Math.min(nextPage, book.totalPages);
  const difference = nextPage - book.currentPage;
  if (!difference) return;
  book.currentPage = nextPage;
  recordBookPageChange(book, difference);
  commitReadingChange();
}

function recordBookPageChange(book, difference) {
  if (!difference) return;
  const key = dateKey(new Date());
  const nextValue = (Number(book.pageLog?.[key]) || 0) + difference;
  book.pageLog = book.pageLog ?? {};
  if (nextValue) book.pageLog[key] = nextValue;
  else delete book.pageLog[key];
}

function commitReadingChange() {
  touchLocalData();
  render();
  scheduleCloudUpload();
}

function scheduleNextDayRefresh() {
  window.clearTimeout(dayRefreshTimer);
  const now = new Date();
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  dayRefreshTimer = window.setTimeout(() => {
    render();
    scheduleNextDayRefresh();
  }, nextDay.getTime() - now.getTime());
}

function renderDateStrip(selected, today, firstAvailableDate) {
  els.weekStrip.innerHTML = "";

  for (let day = startOfDay(firstAvailableDate); day <= startOfDay(today); day = addDays(day, 1)) {
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
        <span class="streak">${habit.trackingMode === "percentage" ? `${formatPercent(stats.successPercent)}% הצלחה` : `${stats.currentStreak} ימים`}</span>
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
  const streakHabits = habits.filter((habit) => habit.trackingMode !== "percentage");
  const bestHabit = [...streakHabits].sort((a, b) => getHabitStats(b).currentStreak - getHabitStats(a).currentStreak)[0];
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
  touchLocalData();
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
  if (habit.trackingMode === "percentage") {
    els.habitStatsGrid.innerHTML = `
      <div class="stat-card"><strong>${formatPercent(stats.successPercent)}%</strong><span>אחוז הצלחה כולל</span></div>
      <div class="stat-card"><strong>${formatPercent(stats.last30Percent)}%</strong><span>הצלחה ב־30 ימים</span></div>
      <div class="stat-card"><strong>${stats.doneCount}</strong><span>סך הצלחות</span></div>
      <div class="stat-card"><strong>${stats.missedCount}</strong><span>סימוני X</span></div>
      <div class="stat-card"><strong>${stats.markedCount}</strong><span>ימים בחישוב</span></div>
      <div class="stat-card"><strong>${habit.countsTowardScore ? "כן" : "לא"}</strong><span>נכלל בניקוד</span></div>
    `;
    els.goalList.innerHTML = GOAL_DAYS.map((period) => {
      const percent = getSuccessPercentForPeriod(habit, period);
      return `
        <div class="goal-row ${percent === 100 ? "reached" : ""}">
          <div>
            <strong>${period} ימים אחרונים</strong>
            <span>${formatPercent(percent)}% הצלחה</span>
          </div>
          <div class="goal-bar" aria-label="${formatPercent(percent)}% הצלחה ב־${period} ימים אחרונים">
            <span style="width:${percent}%"></span>
          </div>
        </div>
      `;
    }).join("");
  } else {
    els.habitStatsGrid.innerHTML = `
      <div class="stat-card"><strong>${stats.currentStreak}</strong><span>רצף נוכחי</span></div>
      <div class="stat-card"><strong>${stats.bestStreak}</strong><span>רצף שיא</span></div>
      <div class="stat-card"><strong>${formatPercent(stats.last30Percent)}%</strong><span>הצלחה ב־30 ימים</span></div>
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
  }
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
  const trackingMode = habit?.trackingMode ?? "streak";
  els.habitTrackingModes.forEach((input) => {
    input.checked = input.value === trackingMode;
  });
  els.habitCountsTowardScore.checked = habit?.countsTowardScore ?? true;
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
    trackingMode: [...els.habitTrackingModes].find((input) => input.checked)?.value ?? "streak",
    countsTowardScore: els.habitCountsTowardScore.checked,
    records: existing?.records ?? {},
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  habits = existing ? habits.map((habit) => (habit.id === id ? nextHabit : habit)) : [nextHabit, ...habits];
  els.dialog.close();
  touchLocalData();
  render();
  scheduleCloudUpload();
}

function handleDelete() {
  const id = els.habitId.value;
  if (!id) return;
  habits = habits.filter((habit) => habit.id !== id);
  els.dialog.close();
  touchLocalData();
  render();
  scheduleCloudUpload();
}

function initializeGoogleCloud() {
  const firebase = window.retzefFirebase;
  if (!firebase) {
    window.addEventListener("retzef-firebase-ready", initializeGoogleCloud, { once: true });
    return;
  }

  googleCloudReady = firebase.configured;
  if (!firebase.configured) {
    setGoogleCloudStatus("החיבור ל־Google עדיין לא הושלם.", "error");
    updateGoogleCloudPanel();
    return;
  }

  firebase.onUserChanged((user) => {
    googleUser = user;
    updateGoogleCloudPanel();
    if (user && !googleBusy) {
      reconcileGoogleCloud({ manual: false });
    } else if (!user && !googleBusy) {
      setGoogleCloudStatus("לא מחובר. אפשר להתחבר עם חשבון Google כדי לסנכרן בין המכשירים.", "idle");
    }
  });
}

async function handleConnectGoogle() {
  const firebase = window.retzefFirebase;
  if (!firebase?.configured || googleBusy) return;

  setGoogleBusy(true);
  setGoogleCloudStatus("פותח התחברות מאובטחת של Google...", "idle");
  try {
    googleUser = await firebase.signIn();
    updateGoogleCloudPanel();
  } catch (error) {
    setGoogleCloudStatus(`ההתחברות נכשלה: ${friendlyFirebaseError(error)}`, "error");
    return;
  } finally {
    setGoogleBusy(false);
  }

  await reconcileGoogleCloud({ manual: false });
}

async function handleDisconnectGoogle() {
  const firebase = window.retzefFirebase;
  if (!firebase || googleBusy) return;
  setGoogleBusy(true);
  try {
    await firebase.signOut();
    googleUser = null;
    setGoogleCloudStatus("התנתקת מ־Google. הנתונים נשארו שמורים במכשיר.", "idle");
  } catch (error) {
    setGoogleCloudStatus(`ההתנתקות נכשלה: ${friendlyFirebaseError(error)}`, "error");
  } finally {
    setGoogleBusy(false);
    updateGoogleCloudPanel();
  }
}

async function reconcileGoogleCloud({ manual }) {
  const firebase = window.retzefFirebase;
  if (!firebase?.configured || !googleUser || googleBusy) return;

  setGoogleBusy(true);
  setGoogleCloudStatus("מסנכרן עם Google...", "idle");
  try {
    const remote = await firebase.download();
    const localUpdatedAt = localStorage.getItem(LOCAL_UPDATED_KEY);

    if (!remote) {
      const payload = createCloudPayload();
      await firebase.upload(payload);
      setGoogleCloudStatus("הנתונים נשמרו ב־Google.", "ok");
      return;
    }

    if (!Array.isArray(remote.habits)) throw new Error("נתוני הענן אינם תקינים.");

    const remoteTime = Date.parse(remote.updatedAt ?? "") || 0;
    const localTime = Date.parse(localUpdatedAt ?? "") || 0;

    if (remoteTime > localTime) {
      applyCloudPayload(remote);
      setGoogleCloudStatus("הנתונים העדכניים נטענו מ־Google.", "ok");
    } else if (localTime > remoteTime) {
      await firebase.upload(createCloudPayload());
      setGoogleCloudStatus("השינויים נשמרו ב־Google.", "ok");
    } else {
      setGoogleCloudStatus(manual ? "הכול מעודכן בכל המכשירים." : "מחובר ומסונכרן עם Google.", "ok");
    }
  } catch (error) {
    setGoogleCloudStatus(`הסנכרון נכשל: ${friendlyFirebaseError(error)}`, "error");
  } finally {
    setGoogleBusy(false);
    updateGoogleCloudPanel();
  }
}

async function uploadGoogleData({ manual }) {
  const firebase = window.retzefFirebase;
  if (!firebase?.configured || !googleUser || googleBusy) return;

  setGoogleBusy(true);
  if (manual) setGoogleCloudStatus("שומר ב־Google...", "idle");
  try {
    await firebase.upload(createCloudPayload());
    setGoogleCloudStatus(manual ? "נשמר ב־Google בהצלחה." : "סונכרן עם Google.", "ok");
  } catch (error) {
    setGoogleCloudStatus(`השמירה ב־Google נכשלה: ${friendlyFirebaseError(error)}`, "error");
  } finally {
    setGoogleBusy(false);
    updateGoogleCloudPanel();
  }
}

function createCloudPayload() {
  const updatedAt = localStorage.getItem(LOCAL_UPDATED_KEY) || new Date().toISOString();
  localStorage.setItem(LOCAL_UPDATED_KEY, updatedAt);
  return {
    app: "retzef",
    version: 4,
    updatedAt,
    habits,
    reading: readingData,
  };
}

function applyCloudPayload(payload) {
  const normalizedHabits = normalizeHabits(payload.habits);
  const migrated = JSON.stringify(normalizedHabits) !== JSON.stringify(payload.habits);
  habits = normalizedHabits;
  applyReadingPayload(payload.reading);
  localStorage.setItem(LOCAL_UPDATED_KEY, migrated ? new Date().toISOString() : payload.updatedAt || new Date().toISOString());
  saveHabits();
  saveReadingData();
  render();
  if (migrated) scheduleCloudUpload();
}

function applyReadingPayload(reading) {
  if (!Array.isArray(reading?.books)) return;
  readingData = {
    startedAt: reading.startedAt ?? null,
    books: reading.books.map(normalizeBook),
  };
}

function touchLocalData() {
  localStorage.setItem(LOCAL_UPDATED_KEY, new Date().toISOString());
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
      if (isMissedRecord(record)) missed += 1;
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
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

start();
