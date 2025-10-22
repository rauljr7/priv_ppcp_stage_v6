let NOTIFICATIONS_STYLE_ID = "NOTIFICATIONS_STYLE";
let NOTIFICATIONS_HOST_ID  = "notifications_host";
let notifications_seq      = 0;

function ensure_notification_styles() {
  if (document.getElementById("notifications_style")) return;

  let css =
  '#notifications_host{position:fixed;top:20px;left:0;right:0;display:flex;justify-content:center;z-index:9999;pointer-events:none}' +
  '.note{pointer-events:auto;display:flex;align-items:center;gap:14px;min-width:320px;max-width:640px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.18);padding:16px 16px 16px 0;font:600 16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;color:#111}' +
  '.note_type{width:8px;align-self:stretch;background:#2563eb;border-top-left-radius:14px;border-bottom-left-radius:14px;flex:0 0 8px}' +
  '.note_body{flex:1;padding:0 2px}' +
  '.note_actions{display:flex;align-items:center;gap:8px}' +
  '.note_close{appearance:none;border:0;background:transparent;cursor:pointer;font-size:20px;line-height:1;padding:0 6px;color:#111;opacity:.9}' +
  '.note_close:hover{opacity:1}' +

  /* Make entire card tinted by type */
  '.note.error{background:#fef2f2;border-color:#fecaca}' +
  '.note.info{background:#fffbeb;border-color:#fde68a}' +
  '.note.success{background:#f0fdf4;border-color:#bbf7d0}' +

  /* Keep the accent bar strong too */
  '.note.error .note_type{background:#dc2626}' +
  '.note.info .note_type{background:#f59e0b}' +
  '.note.success .note_type{background:#16a34a}';

  let style = document.createElement("style");
  style.id = "notifications_style";
  style.type = "text/css";
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
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

  el.style.transition = "opacity .14s ease, transform .14s ease";
  el.style.opacity = "0";
  el.style.transform = "translateY(-6px)";
  setTimeout(function () {
    if (el && el.parentNode) el.parentNode.removeChild(el);
    let has_any = host.querySelector(".note") != null;
    if (!has_any) host.classList.remove("has_backdrop");
  }, 160);

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
  let type = "default";
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
      if (last) {
        let last_id = last.getAttribute("data-id");
        if (last_id === id) {
          dismiss_notification(id);
        }
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
  options.type = "info"; // yellow
  return create_notification(options);
}

function warn_notification(message, opts) {
  let options = opts || {};
  options.message = message;
  options.type = "warn"; // neutral stripe
  return create_notification(options);
}

if (!window.notifications) window.notifications = {};
window.notifications.show = show_notification;
window.notifications.success = success_notification;
window.notifications.error = error_notification;
window.notifications.info = info_notification;
window.notifications.warn = warn_notification;
window.notifications.dismiss = dismiss_notification;
window.notifications.dismissAll = dismiss_all_notifications;
