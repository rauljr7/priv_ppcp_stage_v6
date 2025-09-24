// assets/js/website/loading.js

const LOADING_OVERLAY_ID   = "loading_overlay";
const LOADING_STYLE_ID     = "loading_overlay_styles";
const LOADING_MSG_ID       = "loading_message";
const HTML_NOSCROLL_CLASS  = "loading-sdk-noscroll";
const LOADING_LS_KEY       = "__loading_sdk_ledger__";

function ensure_loading_styles() {
  if (document.getElementById(LOADING_STYLE_ID)) return;

  const css = `
  .loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:9999}
  .loading-box{background:rgba(255,255,255,.98);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:18px 22px;min-width:220px;display:flex;align-items:center;gap:12px}
  .loading-spinner{width:28px;height:28px;border-radius:50%;border:3px solid #e5e7eb;border-top-color:var(--primary, #111);animation:loading-spin .9s linear infinite}
  .loading-message{font:600 14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;color:var(--primary, #111)}
  .loading-message.hidden{display:none}
  @keyframes loading-spin{to{transform:rotate(360deg)}}
  .${HTML_NOSCROLL_CLASS}{overflow:hidden !important}
  `;
  const style = document.createElement("style");
  style.id = LOADING_STYLE_ID;
  style.type = "text/css";
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

function build_overlay(message) {
  const overlay = document.createElement("div");
  overlay.id = LOADING_OVERLAY_ID;
  overlay.className = "loading-overlay";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute("aria-busy", "true");

  const box = document.createElement("div");
  box.className = "loading-box";

  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const msg = document.createElement("div");
  msg.id = LOADING_MSG_ID;
  msg.className = "loading-message";
  const text = typeof message === "string" ? message.trim() : "";
  if (text) {
    msg.textContent = text;
  } else {
    msg.classList.add("hidden");
    msg.textContent = "";
  }

  box.appendChild(spinner);
  box.appendChild(msg);
  overlay.appendChild(box);
  return overlay;
}

function ensure_body(cb) {
  if (document.body) { cb(); return; }
  document.addEventListener("DOMContentLoaded", cb, { once: true });
}

function disable_scroll() {
  const html = document.documentElement;
  if (!html.classList.contains(HTML_NOSCROLL_CLASS)) {
    html.classList.add(HTML_NOSCROLL_CLASS);
  }
}

function restore_scroll() {
  document.documentElement.classList.remove(HTML_NOSCROLL_CLASS);
}

function is_loading() {
  return !!document.getElementById(LOADING_OVERLAY_ID);
}

/* ===================== Ledger (multi-loader tracking) ===================== */

function ledger_load() {
  try {
    const raw = localStorage.getItem(LOADING_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function ledger_save(arr) {
  try { localStorage.setItem(LOADING_LS_KEY, JSON.stringify(arr)); } catch {}
}

function ledger_clear() {
  try { localStorage.removeItem(LOADING_LS_KEY); } catch {}
}

function ledger_upsert(entry) {
  const list = ledger_load();
  const idx = list.findIndex(x => x && x.id === entry.id);
  if (idx >= 0) {
    // update message but keep original order
    list[idx].message = entry.message;
    list[idx].opts = entry.opts || list[idx].opts || {};
  } else {
    list.push(entry);
  }
  ledger_save(list);
  return list;
}

function ledger_remove(id) {
  const list = ledger_load().filter(x => x && x.id !== id);
  ledger_save(list);
  return list;
}

function ledger_first() {
  const list = ledger_load();
  return list.length ? list[0] : null;
}

function update_overlay_from_ledger() {
  const top = ledger_first();
  if (!top) {
    const overlay = document.getElementById(LOADING_OVERLAY_ID);
    if (overlay) overlay.remove();
    restore_scroll();
    return;
  }
  ensure_loading_styles();
  ensure_body(() => {
    let overlay = document.getElementById(LOADING_OVERLAY_ID);
    if (!overlay) {
      overlay = build_overlay(top.message);
      document.body.appendChild(overlay);
      disable_scroll();
      return;
    }
    const msgEl = document.getElementById(LOADING_MSG_ID);
    if (msgEl) {
      const text = typeof top.message === "string" ? top.message.trim() : "";
      if (text) {
        msgEl.textContent = text;
        msgEl.classList.remove("hidden");
      } else {
        msgEl.textContent = "";
        msgEl.classList.add("hidden");
      }
    }
  });
}

/* ===================== Public API ===================== */

function run_loading(opts = {}) {
  const id = typeof opts.id === "string" && opts.id.trim()
    ? opts.id.trim()
    : ("ldg_" + Math.random().toString(36).slice(2));

  const message = typeof opts.message === "string" ? opts.message : "";

  ledger_upsert({ id, message, opts, ts: Date.now() });
  update_overlay_from_ledger();
  return true;
}

function set_loading_message(text) {
  const msgEl = document.getElementById(LOADING_MSG_ID);
  if (!msgEl) return false;

  const str = typeof text === "string" ? text.trim() : "";
  if (str) {
    msgEl.textContent = str;
    msgEl.classList.remove("hidden");
  } else {
    msgEl.textContent = "";
    msgEl.classList.add("hidden");
  }

  // also mirror to the active ledger entry
  const top = ledger_first();
  if (top) {
    top.message = str;
    const list = ledger_load();
    if (list.length) {
      list[0] = top;
      ledger_save(list);
    }
  }
  return true;
}

function remove_loading(opts) {
  if (opts && typeof opts.id === "string" && opts.id.trim()) {
    ledger_remove(opts.id.trim());
  } else {
    ledger_clear();
  }
  update_overlay_from_ledger();
  return true;
}

async function with_loading(task, opts = {}) {
  run_loading(opts);
  try {
    const result = (typeof task === "function") ? task() : task;
    return await result;
  } finally {
    if (opts && typeof opts.id === "string" && opts.id.trim()) {
      remove_loading({ id: opts.id.trim() });
    } else {
      remove_loading();
    }
  }
}

/* ===================== Page-load resets ===================== */

function reset_loading_ledger() {
  ledger_clear();
}
window.addEventListener("DOMContentLoaded", reset_loading_ledger, { once: true });

// Optional helper: clear all localStorage on load (opt-in)
// Call window.enable_full_storage_reset_on_load() somewhere if desired.
function enable_full_storage_reset_on_load() {
  window.addEventListener("DOMContentLoaded", function () {
    try { localStorage.clear(); } catch {}
    try { remove_loading(); } catch {}
  }, { once: true });
}

/* ===================== Expose globals ===================== */

window.run_loading = run_loading;
window.remove_loading = remove_loading;
window.is_loading = is_loading;
window.set_loading_message = set_loading_message;
window.with_loading = with_loading;
window.enable_full_storage_reset_on_load = enable_full_storage_reset_on_load;
window.reset_loading_ledger = reset_loading_ledger;
