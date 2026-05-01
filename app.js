const BANK = Array.isArray(window.REQUIREMENT_BANK) ? window.REQUIREMENT_BANK : REQUIREMENT_BANK;

const els = {
  totalCount: document.querySelector("#totalCount"),
  doneCount: document.querySelector("#doneCount"),
  avgScore: document.querySelector("#avgScore"),
  kindFilter: document.querySelector("#kindFilter"),
  sectionFilter: document.querySelector("#sectionFilter"),
  layerFilter: document.querySelector("#layerFilter"),
  searchInput: document.querySelector("#searchInput"),
  itemList: document.querySelector("#itemList"),
  weakOnlyBtn: document.querySelector("#weakOnlyBtn"),
  modeButtons: document.querySelectorAll(".mode"),
  crumb: document.querySelector("#crumb"),
  title: document.querySelector("#title"),
  questionText: document.querySelector("#questionText"),
  randomBtn: document.querySelector("#randomBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  modeName: document.querySelector("#modeName"),
  requirementCount: document.querySelector("#requirementCount"),
  bestScore: document.querySelector("#bestScore"),
  levelMark: document.querySelector("#levelMark"),
  learnPanel: document.querySelector("#learnPanel"),
  writePanel: document.querySelector("#writePanel"),
  answerList: document.querySelector("#answerList"),
  revealList: document.querySelector("#revealList"),
  lineCount: document.querySelector("#lineCount"),
  memoryFormula: document.querySelector("#memoryFormula"),
  mockPrompt: document.querySelector("#mockPrompt"),
  answerInput: document.querySelector("#answerInput"),
  charCount: document.querySelector("#charCount"),
  scoreBtn: document.querySelector("#scoreBtn"),
  revealBtn: document.querySelector("#revealBtn"),
  resultPanel: document.querySelector("#resultPanel"),
  scoreNumber: document.querySelector("#scoreNumber"),
  scoreComment: document.querySelector("#scoreComment"),
  keywordGrid: document.querySelector("#keywordGrid"),
  revealPanel: document.querySelector("#revealPanel"),
  hideRevealBtn: document.querySelector("#hideRevealBtn")
};

const STORE_KEY = "level-protection-2-memory-v2";
const state = {
  id: BANK[0]?.id,
  mode: "learn",
  weakOnly: false,
  stats: loadStats()
};

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStats() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.stats));
}

function optionList(select, values, label) {
  select.innerHTML = `<option value="all">${label}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function initFilters() {
  optionList(els.kindFilter, unique("kind"), "全部材料");
  optionList(els.sectionFilter, unique("section"), "全部分册/扩展");
  optionList(els.layerFilter, unique("layer"), "全部层面");
}

function unique(key) {
  return [...new Set(BANK.map((item) => item[key]))].filter(Boolean);
}

function normalize(text) {
  return String(text || "").replace(/\s+/g, "").toLowerCase();
}

function normalizeAnswer(text) {
  return String(text || "")
    .replace(/[，。；;、,.:\s()（）]/g, "")
    .replace(/[0-9]+[.)、]/g, "")
    .toLowerCase();
}

function lcsRatio(source, target) {
  const a = normalizeAnswer(source);
  const b = normalizeAnswer(target);
  if (!a || !b) return 0;

  const prev = new Array(b.length + 1).fill(0);
  const curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1]);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }

  return prev[b.length] / Math.max(a.length, 1);
}

function importantTerms(text) {
  const normalized = normalizeAnswer(text);
  const terms = [];
  const patterns = [
    /防震|防风|防雨|防水|防潮|防雷|防火|防静电|电磁屏蔽/g,
    /身份鉴别|访问控制|安全审计|入侵防范|恶意代码|可信验证/g,
    /备份|恢复|加密|密码技术|校验码|告警|审计记录|授权|审批/g,
    /机房|网络|系统|数据|设备|虚拟机|云服务|移动终端|无线/g
  ];

  patterns.forEach((pattern) => {
    for (const match of normalized.matchAll(pattern)) {
      if (!terms.includes(match[0])) terms.push(match[0]);
    }
  });

  return terms;
}

function currentItem() {
  return BANK.find((item) => item.id === state.id) || BANK[0];
}

function filteredItems() {
  const kind = els.kindFilter.value;
  const section = els.sectionFilter.value;
  const layer = els.layerFilter.value;
  const query = normalize(els.searchInput.value);

  return BANK.filter((item) => {
    const stat = state.stats[item.id];
    const weak = !stat || stat.best < 80;
    const text = normalize([
      item.kind,
      item.section,
      item.layer,
      item.control,
      item.requirements.join("")
    ].join(""));

    return (kind === "all" || item.kind === kind)
      && (section === "all" || item.section === section)
      && (layer === "all" || item.layer === layer)
      && (!state.weakOnly || weak)
      && (!query || text.includes(query));
  });
}

function renderStats() {
  const records = Object.values(state.stats);
  const practiced = records.filter((item) => item.count > 0);
  const avg = practiced.length
    ? Math.round(practiced.reduce((sum, item) => sum + item.best, 0) / practiced.length)
    : 0;

  els.totalCount.textContent = BANK.length;
  els.doneCount.textContent = practiced.length;
  els.avgScore.textContent = `${avg}%`;
}

function renderList() {
  const items = filteredItems();
  els.itemList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "没有匹配的控制点。";
    els.itemList.append(empty);
    return;
  }

  items.forEach((item) => {
    const stat = state.stats[item.id];
    const button = document.createElement("button");
    button.className = `queue-item ${item.id === state.id ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span>${item.control}</span>
      <small>${item.section} · ${item.layer} · ${stat ? `最佳 ${stat.best}%` : "未练"}</small>
    `;
    button.addEventListener("click", () => {
      state.id = item.id;
      clearPractice();
      render();
    });
    els.itemList.append(button);
  });
}

function renderCurrent() {
  const item = currentItem();
  const stat = state.stats[item.id];
  const modeText = { learn: "背诵", write: "默写", exam: "模拟" }[state.mode];

  els.crumb.textContent = `${item.kind} / ${item.section} / ${item.layer}`;
  els.title.textContent = item.control;
  els.questionText.textContent = makePrompt(item);
  els.modeName.textContent = modeText;
  els.requirementCount.textContent = item.requirements.length;
  els.bestScore.textContent = stat ? `${stat.best}%` : "未练";
  els.levelMark.textContent = item.level;
  els.lineCount.textContent = `${item.requirements.length} 条`;
  els.mockPrompt.textContent = makePrompt(item);

  renderLines(els.answerList, item.requirements);
  renderLines(els.revealList, item.requirements);
  renderFormula(item);

  els.learnPanel.classList.toggle("hidden", state.mode !== "learn");
  els.writePanel.classList.toggle("hidden", state.mode === "learn");
  if (state.mode === "exam") els.revealPanel.classList.add("hidden");
}

function makePrompt(item) {
  return `请写出《网络安全等级保护基本要求》中，${item.section} ${item.level}${item.layer}层面“${item.control}”控制点的安全要求项。`;
}

function renderLines(container, lines) {
  container.innerHTML = "";
  lines.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    container.append(li);
  });
}

function renderFormula(item) {
  const chips = item.requirements.map((line, index) => {
    return `<span><b>${String.fromCharCode(97 + index)})</b> ${memoryClue(line)}</span>`;
  });
  els.memoryFormula.innerHTML = chips.join("");
}

function memoryClue(line) {
  const text = line
    .replace(/[。；;]$/g, "")
    .replace(/^应/, "")
    .replace(/^保证/, "")
    .trim();

  const manual = [
    ["火灾自动消防系统", "机房火灾自动消防：检测火情、报警、灭火"],
    ["耐火等级", "工作房间和辅助房：耐火等级建筑材料"],
    ["隔离防火措施", "机房区域管理：区域间隔离防火措施"],
    ["防震、防风和防雨", "机房位置：防震、防风、防雨建筑内"],
    ["顶层或地下室", "避免顶层或地下室，否则加强防水防潮"]
  ];

  const matched = manual.find(([keyword]) => text.includes(keyword));
  if (matched) return matched[1];

  const compact = text
    .replace(/包括但不限于.*/, "")
    .replace(/例如.*/, "")
    .replace(/如：.*/, "")
    .replace(/等相关措施/, "等措施")
    .replace(/，并/g, "、")
    .replace(/，且/g, "、")
    .trim();

  if (compact.length <= 34) return compact;
  const firstClause = compact.split(/[，；;]/)[0];
  if (firstClause.length >= 12 && firstClause.length <= 34) return firstClause;
  return `${compact.slice(0, 34)}…`;
}

function scoreAnswer() {
  const item = currentItem();
  const answer = normalizeAnswer(els.answerInput.value);
  const checks = item.requirements.map((line, index) => {
    const required = normalizeAnswer(line);
    const terms = importantTerms(line);
    const termHits = terms.filter((term) => answer.includes(term));
    const exact = answer.includes(required);
    const similarity = lcsRatio(line, answer);
    const termRatio = terms.length ? termHits.length / terms.length : 0;
    const coverage = exact ? 1 : Math.min(1, similarity * 0.72 + termRatio * 0.28);

    return {
      keyword: `${String.fromCharCode(97 + index)}) ${line.replace(/[。；;]$/, "")}`,
      hit: coverage >= 0.62,
      partial: coverage >= 0.35 && coverage < 0.62,
      coverage,
      terms,
      termHits
    };
  });
  const score = Math.round(
    checks.reduce((sum, check) => sum + check.coverage, 0) / Math.max(checks.length, 1) * 100
  );
  return { score, checks };
}

function commitScore(score) {
  const id = currentItem().id;
  const previous = state.stats[id] || { count: 0, best: 0 };
  state.stats[id] = {
    count: previous.count + 1,
    best: Math.max(previous.best, score),
    last: score,
    updatedAt: new Date().toISOString()
  };
  saveStats();
}

function renderScore(score, checks) {
  els.resultPanel.classList.remove("hidden");
  els.scoreNumber.textContent = `${score}%`;
  els.scoreComment.textContent =
    score >= 90 ? "可以进入模拟题节奏。" :
    score >= 75 ? "主干已经到位，补漏关键词。" :
    score >= 55 ? "有框架，需要再默写一遍。" :
    "先背答案，再合上重写。";

  els.keywordGrid.innerHTML = "";
  checks.forEach(({ keyword, hit }) => {
    const chip = document.createElement("span");
    const check = checks.find((item) => item.keyword === keyword);
    chip.className = hit ? "hit" : check?.partial ? "partial" : "miss";
    chip.textContent = keyword;
    els.keywordGrid.append(chip);
  });
}

function clearPractice() {
  els.answerInput.value = "";
  els.charCount.textContent = "0 字";
  els.resultPanel.classList.add("hidden");
  els.revealPanel.classList.add("hidden");
}

function renderMode() {
  els.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
}

function render() {
  renderStats();
  renderMode();
  renderList();
  renderCurrent();
}

["change", "input"].forEach((event) => {
  els.kindFilter.addEventListener(event, renderList);
  els.sectionFilter.addEventListener(event, renderList);
  els.layerFilter.addEventListener(event, renderList);
  els.searchInput.addEventListener(event, renderList);
});

els.modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    clearPractice();
    render();
  });
});

els.weakOnlyBtn.addEventListener("click", () => {
  state.weakOnly = !state.weakOnly;
  els.weakOnlyBtn.classList.toggle("active", state.weakOnly);
  renderList();
});

els.answerInput.addEventListener("input", () => {
  els.charCount.textContent = `${els.answerInput.value.trim().length} 字`;
});

els.scoreBtn.addEventListener("click", () => {
  const { score, checks } = scoreAnswer();
  commitScore(score);
  renderScore(score, checks);
  renderStats();
  renderList();
  renderCurrent();
});

els.revealBtn.addEventListener("click", () => {
  els.revealPanel.classList.remove("hidden");
});

els.hideRevealBtn.addEventListener("click", () => {
  els.revealPanel.classList.add("hidden");
});

els.clearBtn.addEventListener("click", () => {
  clearPractice();
});

els.randomBtn.addEventListener("click", () => {
  const items = filteredItems();
  const pool = items.length ? items : BANK;
  state.id = pool[Math.floor(Math.random() * pool.length)].id;
  clearPractice();
  render();
});

initFilters();
render();
