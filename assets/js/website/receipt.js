"use strict";

/* ========= Helpers ========= */
function $(sel) { return document.querySelector(sel); }
function set(id, text) { const el = document.getElementById(id); if (el) el.textContent = text == null ? "" : String(text); }
function showById(id, on = true) { const el = document.getElementById(id); if (!el) return; el.classList.toggle("hide", !on); }
function fmtMoney(v) { if (v == null) return "$0.00"; const n = typeof v === "string" ? parseFloat(v) : +v; return "$" + (isNaN(n) ? 0 : n).toFixed(2); }

function joinCityStatePostal(a) {
  if (!a) return "";
  const city = a.admin_area_2 || "";
  const state = a.admin_area_1 || "";
  const zip = a.postal_code || "";
  return [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}
function getWebsiteSessionPU0() {
  try {
    const raw = localStorage.getItem("website_session");
    if (!raw) return null;
    const ws = JSON.parse(raw);
    const pus = ws && ws.basket && Array.isArray(ws.basket.purchase_units) ? ws.basket.purchase_units : [];
    return pus && pus[0] ? pus[0] : null;
  } catch (e) {
    return null;
  }
}

/* ========= Items from website_session ========= */
function renderItemsFromSession() {
  const body = document.getElementById("items_tbody");
  if (!body) return;
  while (body.firstChild) body.removeChild(body.firstChild);

  const pu0 = getWebsiteSessionPU0();
  const it = pu0 && Array.isArray(pu0.items) ? pu0.items[0] : null;

  if (!pu0 || !it) {
    // nothing to render
    return;
  }

  const name = it.name || "Item";
  const qty = Math.max(1, parseInt(it.quantity || "1", 10) || 1);
  const unitVal = (it.unit_amount && it.unit_amount.value) ? parseFloat(it.unit_amount.value) : 0;
  const subtotal = unitVal * qty;

  const row = document.createElement("div");
  row.className = "items-row";
  row.setAttribute("role", "row");

  const c1 = document.createElement("div"); c1.textContent = name;
  const c2 = document.createElement("div"); c2.className = "num"; c2.textContent = String(qty);
  const c3 = document.createElement("div"); c3.className = "num"; c3.textContent = fmtMoney(unitVal);
  const c4 = document.createElement("div"); c4.className = "num"; c4.textContent = fmtMoney(subtotal);

  row.appendChild(c1); row.appendChild(c2); row.appendChild(c3); row.appendChild(c4);
  body.appendChild(row);
}

/* ========= Blocks ========= */
function fillAddresses(tx) {
  const billingName = tx?.payer?.name ? [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ") : "";
  const billingAddr = tx?.payer?.address || null;

  set("billing_name", billingName || "—");
  set("billing_line1", billingAddr?.address_line_1 || "—");
  set("billing_city_state_postal", joinCityStatePostal(billingAddr) || "—");
  set("billing_country", billingAddr?.country_code || "—");

  const pu0 = Array.isArray(tx?.purchase_units) ? tx.purchase_units[0] : null;
  const ship = pu0?.shipping || null;
  const shipName = ship?.name?.full_name || "";
  const shipAddr = ship?.address || null;

  set("shipping_name", shipName || "—");
  set("shipping_line1", shipAddr?.address_line_1 || "—");
  set("shipping_city_state_postal", joinCityStatePostal(shipAddr) || "—");
  set("shipping_country", shipAddr?.country_code || "—");

  let method = "—";
  if (Array.isArray(ship?.options)) {
    const chosen = ship.options.find(o => o?.selected) || ship.options[0];
    if (chosen) method = chosen.label || chosen.id || "—";
  }
  set("shipping_method", method);
}

function fillBuyer(tx) {
  const name = tx?.payer?.name ? [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ") : "";
  const email = tx?.payer?.email_address || "";
  const phone = tx?.payer?.phone?.phone_number?.national_number || "";
  set("buyer_name", name || "—");
  set("buyer_email", email || "—");
  set("buyer_phone", phone || "—");
}

function fillPayment(tx) {
  const ps = tx?.payment_source || {};
  if (ps.paypal) {
    set("pp_email", ps.paypal.email_address || "—");
    set("pp_account_id", ps.paypal.account_id || "—");
    set("pp_account_status", ps.paypal.account_status || "—");
    showById("payment_paypal", true);
  } else {
    showById("payment_paypal", false);
  }
}

function fillOrderMeta(tx) {
  set("order_id_value", tx?.id || "—");

  // Try capture create time, else now
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

function fillTotalsFromSession() {
  const pu0 = getWebsiteSessionPU0();
  if (!pu0) return;
  const items = parseFloat(pu0?.amount?.breakdown?.item_total?.value || "0") || 0;
  const ship  = parseFloat(pu0?.amount?.breakdown?.shipping?.value   || "0") || 0;
  const total = parseFloat(pu0?.amount?.value || (items + ship)) || (items + ship);
  set("item_total_value", fmtMoney(items));
  set("shipping_total_value", fmtMoney(ship));
  set("order_total_value", fmtMoney(total));
}

/* ========= Public API ========= */
window.receipt = {
  setTransaction: function (tx) {
    fillOrderMeta(tx);
    fillAddresses(tx);
    fillBuyer(tx);
    fillPayment(tx);
    renderItemsFromSession();  // items always from website_session
    fillTotalsFromSession();   // totals from website_session
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
