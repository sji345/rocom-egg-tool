const records = window.EGG_RECORDS || [];

const heightInput = document.querySelector("#heightInput");
const weightInput = document.querySelector("#weightInput");
const resultsEl = document.querySelector("#results");
const resultTitle = document.querySelector("#resultTitle");
const resultHint = document.querySelector("#resultHint");
const statusPill = document.querySelector("#statusPill");
const clearBtn = document.querySelector("#clearBtn");
const filters = [...document.querySelectorAll(".filter")];

let activeFilter = "all";

function numberValue(input) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function gapToRange(value, min, max) {
  if (value >= min && value <= max) return 0;
  return value < min ? min - value : value - max;
}

function matchRecord(record, height, weight) {
  const heightGap = gapToRange(height, record.heightMin, record.heightMax);
  const weightGap = gapToRange(weight, record.weightMin, record.weightMax);
  const heightScale = Math.max(record.heightMax - record.heightMin, record.heightMax * 0.14, 0.035);
  const weightScale = Math.max(record.weightMax - record.weightMin, record.weightMax * 0.14, 0.28);
  const heightPenalty = heightGap / heightScale;
  const weightPenalty = weightGap / weightScale;
  const score = Math.max(0, Math.round(100 - heightPenalty * 42 - weightPenalty * 58));
  const exact = heightGap === 0 && weightGap === 0;
  const close = score >= 72 && !exact;
  return { ...record, score, exact, close, heightGap, weightGap };
}

function statusFor(match) {
  if (match.exact) return { text: "命中区间", cls: "hit" };
  if (match.close) return { text: "接近", cls: "near" };
  return { text: "偏差较大", cls: "loose" };
}

function render() {
  const height = numberValue(heightInput);
  const weight = numberValue(weightInput);

  if (!height || !weight) {
    statusPill.textContent = "等待输入";
    resultTitle.textContent = "先输入尺寸和重量";
    resultHint.innerHTML = `数据来自公开资料整理，共 <strong>${records.length}</strong> 条；不是官方全量库。`;
    resultsEl.innerHTML = '<div class="empty">填入两个数值后，这里会显示最可能的精灵。</div>';
    return;
  }

  const pool = activeFilter === "all" ? records : records.filter((record) => record.type === activeFilter);
  const matches = pool
    .map((record) => matchRecord(record, height, weight))
    .sort((a, b) => b.score - a.score || Number(b.exact) - Number(a.exact))
    .slice(0, 12);

  const strongCount = matches.filter((item) => item.exact).length;
  const best = matches[0];
  statusPill.textContent = strongCount ? `${strongCount} 个命中` : "显示最接近";
  resultTitle.textContent = best ? `最可能：${best.name}` : "没有候选";
  resultHint.innerHTML = `当前筛选 <strong>${pool.length}</strong> 条；分数越高越接近。`;

  if (!matches.length) {
    resultsEl.innerHTML = '<div class="empty">这个筛选下没有可比对的数据。</div>';
    return;
  }

  resultsEl.innerHTML = matches.map((match) => {
    const status = statusFor(match);
    const detail = [
      match.group ? `<span class="chip">${match.group}</span>` : "",
      `<span class="chip">${match.typeLabel}</span>`,
      `<span class="chip">${status.text}</span>`,
    ].join("");
    return `
      <article class="card ${status.cls}">
        <div class="card-main">
          <div class="topline">
            <h3 class="name">${match.name}</h3>
            <div class="score">${match.score}</div>
          </div>
          <div class="meta">${detail}</div>
          <div class="ranges">
            <div class="range-box"><span>尺寸 / 身高</span><strong>${match.heightText}</strong></div>
            <div class="range-box"><span>重量</span><strong>${match.weightText}</strong></div>
          </div>
          ${match.evolution ? `<p class="evolution">${match.evolution}</p>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

heightInput.addEventListener("input", render);
weightInput.addEventListener("input", render);
clearBtn.addEventListener("click", () => {
  heightInput.value = "";
  weightInput.value = "";
  heightInput.focus();
  render();
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

render();
