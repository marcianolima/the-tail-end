"use strict";

/*
 * The Tail End — 80 years × 52 cells.
 * Each cell represents 1/52 of the corresponding birthday-to-birthday year.
 * This keeps each row aligned with actual birthdays, including leap years.
 * No API, cookies, analytics or server-side processing.
 */
(function () {
  const YEARS = 80;
  const WEEKS_PER_YEAR = 52;
  const TOTAL = YEARS * WEEKS_PER_YEAR;
  const STORAGE_KEY = "the-tail-end-preferences-v1";
  const formatter = new Intl.NumberFormat("pt-BR");
  const percentFormatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  const refs = {
    form: document.getElementById("birth-form"),
    birth: document.getElementById("birthdate"),
    reset: document.getElementById("reset-demo"),
    help: document.getElementById("birth-help"),
    grid: document.getElementById("life-calendar"),
    status: document.getElementById("view-status"),
    ageLabel: document.getElementById("age-label"),
    headline: document.getElementById("weeks-completed-title"),
    percent: document.getElementById("percentage-label"),
    bar: document.getElementById("progress-fill"),
    progress: document.getElementById("life-progress"),
    total: document.getElementById("stat-total"),
    lived: document.getElementById("stat-lived"),
    left: document.getElementById("stat-left"),
    age: document.getElementById("stat-age"),
    ageDetail: document.getElementById("stat-age-detail"),
    sleep: document.getElementById("stat-sleep"),
    work: document.getElementById("stat-work"),
    sleepHours: document.getElementById("sleep-hours"),
    workHours: document.getElementById("work-hours"),
    sleepOutput: document.getElementById("sleep-hours-value"),
    workOutput: document.getElementById("work-hours-value"),
    workStart: document.getElementById("work-start"),
    workEnd: document.getElementById("work-end")
  };

  const cells = [];
  let lastCompleted = -1;
  let lastCurrent = -2;
  let state = {
    birth: "",
    sleepHours: 8,
    workHours: 40,
    workStart: 18,
    workEnd: 65
  };

  function utcDay(year, month, day) {
    return Date.UTC(year, month - 1, day);
  }

  function todayUTC() {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      stamp: utcDay(now.getFullYear(), now.getMonth() + 1, now.getDate())
    };
  }

  function isoDate(year, month, day) {
    return [String(year).padStart(4, "0"), String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
  }

  function parseISO(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const check = new Date(utcDay(year, month, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
    if (check.getTime() > todayUTC().stamp) return null;
    return { year, month, day };
  }

  function anniversary(birth, years) {
    // UTC normalization treats February 29 birthdays as March 1 in non-leap years.
    return utcDay(birth.year + years, birth.month, birth.day);
  }

  function demoBirth(today) {
    const year = today.year - 30;
    const daysInMonth = new Date(Date.UTC(year, today.month, 0)).getUTCDate();
    return { year, month: today.month, day: Math.min(today.day, daysInMonth) };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function derive(birth, today) {
    let age = today.year - birth.year;
    if (today.stamp < anniversary(birth, age)) age -= 1;
    age = Math.max(0, age);

    if (age >= YEARS) {
      return {
        age,
        completed: TOTAL,
        currentIndex: -1,
        remaining: 0,
        percentage: 100,
        livedYears: YEARS
      };
    }

    const start = anniversary(birth, age);
    const end = anniversary(birth, age + 1);
    const fraction = clamp((today.stamp - start) / (end - start), 0, 0.999999999);
    const exactWeek = age * WEEKS_PER_YEAR + fraction * WEEKS_PER_YEAR;
    const completed = clamp(Math.floor(exactWeek), 0, TOTAL);

    return {
      age,
      completed,
      currentIndex: completed,
      remaining: TOTAL - completed,
      percentage: (exactWeek / TOTAL) * 100,
      livedYears: age + fraction
    };
  }

  function buildCalendar() {
    const fragment = document.createDocumentFragment();
    for (let year = 0; year < YEARS; year += 1) {
      const row = document.createElement("div");
      row.className = "calendar-year" + (year > 0 && year % 10 === 0 ? " decade" : "");

      const tick = document.createElement("span");
      tick.className = "year-tick";
      tick.textContent = year % 5 === 0 ? String(year) : "";
      tick.setAttribute("aria-hidden", "true");

      const weeks = document.createElement("div");
      weeks.className = "year-weeks";
      weeks.setAttribute("aria-hidden", "true");

      for (let index = 0; index < WEEKS_PER_YEAR; index += 1) {
        const cell = document.createElement("span");
        cell.className = "week future";
        cell.title = "Idade " + year + " · semana " + (index + 1) + " de 52";
        weeks.appendChild(cell);
        cells.push(cell);
      }

      row.appendChild(tick);
      row.appendChild(weeks);
      fragment.appendChild(row);
    }
    refs.grid.appendChild(fragment);
  }

  function updateCalendar(timeline, personal) {
    if (timeline.completed !== lastCompleted || timeline.currentIndex !== lastCurrent) {
      for (let index = 0; index < TOTAL; index += 1) {
        const type = index < timeline.completed ? "elapsed" : index === timeline.currentIndex ? "current" : "future";
        const className = "week " + type;
        if (cells[index].className !== className) cells[index].className = className;
      }
      lastCompleted = timeline.completed;
      lastCurrent = timeline.currentIndex;
    }

    const descriptor = personal ? "Seu calendário" : "Calendário ilustrativo de 30 anos";
    refs.grid.setAttribute(
      "aria-label",
      descriptor + ": " + TOTAL + " semanas em 80 anos, " + timeline.completed +
      " concluídas, " + timeline.remaining + " ainda não concluídas." +
      (timeline.currentIndex >= 0 ? " Semana atual destacada." : "")
    );
  }

  function settingsFromControls() {
    state.sleepHours = clamp(Number(refs.sleepHours.value) || 0, 4, 12);
    state.workHours = clamp(Number(refs.workHours.value) || 0, 0, 70);
    state.workStart = Number(refs.workStart.value);
    state.workEnd = Number(refs.workEnd.value);
  }

  function syncControls() {
    refs.sleepHours.value = String(state.sleepHours);
    refs.workHours.value = String(state.workHours);
    refs.workStart.value = String(state.workStart);
    refs.workEnd.value = String(state.workEnd);
    refs.sleepOutput.textContent = percentFormatter.format(state.sleepHours).replace(",0", "") + " h";
    refs.workOutput.textContent = String(state.workHours) + " h";
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Private browsing or disabled storage: calculator still works.
    }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      if (typeof saved.birth === "string" && parseISO(saved.birth)) state.birth = saved.birth;
      if (Number.isFinite(saved.sleepHours)) state.sleepHours = clamp(saved.sleepHours, 4, 12);
      if (Number.isFinite(saved.workHours)) state.workHours = clamp(saved.workHours, 0, 70);
      if ([16, 18, 20, 22, 25].includes(saved.workStart)) state.workStart = saved.workStart;
      if ([55, 60, 65, 70, 75].includes(saved.workEnd)) state.workEnd = saved.workEnd;
    } catch (_) {
      // Ignore stale or invalid local preferences.
    }
  }

  function display() {
    const today = todayUTC();
    refs.birth.max = isoDate(today.year, today.month, today.day);
    const parsed = parseISO(state.birth);
    const personal = Boolean(parsed);
    const birth = parsed || demoBirth(today);
    const timeline = derive(birth, today);

    updateCalendar(timeline, personal);

    const count = formatter.format(timeline.completed);
    refs.headline.textContent = count;
    refs.percent.textContent = percentFormatter.format(timeline.percentage) + "%";
    refs.bar.style.width = timeline.percentage.toFixed(4) + "%";
    refs.progress.setAttribute("aria-valuenow", timeline.percentage.toFixed(1));
    refs.total.textContent = formatter.format(TOTAL);
    refs.lived.textContent = count;
    refs.left.textContent = formatter.format(timeline.remaining);
    refs.age.textContent = formatter.format(timeline.age);
    refs.ageDetail.textContent = timeline.age >= YEARS ? "horizonte de 80 anos alcançado" : "de uma referência de 80 anos";

    if (personal) {
      refs.status.classList.add("is-personal");
      refs.status.innerHTML = '<span class="status-light"></span> SEU CALENDÁRIO';
      refs.ageLabel.textContent = timeline.age + " anos completos · nascimento em " + birth.day.toString().padStart(2, "0") +
        "/" + String(birth.month).padStart(2, "0") + "/" + String(birth.year);
    } else {
      refs.status.classList.remove("is-personal");
      refs.status.innerHTML = '<span class="status-light"></span> EXEMPLO ILUSTRATIVO';
      refs.ageLabel.textContent = "Prévia de uma pessoa de 30 anos. Informe seu nascimento para personalizar.";
    }

    // Equivalent weeks, not weeks during which the activity happened.
    // Sleep: n days × sleepingHours/24, expressed in weeks.
    const sleepEquivalent = timeline.livedYears * WEEKS_PER_YEAR * (state.sleepHours / 24);
    // Work: life-year overlap × 52 × (hours per week / 168 hours per week).
    const workingYears = clamp(timeline.livedYears - state.workStart, 0, Math.max(0, state.workEnd - state.workStart));
    const workEquivalent = workingYears * WEEKS_PER_YEAR * (state.workHours / 168);
    refs.sleep.innerHTML = formatter.format(Math.round(sleepEquivalent)) + " <em>semanas</em>";
    refs.work.innerHTML = formatter.format(Math.round(workEquivalent)) + " <em>semanas</em>";
    syncControls();
  }

  function setBirthFromInput() {
    const value = refs.birth.value;
    if (!value) {
      state.birth = "";
      refs.birth.setCustomValidity("");
      persist();
      display();
      return;
    }
    if (!parseISO(value)) {
      refs.birth.setCustomValidity("Informe uma data válida entre 01/01/1900 e hoje.");
      refs.birth.reportValidity();
      return;
    }
    refs.birth.setCustomValidity("");
    state.birth = value;
    persist();
    display();
  }

  function init() {
    if (!refs.grid || !refs.birth) return;
    restore();
    buildCalendar();
    refs.birth.value = state.birth;
    refs.birth.min = "1900-01-01";
    syncControls();
    display();

    refs.form.addEventListener("submit", function (event) {
      event.preventDefault();
      setBirthFromInput();
    });

    refs.birth.addEventListener("change", setBirthFromInput);
    refs.birth.addEventListener("input", function () {
      refs.birth.setCustomValidity("");
    });
    refs.reset.addEventListener("click", function () {
      state.birth = "";
      refs.birth.value = "";
      refs.birth.setCustomValidity("");
      persist();
      display();
    });

    [refs.sleepHours, refs.workHours, refs.workStart, refs.workEnd].forEach(function (control) {
      control.addEventListener("input", function () {
        settingsFromControls();
        persist();
        display();
      });
      control.addEventListener("change", function () {
        settingsFromControls();
        persist();
        display();
      });
    });

    // Long-open browser tabs stay accurate after midnight.
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) display();
    });
    setInterval(display, 60 * 60 * 1000);
  }

  init();
})();
