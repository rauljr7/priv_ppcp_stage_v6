// assets/js/website/loading.js

const LOADING_OVERLAY_ID = "loading_overlay";
const LOADING_STYLE_ID   = "loading_overlay_styles";
const LOADING_MSG_ID     = "loading_message";
const HTML_NOSCROLL_CLASS = "loading-sdk-noscroll";

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
  msg.textContent = typeof message === "string" && message.length ? message : "Loading…";

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

function run_loading(opts = {}) {
  if (is_loading()) return false;
  ensure_loading_styles();
  ensure_body(() => {
    if (is_loading()) return; // double-check in case it appeared meanwhile
    const overlay = build_overlay(opts.message);
    document.body.appendChild(overlay);
    disable_scroll();
  });
  return true;
}

function set_loading_message(text) {
  const el = document.getElementById(LOADING_MSG_ID);
  if (!el) return false;
  el.textContent = typeof text === "string" && text.length ? text : "Loading…";
  return true;
}

function remove_loading() {
  const overlay = document.getElementById(LOADING_OVERLAY_ID);
  if (!overlay) return false;
  try {
    overlay.remove();
  } finally {
    restore_scroll();
  }
  return true;
}

async function with_loading(task) {
  // task can be a Promise or a function returning a Promise/value
  run_loading();
  try {
    const result = (typeof task === "function") ? task() : task;
    return await result;
  } finally {
    remove_loading();
  }
}

// Expose globals (tiny “SDK”)
window.run_loading = run_loading;
window.remove_loading = remove_loading;
window.is_loading = is_loading;
window.set_loading_message = set_loading_message;
window.with_loading = with_loading;
