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

document.addEventListener("DOMContentLoaded", () => {
  if (document.body && document.body.dataset.page === "csr") {
    wireCSRPage();
  }
});
