const records = window.EGG_RECORDS || [];

const heightInput = document.querySelector("#heightInput");
const weightInput = document.querySelector("#weightInput");
const resultsEl = document.querySelector("#results");
const resultTitle = document.querySelector("#resultTitle");
const resultHint = document.querySelector("#resultHint");
const statusPill = document.querySelector("#statusPill");
const clearBtn = document.querySelector("#clearBtn");
const filters = [...document.querySelectorAll(".filter")];
const toolTabs = [...document.querySelectorAll(".tool-tab")];
const eggView = document.querySelector("#eggView");
const merchantView = document.querySelector("#merchantView");
const merchantStatus = document.querySelector("#merchantStatus");
const merchantRound = document.querySelector("#merchantRound");
const merchantNext = document.querySelector("#merchantNext");
const merchantCountdown = document.querySelector("#merchantCountdown");
const merchantNote = document.querySelector("#merchantNote");
const merchantItems = document.querySelector("#merchantItems");
const refreshMerchantBtn = document.querySelector("#refreshMerchantBtn");

let activeFilter = "all";
let merchantNextDate = null;
let merchantLastAutoRefresh = 0;

const MERCHANT_REFRESH_HOURS = [8, 12, 16, 20];
const MERCHANT_RETRY_INTERVAL = 60000;

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

function fixMojibake(value) {
  if (typeof value !== "string" || !/[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/.test(value)) {
    return value || "";
  }

  try {
    const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 255));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value;
  }
}

function formatBeijingTime(value) {
  if (!value) return "--";
  return value.replace(/^\d{4}-/, "").slice(0, 11);
}

function formatBeijingDateTime(date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function parseBeijingDate(value) {
  if (!value) return null;
  const date = new Date(`${value.replace(" ", "T")}+08:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function beijingDateAt(hour, dayOffset = 0) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = Number(part.value);
    return acc;
  }, {});
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset, hour - 8, 0, 0));
}

function currentMerchantWindow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    hourCycle: "h23",
    hour: "2-digit",
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = Number(part.value);
    return acc;
  }, {});
  const hour = parts.hour;

  if (hour < MERCHANT_REFRESH_HOURS[0]) {
    return {
      round: null,
      nextRefreshBeijing: formatBeijingDateTime(beijingDateAt(8)),
      isOpen: false,
    };
  }

  const index = MERCHANT_REFRESH_HOURS.findIndex((start, currentIndex) => {
    const next = MERCHANT_REFRESH_HOURS[currentIndex + 1] ?? 24;
    return hour >= start && hour < next;
  });
  const round = index + 1;
  const nextHour = MERCHANT_REFRESH_HOURS[index + 1] ?? 0;

  return {
    round,
    nextRefreshBeijing: formatBeijingDateTime(beijingDateAt(nextHour, nextHour === 0 ? 1 : 0)),
    isOpen: true,
  };
}

function updateCountdown() {
  if (!merchantNextDate) {
    merchantCountdown.textContent = "--:--:--";
    return;
  }

  const diff = Math.max(0, merchantNextDate.getTime() - Date.now());
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  merchantCountdown.textContent = [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

  if (
    diff === 0 &&
    !merchantView.classList.contains("is-hidden") &&
    !refreshMerchantBtn.disabled &&
    Date.now() - merchantLastAutoRefresh > MERCHANT_RETRY_INTERVAL
  ) {
    merchantLastAutoRefresh = Date.now();
    loadMerchant();
  }
}

function normalizeMerchantItem(item) {
  const image = item.image || "";
  return {
    name: fixMojibake(item.name),
    category: fixMojibake(item.category || item.rarity || "商品"),
    description: fixMojibake(item.description || ""),
    price: item.priceRaw || item.price || "--",
    limit: item.limit || item.purchase_limit || "--",
    image: image.startsWith("/") ? `https://rocodex-merchant.1119484155.workers.dev${image}` : image,
  };
}

function renderMerchantItems(items) {
  if (!items.length) {
    merchantItems.innerHTML = '<div class="empty">当前轮次暂时没有商品数据。</div>';
    return;
  }

  merchantItems.innerHTML = items.map((item) => {
    const numericPrice = Number(item.price);
    const priceText = Number.isFinite(numericPrice) ? numericPrice.toLocaleString("zh-CN") : item.price;
    return `
    <article class="merchant-card">
      <div class="merchant-image">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy">` : "<span>?</span>"}
      </div>
      <div class="merchant-body">
        <div class="meta">
          <span class="chip">${item.category}</span>
          <span class="chip">限购 ${item.limit}</span>
        </div>
        <h3 class="name">${item.name}</h3>
        <div class="merchant-price">${priceText} 洛克贝</div>
        ${item.description ? `<p class="evolution">${item.description}</p>` : ""}
      </div>
    </article>
  `;
  }).join("");
}

function resolveMerchantData(data) {
  const schedule = currentMerchantWindow();
  const sourceItems = data.items || [];
  const sourceNext = parseBeijingDate(data.nextRefreshBeijing);
  const sourceNextIsPast = sourceNext && sourceNext.getTime() <= Date.now() - 30000;
  const scheduledItems = schedule.round && data.rounds?.[schedule.round]
    ? data.rounds[schedule.round]
    : [];
  const shouldUseScheduledItems = schedule.isOpen &&
    scheduledItems.length &&
    (!sourceItems.length || data.status === "closed" || sourceNextIsPast);

  if (shouldUseScheduledItems) {
    return {
      status: "数据延迟",
      round: schedule.round,
      nextRefreshBeijing: schedule.nextRefreshBeijing,
      items: scheduledItems,
      note: "源站当前轮次更新有延迟，已按北京时间刷新档位展示备用商品表。",
    };
  }

  if (schedule.isOpen && !sourceItems.length) {
    return {
      status: "数据延迟",
      round: schedule.round,
      nextRefreshBeijing: schedule.nextRefreshBeijing,
      items: [],
      note: "源站已到营业时间但暂未返回商品，页面会自动重试。",
    };
  }

  return {
    status: data.status === "closed" ? "未营业" : "实时数据",
    round: data.round || schedule.round,
    nextRefreshBeijing: data.nextRefreshBeijing || schedule.nextRefreshBeijing,
    items: sourceItems,
    note: "",
  };
}

async function loadMerchant() {
  merchantStatus.textContent = "获取中";
  merchantNote.textContent = "正在连接远行商人公开数据源。";
  refreshMerchantBtn.disabled = true;

  try {
    const response = await fetch(`https://rocokingdomworld.org/data/merchant.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const resolved = resolveMerchantData(data);
    const items = resolved.items.map(normalizeMerchantItem);
    const sourceTime = data.fetchedAt ? new Date(data.fetchedAt).toLocaleString("zh-CN") : "未知时间";

    merchantStatus.textContent = resolved.status;
    merchantRound.textContent = resolved.round ? `第 ${resolved.round} 轮` : "--";
    merchantNext.textContent = formatBeijingTime(resolved.nextRefreshBeijing);
    merchantNextDate = parseBeijingDate(resolved.nextRefreshBeijing);
    merchantNote.textContent = `数据更新于 ${sourceTime}，时间按北京时间显示。${resolved.note ? ` ${resolved.note}` : ""}`;
    renderMerchantItems(items);
    updateCountdown();
  } catch (error) {
    merchantStatus.textContent = "获取失败";
    merchantRound.textContent = "--";
    merchantNext.textContent = "--";
    merchantNextDate = null;
    merchantNote.textContent = "暂时无法获取远行商人数据，请稍后再试。";
    merchantItems.innerHTML = '<div class="empty">数据源暂时不可用。你可以点“刷新”重试。</div>';
    updateCountdown();
  } finally {
    refreshMerchantBtn.disabled = false;
  }
}

function switchView(view) {
  const isMerchant = view === "merchant";
  eggView.classList.toggle("is-hidden", isMerchant);
  merchantView.classList.toggle("is-hidden", !isMerchant);
  toolTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === view));

  if (isMerchant && !merchantItems.innerHTML.trim()) {
    loadMerchant();
  }
}

toolTabs.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

refreshMerchantBtn.addEventListener("click", loadMerchant);

window.setInterval(updateCountdown, 1000);

render();
