const records = window.EGG_RECORDS || [];

const shinyPets = [
  { name: "恶魔叮", groups: ["妖精组"], confidence: "高" },
  { name: "幽影树", groups: ["妖精组", "植物组"], confidence: "高" },
  { name: "嘟嘟煲", groups: ["妖精组", "大地组"], confidence: "高" },
  { name: "小夜", groups: ["妖精组", "拟人组"], confidence: "高" },
  { name: "加油海葵", groups: ["妖精组", "两栖组"], confidence: "高" },
  { name: "小丑豆豆", groups: ["妖精组", "拟人组"], confidence: "高" },
  { name: "咕咕帽", groups: ["妖精组"], confidence: "高" },
  { name: "牵线木偶", groups: ["妖精组", "拟人组"], confidence: "高" },
  { name: "大耳帽兜", groups: ["妖精组", "拟人组"], confidence: "高" },
  { name: "拉特", groups: ["妖精组"], confidence: "高" },
  { name: "治愈兔", groups: ["妖精组", "动物组"], confidence: "高" },
  { name: "格兰种子", groups: ["妖精组", "植物组"], confidence: "高" },
  { name: "粉粉星", groups: ["妖精组", "软体组"], confidence: "中", note: "图片字符较小，按全33名单与图标判断。" },
  { name: "粉星仔", groups: ["妖精组", "天空组"], confidence: "高" },
  { name: "小独角兽", groups: ["动物组", "巨灵组"], confidence: "高" },
  { name: "灵狐", groups: ["动物组"], confidence: "高" },
  { name: "猴麦仔", groups: ["动物组", "机械组"], confidence: "高" },
  { name: "炫光迪迪", groups: ["动物组", "大地组"], confidence: "高" },
  { name: "小鼓象", groups: ["动物组", "机械组"], confidence: "高" },
  { name: "恶魔狼", groups: ["动物组"], confidence: "高" },
  { name: "呼呼猪", groups: ["动物组"], confidence: "高" },
  { name: "月牙雪熊", groups: ["动物组", "巨灵组"], confidence: "高", aliases: ["月牙熊"] },
  { name: "火红尾", groups: ["动物组"], confidence: "高" },
  { name: "烟花团", groups: ["机械组", "魔力组"], confidence: "高" },
  { name: "机械方方", groups: ["机械组", "拟人组"], confidence: "高" },
  { name: "贝瑟", groups: ["机械组"], confidence: "中", note: "部分攻略写作贝古斯，建议以游戏内图鉴复核。", aliases: ["贝古斯"] },
  { name: "菊花梨", groups: ["植物组"], confidence: "高" },
  { name: "奇丽草", groups: ["植物组"], confidence: "高" },
  { name: "柴渣虫", groups: ["植物组", "昆虫组"], confidence: "高" },
  { name: "空空颅", groups: ["巨灵组", "魔力组"], confidence: "高" },
  { name: "嗜光嗡嗡", groups: ["昆虫组"], confidence: "高" },
  { name: "公平鸽", groups: ["天空组"], confidence: "高" },
  { name: "双灯鱼", groups: ["海洋组"], confidence: "高" },
];

const s1Routes = [
  { group: "妖精组", target: "红绒十字", parents: ["酷拉", "雪影娃娃", "小皮球", "粉星仔", "格兰种子"] },
  { group: "动物组", target: "红绒十字", parents: ["恶魔狼", "月牙雪熊", "獠牙猪", "雅丹鬃"] },
  { group: "巨灵组", target: "月牙雪熊", parents: ["空空颅", "粉星仔"] },
  { group: "拟人组", target: "立方人", parents: ["立方人"] },
  { group: "机械组", target: "立方人", parents: ["贝瑟", "贝古斯"] },
  { group: "植物组", target: "格兰种子", parents: ["燃薪虫", "奇丽花"] },
  { group: "昆虫组", target: "燃薪虫", parents: ["窃光蚊", "燃薪虫"] },
];

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
const breedingView = document.querySelector("#breedingView");
const merchantStatus = document.querySelector("#merchantStatus");
const merchantRound = document.querySelector("#merchantRound");
const merchantNext = document.querySelector("#merchantNext");
const merchantCountdown = document.querySelector("#merchantCountdown");
const merchantNote = document.querySelector("#merchantNote");
const merchantItems = document.querySelector("#merchantItems");
const refreshMerchantBtn = document.querySelector("#refreshMerchantBtn");
const breedingSearch = document.querySelector("#breedingSearch");
const partnerSearch = document.querySelector("#partnerSearch");
const compatResult = document.querySelector("#compatResult");
const breedingGroups = document.querySelector("#breedingGroups");
const breedingResults = document.querySelector("#breedingResults");
const breedingCount = document.querySelector("#breedingCount");

let activeFilter = "all";
let activeBreedingGroup = "all";
let merchantNextDate = null;
let merchantLastAutoRefresh = 0;

const MERCHANT_REFRESH_HOURS = [8, 12, 16, 20];
const MERCHANT_RETRY_INTERVAL = 60000;
const breedingGroupNames = ["全部", ...new Set(shinyPets.flatMap((pet) => pet.groups))];

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

function petMatchesQuery(pet, query) {
  if (!query) return true;
  const text = query.trim().toLowerCase();
  return pet.name.toLowerCase().includes(text) || (pet.aliases || []).some((alias) => alias.toLowerCase().includes(text));
}

function findShinyPet(query) {
  const text = query.trim();
  if (!text) return null;
  return shinyPets.find((pet) => pet.name === text || (pet.aliases || []).includes(text))
    || shinyPets.find((pet) => petMatchesQuery(pet, text))
    || null;
}

function sharedGroups(a, b) {
  return a.groups.filter((group) => b.groups.includes(group));
}

function partnersFor(pet) {
  return shinyPets
    .filter((candidate) => candidate.name !== pet.name)
    .map((candidate) => ({ pet: candidate, groups: sharedGroups(pet, candidate) }))
    .filter((item) => item.groups.length)
    .sort((a, b) => b.groups.length - a.groups.length || a.pet.name.localeCompare(b.pet.name, "zh-CN"));
}

function renderBreedingGroups() {
  breedingGroups.innerHTML = breedingGroupNames.map((group) => {
    const value = group === "全部" ? "all" : group;
    const active = activeBreedingGroup === value ? " is-active" : "";
    return `<button class="group-filter${active}" data-group="${value}" type="button">${group}</button>`;
  }).join("");
}

function renderCompatibility() {
  const first = findShinyPet(breedingSearch.value);
  const second = findShinyPet(partnerSearch.value);

  compatResult.classList.remove("hit", "loose");

  if (!breedingSearch.value.trim() && !partnerSearch.value.trim()) {
    compatResult.textContent = "输入两只精灵，可以快速检查是否同蛋组。";
    return;
  }

  if (!first || !second) {
    const missing = [
      breedingSearch.value.trim() && !first ? "目标精灵未收录" : "",
      partnerSearch.value.trim() && !second ? "配偶精灵未收录" : "",
    ].filter(Boolean).join("，");
    compatResult.textContent = `${missing || "继续输入"}。当前只覆盖 S1-S2 全33只异色蛋组。`;
    compatResult.classList.add("loose");
    return;
  }

  const common = sharedGroups(first, second);
  if (common.length) {
    compatResult.innerHTML = `<strong>${first.name}</strong> 和 <strong>${second.name}</strong> 可以尝试孵蛋，共享 ${common.join("、")}。`;
    compatResult.classList.add("hit");
  } else {
    compatResult.innerHTML = `<strong>${first.name}</strong> 和 <strong>${second.name}</strong> 在当前表里没有共享蛋组。`;
    compatResult.classList.add("loose");
  }
}

function renderBreedingCard(pet) {
  const partners = partnersFor(pet);
  const groups = pet.groups.map((group) => `<span class="chip">${group}</span>`).join("");
  const status = pet.confidence === "中" ? "pending" : "hit";
  const partnerTags = partners.map((item) => {
    const title = item.groups.join("、");
    return `<span class="partner-chip" title="${title}">${item.pet.name}</span>`;
  }).join("");

  return `
    <article class="card ${status}">
      <div class="card-main">
        <div class="topline">
          <h3 class="name">${pet.name}</h3>
          <div class="score">${partners.length} 个</div>
        </div>
        <div class="meta">
          ${groups}
          <span class="chip">置信度 ${pet.confidence}</span>
        </div>
        <div class="partner-list">${partnerTags || '<span class="partner-chip">当前无同组异色</span>'}</div>
        ${pet.note ? `<p class="evolution">${pet.note}</p>` : ""}
      </div>
    </article>
  `;
}

function renderS1Routes() {
  return `
    <article class="card pending">
      <div class="card-main">
        <div class="topline">
          <h3 class="name">S1路线补充</h3>
          <div class="score">${s1Routes.length} 组</div>
        </div>
        <div class="partner-list">
          ${s1Routes.map((route) => `<span class="partner-chip">${route.group}：${route.target}</span>`).join("")}
        </div>
        <p class="evolution">这部分来自文字攻略路线，和全33只分组图不是同一个口径，只作为路线参考。</p>
      </div>
    </article>
  `;
}

function renderBreeding() {
  const query = breedingSearch.value.trim();
  const group = activeBreedingGroup;
  const filtered = shinyPets.filter((pet) => {
    const inGroup = group === "all" || pet.groups.includes(group);
    return inGroup && petMatchesQuery(pet, query);
  });

  breedingCount.textContent = `${filtered.length} / ${shinyPets.length}`;
  renderCompatibility();

  if (!filtered.length) {
    breedingResults.innerHTML = '<div class="empty">没有找到匹配的异色蛋组记录。</div>';
    return;
  }

  const focused = findShinyPet(query);
  const rows = focused && filtered.some((pet) => pet.name === focused.name)
    ? [focused, ...filtered.filter((pet) => pet.name !== focused.name)]
    : filtered;

  breedingResults.innerHTML = rows.map(renderBreedingCard).join("") + renderS1Routes();
}

function switchView(view) {
  const isMerchant = view === "merchant";
  const isBreeding = view === "breeding";
  eggView.classList.toggle("is-hidden", isMerchant || isBreeding);
  merchantView.classList.toggle("is-hidden", !isMerchant);
  breedingView.classList.toggle("is-hidden", !isBreeding);
  toolTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === view));

  if (isMerchant && !merchantItems.innerHTML.trim()) {
    loadMerchant();
  }

  if (isBreeding && !breedingResults.innerHTML.trim()) {
    renderBreeding();
  }
}

toolTabs.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

refreshMerchantBtn.addEventListener("click", loadMerchant);
breedingSearch.addEventListener("input", renderBreeding);
partnerSearch.addEventListener("input", renderBreeding);
breedingGroups.addEventListener("click", (event) => {
  const button = event.target.closest(".group-filter");
  if (!button) return;
  activeBreedingGroup = button.dataset.group;
  renderBreedingGroups();
  renderBreeding();
});

window.setInterval(updateCountdown, 1000);

renderBreedingGroups();
render();
