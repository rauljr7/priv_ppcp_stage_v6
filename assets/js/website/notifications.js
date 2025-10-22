let NOTIFICATIONS_STYLE_ID = "NOTIFICATIONS_STYLE";
let NOTIFICATIONS_HOST_ID  = "notifications_host";
let notifications_seq      = 0;

function ensure_notification_styles() {
  let style_el = document.getElementById(NOTIFICATIONS_STYLE_ID);
  if (style_el) return;

  let css = ""
    + ":root{--note-radius:16px;--note-shadow:0 10px 30px rgba(0,0,0,.2);--note-text:#111;--note-bg:#fff;--note-border:#E5E7EB;--note-success:#10b981;--note-error:#ef4444;--note-info:#3b82f6;--note-warn:#f59e0b}"
    + "#" + NOTIFICATIONS_HOST_ID + "{position:fixed;inset:0;display:grid;place-items:center;z-index:10000;pointer-events:none}"
    + "#" + NOTIFICATIONS_HOST_ID + ".has_backdrop{background:rgba(0,0,0,.45)}"
    + ".note{pointer-events:auto;display:flex;align-items:flex-start;gap:12px;min-width:260px;max-width:min(92vw,560px);background:var(--note-bg);border-radius:var(--note-radius);box-shadow:var(--note-shadow);border:1px solid var(--note-border);padding:16px 18px;position:relative;transform:translateY(-4px);opacity:0;animation:note_in .15s ease forwards}"
    + ".note_type{width:10px;min-width:10px;height:100%;border-radius:8px}"
    + ".note_body{font:600 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;color:var(--note-text);flex:1}"
    + ".note_actions{display:flex;align-items:center}"
    + ".note_close{appearance:none;cursor:pointer;border:0;background:transparent;color:#6b7280;font:600 16px/1 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;padding:4px;margin:-4px;border-radius:8px}"
    + ".note_close:hover{background:#f3f4f6;color:#111}"
    + ".note.success .note_type{background:var(--note-success)}"
    + ".note.error   .note_type{background:var(--note-error)}"
    + ".note.info    .note_type{background:var(--note-info)}"
    + ".note.warn    .note_type{background:var(--note-warn)}"
    + "@keyframes note_in{to{opacity:1;transform:translateY(0)}}";

  style_el = document.createElement("style");
  style_el.id = NOTIFICATIONS_STYLE_ID;
  style_el.type = "text/css";
  style_el.appendChild(document.createTextNode(css));
  document.head.appendChild(style_el);
}

function ensure_notification_host(backdrop) {
  let host = document.getElementById(NOTIFICATIONS_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = NOTIFICATIONS_HOST_ID;
    document.body.appendChild(host);
  }
  if (backdrop) {
    host.classList.add("has_backdrop");
  } else {
    host.classList.remove("has_backdrop");
  }
  return host;
}

function dismiss_notification(id) {
  let host = document.getElementById(NOTIFICATIONS_HOST_ID);
  if (!host) return false;

  let el = host.querySelector('.note[data-id="' + id + '"]');
  if (!el) return false;

  if (el._meta && el._meta.timer) clearTimeout(el._meta.timer);
  if (el._meta && el._meta.on_key) document.removeEventListener("keydown", el._meta.on_key);

  el.style.transition = "opacity .12s ease, transform .12s ease";
  el.style.opacity = "0";
  el.style.transform = "translateY(-4px)";
  setTimeout(function () {
    if (el && el.parentNode) el.parentNode.removeChild(el);
    let has_any = host.querySelector(".note") != null;
    if (!has_any) host.classList.remove("has_backdrop");
  }, 130);

  return true;
}

function dismiss_all_notifications() {
  let host = document.getElementById(NOTIFICATIONS_HOST_ID);
  if (!host) return;
  let list = host.querySelectorAll(".note");
  let i = 0;
  while (i < list.length) {
    let el = list[i];
    let id = el.getAttribute("data-id");
    dismiss_notification(id);
    i = i + 1;
  }
}

function create_notification(opts) {
  ensure_notification_styles();

  let message = "";
  let type = "info";
  let sticky = false;
  let duration = 3500;
  let backdrop = false;
  let aria_role = "";

  if (opts && typeof opts.message === "string") message = opts.message;
  if (opts && typeof opts.type === "string") type = opts.type;
  if (opts && typeof opts.sticky === "boolean") sticky = opts.sticky;
  if (opts && typeof opts.duration === "number") duration = opts.duration;
  if (opts && typeof opts.backdrop === "boolean") backdrop = opts.backdrop;
  if (opts && typeof opts.aria_role === "string") aria_role = opts.aria_role;

  let host = ensure_notification_host(backdrop);

  notifications_seq = notifications_seq + 1;
  let id = "note_" + notifications_seq;

  let note = document.createElement("div");
  note.className = "note " + type;
  note.setAttribute("data-id", id);

  if (aria_role && aria_role.length > 0) {
    note.setAttribute("role", aria_role);
  } else {
    if (type === "error") {
      note.setAttribute("role", "alert");
      note.setAttribute("aria-live", "assertive");
    } else {
      note.setAttribute("role", "status");
      note.setAttribute("aria-live", "polite");
    }
  }

  note.innerHTML = ""
    + '<div class="note_type" aria-hidden="true"></div>'
    + '<div class="note_body">' + (message || "") + '</div>'
    + '<div class="note_actions">'
    +   '<button class="note_close" type="button" aria-label="Dismiss notification">×</button>'
    + '</div>';

  let close_btn = note.querySelector(".note_close");
  if (close_btn) {
    close_btn.addEventListener("click", function () {
      dismiss_notification(id);
    });
  }

  let on_key = function (e) {
    if (!e) return;
    if (e.key === "Escape") {
      let last = host.querySelector(".note:last-of-type");
      if (last && last.getAttribute("data-id") === id) {
        dismiss_notification(id);
      }
    }
  };
  document.addEventListener("keydown", on_key);

  host.appendChild(note);

  let timer = null;
  if (!sticky) {
    if (duration > 0) {
      timer = setTimeout(function () {
        dismiss_notification(id);
      }, duration);
    }
  }

  note._meta = { on_key: on_key, timer: timer, backdrop: backdrop };

  return id;
}

function show_notification(message, opts) {
  let options = opts || {};
  options.message = message;
  return create_notification(options);
}

function success_notification(message, opts) {
  let options = opts || {};
  options.message = message;
  options.type = "success";
  return create_notification(options);
}

function error_notification(message, opts) {
  let options = opts || {};
  options.message = message;
  options.type = "error";
  options.aria_role = "alert";
  return create_notification(options);
}

function info_notification(message, opts) {
  let options = opts || {};
  options.message = message;
  options.type = "info";
  return create_notification(options);
}

function warn_notification(message, opts) {
  let options = opts || {};
  options.message = message;
  options.type = "warn";
  return create_notification(options);
}

// Optional: expose a simple API object as well
if (!window.notifications) window.notifications = {};
window.notifications.show = show_notification;
window.notifications.success = success_notification;
window.notifications.error = error_notification;
window.notifications.info = info_notification;
window.notifications.warn = warn_notification;
window.notifications.dismiss = dismiss_notification;
window.notifications.dismissAll = dismiss_all_notifications;