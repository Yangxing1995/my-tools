function $(id) {
  return document.getElementById(id);
}

const {
  normalizePEM,
  splitCertificatePEMs,
  parseCertificatePEM,
  parseCSRPEM,
  formatJSONText,
  minifyJSONText,
  utf8ToBase64,
  base64ToUtf8,
  encodeURLText,
  decodeURLText,
  toPGArray,
  transformLines,
  parseDateTime,
  formatDateTime,
  diffDateTimes,
  addDaysToDateTime
} = window.WrenchUtils || {};

const toolCatalog = [
  {
    name: "JSON 解析器",
    href: "/json",
    category: "数据处理",
    desc: "提取、格式化、压缩和表格查看 JSON 数据",
    tags: ["json", "format", "minify", "格式化", "压缩", "校验", "解析", "表格"]
  },
  {
    name: "CSR 格式化",
    href: "/csr",
    category: "证书工具",
    desc: "输入 JSON 或原始 CSR，输出规范化 PEM",
    tags: ["csr", "pem", "证书请求", "格式化"]
  },
  {
    name: "证书格式化",
    href: "/cert",
    category: "证书工具",
    desc: "拆分证书链并查看证书信息",
    tags: ["cert", "certificate", "pem", "证书链", "x509"]
  },
  {
    name: "Base64 编解码",
    href: "/base64",
    category: "编码转换",
    desc: "UTF-8 文本 Base64 编码和解码",
    tags: ["base64", "b64", "编码", "解码"]
  },
  {
    name: "URL 编解码",
    href: "/url",
    category: "编码转换",
    desc: "URL 参数和文本片段 percent-encoding 编解码",
    tags: ["url", "uri", "encode", "decode", "编码", "解码"]
  },
  {
    name: "PG Array 转换",
    href: "/pg-array",
    category: "数据处理",
    desc: "把一串 ID 转成 PostgreSQL IN 查询数组",
    tags: ["postgres", "pg", "sql", "array", "in", "id", "数组"]
  },
  {
    name: "文本去重排序",
    href: "/text",
    category: "数据处理",
    desc: "多行文本去重、排序和清理空行",
    tags: ["text", "文本", "去重", "排序", "行处理", "列表"]
  },
  {
    name: "时间计算",
    href: "/time",
    category: "数据处理",
    desc: "计算两个时间差值，或给时间加减天数",
    tags: ["time", "date", "时间", "日期", "天数", "时间差"]
  },
  {
    name: "CSR 与证书匹配",
    href: "/cert-match",
    category: "证书工具",
    desc: "比较 CSR 和证书的公钥、CN 和 SAN",
    tags: ["csr", "cert", "certificate", "match", "匹配", "公钥", "san"]
  }
];

const categoryOrder = ["数据处理", "编码转换", "证书工具", "本地工具"];
let activeToolCategory = "全部";
const frequentSubfeatureKey = "wrench:frequent-subfeatures";
const frequentSubfeatureLimit = 2;

function readFrequentSubfeatures() {
  try {
    return JSON.parse(localStorage.getItem(frequentSubfeatureKey) || "[]");
  } catch (e) {
    return [];
  }
}

function writeFrequentSubfeatures(items) {
  try {
    localStorage.setItem(frequentSubfeatureKey, JSON.stringify(items.slice(0, frequentSubfeatureLimit)));
  } catch (e) {
    // Recent feature tracking is optional UI metadata; tool execution must not depend on browser storage.
  }
}

function renderFrequentSubfeatures() {
  const el = $("appFrequentSubfeatures");
  if (!el) return;

  const items = readFrequentSubfeatures()
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastUsed || 0) - (a.lastUsed || 0))
    .slice(0, frequentSubfeatureLimit);

  el.replaceChildren();
  el.hidden = items.length === 0;
  if (items.length === 0) return;

  const title = document.createElement("div");
  title.className = "app-frequent-title";
  title.textContent = "常用子功能";
  el.appendChild(title);

  items.forEach(item => {
    const a = document.createElement("a");
    a.className = "app-frequent-link";
    a.href = item.href || "/";
    a.textContent = item.label;
    el.appendChild(a);
  });
}

function recordSubfeatureUse(id, label, href) {
  if (!id || !label) return;
  const items = readFrequentSubfeatures();
  const existing = items.find(item => item.id === id);
  if (existing) {
    existing.count = (existing.count || 0) + 1;
    existing.lastUsed = Date.now();
  } else {
    items.push({ id, label, href, count: 1, lastUsed: Date.now() });
  }
  // Only feature metadata is stored here; user input stays in sessionStorage or the live page.
  writeFrequentSubfeatures(items.sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastUsed || 0) - (a.lastUsed || 0)));
  renderFrequentSubfeatures();
}

function matchesTool(tool, query) {
  if (!query) return true;
  const haystack = [tool.name, tool.category, tool.desc, ...(tool.tags || [])].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function toolsForCategory(category) {
  if (category === "全部") return toolCatalog;
  return toolCatalog.filter(tool => tool.category === category);
}

function pageFromHref(href) {
  return href.replace(/^\//, "") || "home";
}

function renderSidebarTools(query, activePage) {
  const el = $("appSidebarTools");
  if (!el) return;

  const normalizedQuery = (query || "").trim();
  el.innerHTML = "";

  const home = document.createElement("a");
  home.className = "app-sidebar-home";
  home.href = "/";
  home.classList.toggle("active", activePage === "home");
  home.innerHTML = `<span>首页</span><small>全部工具概览</small>`;
  el.appendChild(home);

  categoryOrder
    .filter(category => toolCatalog.some(tool => tool.category === category))
    .forEach(category => {
      const tools = toolsForCategory(category).filter(tool => matchesTool(tool, normalizedQuery));
      if (normalizedQuery && tools.length === 0) return;

      const details = document.createElement("details");
      details.className = "app-sidebar-group";
      details.open = normalizedQuery || tools.some(tool => pageFromHref(tool.href) === activePage);

      const summary = document.createElement("summary");
      summary.className = "app-sidebar-category";
      summary.innerHTML = `<span>${category}</span><span>${tools.length}</span>`;

      const list = document.createElement("div");
      list.className = "app-sidebar-list";

      tools.forEach(tool => {
        const a = document.createElement("a");
        a.href = tool.href;
        a.className = "app-sidebar-tool";
        a.classList.toggle("active", pageFromHref(tool.href) === activePage);
        a.innerHTML = `<span>${tool.name}</span><small>${tool.desc}</small>`;
        list.appendChild(a);
      });

      details.appendChild(summary);
      details.appendChild(list);
      el.appendChild(details);
    });
}

function renderAppShell(activePage) {
  const existingShell = document.querySelector(".app-shell");
  if (existingShell) {
    renderSidebarTools("", activePage);
    return;
  }

  const container = document.querySelector("body > .container");
  if (!container) return;

  const shell = document.createElement("div");
  shell.className = "app-shell";

  const sidebar = document.createElement("aside");
  sidebar.className = "app-sidebar";
  sidebar.innerHTML = `
    <div class="app-sidebar-brand">
      <img class="app-sidebar-logo" src="/static/favicon.svg" alt="" aria-hidden="true">
      <div class="app-sidebar-brand-text">
        <strong>Wrench </strong>
        <span>🔒 无数据上传</span>
      </div>
    </div>
    <div class="app-sidebar-search">
      <input id="appToolSearch" type="search" placeholder="搜索工具" autocomplete="off">
      <button class="btn" id="appToolSearchClear">清空</button>
    </div>
    <div id="appFrequentSubfeatures" class="app-frequent" hidden></div>
    <nav id="appSidebarTools" class="app-sidebar-tools" aria-label="工具列表"></nav>
  `;

  const main = document.createElement("main");
  main.className = "app-main";

  document.body.insertBefore(shell, container);
  main.appendChild(container);
  shell.appendChild(sidebar);
  shell.appendChild(main);

  const search = $("appToolSearch");
  const clear = $("appToolSearchClear");

  if (search) {
    search.addEventListener("input", () => renderSidebarTools(search.value, activePage));
    search.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const firstTool = document.querySelector(".app-sidebar-tool:not([hidden])");
      if (firstTool) {
        e.preventDefault();
        firstTool.click();
      }
    });
  }

  if (clear && search) {
    clear.addEventListener("click", () => {
      search.value = "";
      search.focus();
      renderSidebarTools("", activePage);
    });
  }

  renderFrequentSubfeatures();
  renderSidebarTools("", activePage);
}

function renderToolRow(tool) {
  const a = document.createElement("a");
  a.className = "tool-row";
  a.href = tool.href;

  const text = document.createElement("span");
  text.className = "tool-row-main";

  const name = document.createElement("span");
  name.className = "tool-row-name";
  name.textContent = tool.name;

  const desc = document.createElement("span");
  desc.className = "tool-row-desc";
  desc.textContent = tool.desc;

  const meta = document.createElement("span");
  meta.className = "tool-row-meta";
  meta.textContent = tool.category;

  const arrow = document.createElement("span");
  arrow.className = "tool-row-arrow";
  arrow.textContent = "打开";

  text.appendChild(name);
  text.appendChild(desc);
  a.appendChild(text);
  a.appendChild(meta);
  a.appendChild(arrow);

  return a;
}

function renderHomeTools() {
  const search = $("homeToolSearch");
  const query = search ? search.value.trim() : "";
  const filtered = toolsForCategory(activeToolCategory).filter(tool => matchesTool(tool, query));

  const title = $("toolListTitle");
  if (title) {
    title.textContent = activeToolCategory === "全部" ? "全部工具" : activeToolCategory;
  }

  const resultCount = $("toolResultCount");
  if (resultCount) {
    resultCount.textContent = `${filtered.length} 个`;
  }

  const groups = $("toolGroups");
  const empty = $("emptyTools");
  if (!groups || !empty) return;

  groups.innerHTML = "";
  empty.hidden = filtered.length > 0;

  const categories = [...new Set(filtered.map(tool => tool.category))];
  categories.forEach(category => {
    const section = document.createElement("section");
    section.className = "tool-group";

    const heading = document.createElement("h3");
    heading.textContent = category;
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "tool-list";
    filtered
      .filter(tool => tool.category === category)
      .forEach(tool => list.appendChild(renderToolRow(tool)));

    section.appendChild(list);
    groups.appendChild(section);
  });
}

function wireHomePage() {
  const search = $("homeToolSearch");
  const clear = $("homeToolSearchClear");

  renderHomeTools();

  if (search) {
    search.addEventListener("input", () => {
      renderHomeTools();
      renderSidebarTools(search.value, "home");
    });
    search.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      const firstTool = document.querySelector(".tool-row");
      if (firstTool) {
        e.preventDefault();
        firstTool.click();
      }
    });
  }

  if (clear && search) {
    clear.addEventListener("click", () => {
      search.value = "";
      search.focus();
      renderHomeTools();
      renderSidebarTools("", "home");
    });
  }
}

function setStatus(msg, type) {
  const el = $("status");
  if (!el) return;
  el.classList.remove("ok", "err");
  if (type) el.classList.add(type);
  el.textContent = msg || "";
}

const handoffPrefix = "wrench:handoff:";
const handoffTTL = 60 * 1000;

function getSelectedTextareaText(textarea) {
  if (!textarea || typeof textarea.selectionStart !== "number") return "";
  return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();
}

function detectPemActions(text) {
  const actions = [];
  if (/-----BEGIN(?: NEW)? CERTIFICATE REQUEST-----/.test(text)) {
    actions.push({ type: "csr", label: "在 CSR 工具中打开", href: "/csr" });
  }
  if (/-----BEGIN CERTIFICATE-----/.test(text)) {
    actions.push({ type: "cert", label: "在证书工具中打开", href: "/cert" });
  }
  return actions;
}

function cleanupExpiredHandoffs() {
  const now = Date.now();
  Object.keys(sessionStorage).forEach(key => {
    if (!key.startsWith(handoffPrefix)) return;
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || "{}");
      if (!value.expiresAt || value.expiresAt < now) {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      sessionStorage.removeItem(key);
    }
  });
}

function createHandoff(type, value) {
  cleanupExpiredHandoffs();
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
  sessionStorage.setItem(handoffPrefix + id, JSON.stringify({
    type,
    value,
    expiresAt: Date.now() + handoffTTL
  }));
  return id;
}

function consumeHandoff(page) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("handoff");
  if (!id) return;

  const key = handoffPrefix + id;
  try {
    const data = JSON.parse(sessionStorage.getItem(key) || "{}");
    sessionStorage.removeItem(key);

    if (!data || data.expiresAt < Date.now() || data.type !== page || typeof data.value !== "string") {
      return;
    }

    const input = $("input");
    if (!input) return;

    input.value = data.value;
    persistField(input);
    const cleanURL = window.location.pathname;
    window.history.replaceState(null, "", cleanURL);
  } catch (e) {
    sessionStorage.removeItem(key);
  }
}

function hideContextMenu() {
  const existing = document.querySelector(".context-menu");
  if (existing) existing.remove();
}

function showContextMenu(x, y, actions, text) {
  hideContextMenu();

  const menu = document.createElement("div");
  menu.className = "context-menu";

  actions.forEach(action => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      const handoff = createHandoff(action.type, text);
      hideContextMenu();
      window.open(`${action.href}?handoff=${encodeURIComponent(handoff)}`, "_blank");
    });
    menu.appendChild(button);
  });

  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const left = Math.min(x, window.innerWidth - rect.width - 8);
  const top = Math.min(y, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

function bindJSONContextMenu(textarea) {
  if (!textarea || textarea.dataset.jsonContextMenuBound === "1") return;
  textarea.dataset.jsonContextMenuBound = "1";

  textarea.addEventListener("contextmenu", e => {
    const selected = getSelectedTextareaText(textarea);
    const actions = detectPemActions(selected);
    if (actions.length === 0) return;

    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, actions, selected);
  });
}

function wireJSONContextActions() {
  bindJSONContextMenu($("output"));

  document.addEventListener("click", hideContextMenu);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") hideContextMenu();
  });
}

function currentPage() {
  return document.body ? document.body.dataset.page : "";
}

function storageKey(page, id) {
  return `wrench:${page}:${id}`;
}

function persistField(el) {
  const page = currentPage();
  if (!page || !el || !el.id) return;

  const key = storageKey(page, el.id);
  if (el.value) {
    sessionStorage.setItem(key, el.value);
  } else {
    sessionStorage.removeItem(key);
  }
}

function persistPageState() {
  document.querySelectorAll("textarea[id], input[id]").forEach(persistField);
}

function restorePageState(page) {
  if (!page) return;

  document.querySelectorAll("textarea[id], input[id]").forEach(el => {
    const value = sessionStorage.getItem(storageKey(page, el.id));
    if (value !== null) {
      el.value = value;
    }
    el.addEventListener("input", () => persistField(el));
  });
}

function syncRestoredControls() {
  const outEl = $("output");
  if (outEl && outEl.value) {
    ["btnCopy", "btnToJSON", "btnSave"].forEach(id => {
      const btn = $(id);
      if (btn) btn.disabled = false;
    });
  }

}

async function copyToClipboard(text) {
    if (!text) return false;

    // 优先使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn("Clipboard API failed, falling back to execCommand:", err);
        }
    }

    // 降级方案：使用 execCommand
    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);
        return success;
    } catch (err) {
        console.error("Copy failed:", err);
        return false;
    }
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openASN1Parser(text) {
  const value = toASN1HashValue(text);
  if (!value) {
    setStatus("没有可解析的内容", "err");
    return;
  }
  window.open("https://lapo.it/asn1js/#" + value, "_blank", "noreferrer");
}

function toASN1HashValue(text) {
  const value = (text || "").trim();
  if (!value) return "";

  const pemMatch = value.match(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/);
  const body = pemMatch ? pemMatch[1] : value;

  return body
    .replace(/\s+/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function openMySSLCertParser(sha1) {
  const value = (sha1 || "").trim();
  if (!value) {
    setStatus("缺少证书 SHA1", "err");
    return;
  }
  window.open("https://myssl.com/cert_decode.html?id=" + encodeURIComponent(value), "_blank", "noreferrer");
}

function openFullscreenOverlay(textarea, title) {
  let overlay = document.getElementById("fullscreenOverlay");
  
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "fullscreenOverlay";
    overlay.className = "fullscreen-overlay";
    
    const header = document.createElement("div");
    header.className = "fullscreen-header";
    
    const titleEl = document.createElement("div");
    titleEl.className = "fullscreen-title";
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "fullscreen-close";
    closeBtn.textContent = "退出全屏 (ESC)";
    
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    
    const clonedTextarea = document.createElement("textarea");
    clonedTextarea.className = "textarea";
    clonedTextarea.id = "fullscreenTextarea";
    
    overlay.appendChild(header);
    overlay.appendChild(clonedTextarea);
    document.body.appendChild(overlay);
    
    const closeFullscreen = () => {
      const sourceTextarea = overlay._sourceTextarea || textarea;
      sourceTextarea.value = clonedTextarea.value;
      persistField(sourceTextarea);
      sourceTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      overlay.classList.remove("active");
    };
    
    closeBtn.addEventListener("click", closeFullscreen);
    
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeFullscreen();
      }
    });
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("active")) {
        closeFullscreen();
      }
    });
  }
  
  const titleEl = overlay.querySelector(".fullscreen-title");
  const clonedTextarea = overlay.querySelector("#fullscreenTextarea");
  
  overlay._sourceTextarea = textarea;
  titleEl.textContent = title;
  clonedTextarea.value = textarea.value;
  clonedTextarea.readOnly = textarea.readOnly;
  if (currentPage() === "json" && textarea.id === "output") {
    bindJSONContextMenu(clonedTextarea);
  }
  
  overlay.classList.add("active");
  clonedTextarea.focus();
}

function parseCSRFromInput(raw) {
  const s = (raw || "").trim();
  if (!s) return { csr: "", err: "输入为空" };

  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(s);
      const csr = typeof obj.csr === "string" ? obj.csr : "";
      if (!csr.trim()) return { csr: "", err: "JSON 中未找到 csr 字段" };
      return { csr };
    } catch (e) {
      return { csr: "", err: "JSON 解析失败：" + e.message };
    }
  }

  return { csr: s };
}

function formatCSR() {
  const btn = $("btnFormat");
  const btnParse = $("btnParse");
  const btnCopy = $("btnCopy");
  const btnToJSON = $("btnToJSON");
  const inEl = $("input");
  const outEl = $("output");

  if (!inEl || !outEl) return;

  setStatus("处理中...", "");
  if (btn) btn.disabled = true;
  if (btnParse) btnParse.disabled = true;
  if (btnCopy) btnCopy.disabled = true;
  if (btnToJSON) btnToJSON.disabled = true;

  const parsed = parseCSRFromInput(inEl.value);
  if (parsed.err) {
    setStatus(parsed.err, "err");
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const pem = normalizePEM(parsed.csr, "csr");
    outEl.value = pem;
    setStatus("完成", "ok");
    recordSubfeatureUse("csr-format", "CSR 格式化", "/csr");
    if (btnCopy) btnCopy.disabled = false;
    if (btnToJSON) btnToJSON.disabled = false;
    parseCSR(pem, { quiet: true });
  } catch (e) {
    setStatus(e.message, "err");
    outEl.value = "";
  } finally {
    persistPageState();
    if (btn) btn.disabled = false;
    if (btnParse) btnParse.disabled = false;
  }
}

function renderCSRInfo(info) {
  const el = $("csrInfo");
  if (!el) return;

  const value = v => {
    if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "N/A";
    if (v === 0) return "N/A";
    return v || "N/A";
  };

  const rows = [
    ["Subject", value(info.subject)],
    ["Common Name", value(info.commonName)],
    ["Country", value(info.country)],
    ["Organization", value(info.organization)],
    ["Organizational Unit", value(info.organizationalUnit)],
    ["Locality", value(info.locality)],
    ["Province", value(info.province)],
    ["DNS SAN", value(info.dnsNames)],
    ["Email SAN", value(info.emailAddresses)],
    ["IP SAN", value(info.ipAddresses)],
    ["URI SAN", value(info.uris)],
    ["Public Key", info.publicKeySize ? `${value(info.publicKeyAlgorithm)} ${info.publicKeySize} bits` : value(info.publicKeyAlgorithm)],
    ["Signature", value(info.signatureAlgorithm)]
  ];

  el.classList.remove("empty-state");
  el.innerHTML = rows.map(([label, content]) => `
    <div class="info-item">
      <div class="info-label">${label}</div>
      <div class="info-value">${escapeHTML(content)}</div>
    </div>
  `).join("");
}

function resetCSRInfo() {
  const el = $("csrInfo");
  if (!el) return;
  el.classList.add("empty-state");
  el.textContent = "暂无解析结果";
}

async function parseCSR(input, options = {}) {
  const btn = $("btnParse");
  const inEl = $("input");
  const outEl = $("output");
  const csrText = (input || (outEl && outEl.value) || (inEl && inEl.value) || "").trim();

  if (!csrText) {
    if (!options.quiet) setStatus("输入为空", "err");
    resetCSRInfo();
    return;
  }

  if (!options.quiet) setStatus("解析中...", "");
  if (btn) btn.disabled = true;

  try {
    const info = parseCSRPEM(csrText);
    renderCSRInfo(info);
    if (!options.quiet) recordSubfeatureUse("csr-parse", "CSR 解析", "/csr");
    if (outEl && !outEl.value && info.pem) {
      outEl.value = info.pem;
      persistPageState();
    }
    if (!options.quiet) setStatus("解析完成", "ok");
  } catch (e) {
    if (!options.quiet) setStatus(e.message, "err");
    resetCSRInfo();
  } finally {
    if (btn) btn.disabled = false;
  }
}

function wireCSRPage() {
  const btn = $("btnFormat");
  const btnParse = $("btnParse");
  const btnCopy = $("btnCopy");
  const btnToJSON = $("btnToJSON");
  const btnASN1 = $("btnASN1");
  const btnClear = $("btnClear");
  const inEl = $("input");
  const outEl = $("output");

  if (btn) btn.addEventListener("click", formatCSR);
  if (btnParse) btnParse.addEventListener("click", () => parseCSR());

  if (btnASN1) {
    btnASN1.addEventListener("click", () => {
      openASN1Parser((outEl && outEl.value) || (inEl && inEl.value) || "");
    });
  }

  if (btnCopy && outEl) {
    btnCopy.addEventListener("click", async () => {
      const ok = await copyToClipboard(outEl.value);
      setStatus(ok ? "已复制到剪贴板" : "复制失败（浏览器不支持或无权限）", ok ? "ok" : "err");
    });
  }

  if (btnToJSON && outEl) {
    btnToJSON.addEventListener("click", async () => {
      const pem = outEl.value.trim();
      if (!pem) {
        setStatus("输出为空，无法转换", "err");
        return;
      }
      const jsonValue = pem.replace(/\n/g, "\\r\\n");
      const jsonOutput = jsonValue
      const ok = await copyToClipboard(jsonOutput);
      if (ok) {
        setStatus("已复制 JSON 格式到剪贴板", "ok");
      } else {
        outEl.value = jsonOutput;
        persistPageState();
        setStatus("JSON 格式已显示在输出区域", "ok");
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (inEl) inEl.value = "";
      if (outEl) outEl.value = "";
      setStatus("", "");
      if (btnCopy) btnCopy.disabled = true;
      if (btnToJSON) btnToJSON.disabled = true;
      resetCSRInfo();
      persistPageState();
    });
  }

  if (inEl) {
    inEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        formatCSR();
      }
    });
  }
}

async function copyCertToClipboard(certText, btnId) {
  const ok = await copyToClipboard(certText);
  const btn = $(btnId);
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = ok ? "已复制" : "复制失败";
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }
  return ok;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch (e) {
    return dateStr;
  }
}

function renderCertList(certs) {
  const container = $("outputContainer");
  const certList = $("certList");
  const certCount = $("certCount");

  if (!container || !certList || !certCount) return;

  certCount.textContent = `(共 ${certs.length} 个证书)`;
  certList.innerHTML = "";

  certs.forEach((cert, index) => {
    const certItem = document.createElement("div");
    certItem.className = "cert-item";

    const leftDiv = document.createElement("div");
    leftDiv.className = "cert-left";

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.style.marginBottom = "8px";

    const label = document.createElement("span");
    label.textContent = `证书 ${index + 1}`;
    label.style.fontWeight = "bold";

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn";
    copyBtn.textContent = "复制PEM";
    copyBtn.id = `btnCopyCert${index}`;
    copyBtn.addEventListener("click", () => copyCertToClipboard(cert.pem, `btnCopyCert${index}`));

    const decodeBtn = document.createElement("button");
    decodeBtn.className = "btn";
    decodeBtn.textContent = "MySSL解析";
    decodeBtn.addEventListener("click", () => openMySSLCertParser(cert.sha1));

    const asn1Btn = document.createElement("button");
    asn1Btn.className = "btn";
    asn1Btn.textContent = "ASN.1解析";
    asn1Btn.addEventListener("click", () => openASN1Parser(cert.pem));

    toolbar.appendChild(label);
    toolbar.appendChild(copyBtn);
    toolbar.appendChild(decodeBtn);
    toolbar.appendChild(asn1Btn);

    const textarea = document.createElement("textarea");
    textarea.className = "textarea";
    textarea.value = cert.pem || "";
    textarea.style.height = "200px";
    textarea.style.fontSize = "12px";

    leftDiv.appendChild(toolbar);
    leftDiv.appendChild(textarea);

    const rightDiv = document.createElement("div");
    rightDiv.className = "cert-right";

    const sections = [
      {
        title: "主题 (Subject)",
        content: cert.subject || "N/A"
      },
      {
        title: "签发者 (Issuer)",
        content: cert.issuer || "N/A"
      },
      {
        title: "有效期",
        content: `<div><span class="cert-info-label">起始:</span>${formatDate(cert.notBefore)}</div><div><span class="cert-info-label">结束:</span>${formatDate(cert.notAfter)}</div>`
      },
      {
        title: "序列号",
        content: cert.serialNumber || "N/A"
      },
      {
        title: "其他信息",
        content: `<div><span class="cert-info-label">版本:</span>${cert.version || "N/A"}</div><div><span class="cert-info-label">是否CA:</span>${cert.isCA ? "是" : "否"}</div><div><span class="cert-info-label">公钥:</span>${cert.publicKeySize ? `${cert.publicKeyAlgorithm} ${cert.publicKeySize} bits` : (cert.publicKeyAlgorithm || "N/A")}</div><div><span class="cert-info-label">签名:</span>${cert.signatureAlgorithm || "N/A"}</div>`
      }
    ];

    sections.forEach(section => {
      const sectionDiv = document.createElement("div");
      sectionDiv.className = "cert-info-section";

      const titleDiv = document.createElement("div");
      titleDiv.className = "cert-info-title";
      titleDiv.textContent = section.title;

      const contentDiv = document.createElement("div");
      contentDiv.className = "cert-info-content";
      contentDiv.innerHTML = section.content;

      sectionDiv.appendChild(titleDiv);
      sectionDiv.appendChild(contentDiv);
      rightDiv.appendChild(sectionDiv);
    });

    certItem.appendChild(leftDiv);
    certItem.appendChild(rightDiv);
    certList.appendChild(certItem);
  });

  container.style.display = "block";
}

async function splitCertChain() {
  const btn = $("btnSplit");
  const inEl = $("input");
  const container = $("outputContainer");

  if (!inEl) return;

  setStatus("处理中...", "");
  if (btn) btn.disabled = true;
  if (container) container.style.display = "none";

  const certChain = (inEl.value || "").trim();
  if (!certChain) {
    setStatus("输入为空", "err");
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const certPEMs = splitCertificatePEMs(certChain);
    const certs = [];
    for (const pem of certPEMs) {
      certs.push(await parseCertificatePEM(pem));
    }
    const count = certs.length;

    renderCertList(certs);
    setStatus(`完成，共拆分出 ${count} 个证书`, "ok");
    recordSubfeatureUse("cert-split", "拆分证书", "/cert");
  } catch (e) {
    setStatus(e.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
}

function wireCertPage() {
  const btn = $("btnSplit");
  const btnClear = $("btnClear");
  const inEl = $("input");
  const container = $("outputContainer");

  if (btn) {
    btn.addEventListener("click", () => {
      splitCertChain();
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (inEl) inEl.value = "";
      if (container) container.style.display = "none";
      const certList = $("certList");
      if (certList) certList.innerHTML = "";
      setStatus("", "");
      persistPageState();
    });
  }

  if (inEl) {
    inEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        splitCertChain();
      }
    });
  }
}

let jsonOutputEditor = null;
let jsonOutputEditorLoading = false;
let jsonFullscreenEditor = null;

function syncJSONOutputSource(value) {
  const outEl = $("output");
  if (!outEl) return;
  outEl.value = value || "";
  persistField(outEl);
}

function setJSONOutputValue(value) {
  syncJSONOutputSource(value);
  if (jsonOutputEditor && jsonOutputEditor.getValue() !== value) {
    jsonOutputEditor.setValue(value || "");
  }
}

function getJSONOutputSelection() {
  if (!jsonOutputEditor) return "";
  const selection = jsonOutputEditor.getSelection();
  return selection ? jsonOutputEditor.getModel().getValueInRange(selection).trim() : "";
}

function bindJSONEditorContextMenu(editor) {
  const domNode = editor && editor.getDomNode ? editor.getDomNode() : null;
  if (!domNode || domNode.dataset.jsonContextMenuBound === "1") return;
  domNode.dataset.jsonContextMenuBound = "1";

  domNode.addEventListener("contextmenu", e => {
    const selected = getJSONOutputSelection();
    const actions = detectPemActions(selected);
    if (actions.length === 0) return;

    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, actions, selected);
  });
}

function initJSONOutputEditor() {
  const outEl = $("output");
  const editorContainer = $("jsonOutputEditor");
  if (!outEl || !editorContainer || jsonOutputEditor || jsonOutputEditorLoading) return;

  if (typeof require !== "function") {
    setStatus("Monaco 编辑器未加载，已使用普通文本框", "err");
    return;
  }

  jsonOutputEditorLoading = true;
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs" } });
  require(["vs/editor/editor.main"], () => {
    jsonOutputEditor = monaco.editor.create(editorContainer, {
      value: outEl.value || "",
      language: "json",
      theme: "vs-dark",
      automaticLayout: true,
      folding: true,
      showFoldingControls: "always",
      fontSize: 13,
      tabSize: 2,
      insertSpaces: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "off"
    });

    editorContainer.hidden = false;
    outEl.classList.add("json-output-source-hidden");
    jsonOutputEditor.onDidChangeModelContent(() => syncJSONOutputSource(jsonOutputEditor.getValue()));
    bindJSONEditorContextMenu(jsonOutputEditor);
    jsonOutputEditorLoading = false;
  }, () => {
    jsonOutputEditorLoading = false;
    setStatus("Monaco 编辑器加载失败，已使用普通文本框", "err");
  });
}

function runJSONEditorAction(actionId) {
  if (!jsonOutputEditor) return;
  const action = jsonOutputEditor.getAction(actionId);
  if (action) action.run();
}

function createMonacoJSONEditor(container, value) {
  return monaco.editor.create(container, {
    value: value || "",
    language: "json",
    theme: "vs-dark",
    automaticLayout: true,
    folding: true,
    showFoldingControls: "always",
    fontSize: 13,
    tabSize: 2,
    insertSpaces: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "off"
  });
}

function openJSONMonacoFullscreen() {
  const outEl = $("output");
  if (!outEl) return;
  if (typeof require !== "function") {
    openFullscreenOverlay(outEl, "输出区域");
    return;
  }

  let overlay = document.getElementById("jsonMonacoFullscreenOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "jsonMonacoFullscreenOverlay";
    overlay.className = "fullscreen-overlay";

    const header = document.createElement("div");
    header.className = "fullscreen-header";

    const titleEl = document.createElement("div");
    titleEl.className = "fullscreen-title";
    titleEl.textContent = "输出区域";

    const actions = document.createElement("div");
    actions.className = "fullscreen-actions";

    const expandBtn = document.createElement("button");
    expandBtn.className = "fullscreen-close";
    expandBtn.type = "button";
    expandBtn.textContent = "展开全部";

    const collapseBtn = document.createElement("button");
    collapseBtn.className = "fullscreen-close";
    collapseBtn.type = "button";
    collapseBtn.textContent = "收起全部";

    const closeBtn = document.createElement("button");
    closeBtn.className = "fullscreen-close";
    closeBtn.type = "button";
    closeBtn.textContent = "退出全屏 (ESC)";

    actions.appendChild(expandBtn);
    actions.appendChild(collapseBtn);
    actions.appendChild(closeBtn);
    header.appendChild(titleEl);
    header.appendChild(actions);

    const editorContainer = document.createElement("div");
    editorContainer.id = "jsonFullscreenEditor";
    editorContainer.className = "json-fullscreen-editor";

    overlay.appendChild(header);
    overlay.appendChild(editorContainer);
    document.body.appendChild(overlay);

    const close = () => {
      if (jsonFullscreenEditor) {
        setJSONOutputValue(jsonFullscreenEditor.getValue());
      }
      overlay.classList.remove("active");
    };

    expandBtn.addEventListener("click", () => {
      if (jsonFullscreenEditor) {
        const action = jsonFullscreenEditor.getAction("editor.unfoldAll");
        if (action) action.run();
      }
    });
    collapseBtn.addEventListener("click", () => {
      if (jsonFullscreenEditor) {
        const action = jsonFullscreenEditor.getAction("editor.foldAll");
        if (action) action.run();
      }
    });
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay.classList.contains("active")) close();
    });
  }

  overlay.classList.add("active");
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs" } });
  require(["vs/editor/editor.main"], () => {
    const editorContainer = $("jsonFullscreenEditor");
    if (!editorContainer) return;
    if (!jsonFullscreenEditor) {
      jsonFullscreenEditor = createMonacoJSONEditor(editorContainer, outEl.value || "");
    } else if (jsonFullscreenEditor.getValue() !== outEl.value) {
      jsonFullscreenEditor.setValue(outEl.value || "");
    }
    jsonFullscreenEditor.focus();
    jsonFullscreenEditor.layout();
  }, () => {
    overlay.classList.remove("active");
    openFullscreenOverlay(outEl, "输出区域");
  });
}

let jsonTableRows = [];

function normalizeJSONTableRows(value) {
  const rows = Array.isArray(value) ? value : [value];
  if (rows.length === 0) throw new Error("JSON 数组为空");
  if (!rows.every(row => row && typeof row === "object" && !Array.isArray(row))) {
    throw new Error("表格视图只支持 JSON 对象或对象数组");
  }
  return rows;
}

function collectJSONTableFields(rows) {
  const fields = [];
  const seen = new Set();
  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (seen.has(key)) return;
      seen.add(key);
      fields.push(key);
    });
  });
  return fields;
}

function formatJSONTableCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatJSONCellForFullscreen(value) {
  const text = String(value || "").trim();
  if (!text) return { text: "", formatted: false };

  try {
    return {
      text: JSON.stringify(JSON.parse(text), null, 2),
      formatted: true
    };
  } catch (e) {
    return { text: value || "", formatted: false };
  }
}

function showJSONCellFullscreen(title, value) {
  let overlay = document.getElementById("jsonCellOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "jsonCellOverlay";
    overlay.className = "fullscreen-overlay";

    const header = document.createElement("div");
    header.className = "fullscreen-header";

    const titleEl = document.createElement("div");
    titleEl.className = "fullscreen-title";

    const closeBtn = document.createElement("button");
    closeBtn.className = "fullscreen-close";
    closeBtn.textContent = "关闭 (ESC)";

    const content = document.createElement("pre");
    content.className = "json-cell-fullscreen-content";

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove("active");
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay.classList.contains("active")) close();
    });
  }

  const formattedValue = formatJSONCellForFullscreen(value);
  overlay.querySelector(".fullscreen-title").textContent = formattedValue.formatted ? `${title} · JSON 已格式化` : title;
  overlay.querySelector(".json-cell-fullscreen-content").textContent = formattedValue.text;
  overlay.classList.add("active");
}

function getSelectedJSONTableFields() {
  return Array.from(document.querySelectorAll("#jsonFieldList input[type='checkbox']:checked")).map(input => input.value);
}

function renderJSONTable(fields) {
  const container = $("jsonTableContainer");
  const summary = $("jsonTableSummary");
  if (!container) return;

  const selectedFields = fields && fields.length ? fields : getSelectedJSONTableFields();
  if (summary) summary.textContent = `${jsonTableRows.length} 行 / ${selectedFields.length} 列`;

  if (!selectedFields.length) {
    container.innerHTML = "<div class=\"small\">请至少选择一个字段</div>";
    return;
  }

  const table = document.createElement("table");
  table.className = "json-data-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  selectedFields.forEach(field => {
    const th = document.createElement("th");
    th.textContent = field;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  jsonTableRows.forEach(row => {
    const tr = document.createElement("tr");
    selectedFields.forEach(field => {
      const td = document.createElement("td");
      const value = formatJSONTableCell(row[field]);
      const content = document.createElement("div");
      content.className = "json-cell-content";
      content.textContent = value;
      content.title = "双击全屏查看";
      content.addEventListener("dblclick", () => showJSONCellFullscreen(field, value));
      td.appendChild(content);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.replaceChildren(table);
}

function renderJSONFieldList(fields) {
  const fieldList = $("jsonFieldList");
  if (!fieldList) return;

  fieldList.replaceChildren();
  fields.forEach(field => {
    const label = document.createElement("label");
    label.className = "json-field-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = field;
    input.checked = true;
    input.addEventListener("change", () => renderJSONTable());

    const text = document.createElement("span");
    text.textContent = field;

    label.appendChild(input);
    label.appendChild(text);
    fieldList.appendChild(label);
  });
}

function clearJSONTableView() {
  jsonTableRows = [];
  const card = $("jsonTableCard");
  const fieldList = $("jsonFieldList");
  const container = $("jsonTableContainer");
  const summary = $("jsonTableSummary");
  if (card) card.hidden = true;
  if (fieldList) fieldList.replaceChildren();
  if (container) container.replaceChildren();
  if (summary) summary.textContent = "";
}

function showJSONTableView() {
  const outEl = $("output");
  const card = $("jsonTableCard");
  if (!outEl || !card) return;

  const text = (outEl.value || "").trim();
  if (!text) {
    setStatus("没有可转换的 JSON 输出", "err");
    clearJSONTableView();
    return;
  }

  try {
    jsonTableRows = normalizeJSONTableRows(JSON.parse(text));
    const fields = collectJSONTableFields(jsonTableRows);
    if (fields.length === 0) throw new Error("没有可展示的字段");
    renderJSONFieldList(fields);
    renderJSONTable(fields);
    card.hidden = false;
    setStatus("表格视图已生成", "ok");
    recordSubfeatureUse("json-table", "JSON 表格视图", "/json");
  } catch (e) {
    clearJSONTableView();
    setStatus("表格视图生成失败：" + e.message, "err");
  }
}

function formatJSON() {
  const btn = $("btnFormat");
  const btnCopy = $("btnCopy");
  const btnSave = $("btnSave");
  const btnJSONTable = $("btnJSONTable");
  const inEl = $("input");
  const outEl = $("output");
  const indentSelect = $("indentSelect");

  if (!inEl || !outEl) return;

  setStatus("处理中...", "");
  if (btn) btn.disabled = true;
  if (btnCopy) btnCopy.disabled = true;
  if (btnSave) btnSave.disabled = true;
  if (btnJSONTable) btnJSONTable.disabled = true;

  const jsonText = (inEl.value || "").trim();
  if (!jsonText) {
    setStatus("输入为空", "err");
    if (btn) btn.disabled = false;
    return;
  }

  const indent = indentSelect ? parseInt(indentSelect.value, 10) : 2;

  try {
    setJSONOutputValue(formatJSONText(jsonText, indent));
    setStatus("格式化完成", "ok");
    recordSubfeatureUse("json-format", "JSON 格式化", "/json");
    if (btnCopy) btnCopy.disabled = false;
    if (btnSave) btnSave.disabled = false;
    if (btnJSONTable) btnJSONTable.disabled = false;
  } catch (e) {
    setStatus(e.message, "err");
    setJSONOutputValue("");
    clearJSONTableView();
  } finally {
    persistPageState();
    if (btn) btn.disabled = false;
  }
}

function minifyJSON() {
  const btn = $("btnMinify");
  const btnCopy = $("btnCopy");
  const btnSave = $("btnSave");
  const btnJSONTable = $("btnJSONTable");
  const inEl = $("input");
  const outEl = $("output");

  if (!inEl || !outEl) return;

  setStatus("处理中...", "");
  if (btn) btn.disabled = true;
  if (btnCopy) btnCopy.disabled = true;
  if (btnSave) btnSave.disabled = true;
  if (btnJSONTable) btnJSONTable.disabled = true;

  const jsonText = (inEl.value || "").trim();
  if (!jsonText) {
    setStatus("输入为空", "err");
    if (btn) btn.disabled = false;
    return;
  }

  try {
    setJSONOutputValue(minifyJSONText(jsonText));
    setStatus("压缩完成", "ok");
    recordSubfeatureUse("json-minify", "JSON 压缩", "/json");
    if (btnCopy) btnCopy.disabled = false;
    if (btnSave) btnSave.disabled = false;
    if (btnJSONTable) btnJSONTable.disabled = false;
  } catch (e) {
    setStatus(e.message, "err");
    setJSONOutputValue("");
    clearJSONTableView();
  } finally {
    persistPageState();
    if (btn) btn.disabled = false;
  }
}

function saveJSONToFile() {
  const outEl = $("output");

  if (!outEl || !outEl.value.trim()) {
    setStatus("没有可保存的内容", "err");
    return;
  }

  const fileName = "output.json";

  try {
    const blob = new Blob([outEl.value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus("文件已保存", "ok");
  } catch (e) {
    setStatus("保存文件失败：" + e.message, "err");
  }
}

function wireJSONPage() {
  const btnFormat = $("btnFormat");
  const btnMinify = $("btnMinify");
  const btnCopy = $("btnCopy");
  const btnSave = $("btnSave");
  const btnClear = $("btnClear");
  const btnFullscreenInput = $("btnFullscreenInput");
  const btnFullscreenOutput = $("btnFullscreenOutput");
  const btnExpandJSON = $("btnExpandJSON");
  const btnCollapseJSON = $("btnCollapseJSON");
  const btnJSONTable = $("btnJSONTable");
  const inEl = $("input");
  const outEl = $("output");

  initJSONOutputEditor();

  if (btnFormat) {
    btnFormat.addEventListener("click", formatJSON);
  }

  if (btnMinify) {
    btnMinify.addEventListener("click", minifyJSON);
  }

  if (btnCopy && outEl) {
    btnCopy.addEventListener("click", async () => {
      const ok = await copyToClipboard(outEl.value);
      setStatus(ok ? "已复制到剪贴板" : "复制失败（浏览器不支持或无权限）", ok ? "ok" : "err");
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", saveJSONToFile);
  }

  if (btnJSONTable) {
    btnJSONTable.addEventListener("click", showJSONTableView);
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (inEl) inEl.value = "";
      setJSONOutputValue("");
      clearJSONTableView();
      setStatus("", "");
      if (btnCopy) btnCopy.disabled = true;
      if (btnSave) btnSave.disabled = true;
      if (btnJSONTable) btnJSONTable.disabled = true;
      persistPageState();
    });
  }

  if (btnFullscreenInput && inEl) {
    btnFullscreenInput.addEventListener("click", () => {
      openFullscreenOverlay(inEl, "输入区域");
    });
  }

  if (btnFullscreenOutput && outEl) {
    btnFullscreenOutput.addEventListener("click", () => {
      openJSONMonacoFullscreen();
    });
  }

  if (btnExpandJSON) {
    btnExpandJSON.addEventListener("click", () => runJSONEditorAction("editor.unfoldAll"));
  }

  if (btnCollapseJSON) {
    btnCollapseJSON.addEventListener("click", () => runJSONEditorAction("editor.foldAll"));
  }

  if (outEl) {
    if (btnJSONTable && outEl.value) btnJSONTable.disabled = false;
    outEl.addEventListener("input", () => {
      if (jsonOutputEditor && jsonOutputEditor.getValue() !== outEl.value) {
        jsonOutputEditor.setValue(outEl.value || "");
      }
      if (btnJSONTable) btnJSONTable.disabled = !outEl.value.trim();
      clearJSONTableView();
    });
  }

  if (inEl) {
    inEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        formatJSON();
      }
    });
  }
}

function runTextTransform(transform, doneMessage) {
  const inEl = $("input");
  const outEl = $("output");
  const btnCopy = $("btnCopy");

  if (!inEl || !outEl) return;

  const text = inEl.value || "";
  if (!text) {
    setStatus("输入为空", "err");
    outEl.value = "";
    if (btnCopy) btnCopy.disabled = true;
    return;
  }

  try {
    outEl.value = transform(text);
    setStatus(doneMessage, "ok");
    if (btnCopy) btnCopy.disabled = false;
  } catch (e) {
    outEl.value = "";
    setStatus("处理失败：" + e.message, "err");
    if (btnCopy) btnCopy.disabled = true;
  } finally {
    persistPageState();
  }
}

function runTextAction(action) {
  runTextTransform(action.transform, action.doneMessage);
  recordSubfeatureUse(action.id || action.buttonId, action.label || action.doneMessage, action.href || `/${currentPage()}`);
}

function wireTextToolPage(actions) {
  const btnClear = $("btnClear");
  const btnCopy = $("btnCopy");
  const btnFullscreenInput = $("btnFullscreenInput");
  const btnFullscreenOutput = $("btnFullscreenOutput");
  const inEl = $("input");
  const outEl = $("output");

  actions.forEach(action => {
    const btn = $(action.buttonId);
    if (btn) {
      btn.addEventListener("click", () => {
        runTextAction(action);
      });
    }
  });

  if (btnCopy && outEl) {
    btnCopy.addEventListener("click", async () => {
      const ok = await copyToClipboard(outEl.value);
      setStatus(ok ? "已复制到剪贴板" : "复制失败（浏览器不支持或无权限）", ok ? "ok" : "err");
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (inEl) inEl.value = "";
      if (outEl) outEl.value = "";
      setStatus("", "");
      if (btnCopy) btnCopy.disabled = true;
      persistPageState();
    });
  }

  if (btnFullscreenInput && inEl) {
    btnFullscreenInput.addEventListener("click", () => {
      openFullscreenOverlay(inEl, "输入区域");
    });
  }

  if (btnFullscreenOutput && outEl) {
    btnFullscreenOutput.addEventListener("click", () => {
      openFullscreenOverlay(outEl, "输出区域");
    });
  }

  if (inEl && actions.length > 0) {
    inEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runTextAction(actions[0]);
      }
    });
  }
}

function wireBase64Page() {
  wireTextToolPage([
    {
      id: "base64-encode",
      label: "Base64 编码",
      href: "/base64",
      buttonId: "btnEncode",
      transform: utf8ToBase64,
      doneMessage: "编码完成"
    },
    {
      id: "base64-decode",
      label: "Base64 解码",
      href: "/base64",
      buttonId: "btnDecode",
      transform: base64ToUtf8,
      doneMessage: "解码完成"
    }
  ]);
}

function wireURLPage() {
  wireTextToolPage([
    {
      id: "url-encode",
      label: "URL 编码",
      href: "/url",
      buttonId: "btnEncode",
      transform: encodeURLText,
      doneMessage: "编码完成"
    },
    {
      id: "url-decode",
      label: "URL 解码",
      href: "/url",
      buttonId: "btnDecode",
      transform: decodeURLText,
      doneMessage: "解码完成"
    }
  ]);
}

function currentPGArrayMode() {
  const checked = document.querySelector("input[name='pgMode']:checked");
  return checked ? checked.value : "auto";
}

function runPGArrayTransform() {
  const uniqueEl = $("unique");
  runTextTransform(
    text => toPGArray(text, {
      mode: currentPGArrayMode(),
      unique: uniqueEl ? uniqueEl.checked : true
    }),
    "转换完成"
  );
  recordSubfeatureUse("pg-array-convert", "PG Array 转换", "/pg-array");
}

function currentTextLineOptions(sort) {
  const trimEl = $("trimLines");
  const dropEmptyEl = $("dropEmptyLines");
  const caseSensitiveEl = $("caseSensitive");
  return {
    trim: trimEl ? trimEl.checked : true,
    dropEmpty: dropEmptyEl ? dropEmptyEl.checked : true,
    caseSensitive: caseSensitiveEl ? caseSensitiveEl.checked : true,
    unique: true,
    sort
  };
}

function runTextLineTransform(sort, label) {
  runTextTransform(text => transformLines(text, currentTextLineOptions(sort)), "处理完成");
  recordSubfeatureUse(`text-${sort || "dedup"}`, label, "/text");
}

function wireTextPage() {
  const btnDedup = $("btnDedup");
  const btnSortAsc = $("btnSortAsc");
  const btnSortDesc = $("btnSortDesc");
  const inEl = $("input");

  if (btnDedup) btnDedup.addEventListener("click", () => runTextLineTransform("", "文本去重"));
  if (btnSortAsc) btnSortAsc.addEventListener("click", () => runTextLineTransform("asc", "文本升序排序"));
  if (btnSortDesc) btnSortDesc.addEventListener("click", () => runTextLineTransform("desc", "文本降序排序"));

  wireTextToolPage([]);

  if (inEl) {
    inEl.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runTextLineTransform("", "文本去重");
      }
    });
  }
}

function wirePGArrayPage() {
  const btnConvert = $("btnConvert");
  const btnClear = $("btnClear");
  const btnCopy = $("btnCopy");
  const btnFullscreenInput = $("btnFullscreenInput");
  const btnFullscreenOutput = $("btnFullscreenOutput");
  const inEl = $("input");
  const outEl = $("output");

  if (btnConvert) btnConvert.addEventListener("click", runPGArrayTransform);

  if (btnCopy && outEl) {
    btnCopy.addEventListener("click", async () => {
      const ok = await copyToClipboard(outEl.value);
      setStatus(ok ? "已复制到剪贴板" : "复制失败（浏览器不支持或无权限）", ok ? "ok" : "err");
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (inEl) inEl.value = "";
      if (outEl) outEl.value = "";
      setStatus("", "");
      if (btnCopy) btnCopy.disabled = true;
      persistPageState();
    });
  }

  if (btnFullscreenInput && inEl) {
    btnFullscreenInput.addEventListener("click", () => {
      openFullscreenOverlay(inEl, "输入区域");
    });
  }

  if (btnFullscreenOutput && outEl) {
    btnFullscreenOutput.addEventListener("click", () => {
      openFullscreenOverlay(outEl, "输出区域");
    });
  }

  if (inEl) {
    inEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runPGArrayTransform();
      }
    });
  }
}

function arrayIncludesAll(container, expected) {
  const actual = new Set((container || []).filter(Boolean));
  return (expected || []).filter(Boolean).every(item => actual.has(item));
}

function renderMatchResult(rows) {
  const el = $("matchResult");
  if (!el) return;

  el.classList.remove("empty-state");
  el.innerHTML = rows.map(row => `
    <div class="info-item ${row.ok ? "match-ok" : "match-bad"}">
      <div class="info-label">${escapeHTML(row.label)}</div>
      <div class="info-value">${escapeHTML(row.value)}</div>
    </div>
  `).join("");
}

function resetMatchResult() {
  const el = $("matchResult");
  if (!el) return;
  el.classList.add("empty-state");
  el.textContent = "暂无匹配结果";
}

async function runCertMatch() {
  const csrEl = $("csrInput");
  const certEl = $("certInput");
  const btn = $("btnMatch");
  const csrText = csrEl ? csrEl.value.trim() : "";
  const certText = certEl ? certEl.value.trim() : "";

  if (!csrText || !certText) {
    setStatus("CSR 和证书都不能为空", "err");
    resetMatchResult();
    return;
  }

  setStatus("匹配中...", "");
  if (btn) btn.disabled = true;

  try {
    const csr = parseCSRPEM(csrText);
    const cert = await parseCertificatePEM(certText);
    const publicKeyOK = Boolean(csr.publicKeyHex && cert.publicKeyHex && csr.publicKeyHex === cert.publicKeyHex);
    const cnOK = Boolean(csr.commonName && cert.commonName && csr.commonName === cert.commonName);
    const dnsOK = arrayIncludesAll(cert.dnsNames, csr.dnsNames);
    const ipOK = arrayIncludesAll(cert.ipAddresses, csr.ipAddresses);

    renderMatchResult([
      {
        label: "公钥",
        ok: publicKeyOK,
        value: publicKeyOK
          ? `${csr.publicKeyAlgorithm} ${csr.publicKeySize || ""} bits 一致`
          : `不一致：CSR=${csr.publicKeyAlgorithm} ${csr.publicKeySize || ""} bits，证书=${cert.publicKeyAlgorithm} ${cert.publicKeySize || ""} bits`
      },
      {
        label: "Common Name",
        ok: cnOK,
        value: cnOK ? csr.commonName : `CSR=${csr.commonName || "N/A"}，证书=${cert.commonName || "N/A"}`
      },
      {
        label: "DNS SAN",
        ok: dnsOK,
        value: (csr.dnsNames || []).length ? `CSR: ${(csr.dnsNames || []).join(", ")}；证书覆盖: ${dnsOK ? "是" : "否"}` : "CSR 未包含 DNS SAN"
      },
      {
        label: "IP SAN",
        ok: ipOK,
        value: (csr.ipAddresses || []).length ? `CSR: ${(csr.ipAddresses || []).join(", ")}；证书覆盖: ${ipOK ? "是" : "否"}` : "CSR 未包含 IP SAN"
      }
    ]);

    setStatus(publicKeyOK ? "匹配完成：公钥一致" : "匹配完成：公钥不一致", publicKeyOK ? "ok" : "err");
    recordSubfeatureUse("cert-match", "CSR 与证书匹配", "/cert-match");
  } catch (e) {
    setStatus("匹配失败：" + e.message, "err");
    resetMatchResult();
  } finally {
    if (btn) btn.disabled = false;
    persistPageState();
  }
}

function wireCertMatchPage() {
  const btnMatch = $("btnMatch");
  const btnClear = $("btnClear");
  const btnFullscreenCSR = $("btnFullscreenCSR");
  const btnFullscreenCert = $("btnFullscreenCert");
  const csrEl = $("csrInput");
  const certEl = $("certInput");

  if (btnMatch) btnMatch.addEventListener("click", runCertMatch);

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (csrEl) csrEl.value = "";
      if (certEl) certEl.value = "";
      setStatus("", "");
      resetMatchResult();
      persistPageState();
    });
  }

  if (btnFullscreenCSR && csrEl) {
    btnFullscreenCSR.addEventListener("click", () => openFullscreenOverlay(csrEl, "CSR"));
  }

  if (btnFullscreenCert && certEl) {
    btnFullscreenCert.addEventListener("click", () => openFullscreenOverlay(certEl, "证书"));
  }

  [csrEl, certEl].forEach(el => {
    if (!el) return;
    el.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCertMatch();
      }
    });
  });
}

function renderTimeResult(rows) {
  const el = $("timeResult");
  if (!el) return;

  el.classList.remove("empty-state");
  el.innerHTML = rows.map(([label, value]) => `
    <div class="info-item">
      <div class="info-label">${escapeHTML(label)}</div>
      <div class="info-value">${escapeHTML(value)}</div>
    </div>
  `).join("");
}

function resetTimeResult() {
  const el = $("timeResult");
  if (!el) return;
  el.classList.add("empty-state");
  el.textContent = "暂无计算结果";
}

function currentDateTimeText() {
  return formatDateTime(new Date());
}

let activeDateTimeInput = null;
let pickerDate = new Date();
let pickerMonth = new Date();

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateParts(date) {
  return {
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    hour: pad2(date.getHours()),
    minute: pad2(date.getMinutes()),
    second: pad2(date.getSeconds())
  };
}

function setDateTimeInput(input, date) {
  if (!input) return;
  input.value = formatDateTime(date);
  persistField(input);
}

function selectedPickerDateTime() {
  const hour = Number($("pickerHour")?.value || 0);
  const minute = Number($("pickerMinute")?.value || 0);
  const second = Number($("pickerSecond")?.value || 0);
  return new Date(pickerDate.getFullYear(), pickerDate.getMonth(), pickerDate.getDate(), hour, minute, second);
}

function renderDateTimePicker() {
  const picker = $("dateTimePicker");
  if (!picker || !activeDateTimeInput) return;

  const monthTitle = $("pickerMonthTitle");
  if (monthTitle) monthTitle.textContent = `${pickerMonth.getFullYear()} 年 ${pickerMonth.getMonth() + 1} 月`;

  const grid = $("pickerCalendarGrid");
  if (!grid) return;
  grid.replaceChildren();

  ["日", "一", "二", "三", "四", "五", "六"].forEach(day => {
    const el = document.createElement("div");
    el.className = "datetime-picker-weekday";
    el.textContent = day;
    grid.appendChild(el);
  });

  const first = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const todayText = dateParts(new Date()).date;
  const selectedText = dateParts(pickerDate).date;

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const dayText = dateParts(day).date;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "datetime-picker-day";
    button.classList.toggle("muted", day.getMonth() !== pickerMonth.getMonth());
    button.classList.toggle("today", dayText === todayText);
    button.classList.toggle("selected", dayText === selectedText);
    button.textContent = String(day.getDate());
    button.addEventListener("click", () => {
      pickerDate = day;
      setDateTimeInput(activeDateTimeInput, selectedPickerDateTime());
      renderDateTimePicker();
    });
    grid.appendChild(button);
  }
}

function ensureDateTimePicker() {
  let picker = $("dateTimePicker");
  if (picker) return picker;

  picker = document.createElement("div");
  picker.id = "dateTimePicker";
  picker.className = "datetime-picker-popover";
  picker.innerHTML = `
    <div class="datetime-picker-header">
      <button type="button" class="datetime-picker-nav" id="pickerPrevMonth">‹</button>
      <div class="datetime-picker-title" id="pickerMonthTitle"></div>
      <button type="button" class="datetime-picker-nav" id="pickerNextMonth">›</button>
    </div>
    <div class="datetime-picker-grid" id="pickerCalendarGrid"></div>
    <div class="datetime-picker-time">
      <label><span>HH</span><input id="pickerHour" class="input" type="number" min="0" max="23"></label>
      <label><span>mm</span><input id="pickerMinute" class="input" type="number" min="0" max="59"></label>
      <label><span>ss</span><input id="pickerSecond" class="input" type="number" min="0" max="59"></label>
    </div>
    <div class="datetime-picker-actions">
      <button type="button" class="btn" id="pickerNow">现在</button>
      <button type="button" class="btn primary" id="pickerDone">确定</button>
    </div>
  `;
  document.body.appendChild(picker);

  $("pickerPrevMonth").addEventListener("click", () => {
    pickerMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1);
    renderDateTimePicker();
  });
  $("pickerNextMonth").addEventListener("click", () => {
    pickerMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1);
    renderDateTimePicker();
  });
  ["pickerHour", "pickerMinute", "pickerSecond"].forEach(id => {
    $(id).addEventListener("input", () => {
      if (activeDateTimeInput) setDateTimeInput(activeDateTimeInput, selectedPickerDateTime());
    });
  });
  $("pickerNow").addEventListener("click", () => {
    const now = new Date();
    pickerDate = now;
    pickerMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setPickerTime(now);
    setDateTimeInput(activeDateTimeInput, now);
    renderDateTimePicker();
  });
  $("pickerDone").addEventListener("click", hideDateTimePicker);

  document.addEventListener("click", e => {
    if (!picker.classList.contains("active")) return;
    if (picker.contains(e.target) || e.target === activeDateTimeInput) return;
    hideDateTimePicker();
  });

  return picker;
}

function setPickerTime(date) {
  $("pickerHour").value = pad2(date.getHours());
  $("pickerMinute").value = pad2(date.getMinutes());
  $("pickerSecond").value = pad2(date.getSeconds());
}

function showDateTimePicker(input) {
  activeDateTimeInput = input;
  let date;
  try {
    date = input.value ? parseDateTime(input.value) : new Date();
  } catch (e) {
    date = new Date();
  }
  pickerDate = date;
  pickerMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  const picker = ensureDateTimePicker();
  setPickerTime(date);
  renderDateTimePicker();

  const rect = input.getBoundingClientRect();
  picker.style.left = `${Math.min(rect.left, window.innerWidth - 360)}px`;
  picker.style.top = `${rect.bottom + 8}px`;
  picker.classList.add("active");
}

function hideDateTimePicker() {
  const picker = $("dateTimePicker");
  if (picker) picker.classList.remove("active");
}

function runTimeDiff() {
  const startEl = $("startTime");
  const endEl = $("endTime");
  const startValue = startEl ? startEl.value : "";
  const endValue = endEl ? endEl.value : "";

  try {
    const result = diffDateTimes(startValue, endValue);
    renderTimeResult([
      ["开始时间", startValue],
      ["结束时间", endValue],
      ["相差天数", `${result.days.toFixed(6)} 天`],
      ["绝对天数", `${result.absDays.toFixed(6)} 天`],
      ["小时", `${result.hours.toFixed(3)} 小时`],
      ["分钟", `${result.minutes.toFixed(3)} 分钟`],
      ["秒", `${result.seconds.toFixed(3)} 秒`],
      ["毫秒", `${result.milliseconds} ms`]
    ]);
    setStatus("时间差计算完成", "ok");
    recordSubfeatureUse("time-diff", "时间差计算", "/time");
    persistPageState();
  } catch (e) {
    setStatus("计算失败：" + e.message, "err");
    resetTimeResult();
  }
}

function runAddDays() {
  const baseEl = $("baseTime");
  const daysEl = $("daysDelta");
  const baseValue = baseEl ? baseEl.value : "";

  try {
    const result = addDaysToDateTime(baseValue, daysEl ? daysEl.value : "");
    renderTimeResult([
      ["计算结果", formatDateTime(result)],
      ["ISO 时间", result.toISOString()],
      ["时间戳秒", String(Math.floor(result.getTime() / 1000))],
      ["时间戳毫秒", String(result.getTime())]
    ]);
    setStatus("日期计算完成", "ok");
    recordSubfeatureUse("time-add-days", "时间加减天数", "/time");
    persistPageState();
  } catch (e) {
    setStatus("计算失败：" + e.message, "err");
    resetTimeResult();
  }
}

function wireTimePage() {
  const btnDiffTime = $("btnDiffTime");
  const btnAddDays = $("btnAddDays");
  const btnClear = $("btnClear");
  const startEl = $("startTime");
  const endEl = $("endTime");
  const baseEl = $("baseTime");
  const daysEl = $("daysDelta");

  if (btnDiffTime) btnDiffTime.addEventListener("click", runTimeDiff);
  if (btnAddDays) btnAddDays.addEventListener("click", runAddDays);

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      [startEl, endEl, baseEl, daysEl].forEach(el => {
        if (el) el.value = "";
      });
      setStatus("", "");
      resetTimeResult();
      persistPageState();
    });
  }

  [startEl, endEl, baseEl].forEach(el => {
    if (!el) return;
    el.addEventListener("click", () => showDateTimePicker(el));
    el.addEventListener("focus", () => showDateTimePicker(el));
  });

  [startEl, endEl, baseEl, daysEl].forEach(el => {
    if (!el) return;
    el.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (el === baseEl || el === daysEl) runAddDays();
        else runTimeDiff();
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body ? document.body.dataset.page : null;

  renderAppShell(page || "home");

  if (page) {
    restorePageState(page);
    consumeHandoff(page);
  }

  if (page === "home") {
    wireHomePage();
  }
  if (page === "csr") {
    wireCSRPage();
  }
  if (page === "cert") {
    wireCertPage();
  }
  if (page === "cert-match") {
    wireCertMatchPage();
  }
  if (page === "json") {
    wireJSONPage();
    wireJSONContextActions();
  }
  if (page === "base64") {
    wireBase64Page();
  }
  if (page === "url") {
    wireURLPage();
  }
  if (page === "pg-array") {
    wirePGArrayPage();
  }
  if (page === "text") {
    wireTextPage();
  }
  if (page === "time") {
    wireTimePage();
  }
  syncRestoredControls();
});
