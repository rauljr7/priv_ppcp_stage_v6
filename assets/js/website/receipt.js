"use strict";

/* ========= Helpers ========= */
function $(sel) { return document.querySelector(sel); }
function set(id, text) { const el = document.getElementById(id); if (el) el.textContent = text == null ? "" : String(text); }
function showById(id, on = true) { const el = document.getElementById(id); if (!el) return; el.classList.toggle("hide", !on); }
function toggleTwoCol(gridEl, on) { if (!gridEl) return; gridEl.classList.toggle("two-col", !!on); }
function fmtMoney(v) { if (v == null) return "$0.00"; const n = typeof v === "string" ? parseFloat(v) : +v; return "$" + (isNaN(n) ? 0 : n).toFixed(2); }

function joinCityStatePostal(a) {
  if (!a) return "";
  const city = a.admin_area_2 || "";
  const state = a.admin_area_1 || "";
  const zip = a.postal_code || "";
  return [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}
function hasAny(values) { return values.some(v => typeof v === "string" ? v.trim().length > 0 : !!v); }

function fillBuyer(tx) {
  let name  = tx?.payer?.name ? [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ") : "";
  let email = tx?.payer?.email_address || "";
  let phone = tx?.payer?.phone?.phone_number?.national_number || "";

  if (!name || !email || !phone) {
    try {
      const raw = localStorage.getItem("website_session");
      const ws  = raw ? JSON.parse(raw) : null;
      const ci  = ws?.contact_information || {};
      const si  = ws?.shipping_information || {};
      const bi  = ws?.billing_information || {};
      if (!name && (si.full_name || bi.full_name)) name = si.full_name || bi.full_name || name;
      if (!email && ci.email) email = ci.email;
      if (!phone && (si.phone || bi.phone)) phone = si.phone || bi.phone || phone;
    } catch (_) {}
  }

  set("buyer_name", name || "—");
  set("buyer_email", email || "—");
  set("buyer_phone", phone || "—");

  const hasBuyer = hasAny([name, email, phone]);
  showById("section_buyer", hasBuyer);
  return hasBuyer;
}

function fillPayment(tx) {
  let ps = tx && tx.payment_source ? tx.payment_source : {};
  let has_payment = false;

  // PayPal
  if (ps.paypal) {
    set("pp_email", ps.paypal.email_address || "—");
    set("pp_account_id", ps.paypal.account_id || "—");
    set("pp_account_status", ps.paypal.account_status || "—");
    showById("payment_paypal", true);
    const gp = document.getElementById("payment_googlepay"); if (gp) gp.classList.add("hide");
    const vn = document.getElementById("payment_venmo");     if (vn) vn.classList.add("hide");
    const cd = document.getElementById("payment_card");      if (cd) cd.classList.add("hide");
    has_payment = true;
  } else {
    showById("payment_paypal", false);
  }

  // Google Pay
  if (ps.google_pay) {
    const el = ensureGooglePayCard(); if (el) el.classList.remove("hide");
    const gc = ps.google_pay.card || {};
    const brand = gc.brand || "";
    const last  = gc.last_digits || "";
    const display = brand && last ? `${brand} •••• ${last}` : (brand || (last ? `•••• ${last}` : "—"));
    set("gp_card", display);
    set("gp_type", gc.type || "—");
    set("gp_name", ps.google_pay.name || gc.name || "—");

    const vn = document.getElementById("payment_venmo"); if (vn) vn.classList.add("hide");
    const cd = document.getElementById("payment_card");  if (cd) cd.classList.add("hide");
    showById("payment_paypal", false);
    has_payment = true;
  } else {
    const el = document.getElementById("payment_googlepay");
    if (el) el.classList.add("hide");
  }

  // Venmo
  if (ps.venmo) {
    const vcard = ensureVenmoCard(); if (vcard) vcard.classList.remove("hide");
    const v = ps.venmo;
    let venmo_name = "";
    if (v && v.name) {
      venmo_name = [v.name.given_name || "", v.name.surname || ""].filter(Boolean).join(" ");
    } else if (tx?.payer?.name) {
      venmo_name = [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ");
    }
    set("vn_email", v.email_address || tx?.payer?.email_address || "—");
    set("vn_account_id", v.account_id || tx?.payer?.payer_id || "—");
    set("vn_name", venmo_name || "—");
    set("vn_phone", v?.phone_number?.national_number || tx?.payer?.phone?.phone_number?.national_number || "—");

    const gp = document.getElementById("payment_googlepay"); if (gp) gp.classList.add("hide");
    const cd = document.getElementById("payment_card");      if (cd) cd.classList.add("hide");
    showById("payment_paypal", false);
    has_payment = true;
  } else {
    const el = document.getElementById("payment_venmo");
    if (el) el.classList.add("hide");
  }

  // Direct Card (payment_source.card)
  if (ps.card) {
    const el = ensureDirectCard(); if (el) el.classList.remove("hide");
    const c = ps.card;
    const brand = c.brand || "";
    const last  = c.last_digits || "";
    const display = brand && last ? `${brand} •••• ${last}` : (brand || (last ? `•••• ${last}` : "—"));
    set("cd_card", display);
    set("cd_type", c.type || "—");

    const gp = document.getElementById("payment_googlepay"); if (gp) gp.classList.add("hide");
    const vn = document.getElementById("payment_venmo");     if (vn) vn.classList.add("hide");
    showById("payment_paypal", false);
    has_payment = true;
  } else {
    const el = document.getElementById("payment_card");
    if (el) el.classList.add("hide");
  }

  showById("section_payment", has_payment);
  return has_payment;
}

function fillOrderMeta(tx) {
  set("order_id_value", tx?.id || "—");

  const pu0 = Array.isArray(tx?.purchase_units) ? tx.purchase_units[0] : null;
  const cap = pu0?.payments?.captures?.[0];
  const iso = cap?.create_time || new Date().toISOString();
  const dateStr = new Date(iso).toLocaleString();
  set("order_date_value", dateStr);

  const status = (tx?.status || "PENDING").toUpperCase();
  const badge = document.getElementById("receipt_status_badge");
  if (badge) {
    badge.textContent = status;
    badge.classList.remove("status-success", "status-pending", "status-failed");
    if (status === "COMPLETED") badge.classList.add("status-success");
    else if (status === "PAYER_ACTION_REQUIRED" || status === "PENDING") badge.classList.add("status-pending");
    else badge.classList.add("status-failed");
  }
}

function getWebsiteSessionPU0() {
  try {
    const raw = localStorage.getItem("website_session");
    if (!raw) return null;
    const ws = JSON.parse(raw);
    const pus = ws && ws.basket && Array.isArray(ws.basket.purchase_units) ? ws.basket.purchase_units : [];
    return pus && pus[0] ? pus[0] : null;
  } catch (_) { return null; }
}

function renderItemsFromSession() {
  const body = document.getElementById("items_tbody");
  if (!body) return;
  while (body.firstChild) body.removeChild(body.firstChild);

  let items = [];

  // 1) Preferred: live session helper
  try {
    if (typeof get_session_basket_purchase_units_items === "function") {
      const arr = get_session_basket_purchase_units_items();
      if (Array.isArray(arr) && arr.length) items = arr;
    }
  } catch (_) {}

  // 2) Fallback: website_session from localStorage
  if (!items.length) {
    try {
      const raw = localStorage.getItem("website_session");
      const ws  = raw ? JSON.parse(raw) : null;
      const pu0 = ws?.basket?.purchase_units?.[0];
      const arr = Array.isArray(pu0?.items) ? pu0.items : [];
      if (arr.length) items = arr;
    } catch (_) {}
  }

  // 3) Fallback: transaction payload (rarely has items, but try)
  if (!items.length) {
    const tx   = window.receipt_last_tx || window.transaction_payload || null;
    const pu0  = Array.isArray(tx?.purchase_units) ? tx.purchase_units[0] : null;
    const arr  = Array.isArray(pu0?.items) ? pu0.items : [];
    if (arr.length) items = arr;
  }

  if (!items.length) return;

  items.forEach((it) => {
    const title = [it?.name, it?.description].filter(Boolean).join(" — ") || "Item";
    const qty   = Math.max(1, parseInt(String(it?.quantity ?? "1"), 10) || 1);
    const unit  = parseFloat(it?.unit_amount?.value || "0") || 0;
    const subtotal = unit * qty;

    const row = document.createElement("div");
    row.className = "items-row";
    row.setAttribute("role", "row");

    const c1 = document.createElement("div"); c1.textContent = title;
    const c2 = document.createElement("div"); c2.className = "num"; c2.textContent = String(qty);
    const c3 = document.createElement("div"); c3.className = "num"; c3.textContent = fmtMoney(unit);
    const c4 = document.createElement("div"); c4.className = "num"; c4.textContent = fmtMoney(subtotal);

    row.appendChild(c1); row.appendChild(c2); row.appendChild(c3); row.appendChild(c4);
    body.appendChild(row);
  });
}

function fillTotalsFromSession(tx) {
  let items = 0, ship = 0, total = 0;

  // 1) Try website_session first
  const pu0 = getWebsiteSessionPU0();
  if (pu0 && pu0.amount) {
    items = parseFloat(pu0?.amount?.breakdown?.item_total?.value || "0") || 0;
    ship  = parseFloat(pu0?.amount?.breakdown?.shipping?.value   || "0") || 0;
    total = parseFloat(pu0?.amount?.value || (items + ship)) || (items + ship);
  }

  // 2) If still zero, fall back to tx (prod GPay often lacks purchase_units.amount)
  if (items === 0 && ship === 0 && total === 0) {
    const x = tx || window.receipt_last_tx || window.transaction_payload || null;
    const xpu0 = Array.isArray(x && x.purchase_units) ? x.purchase_units[0] : null;

    if (xpu0 && xpu0.amount) {
      items = parseFloat(xpu0?.amount?.breakdown?.item_total?.value || "0") || 0;
      ship  = parseFloat(xpu0?.amount?.breakdown?.shipping?.value   || "0") || 0;
      total = parseFloat(xpu0?.amount?.value || (items + ship)) || (items + ship);
    } else {
      // No PU amount in prod -> use capture amount as the total
      const cap = xpu0 && xpu0.payments && Array.isArray(xpu0.payments.captures) ? xpu0.payments.captures[0] : null;
      if (cap && cap.amount && typeof cap.amount.value === "string") {
        total = parseFloat(cap.amount.value) || 0;

        // If a shipping option is present on the order, subtract it from total for an items figure
        let chosen = null;
        const opts = xpu0 && xpu0.shipping && Array.isArray(xpu0.shipping.options) ? xpu0.shipping.options : null;
        if (opts && opts.length) {
          chosen = opts.find(function (o) { return o && o.selected; }) || opts[0];
        }
        if (chosen && chosen.amount && typeof chosen.amount.value === "string") {
          ship = parseFloat(chosen.amount.value) || 0;
        } else {
          ship = 0;
        }
        items = total - ship;
        if (items < 0) items = 0;
      }
    }
  }

  set("item_total_value", fmtMoney(items));
  set("shipping_total_value", fmtMoney(ship));
  set("order_total_value", fmtMoney(total));
}

function fillAddresses(tx) {
  const gp = tx?.payment_source?.google_pay || null;
  const gp_card = gp?.card || null;

  // Billing name
  let billing_name = "";
  if (tx?.payer?.name) {
    billing_name = [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ");
  } else if (gp && typeof gp.name === "string") {
    billing_name = gp.name;
  } else if (gp_card && typeof gp_card.name === "string") {
    billing_name = gp_card.name;
  }

  // Billing address (tx → gp_card → session fallback)
  let billing_addr = tx?.payer?.address || gp_card?.billing_address || null;

  if (!billing_addr) {
    try {
      const raw = localStorage.getItem("website_session");
      const ws  = raw ? JSON.parse(raw) : null;
      const b   = ws?.billing_information;
      if (b) {
        billing_name = b.full_name || billing_name;
        billing_addr = {
          address_line_1: b.address_line_1 || "",
          admin_area_2:   b.city || "",
          admin_area_1:   b.state_province || "",
          postal_code:    b.postal_code || "",
          country_code:   b.country || "US"
        };
      }
    } catch (_) {}
  }

  set("billing_name", billing_name || "—");
  set("billing_line1", billing_addr?.address_line_1 || "—");
  set("billing_city_state_postal", joinCityStatePostal(billing_addr) || "—");
  set("billing_country", billing_addr?.country_code || "—");

  const has_billing = hasAny([
    billing_name,
    billing_addr?.address_line_1,
    joinCityStatePostal(billing_addr),
    billing_addr?.country_code
  ]);
  showById("section_billing", has_billing);

  // Shipping (existing logic + session fallback you already had)
  const pu0  = Array.isArray(tx?.purchase_units) ? tx.purchase_units[0] : null;
  const ship = pu0?.shipping || null;
  let ship_name = ship?.name?.full_name || "";
  let ship_addr = ship?.address || null;

  if (!ship_addr) {
    try {
      const raw = localStorage.getItem("website_session");
      const ws  = raw ? JSON.parse(raw) : null;
      const s   = ws?.shipping_information;
      if (s) {
        ship_name = s.full_name || ship_name;
        ship_addr = {
          address_line_1: s.address_line_1 || "",
          address_line_2: s.address_line_2 || "",
          admin_area_2:   s.city || "",
          admin_area_1:   s.state_province || "",
          postal_code:    s.postal_code || "",
          country_code:   s.country || "US"
        };
      }
    } catch (_) {}
  }

  set("shipping_name", ship_name || "—");
  set("shipping_line1", ship_addr?.address_line_1 || "—");
  set("shipping_city_state_postal", joinCityStatePostal(ship_addr) || "—");
  set("shipping_country", ship_addr?.country_code || "—");

  let method = "—";
  if (ship && Array.isArray(ship.options)) {
    const chosen = ship.options.find(o => o && o.selected) || ship.options[0];
    if (chosen) method = chosen.label || chosen.id || "—";
  } else {
    try {
      const raw = localStorage.getItem("website_session");
      const ws  = raw ? JSON.parse(raw) : null;
      const sm  = ws?.shipping_methods;
      if (sm && Array.isArray(sm.options)) {
        const sel = sm.selected || "";
        const found = sm.options.find(o => o && String(o.id) === String(sel));
        if (found) method = found.label || found.id || method;
      }
    } catch (_) {}
  }
  set("shipping_method", method);

  const has_shipping = hasAny([
    ship_name,
    ship_addr?.address_line_1,
    joinCityStatePostal(ship_addr),
    ship_addr?.country_code,
    method && method !== "—"
  ]);
  showById("section_shipping", has_shipping);

  const addr_grid = document.querySelector("#section_address_grid .info-grid");
  toggleTwoCol(addr_grid, has_billing && has_shipping);

  return { hasBilling: has_billing, hasShipping: has_shipping };
}

function ensureGooglePayCard() {
  let host = document.getElementById("section_payment");
  if (!host) return null;

  let card = document.getElementById("payment_googlepay");
  if (card) return card;

  card = document.createElement("div");
  card.id = "payment_googlepay";
  card.className = "pay-card";
  card.innerHTML =
    '<div class="pay-row">' +
      '<div class="pay-brand"><span class="pill">Google&nbsp;Pay</span></div>' +
      '<div class="pay-meta">' +
        '<div class="kv"><span class="k">Card</span><span id="gp_card" class="v">—</span></div>' +
        '<div class="kv"><span class="k">Type</span><span id="gp_type" class="v">—</span></div>' +
        '<div class="kv"><span class="k">Name</span><span id="gp_name" class="v">—</span></div>' +
      '</div>' +
    '</div>';
  host.appendChild(card);
  return card;
}

function ensureVenmoCard() {
  let host = document.getElementById("section_payment");
  if (!host) return null;

  let card = document.getElementById("payment_venmo");
  if (card) return card;

  card = document.createElement("div");
  card.id = "payment_venmo";
  card.className = "pay-card";
  card.innerHTML =
    '<div class="pay-row">' +
      '<div class="pay-brand"><span class="pill">Venmo</span></div>' +
      '<div class="pay-meta">' +
        '<div class="kv"><span class="k">Email</span><span id="vn_email" class="v">—</span></div>' +
        '<div class="kv"><span class="k">Account ID</span><span id="vn_account_id" class="v">—</span></div>' +
        '<div class="kv"><span class="k">Name</span><span id="vn_name" class="v">—</span></div>' +
        '<div class="kv"><span class="k">Phone</span><span id="vn_phone" class="v">—</span></div>' +
      '</div>' +
    '</div>';
  host.appendChild(card);
  return card;
}

function ensureDirectCard() {
  const host = document.getElementById("section_payment");
  if (!host) return null;

  let card = document.getElementById("payment_card");
  if (card) return card;

  card = document.createElement("div");
  card.id = "payment_card";
  card.className = "pay-card";
  card.innerHTML =
    '<div class="pay-row">' +
      '<div class="pay-brand"><span class="pill">Card</span></div>' +
      '<div class="pay-meta">' +
        '<div class="kv"><span class="k">Card</span><span id="cd_card" class="v">—</span></div>' +
        '<div class="kv"><span class="k">Type</span><span id="cd_type" class="v">—</span></div>' +
      '</div>' +
    '</div>';
  host.appendChild(card);
  return card;
}

/* ========= Public API ========= */
window.receipt = {
  setTransaction: function (tx) {
    window.receipt_last_tx = tx;   // <— remember tx for fallbacks

    fillOrderMeta(tx);
    fillAddresses(tx);
    const hasBuyer = fillBuyer(tx);
    const hasPayment = fillPayment(tx);

    const bpGrid = document.querySelector("#section_buyer_payment .info-grid");
    toggleTwoCol(bpGrid, hasBuyer && hasPayment);

    renderItemsFromSession();
    fillTotalsFromSession(tx);
  },
  setTotals: function ({ items, shipping, total } = {}) {
    if (typeof items !== "undefined") set("item_total_value", fmtMoney(items));
    if (typeof shipping !== "undefined") set("shipping_total_value", fmtMoney(shipping));
    if (typeof total !== "undefined") set("order_total_value", fmtMoney(total));
  },
  refreshItemsFromSession: renderItemsFromSession
};

/* ========= DOM Ready ========= */
document.addEventListener("DOMContentLoaded", function () {
  renderItemsFromSession();
  fillTotalsFromSession();
  const printBtn = document.getElementById("receipt_print_btn");
  if (printBtn) printBtn.addEventListener("click", () => window.print());
});

window.check_url = async function () {
  if (typeof window.run_loading === "function") window.run_loading();

  const bail = (reason) => {
    if (typeof window.remove_loading === "function") window.remove_loading();
    window.location.assign("/");
    throw new Error(reason || "bail");
  };

  try {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session");
    if (!sessionId) return bail("missing_session_param");

    const raw = localStorage.getItem("website_session");
    if (!raw) return bail("missing_website_session");

    let ws = null;
    try { ws = JSON.parse(raw); } catch { return bail("invalid_session_json"); }
    if (!ws || typeof ws !== "object") return bail("invalid_session_obj");
    if (ws.id && String(ws.id) !== String(sessionId)) return bail("session_id_mismatch");

    const tx = ws.transaction_payload || window.transaction_payload;
    if (!tx || typeof tx !== "object" || Array.isArray(tx)) return bail("missing_tx_payload");

    if (window.receipt && typeof window.receipt.setTransaction === "function") {
      window.receipt.setTransaction(tx);
    }

    const pu0 = ws?.basket?.purchase_units?.[0];
    if (pu0?.amount && window.receipt && typeof window.receipt.setTotals === "function") {
      window.receipt.setTotals({
        items: pu0.amount?.breakdown?.item_total?.value,
        shipping: pu0.amount?.breakdown?.shipping?.value,
        total: pu0.amount?.value
      });
    }

    if (typeof window.remove_loading === "function") window.remove_loading();
    return { ok: true, sessionId };
  } catch (err) {
    if (typeof window.remove_loading === "function") window.remove_loading();
    window.location.assign("/");
    return { ok: false, error: String(err?.message || err) };
  }
};
