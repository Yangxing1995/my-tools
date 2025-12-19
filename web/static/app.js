function $(id) {
  return document.getElementById(id);
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
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
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

function renderCertList(certs) {
  const container = $("outputContainer");
  const certList = $("certList");
  const certCount = $("certCount");
  
  if (!container || !certList || !certCount) return;
  
  certCount.textContent = `(共 ${certs.length} 个证书)`;
  certList.innerHTML = "";
  
  certs.forEach((cert, index) => {
    const certItem = document.createElement("div");
    certItem.style.marginBottom = "16px";
    
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.style.marginBottom = "8px";
    
    const label = document.createElement("span");
    label.textContent = `证书 ${index + 1}`;
    label.style.fontWeight = "bold";
    
    const copyBtn = document.createElement("button");
    copyBtn.className = "btn";
    copyBtn.textContent = "复制";
    copyBtn.id = `btnCopyCert${index}`;
    copyBtn.addEventListener("click", () => copyCertToClipboard(cert, `btnCopyCert${index}`));
    
    toolbar.appendChild(label);
    toolbar.appendChild(copyBtn);
    
    const textarea = document.createElement("textarea");
    textarea.className = "textarea";
    textarea.readOnly = true;
    textarea.value = cert;
    textarea.style.height = "150px";
    textarea.style.fontSize = "12px";
    
    certItem.appendChild(toolbar);
    certItem.appendChild(textarea);
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

document.addEventListener("DOMContentLoaded", () => {
  if (document.body && document.body.dataset.page === "csr") {
    wireCSRPage();
  }
  if (document.body && document.body.dataset.page === "cert") {
    wireCertPage();
  }
  if (document.body && document.body.dataset.page === "sectigo") {
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
