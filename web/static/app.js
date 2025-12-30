function $(id) {
  return document.getElementById(id);
}

function renderNav(activePage) {
  const navItems = [
    { href: "/", label: "首页", page: "home" },
    { href: "/csr", label: "CSR 格式化", page: "csr" },
    { href: "/cert", label: "证书格式化", page: "cert" },
    { href: "/json", label: "JSON 格式化", page: "json" }
  ];

  const navEl = document.querySelector(".nav");
  if (!navEl) return;

  navEl.innerHTML = "";
  navItems
    .filter(item => item.page !== activePage)
    .forEach(item => {
      const a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      navEl.appendChild(a);
    });
}

function setStatus(msg, type) {
  const el = $("status");
  if (!el) return;
  el.classList.remove("ok", "err");
  if (type) el.classList.add(type);
  el.textContent = msg || "";
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

async function formatCSR() {
  const btn = $("btnFormat");
  const btnCopy = $("btnCopy");
  const inEl = $("input");
  const outEl = $("output");

  if (!inEl || !outEl) return;

  setStatus("处理中...", "");
  if (btn) btn.disabled = true;
  if (btnCopy) btnCopy.disabled = true;

  const parsed = parseCSRFromInput(inEl.value);
  if (parsed.err) {
    setStatus(parsed.err, "err");
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const resp = await fetch("/api/v1/csr/format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csr: parsed.csr })
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : ("HTTP " + resp.status);
      setStatus(msg, "err");
      outEl.value = "";
      return;
    }

    if (!data || !data.ok || !data.data || typeof data.data.pem !== "string") {
      setStatus("响应格式不正确", "err");
      outEl.value = "";
      return;
    }

    outEl.value = data.data.pem;
    setStatus("完成", "ok");
    if (btnCopy) btnCopy.disabled = false;
  } catch (e) {
    setStatus("请求失败：" + e.message, "err");
    outEl.value = "";
  } finally {
    if (btn) btn.disabled = false;
  }
}

function wireCSRPage() {
  const btn = $("btnFormat");
  const btnCopy = $("btnCopy");
  const btnClear = $("btnClear");
  const inEl = $("input");
  const outEl = $("output");

  if (btn) btn.addEventListener("click", formatCSR);

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
    
    toolbar.appendChild(label);
    toolbar.appendChild(copyBtn);
    
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
        content: `<div><span class="cert-info-label">版本:</span>${cert.version || "N/A"}</div><div><span class="cert-info-label">是否CA:</span>${cert.isCA ? "是" : "否"}</div>`
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
    const resp = await fetch("/api/v1/cert/split", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certChain })
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : ("HTTP " + resp.status);
      setStatus(msg, "err");
      return;
    }

    if (!data || !data.ok || !data.data || !Array.isArray(data.data.certs)) {
      setStatus("响应格式不正确", "err");
      return;
    }

    const certs = data.data.certs;
    const count = data.data.count || certs.length;
    
    renderCertList(certs);
    setStatus(`完成，共拆分出 ${count} 个证书`, "ok");
  } catch (e) {
    setStatus("请求失败：" + e.message, "err");
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

async function formatJSON() {
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
    const resp = await fetch("/api/v1/json/format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: jsonText, indent })
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : ("HTTP " + resp.status);
      setStatus(msg, "err");
      outEl.value = "";
      return;
    }

    if (!data || !data.ok || !data.data || typeof data.data.formatted !== "string") {
      setStatus("响应格式不正确", "err");
      outEl.value = "";
      return;
    }

    outEl.value = data.data.formatted;
    setStatus("格式化完成", "ok");
    if (btnCopy) btnCopy.disabled = false;
    if (btnSave) btnSave.disabled = false;
  } catch (e) {
    setStatus("请求失败：" + e.message, "err");
    outEl.value = "";
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function minifyJSON() {
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
    const resp = await fetch("/api/v1/json/minify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: jsonText })
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : ("HTTP " + resp.status);
      setStatus(msg, "err");
      outEl.value = "";
      return;
    }

    if (!data || !data.ok || !data.data || typeof data.data.minified !== "string") {
      setStatus("响应格式不正确", "err");
      outEl.value = "";
      return;
    }

    outEl.value = data.data.minified;
    setStatus("压缩完成", "ok");
    if (btnCopy) btnCopy.disabled = false;
    if (btnSave) btnSave.disabled = false;
  } catch (e) {
    setStatus("请求失败：" + e.message, "err");
    outEl.value = "";
  } finally {
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
    });
  }

  if (btnFullscreenInput && inEl) {
    btnFullscreenInput.addEventListener("click", () => {
      if (inEl.requestFullscreen) {
        inEl.requestFullscreen();
      } else if (inEl.webkitRequestFullscreen) {
        inEl.webkitRequestFullscreen();
      } else if (inEl.mozRequestFullScreen) {
        inEl.mozRequestFullScreen();
      } else if (inEl.msRequestFullscreen) {
        inEl.msRequestFullscreen();
      }
    });
  }

  if (btnFullscreenOutput && outEl) {
    btnFullscreenOutput.addEventListener("click", () => {
      if (outEl.requestFullscreen) {
        outEl.requestFullscreen();
      } else if (outEl.webkitRequestFullscreen) {
        outEl.webkitRequestFullscreen();
      } else if (outEl.mozRequestFullScreen) {
        outEl.mozRequestFullScreen();
      } else if (outEl.msRequestFullscreen) {
        outEl.msRequestFullscreen();
      }
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

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body ? document.body.dataset.page : null;
  
  if (page) {
    renderNav(page);
  }
  
  if (page === "csr") {
    wireCSRPage();
  }
  if (page === "cert") {
    wireCertPage();
  }
  if (page === "json") {
    wireJSONPage();
  }
  if (page === "sectigo") {
    wireSectigoPage();
  }
});

function setSectigoStatus(msg, type) {
  const el = $("sectigoStatus");
  if (!el) return;
  el.classList.remove("ok", "err");
  if (type) el.classList.add(type);
  el.textContent = msg || "";
}

function setFiles(runId, files) {
  const el = $("sectigoFiles");
  if (!el) return;
  el.innerHTML = "";

  if (!runId) return;

  const list = (files || []).filter(f => f && typeof f.name === "string" && f.name.length > 0);
  if (list.length === 0) {
    el.textContent = "无输出文件";
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach(f => {
    const a = document.createElement("a");
    a.href = `/api/v1/runs/file?runId=${encodeURIComponent(runId)}&name=${encodeURIComponent(f.name)}`;
    a.textContent = `${f.name} (${f.size || 0} bytes)`;
    a.target = "_blank";
    a.rel = "noreferrer";
    const div = document.createElement("div");
    div.appendChild(a);
    frag.appendChild(div);
  });
  el.appendChild(frag);
}

async function runSectigo() {
  const btnRun = $("btnRun");
  const btnCopy = $("btnCopyLog");
  const input = $("sectigoInput");
  const log = $("sectigoLog");
  const meta = $("sectigoMeta");

  if (!input || !log) return;

  const op = (document.body.dataset.op || "detail");
  const text = (input.value || "").trim();
  if (!text) {
    setSectigoStatus("输入为空", "err");
    return;
  }

  setSectigoStatus("处理中...", "");
  if (btnRun) btnRun.disabled = true;
  if (btnCopy) btnCopy.disabled = true;
  if (meta) meta.textContent = "";
  setFiles("", []);

  try {
    const resp = await fetch(`/api/v1/sectigo/${op}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : ("HTTP " + resp.status);
      setSectigoStatus(msg, "err");
      log.value = "";
      return;
    }

    if (!data || !data.ok || !data.data) {
      setSectigoStatus("响应格式不正确", "err");
      log.value = "";
      return;
    }

    const d = data.data;
    const stdout = typeof d.stdout === "string" ? d.stdout : "";
    const stderr = typeof d.stderr === "string" ? d.stderr : "";
    const exitCode = typeof d.exitCode === "number" ? d.exitCode : 0;
    const runId = typeof d.runId === "string" ? d.runId : "";

    log.value = (stdout ? "[stdout]\n" + stdout : "") + (stderr ? "\n[stderr]\n" + stderr : "");

    if (meta) meta.textContent = runId ? ("runId: " + runId + " / exitCode: " + exitCode) : ("exitCode: " + exitCode);

    setFiles(runId, d.files || []);
    setSectigoStatus("完成", exitCode === 0 ? "ok" : "err");
    if (btnCopy) btnCopy.disabled = false;
  } catch (e) {
    setSectigoStatus("请求失败：" + e.message, "err");
    log.value = "";
  } finally {
    if (btnRun) btnRun.disabled = false;
  }
}

function setActiveOp(op) {
  document.body.dataset.op = op;
  const tabDetail = $("tabDetail");
  const tabRefund = $("tabRefund");
  if (tabDetail) tabDetail.classList.toggle("primary", op === "detail");
  if (tabRefund) tabRefund.classList.toggle("primary", op === "refund");
  setSectigoStatus("", "");
  const meta = $("sectigoMeta");
  if (meta) meta.textContent = "";
  setFiles("", []);
}

function wireSectigoPage() {
  const tabDetail = $("tabDetail");
  const tabRefund = $("tabRefund");
  const btnRun = $("btnRun");
  const btnClear = $("btnClear");
  const btnCopy = $("btnCopyLog");
  const input = $("sectigoInput");
  const log = $("sectigoLog");

  setActiveOp("detail");

  if (tabDetail) tabDetail.addEventListener("click", () => setActiveOp("detail"));
  if (tabRefund) tabRefund.addEventListener("click", () => setActiveOp("refund"));
  if (btnRun) btnRun.addEventListener("click", runSectigo);

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (input) input.value = "";
      if (log) log.value = "";
      setSectigoStatus("", "");
      const meta = $("sectigoMeta");
      if (meta) meta.textContent = "";
      setFiles("", []);
      if (btnCopy) btnCopy.disabled = true;
    });
  }

  if (btnCopy && log) {
    btnCopy.addEventListener("click", async () => {
      const ok = await copyToClipboard(log.value);
      setSectigoStatus(ok ? "已复制到剪贴板" : "复制失败（浏览器不支持或无权限）", ok ? "ok" : "err");
    });
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runSectigo();
      }
    });
  }
}
