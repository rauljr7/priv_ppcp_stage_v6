// assets/js/website/loading.js

const LOADING_OVERLAY_ID   = "loading_overlay";
const LOADING_STYLE_ID     = "loading_overlay_styles";
const LOADING_MSG_ID       = "loading_message";
const HTML_NOSCROLL_CLASS  = "loading-sdk-noscroll";
// ledger persisted in localStorage (array of {id, message, ts})
const LOADING_LEDGER_KEY   = "loading_ledger_v1";

/* ========== styles / DOM ========== */
function ensure_loading_styles() {
  if (document.getElementById(LOADING_STYLE_ID)) return;
  const css = `
  .loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:9999}
  .loading-box{background:rgba(255,255,255,.98);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:18px 22px;min-width:220px;display:flex;align-items:center;gap:12px}
  .loading-spinner{width:28px;height:28px;border-radius:50%;border:3px solid #e5e7eb;border-top-color:var(--primary, #111);animation:loading-spin .9s linear infinite}
  .loading-message{font:600 14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;color:var(--primary, #111)}
  @keyframes loading-spin{to{transform:rotate(360deg)}}
  .${HTML_NOSCROLL_CLASS}{overflow:hidden !important}
  `;
  const style = document.createElement("style");
  style.id = LOADING_STYLE_ID;
  style.type = "text/css";
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

function build_overlay(defaultMessage) {
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
  msg.textContent = defaultMessage && String(defaultMessage).length ? String(defaultMessage) : "Loading…";

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

/* ========== ledger (persisted) ========== */
function read_ledger() {
  try {
    const raw = localStorage.getItem(LOADING_LEDGER_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function write_ledger(list) {
  try {
    localStorage.setItem(LOADING_LEDGER_KEY, JSON.stringify(list || []));
  } catch {}
}
function gen_id() {
  return "ld_" + Math.random().toString(36).slice(2, 10);
}
function current_entry() {
  const list = read_ledger();
  return list.length ? list[list.length - 1] : null; // show last (most recent)
}

/* ========== overlay <-> ledger sync ========== */
function update_overlay_from_ledger() {
  const entry = current_entry();
  const overlay = document.getElementById(LOADING_OVERLAY_ID);
  const hasAny = !!entry;

  if (!hasAny) {
    if (overlay) {
      try { overlay.remove(); } finally { restore_scroll(); }
    }
    return;
  }

  ensure_loading_styles();
  if (!overlay) {
    ensure_body(() => {
      if (document.getElementById(LOADING_OVERLAY_ID)) { // race-safe
        apply_message_from_entry(current_entry());
        return;
      }
      const ov = build_overlay();
      document.body.appendChild(ov);
      disable_scroll();
      apply_message_from_entry(current_entry());
    });
  } else {
    apply_message_from_entry(entry);
  }
}

function apply_message_from_entry(entry) {
  const msgEl = document.getElementById(LOADING_MSG_ID);
  if (!msgEl) return;
  const text = entry && typeof entry.message === "string" ? entry.message : "";
  if (text && text.length) {
    msgEl.textContent = text;
    msgEl.style.display = "";
  } else {
    msgEl.textContent = "";
    msgEl.style.display = "none";
  }
}

/* ========== Public API (unchanged names) ========== */
function run_loading(opts = {}) {
  const id = (opts && typeof opts.id === "string" && opts.id.trim()) ? opts.id.trim() : gen_id();
  const message = (opts && typeof opts.message === "string") ? opts.message : "";

  // upsert into ledger (no duplicates by id)
  const list = read_ledger();
  const ix = list.findIndex(e => e && e.id === id);
  if (ix !== -1) {
    // already tracked; update its message if a non-empty message is provided
    if (message && message.length) {
      list[ix].message = message;
      write_ledger(list);
      // if this entry is the one on top, reflect message immediately
      if (ix === list.length - 1) apply_message_from_entry(list[ix]);
    }
    // ensure overlay is visible if something is loading
    update_overlay_from_ledger();
    return false;
  }

  list.push({ id, message, ts: Date.now() });
  write_ledger(list);

  // show/refresh overlay based on latest entry
  update_overlay_from_ledger();
  return true;
}

function set_loading_message(text) {
  const el = document.getElementById(LOADING_MSG_ID);
  if (!el) return false;
  const t = (typeof text === "string" && text.length) ? text : "";
  if (t) {
    el.textContent = t;
    el.style.display = "";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
  return true;
}

function remove_loading(opts = {}) {
  const list = read_ledger();

  // if id provided, remove only that one; else clear all
  const id = (opts && typeof opts.id === "string" && opts.id.trim()) ? opts.id.trim() : "";
  if (id) {
    const next = list.filter(e => e && e.id !== id);
    if (next.length === list.length) {
      // nothing removed; still ensure overlay reflects current state
      update_overlay_from_ledger();
      return false;
    }
    write_ledger(next);
  } else {
    write_ledger([]);
  }

  // reflect the new top-of-stack (or remove overlay if empty)
  update_overlay_from_ledger();
  return true;
}

async function with_loading(task, opts = {}) {
  run_loading(opts);
  try {
    const result = (typeof task === "function") ? task() : task;
    return await result;
  } finally {
    // if an id was passed to with_loading, remove just that; else remove all
    if (opts && typeof opts.id === "string" && opts.id.trim()) {
      remove_loading({ id: opts.id.trim() });
    } else {
      remove_loading();
    }
  }
}

/* ========== expose ========== */
window.run_loading = run_loading;
window.remove_loading = remove_loading;
window.is_loading = is_loading;
window.set_loading_message = set_loading_message;
window.with_loading = with_loading;

// Optional: if a stale ledger exists (e.g., after navigation), reflect it.
document.addEventListener("DOMContentLoaded", update_overlay_from_ledger);