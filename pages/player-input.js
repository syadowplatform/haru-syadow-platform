import { auth, db } from "../firebase.js";
console.log("✅ player-input imported", { auth, db });



document.addEventListener("DOMContentLoaded", () => {
  console.log("player-input.js loaded");
  const frontHoles = ["F1","F2","F3","F4","F5","F6","F7","F8","F9"];
  const backHoles  = ["B1","B2","B3","B4","B5","B6","B7","B8","B9"];
  const allHoles   = [...frontHoles, ...backHoles];

 

  // 샷 추가 버튼
  document.addEventListener("click", (e) => {
    if (e.target.matches(".add-shot-btn")) {
      const holeId = e.target.getAttribute("data-hole");
      const col = document.querySelector(`.shot-column[data-hole="${holeId}"]`);
      if (!col) return;
      const current = col.querySelectorAll(".shot-block").length;
      addShotBlock(col, current + 1);
    }
  });

  // 퍼트 추가 버튼
  document.addEventListener("click", (e) => {
    if (e.target.matches(".add-putt-btn")) {
      const holeId = e.target.getAttribute("data-hole");
      const col = document.querySelector(`.putt-column[data-hole="${holeId}"]`);
      if (!col) return;
      addPuttBlock(col);
    }
  });

  // Pin 버튼
  document.addEventListener("click", (e) => {
    if (e.target.matches(".pin-btn")) {
      const btn = e.target;
      openPopup("green", btn, "Select Pin Position");
    }
  });


  // Direction 버튼 (샷 블럭 안)
  document.addEventListener("click", (e) => {
    if (e.target.matches(".direction-btn")) {
      const btn = e.target;
      const shotBlock = btn.closest(".shot-block");
      let mode = "direction"; // 기본: 9방향
      if (shotBlock) {
        const posSelect = shotBlock.querySelector(".position-select");
        if (posSelect && posSelect.value === "OG") {
          mode = "green"; // GIR이면 9그리드 숫자
        }
      }
      openPopup(mode, btn, mode === "green" ? "Select Ball Position" : "Select Direction");
    }
  });

  // 팝업 닫기 버튼
  const popupClose = document.getElementById("popupClose");
  const popupOverlay = document.getElementById("popupOverlay");
  if (popupClose && popupOverlay) {
    popupClose.addEventListener("click", closePopup);
    popupOverlay.addEventListener("click", (e) => {
      if (e.target === popupOverlay) {
        closePopup();
      }
    });
  }
});

/* ---------- 유틸: 서수 ---------- */
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ---------- 샷 블럭 생성 ---------- */

function addShotBlock(container, index) {
  const block = document.createElement("div");
  block.className = "shot-block";
  block.dataset.shotIndex = String(index);

  const labelText = `${ordinal(index)} Shot`;

  block.innerHTML = `
    <div class="shot-header">
      <div class="shot-label">${labelText}</div>
      <button type="button" class="delete-shot-btn">✕</button>
    </div>

    <div class="shot-row">
      <span class="shot-field-label">To Hole</span>
      <input type="number" inputmode="decimal" class="shot-distance" />
    </div>


<div class="shot-row">
  <span class="shot-field-label">Wind</span>
  <button type="button" class="wind-clock-btn">Select</button>
</div>

   <div class="shot-row">
  <span class="shot-field-label">Club</span>
  <input
    type="text"
    class="shot-club"
    list="clubDatalist"
    inputmode="text"
  />
</div>


    <div class="shot-row">
      <span class="shot-field-label">Position</span>
      <select class="position-select">
        <option value="">-</option>
        <option value="OG">OG</option>
        <option value="FW">FW</option>
        <option value="SH">SH</option>
        <option value="RH">RH</option>
        <option value="BK">BK</option>
        <option value="WH">WH</option>
        <option value="LB">LB</option>
        <option value="OB">OB</option>
      </select>
    </div>

    <div class="shot-row">
      <span class="shot-field-label">Direction</span>
      <button type="button" class="direction-btn">Select</button>
    </div>
  `;

  container.appendChild(block);
}
// 샷 삭제
document.addEventListener("click", (e) => {
  if (e.target.matches(".delete-shot-btn")) {
    const block = e.target.closest(".shot-block");
    if (block) block.remove();
  }
});


/* ---------- 퍼트 블럭 생성 (Step만) ---------- */

function addPuttBlock(container) {
  const block = document.createElement("div");
  block.className = "putt-block";

  block.innerHTML = `
    <div class="shot-header">
      <div class="shot-label">Putt</div>
      <button type="button" class="delete-putt-btn">✕</button>
    </div>

    <div class="shot-row">
      <span class="shot-field-label">Step</span>
      <input type="number" inputmode="decimal" class="putt-step" />
    </div>
  `;

  container.appendChild(block);
}

// 퍼트 삭제
document.addEventListener("click", (e) => {
  if (e.target.matches(".delete-putt-btn")) {
    const block = e.target.closest(".putt-block");
    if (block) block.remove();
  }
});
// ✅ Wind(Clock) 버튼 (샷 블럭 안)
document.addEventListener("click", (e) => {
  if (e.target.matches(".wind-clock-btn")) {
    const btn = e.target;
    openPopup("clock", btn, "Select Wind Direction");
  }
});







/* ---------- 팝업 (핀 / 디렉션 / 윈드) ---------- */

let currentPopupTarget = null;
let currentPopupMode = null;

const GRID_NUMBERS = [
  ["B1", "B2", "B3"],
  ["M1", "M2", "M3"],
  ["F1", "F2", "F3"],
];

const GRID_ARROWS = [
  ["⇖", "⇑", "⇗"],
  ["⇐", "◉", "⇒"],
  ["⇙", "⇓", "⇘"],
];

// ✅ Clock (round) renderer
function renderClockPopup(gridEl) {
  gridEl.innerHTML = "";

  const face = document.createElement("div");
  face.className = "clock-face";

  const positions = [
    { v: "12", x: 50, y: 6 },
    { v: "1",  x: 70, y: 14 },
    { v: "2",  x: 86, y: 30 },
    { v: "3",  x: 94, y: 50 },
    { v: "4",  x: 86, y: 70 },
    { v: "5",  x: 70, y: 86 },
    { v: "6",  x: 50, y: 94 },
    { v: "7",  x: 30, y: 86 },
    { v: "8",  x: 14, y: 70 },
    { v: "9",  x: 6,  y: 50 },
    { v: "10", x: 14, y: 30 },
    { v: "11", x: 30, y: 14 },
  ];

  positions.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "popup-cell clock-cell";
    btn.textContent = p.v;
    btn.dataset.value = p.v;
    btn.style.left = p.x + "%";
    btn.style.top = p.y + "%";
    face.appendChild(btn);
  });

  // center reset button
  const center = document.createElement("button");
  center.type = "button";
  center.className = "popup-cell clock-center";
  center.textContent = "✕";
  center.dataset.value = ""; // reset
  face.appendChild(center);

  gridEl.appendChild(face);
}

function openPopup(mode, targetEl, titleText) {
  currentPopupTarget = targetEl;
  currentPopupMode = mode;

  const overlay = document.getElementById("popupOverlay");
  const grid = document.getElementById("popupGrid");
  const title = document.getElementById("popupTitle");

  if (!overlay || !grid || !title) return;

  title.textContent = titleText || "Select";
  grid.innerHTML = "";

  // ✅ CLOCK 전용 (여기서 끝!)
  if (mode === "clock") {
    renderClockPopup(grid);
    overlay.classList.remove("hidden");
    return; // ❗❗ 이게 핵심
  }

  // ✅ 기존 그린 / 방향 그리드
  const data =
    mode === "green"
      ? GRID_NUMBERS
      : GRID_ARROWS;

  data.forEach((row) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "popup-row";

    row.forEach((val) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-cell";
      btn.textContent = val;
      btn.dataset.value = val;
      rowDiv.appendChild(btn);
    });

    grid.appendChild(rowDiv);
  });

  overlay.classList.remove("hidden");
}
const popupGrid = document.getElementById("popupGrid");

popupGrid.onclick = (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  if (!t.classList.contains("popup-cell")) return;

  const value = t.dataset.value;

  if (currentPopupTarget) {
    currentPopupTarget.textContent = value || "X";
    currentPopupTarget.dataset.value = value || "";
  }

  closePopup();
};

function closePopup() {
  const overlay = document.getElementById("popupOverlay");
  if (overlay) overlay.classList.add("hidden");
  currentPopupTarget = null;
  currentPopupMode = null;
}


// 샷 삭제
document.addEventListener("click", (e) => {
  if (e.target.matches(".delete-shot-btn")) {
    const block = e.target.closest(".shot-block");
    if (block) block.remove();
  }
});

// 퍼트 삭제
document.addEventListener("click", (e) => {
  if (e.target.matches(".delete-putt-btn")) {
    const block = e.target.closest(".putt-block");
    if (block) block.remove();
  }
});
/* ===============================
   AUTO SCORE CALCULATION
================================ */

const ALL_HOLES = [
  "F1","F2","F3","F4","F5","F6","F7","F8","F9",
  "B1","B2","B3","B4","B5","B6","B7","B8","B9"
];

// 모든 입력 변화 감지
document.addEventListener("input", handleScoreUpdate);
document.addEventListener("change", handleScoreUpdate);

  // ✅ Save button
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", handleSaveRound);
  }

function handleScoreUpdate() {
  ALL_HOLES.forEach(hole => {
    calculateHoleScore(hole);
  });
  updateSummaryScore();
}

function calculateHoleScore(hole) {
  let score = 0;

  // 1️⃣ Shot 개수
  const shotCol = document.querySelector(`.shot-column[data-hole="${hole}"]`);
  if (shotCol) {
    score += shotCol.querySelectorAll(".shot-block").length;
  }

  // 2️⃣ Putt 개수
  const puttCol = document.querySelector(`.putt-column[data-hole="${hole}"]`);
  if (puttCol) {
    score += puttCol.querySelectorAll(".putt-block").length;
  }

  // 3️⃣ Penalty
  const penalty = document.querySelector(`.penalty-input[data-hole="${hole}"]`);
  if (penalty && penalty.value !== "") {
    score += Number(penalty.value);
  }

  // 4️⃣ Tap-in (+1 or 0)
  const tapIn = document.querySelector(`input[type="checkbox"][data-hole="${hole}"]`);
  if (tapIn && tapIn.checked) {
    score += 1;
  }

  // 5️⃣ 홀별 Auto Score 표시
  const autoScoreEl = document.querySelector(`.auto-score[data-hole="${hole}"]`);
  if (autoScoreEl) {
    autoScoreEl.textContent = score > 0 ? score : "—";
  }

  return score;
}
function updateSummaryScore() {
  let front = 0;
  let back = 0;

  for (let i = 1; i <= 9; i++) {
    front += getHoleScore(`F${i}`);
    back  += getHoleScore(`B${i}`);
  }

  const total = front + back;

  document.getElementById("scoreFront").textContent = front;
  document.getElementById("scoreBack").textContent = back;
  document.getElementById("scoreTotal").textContent = total;
}

function getHoleScore(hole) {
  const el = document.querySelector(`.auto-score[data-hole="${hole}"]`);
  if (!el) return 0;
  const val = Number(el.textContent);
  return isNaN(val) ? 0 : val;
}
// ===============================
// SAVE ROUND TO FIRESTORE
// Paste this near the very bottom of player-input.js (after your score functions)
// ===============================

async function handleSaveRound() {
  try {
    // ---- Top inputs ----
    const mode = document.getElementById("mode")?.value || "";
    const date = document.getElementById("date")?.value || "";
    const courseName = document.getElementById("courseName")?.value || "";
    const unit = document.getElementById("unit")?.value || "";
    const teeTime = document.getElementById("teeTime")?.value || "";
    const playOrder = document.getElementById("playOrder")?.value || "";

    const tempUnit = document.getElementById("tempUnit")?.value || "";
    const tempLow = Number(document.getElementById("tempLow")?.value || 0);
    const tempHigh = Number(document.getElementById("tempHigh")?.value || 0);

    const windDirText = document.getElementById("windDirBtn")?.textContent?.trim() || "";
    const windSpeed = Number(document.getElementById("windSpeed")?.value || 0);

    const fairwayGrass = document.getElementById("fairwayGrass")?.value || "";
    const fairwayGrassNote = document.getElementById("fairwayGrassNote")?.value || "";
    const greenGrass = document.getElementById("greenGrass")?.value || "";
    const greenGrassNote = document.getElementById("greenGrassNote")?.value || "";
    const roughGrass = document.getElementById("roughGrass")?.value || "";
    const roughGrassNote = document.getElementById("roughGrassNote")?.value || "";

    // ---- Score summary (already calculated on screen) ----
    const front9 = safeNumber(document.getElementById("scoreFront")?.textContent);
    const back9 = safeNumber(document.getElementById("scoreBack")?.textContent);
    const total = safeNumber(document.getElementById("scoreTotal")?.textContent);

    // ---- Helpers to read Par by table order (your par-select has no data-hole) ----
    const frontParSelects = Array.from(document.querySelectorAll("#front9Table .par-select"));
    const backParSelects = Array.from(document.querySelectorAll("#back9Table .par-select"));

    function getParByHole(hole) {
      const n = Number(hole.slice(1)); // 1~9
      if (hole.startsWith("F")) return Number(frontParSelects[n - 1]?.value || 0);
      if (hole.startsWith("B")) return Number(backParSelects[n - 1]?.value || 0);
      return 0;
    }

    function getPinByHole(hole) {
      const btn = document.querySelector(`.pin-btn[data-hole="${hole}"]`);
      const t = btn?.textContent?.trim() || "";
      return t === "Select" ? "" : t;
    }

    function getTapInByHole(hole) {
      const cb = document.querySelector(`.tapin-label input[type="checkbox"][data-hole="${hole}"]`);
      return !!cb?.checked;
    }

    function getPenaltyByHole(hole) {
      const el = document.querySelector(`.penalty-input[data-hole="${hole}"]`);
      return Number(el?.value || 0);
    }

    function getAutoScoreByHole(hole) {
      const el = document.querySelector(`.auto-score[data-hole="${hole}"]`);
      // empty means not played yet
      return safeNumber(el?.textContent);
    }

    function getShotsByHole(hole) {
      const col = document.querySelector(`.shot-column[data-hole="${hole}"]`);
      if (!col) return [];

      const blocks = Array.from(col.querySelectorAll(".shot-block"));
      return blocks.map((b, idx) => {
        const dist = Number(b.querySelector(".shot-distance")?.value || 0);
        const club = (b.querySelector(".shot-club")?.value || "").trim();
        const pos = (b.querySelector(".position-select")?.value || "").trim();
        const dirBtn = b.querySelector(".direction-btn");
        const direction = (dirBtn?.textContent || "").trim();
        return {
          index: idx + 1,
          distance: dist,
          club,
          position: pos,
          direction: direction === "Select" ? "" : direction,
        };
      });
    }

    function getPuttsByHole(hole) {
      const col = document.querySelector(`.putt-column[data-hole="${hole}"]`);
      if (!col) return [];

      const blocks = Array.from(col.querySelectorAll(".putt-block"));
      return blocks.map((b, idx) => {
        const step = Number(b.querySelector(".putt-step")?.value || 0);
        return { index: idx + 1, step };
      });
    }

    
    function calcGIR(holeId) {
  const par = getParByHole(holeId);
  if (!par) return null;

  const col = document.querySelector(`.shot-column[data-hole="${holeId}"]`);
  if (!col) return null;

  const shots = col.querySelectorAll(".shot-block");

  let onGreenShotNum = null;
  shots.forEach((shot, idx) => {
    const pos = shot.querySelector(".position-select")?.value;
    if (onGreenShotNum === null && pos === "GR") {
      onGreenShotNum = idx + 1;
    }
  });

  if (onGreenShotNum === null) return false;
  return onGreenShotNum <= (par - 2);
}   


    const holes = {};
    const ALL_HOLES = ["F1","F2","F3","F4","F5","F6","F7","F8","F9","B1","B2","B3","B4","B5","B6","B7","B8","B9"];

    ALL_HOLES.forEach((hole) => {
      holes[hole] = {
        par: getParByHole(hole),
        pin: getPinByHole(hole),
        tapIn: getTapInByHole(hole),
        penalty: getPenaltyByHole(hole),
        autoScore: getAutoScoreByHole(hole),
        shots: getShotsByHole(hole),
        gir: calcGIR(hole),
        putts: getPuttsByHole(hole),
      };
    });

    // ---- Payload ----
    const payload = {
      meta: {
        mode,
        date,
        courseName,
        unit,
        teeTime,
        playOrder,
        tempUnit,
        tempLow,
        tempHigh,
        windDirection: windDirText,
        windSpeed,
        fairwayGrass,
        fairwayGrassNote,
        greenGrass,
        greenGrassNote,
        roughGrass,
        roughGrassNote,
      },
      scoreSummary: { front9, back9, total },
      holes,
      createdAt: serverTimestamp(),
    };

    // ---- Save ----
    // You must already have: const db = getFirestore(app);
    // And imports: addDoc, collection, serverTimestamp
    const ref = await addDoc(collection(db, "playerRounds"), payload);

    alert(`✅ Saved! (${ref.id})`);
  } catch (err) {
    console.error("❌ Save failed:", err);
    alert("❌ Save failed. Check console.");
  }
}

function safeNumber(v) {
  const n = Number((v || "").toString().trim());
  return Number.isFinite(n) ? n : 0;
}
