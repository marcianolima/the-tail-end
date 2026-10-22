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
    calendarVisual: document.getElementById("calendar-visual"),
    overlays: document.getElementById("time-overlays"),
    weekDetails: document.getElementById("week-details"),
    weekClose: document.getElementById("week-details-close"),
    weekStatus: document.getElementById("week-details-status"),
    weekNumber: document.getElementById("week-details-number"),
    weekAge: document.getElementById("week-details-age"),
    weekDate: document.getElementById("week-details-date"),
    weekPosition: document.getElementById("week-details-position"),
    sleepCard: document.getElementById("sleep-card"),
    workCard: document.getElementById("work-card"),
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
  const yearRows = [];
  let lastCompleted = -1;
  let lastCurrent = -2;
  let selectedIndex = -1;
  let keyboardIndex = 0;
  let activeBirth = null;
  let activeTimeline = null;
  let overlayScheduled = false;
  const weekDateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
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

      for (let week = 0; week < WEEKS_PER_YEAR; week += 1) {
        const index = year * WEEKS_PER_YEAR + week;
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "week future";
        cell.tabIndex = -1;
        cell.dataset.index = String(index);
        cell.title = "Semana " + (index + 1) + " · " + year + " anos · " + (week + 1) + "/52";
        cell.setAttribute("aria-label", "Semana " + (index + 1) + ", idade " + year + " anos, semana " + (week + 1) + " de 52");
        cell.setAttribute("aria-pressed", "false");
        weeks.appendChild(cell);
        cells.push(cell);
      }

      row.appendChild(tick);
      row.appendChild(weeks);
      fragment.appendChild(row);
      yearRows.push(weeks);
    }
    refs.grid.appendChild(fragment);
  }

  function updateCalendar(timeline, personal) {
    if (timeline.completed !== lastCompleted || timeline.currentIndex !== lastCurrent) {
      for (let index = 0; index < TOTAL; index += 1) {
        const type = index < timeline.completed ? "elapsed" : index === timeline.currentIndex ? "current" : "future";
        const className = "week " + type + (index === selectedIndex ? " selected" : "");
        if (cells[index].className !== className) cells[index].className = className;
      }
      lastCompleted = timeline.completed;
      lastCurrent = timeline.currentIndex;
    }

    const suggested = timeline.currentIndex < 0 ? TOTAL - 1 : timeline.currentIndex;
    if (selectedIndex < 0 && cells[keyboardIndex]) {
      cells[keyboardIndex].tabIndex = -1;
      keyboardIndex = suggested;
      cells[keyboardIndex].tabIndex = 0;
    }

    const descriptor = personal ? "Seu calendário" : "Calendário ilustrativo de 30 anos";
    refs.grid.setAttribute(
      "aria-label",
      descriptor + ": " + TOTAL + " semanas em 80 anos, " + timeline.completed +
      " concluídas, " + timeline.remaining + " ainda não concluídas." +
      " Toque para consultar ou use as setas do teclado." +
      (timeline.currentIndex >= 0 ? " Semana atual destacada." : "")
    );
  }

  function weekStartStamp(birth, index) {
    const year = Math.floor(index / WEEKS_PER_YEAR);
    const weekOfYear = index % WEEKS_PER_YEAR;
    const begin = anniversary(birth, year);
    const end = anniversary(birth, year + 1);
    return begin + Math.round((end - begin) * weekOfYear / WEEKS_PER_YEAR / 86400000) * 86400000;
  }

  function ageInMonthsAt(birth, year, stamp) {
    const start = new Date(anniversary(birth, year));
    const target = new Date(stamp);
    let monthCount = (target.getUTCFullYear() - start.getUTCFullYear()) * 12
      + target.getUTCMonth() - start.getUTCMonth();
    if (target.getUTCDate() < start.getUTCDate()) monthCount--;
    return clamp(monthCount, 0, 11);
  }

  function hideWeekDetails() {
    if (selectedIndex >= 0 && cells[selectedIndex]) {
      cells[selectedIndex].classList.remove("selected");
      cells[selectedIndex].setAttribute("aria-pressed", "false");
    }
    selectedIndex = -1;
    refs.weekDetails.hidden = true;
  }

  function placeWeekDetails(cell) {
    if (refs.weekDetails.hidden || !cell) return;
    const rect = cell.getBoundingClientRect();
    const popup = refs.weekDetails.getBoundingClientRect();
    const width = popup.width || 296;
    const height = popup.height || 170;
    const left = clamp(rect.left + rect.width / 2 - width / 2, 12, Math.max(12, window.innerWidth - width - 12));
    let top = rect.bottom + 12;
    if (top + height > window.innerHeight - 12) top = rect.top - height - 12;
    if (top < 12) top = Math.max(12, (window.innerHeight - height) / 2);
    refs.weekDetails.style.left = left.toFixed(1) + "px";
    refs.weekDetails.style.top = top.toFixed(1) + "px";
  }

  function selectWeek(index, focus) {
    if (!activeBirth || !activeTimeline || !cells[index]) return;
    const previous = selectedIndex;
    if (previous >= 0 && previous !== index) {
      cells[previous].classList.remove("selected");
      cells[previous].setAttribute("aria-pressed", "false");
    }
    selectedIndex = index;
    cells[index].classList.add("selected");
    cells[index].setAttribute("aria-pressed", "true");
    if (keyboardIndex !== index) {
      cells[keyboardIndex].tabIndex = -1;
      keyboardIndex = index;
      cells[index].tabIndex = 0;
    }

    const year = Math.floor(index / WEEKS_PER_YEAR);
    const weekOfYear = index % WEEKS_PER_YEAR;
    const begin = weekStartStamp(activeBirth, index);
    const end = index === TOTAL - 1
      ? anniversary(activeBirth, YEARS)
      : weekStartStamp(activeBirth, index + 1);
    const month = ageInMonthsAt(activeBirth, year, begin);
    const period = index < activeTimeline.completed ? "elapsed" :
      index === activeTimeline.currentIndex ? "current" : "future";

    refs.weekDetails.dataset.period = period;
    refs.weekStatus.textContent = period === "elapsed" ? "SEMANA VIVIDA" :
      period === "current" ? "SEMANA ATUAL" : "SEMANA FUTURA";
    refs.weekNumber.textContent = "Semana " + formatter.format(index + 1);
    refs.weekAge.textContent = year + (year === 1 ? " ano" : " anos") +
      " e " + month + (month === 1 ? " mês" : " meses");
    refs.weekDate.textContent = "Período aproximado: " +
      weekDateFormatter.format(new Date(begin)) + " – " +
      weekDateFormatter.format(new Date(end - 86400000));
    refs.weekPosition.textContent = "Semana " + (weekOfYear + 1) +
      " de 52 no ano de vida " + (year + 1) +
      (state.birth ? "" : " · exemplo ilustrativo");
    refs.weekDetails.hidden = false;
    if (focus) cells[index].focus();
    placeWeekDetails(cells[index]);
  }

  function renderOverlays() {
    if (!activeTimeline || !refs.overlays || !cells.length) return;

    const visualBounds = refs.calendarVisual.getBoundingClientRect();
    const first = cells[0].getBoundingClientRect();
    const last = cells[TOTAL - 1].getBoundingClientRect();
    if (!visualBounds.width || !first.width || !last.width) return;

    const offsetX = visualBounds.left;
    const offsetY = visualBounds.top;
    const x0 = first.left - offsetX;
    const x1 = last.right - offsetX;
    const top = first.top - offsetY;
    const bottom = last.bottom - offsetY;
    const availableWidth = x1 - x0;
    const sleepRatio = clamp(state.sleepHours / 24, 0, 1);
    const dividerX = x1 - availableWidth * sleepRatio;
    const dimension = (value) => Number(value.toFixed(2));
    const markup = [];
    const height = Math.max(0, bottom - top);

    markup.push('<rect class="sleep-band" x="' + dimension(dividerX) + '" y="' +
      dimension(top) + '" width="' + dimension(Math.max(0, x1 - dividerX)) +
      '" height="' + dimension(height) + '"/>');
    markup.push('<line class="sleep-divider" x1="' + dimension(dividerX) + '" y1="' +
      dimension(top) + '" x2="' + dimension(dividerX) + '" y2="' + dimension(bottom) + '"/>');

    const workShare = clamp(state.workHours / 168, 0, 1);
    const yearsWorked = clamp(activeTimeline.livedYears - state.workStart,
      0, Math.max(0, state.workEnd - state.workStart));
    const fullYears = Math.floor(yearsWorked + 1e-8);
    const partial = clamp(yearsWorked - fullYears, 0, 1);
    const workLeft = dividerX - availableWidth * workShare;
    const workRight = dividerX;

    if (workShare > 0 && yearsWorked > 0 && yearRows[state.workStart]) {
      const firstRow = yearRows[state.workStart].getBoundingClientRect();
      const yTop = firstRow.top - offsetY;
      const points = [[workLeft, yTop], [workRight, yTop]];

      if (fullYears > 0) {
        const lastFullRow = yearRows[state.workStart + fullYears - 1].getBoundingClientRect();
        const lastFullY = lastFullRow.bottom - offsetY;
        points.push([workRight, lastFullY]);
      }

      if (partial > 0.00001 && yearRows[state.workStart + fullYears]) {
        const partialRow = yearRows[state.workStart + fullYears].getBoundingClientRect();
        const partialX = workLeft + (workRight - workLeft) * partial;
        const partialBottomY = partialRow.bottom - offsetY;
        points.push([partialX, partialBottomY], [workLeft, partialBottomY]);
      } else {
        const endRow = yearRows[state.workStart + Math.max(0, fullYears - 1)].getBoundingClientRect();
        points.push([workLeft, endRow.bottom - offsetY]);
      }

      const path = points.map((point, index) =>
        (index === 0 ? "M " : " L ") + dimension(point[0]) + " " + dimension(point[1])
      ).join("") + " Z";
      markup.push('<path class="work-region" d="' + path + '"/>');
    }

    refs.overlays.setAttribute("viewBox", "0 0 " +
      dimension(visualBounds.width) + " " + dimension(visualBounds.height));
    refs.overlays.innerHTML = markup.join("");
  }

  function scheduleOverlayRender() {
    if (overlayScheduled) return;
    overlayScheduled = true;
    window.requestAnimationFrame(function () {
      overlayScheduled = false;
      renderOverlays();
    });
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
    activeBirth = birth;
    activeTimeline = timeline;

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
    scheduleOverlayRender();
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
    hideWeekDetails();
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
      hideWeekDetails();
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

    // Event delegation keeps 4,160 cells lightweight.
    refs.grid.addEventListener("click", function (event) {
      const cell = event.target.closest(".week");
      if (!cell || !refs.grid.contains(cell)) return;
      selectWeek(Number(cell.dataset.index), false);
      event.stopPropagation();
    });
    refs.grid.addEventListener("keydown", function (event) {
      const cell = event.target.closest(".week");
      if (!cell) return;
      const index = Number(cell.dataset.index);
      let next = index;
      if (event.key === "ArrowRight") next++;
      else if (event.key === "ArrowLeft") next--;
      else if (event.key === "ArrowDown") next += WEEKS_PER_YEAR;
      else if (event.key === "ArrowUp") next -= WEEKS_PER_YEAR;
      else if (event.key === "Home") next = Math.floor(index / WEEKS_PER_YEAR) * WEEKS_PER_YEAR;
      else if (event.key === "End") next = Math.floor(index / WEEKS_PER_YEAR) * WEEKS_PER_YEAR + WEEKS_PER_YEAR - 1;
      else if (event.key === "Escape") {
        hideWeekDetails();
        return;
      } else return;
      event.preventDefault();
      selectWeek(clamp(next, 0, TOTAL - 1), true);
    });
    refs.weekClose.addEventListener("click", function () {
      hideWeekDetails();
      if (cells[keyboardIndex]) cells[keyboardIndex].focus({ preventScroll: true });
    });
    document.addEventListener("pointerdown", function (event) {
      if (!refs.weekDetails.hidden && !refs.weekDetails.contains(event.target) &&
          !refs.grid.contains(event.target)) hideWeekDetails();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") hideWeekDetails();
    });
    window.addEventListener("scroll", function () {
      if (!refs.weekDetails.hidden) hideWeekDetails();
    }, { passive: true });
    window.addEventListener("resize", function () {
      scheduleOverlayRender();
      if (!refs.weekDetails.hidden) placeWeekDetails(cells[selectedIndex]);
    }, { passive: true });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(scheduleOverlayRender);
      observer.observe(refs.calendarVisual);
    }

    [
      [refs.sleepCard, "highlight-sleep"],
      [refs.workCard, "highlight-work"]
    ].forEach(function (entry) {
      const card = entry[0];
      const className = entry[1];
      function toggle(active) {
        refs.overlays.classList.toggle(className, active);
        card.classList.toggle("is-linked", active);
      }
      card.addEventListener("pointerenter", function () { toggle(true); });
      card.addEventListener("pointerleave", function () { toggle(false); });
      card.addEventListener("focusin", function () { toggle(true); });
      card.addEventListener("focusout", function (event) {
        if (!card.contains(event.relatedTarget)) toggle(false);
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
