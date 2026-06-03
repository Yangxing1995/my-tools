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
  toPGArray
} = window.MyToolsUtils || {};

const toolCatalog = [
  {
    name: "JSON 格式化",
    href: "/json",
    category: "数据处理",
    desc: "格式化、压缩和校验 JSON 数据",
    tags: ["json", "format", "minify", "格式化", "压缩", "校验"]
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
  }
];

const categoryOrder = ["数据处理", "编码转换", "证书工具", "本地工具"];
let activeToolCategory = "全部";

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

const handoffPrefix = "mytools:handoff:";
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
  return `mytools:${page}:${id}`;
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
  document.querySelectorAll("textarea[id]").forEach(persistField);
}

function restorePageState(page) {
  if (!page) return;

  document.querySelectorAll("textarea[id]").forEach(el => {
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
      textarea.value = clonedTextarea.value;
      persistField(textarea);
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
    textarea.readOnly = true;
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

function formatJSON() {
  const btn = $("btnFormat");
  const btnCopy = $("btnCopy");
  const btnSave = $("btnSave");
  const inEl = $("input");
  const outEl = $("output");
  const indentSelect = $("indentSelect");

  if (!inEl || !outEl) return;

  setStatus("处理中...", "");
  if (btn) btn.disabled = true;
  if (btnCopy) btnCopy.disabled = true;
  if (btnSave) btnSave.disabled = true;

  const jsonText = (inEl.value || "").trim();
  if (!jsonText) {
    setStatus("输入为空", "err");
    if (btn) btn.disabled = false;
    return;
  }

  const indent = indentSelect ? parseInt(indentSelect.value, 10) : 2;

  try {
    outEl.value = formatJSONText(jsonText, indent);
    setStatus("格式化完成", "ok");
    if (btnCopy) btnCopy.disabled = false;
    if (btnSave) btnSave.disabled = false;
  } catch (e) {
    setStatus(e.message, "err");
    outEl.value = "";
  } finally {
    persistPageState();
    if (btn) btn.disabled = false;
  }
}

function minifyJSON() {
  const btn = $("btnMinify");
  const btnCopy = $("btnCopy");
  const btnSave = $("btnSave");
  const inEl = $("input");
  const outEl = $("output");

  if (!inEl || !outEl) return;

  setStatus("处理中...", "");
  if (btn) btn.disabled = true;
  if (btnCopy) btnCopy.disabled = true;
  if (btnSave) btnSave.disabled = true;

  const jsonText = (inEl.value || "").trim();
  if (!jsonText) {
    setStatus("输入为空", "err");
    if (btn) btn.disabled = false;
    return;
  }

  try {
    outEl.value = minifyJSONText(jsonText);
    setStatus("压缩完成", "ok");
    if (btnCopy) btnCopy.disabled = false;
    if (btnSave) btnSave.disabled = false;
  } catch (e) {
    setStatus(e.message, "err");
    outEl.value = "";
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
  const inEl = $("input");
  const outEl = $("output");

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

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (inEl) inEl.value = "";
      if (outEl) outEl.value = "";
      setStatus("", "");
      if (btnCopy) btnCopy.disabled = true;
      if (btnSave) btnSave.disabled = true;
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
        runTextTransform(action.transform, action.doneMessage);
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
        runTextTransform(actions[0].transform, actions[0].doneMessage);
      }
    });
  }
}

function wireBase64Page() {
  wireTextToolPage([
    {
      buttonId: "btnEncode",
      transform: utf8ToBase64,
      doneMessage: "编码完成"
    },
    {
      buttonId: "btnDecode",
      transform: base64ToUtf8,
      doneMessage: "解码完成"
    }
  ]);
}

function wireURLPage() {
  wireTextToolPage([
    {
      buttonId: "btnEncode",
      transform: encodeURLText,
      doneMessage: "编码完成"
    },
    {
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
  syncRestoredControls();
});
