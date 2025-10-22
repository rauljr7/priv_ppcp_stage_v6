/* ========= Notifications ========= */

let notifications_style_id = "notifications_style";
let notifications_host_id  = "notifications_host";
let notifications_seq      = 0;

function ensure_notification_styles() {
  let existing = document.getElementById(notifications_style_id);
  if (existing) return;

  let css = ""
    + "#"+notifications_host_id+"{position:fixed;top:20px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:12px;z-index:9999;pointer-events:none}"
    + ".note{pointer-events:auto;display:flex;align-items:center;gap:14px;min-width:360px;max-width:760px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 14px 36px rgba(0,0,0,.18);padding:18px 18px;font:700 18px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;color:#111}"
    + ".note_body{flex:1;padding:0 2px}"
    + ".note_actions{display:flex;align-items:center;gap:8px}"
    + ".note_close{appearance:none;border:0;background:transparent;cursor:pointer;font-size:22px;line-height:1;padding:0 8px;color:#111;opacity:.9}"
    + ".note_close:hover{opacity:1}"

    /* Tinted cards by type */
    + ".note.error{background:#fef2f2;border-color:#fecaca}"
    + ".note.info{background:#fffbeb;border-color:#fde68a}"
    + ".note.success{background:#f0fdf4;border-color:#bbf7d0}";

  let style = document.createElement("style");
  style.id = notifications_style_id;
  style.type = "text/css";
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

function ensure_notification_host() {
  let host = document.getElementById(notifications_host_id);
  if (host) return host;

  host = document.createElement("div");
  host.id = notifications_host_id;
  host.setAttribute("aria-live", "polite");
  host.setAttribute("aria-atomic", "true");
  document.body.appendChild(host);
  return host;
}

function next_notification_id() {
  notifications_seq = notifications_seq + 1;
  let id = "note_" + String(notifications_seq);
  return id;
}

function hide_notification_by_id(id) {
  let el = document.querySelector('[data-id="'+id+'"]');
  if (!el) return;
  if (el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

function show_notification(message, type, options) {
  if (!message) message = "";
  if (!type) type = "";
  if (!options) options = {};

  ensure_notification_styles();
  let host = ensure_notification_host();

  let id = next_notification_id();

  let note = document.createElement("div");
  note.className = "note";
  note.setAttribute("role", "alert");
  note.setAttribute("data-id", id);

  if (type === "error") {
    note.classList.add("error");
  } else if (type === "info") {
    note.classList.add("info");
  } else if (type === "success") {
    note.classList.add("success");
  }

  let body = document.createElement("div");
  body.className = "note_body";
  body.textContent = message;

  let actions = document.createElement("div");
  actions.className = "note_actions";

  let btn_close = document.createElement("button");
  btn_close.className = "note_close";
  btn_close.type = "button";
  btn_close.setAttribute("aria-label", "Dismiss notification");
  btn_close.textContent = "×";
  btn_close.addEventListener("click", function () {
    hide_notification_by_id(id);
  });

  actions.appendChild(btn_close);
  note.appendChild(body);
  note.appendChild(actions);
  host.appendChild(note);

  let auto_hide_ms = 0;
  if (typeof options.auto_hide_ms === "number") {
    auto_hide_ms = options.auto_hide_ms;
  }

  if (auto_hide_ms > 0) {
    window.setTimeout(function () {
      hide_notification_by_id(id);
    }, auto_hide_ms);
  }

  return id;
}

/* Convenience helpers */
function notify_error(message) {
  let opts = {};
  /* sticky by default (no auto-hide) */
  return show_notification(message, "error", opts);
}

function notify_info(message) {
  let opts = {};
  /* sticky by default; change to opts.auto_hide_ms = 5000 if desired */
  return show_notification(message, "info", opts);
}

function notify_success(message) {
  let opts = {};
  /* auto-hide success after 4s (edit as needed) */
  opts.auto_hide_ms = 4000;
  return show_notification(message, "success", opts);
}