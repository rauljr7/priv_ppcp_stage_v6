"use strict";

/* ========= Helpers ========= */
function $(sel) { return document.querySelector(sel); }
function set(id, text) { const el = document.getElementById(id); if (el) el.textContent = text == null ? "" : String(text); }
function show(id, on) { const el = document.getElementById(id); if (el) el.classList.toggle("is-hidden", on === false); }
function fmtMoney(v) {
  if (v == null) return "$0.00";
  const n = typeof v === "string" ? parseFloat(v) : +v;
  return "$" + (isNaN(n) ? 0 : n).toFixed(2);
}
function joinAddr(a) {
  if (!a) return "";
  const parts = [
    a.address_line_1, a.address_line_2,
    a.admin_area_2, a.admin_area_1,
    a.postal_code, a.country_code
  ].map(s => (s || "").toString().trim()).filter(Boolean);
  return parts.join(", ");
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

/* ========= Layout helpers ========= */
function ensureTwoCol(id) {
  const row = document.getElementById(id);
  if (row) row.classList.add("two-col");
}

/* ========= Items (from localStorage) ========= */
function renderItemsFromSession() {
  const tbody = document.getElementById("items_body");
  const emptyRow = document.getElementById("items_empty_row");
  if (!tbody) return;

  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

  const pu0 = getWebsiteSessionPU0();
  if (!pu0) {
    if (emptyRow) emptyRow.classList.remove("is-hidden");
    return;
  }

  const desc = pu0.description || "";
  const it = (Array.isArray(pu0.items) && pu0.items[0]) || null;

  if (!it) {
    if (emptyRow) emptyRow.classList.remove("is-hidden");
    return;
  }
  if (emptyRow) emptyRow.classList.add("is-hidden");

  const tr = document.createElement("tr");

  const tdProd = document.createElement("td");
  tdProd.textContent = it.name || "Item";

  const tdOpts = document.createElement("td");
  tdOpts.textContent = it.description || desc || "";

  const tdUnit = document.createElement("td");
  const unitVal = it.unit_amount && it.unit_amount.value ? it.unit_amount.value : "0.00";
  tdUnit.textContent = fmtMoney(unitVal);

  const tdQty = document.createElement("td");
  const qty = parseInt(it.quantity || "1", 10);
  tdQty.textContent = isNaN(qty) ? "1" : String(qty);

  const tdSub = document.createElement("td");
  const sub = (parseFloat(unitVal || 0) * (isNaN(qty) ? 1 : qty)).toFixed(2);
  tdSub.textContent = fmtMoney(sub);

  tr.appendChild(tdProd);
  tr.appendChild(tdOpts);
  tr.appendChild(tdUnit);
  tr.appendChild(tdQty);
  tr.appendChild(tdSub);
  tbody.appendChild(tr);
}

/* ========= Blocks ========= */
function fillBuyer(tx) {
  const payer = tx && tx.payer;
  const name = payer && payer.name ? [payer.name.given_name, payer.name.surname].filter(Boolean).join(" ") : "";
  const email = (payer && payer.email_address) || "";
  const phone = payer && payer.phone && payer.phone.phone_number && payer.phone.phone_number.national_number || "";
  const id = (payer && payer.payer_id) || "";

  set("buyer_name", name);
  set("buyer_email", email);
  set("buyer_phone", phone);
  set("buyer_id", id);

  const hasAny = name || email || phone || id;
  show("buyer_card", !!hasAny);
}

function fillPayment(tx) {
  const ps = tx && tx.payment_source || {};
  let method = "";
  let primary = "";
  let secondary = "";

  if (ps.paypal) {
    method = "PayPal";
    primary = ps.paypal.email_address || "";
    const acct = ps.paypal.account_id ? ("Account: " + ps.paypal.account_id) : "";
    secondary = acct;
  }
  // else if (ps.venmo) { method = "Venmo"; primary = "@" + (ps.venmo.username || ""); }
  // else if (ps.apple_pay) { method = "Apple Pay"; primary = "•••• " + (ps.apple_pay.last4 || ""); }
  // else if (ps.google_pay) { method = "Google Pay"; primary = "•••• " + (ps.google_pay.last4 || ""); }
  // else if (ps.card) { method = (ps.card.brand || "Card"); primary = "•••• " + (ps.card.last4 || ""); }

  set("pay_type", method || "Payment");
  set("pay_detail_primary", primary);
  set("pay_detail_secondary", secondary);

  const hasAny = method || primary || secondary;
  show("payment_card", !!hasAny);
}

function fillAddresses(tx) {
  const billing = tx && tx.payer && tx.payer.address || null;
  const billingName = tx && tx.payer && tx.payer.name ? [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ") : "";

  const pu0 = (tx && Array.isArray(tx.purchase_units) && tx.purchase_units[0]) || {};
  const ship = pu0 && pu0.shipping || null;
  const shipName = ship && ship.name && ship.name.full_name || "";
  const shipAddr = ship && ship.address || null;

  set("billing_name", billingName);
  set("billing_address", joinAddr(billing));
  const hasBill = billingName || joinAddr(billing);
  show("billing_card", !!hasBill);

  set("shipping_name", shipName);
  set("shipping_address", joinAddr(shipAddr));

  let method = "";
  let price = "";
  const opts = ship && Array.isArray(ship.options) ? ship.options : [];
  const chosen = opts.find(o => o && o.selected) || opts[0];
  if (chosen) {
    method = chosen.label || chosen.id || "";
    price = chosen.amount && chosen.amount.value ? chosen.amount.value : "";
  }
  set("shipping_method_chip", method ? method : "Shipping");
  set("shipping_cost_chip", price ? fmtMoney(price) : "");

  const hasShip = shipName || joinAddr(shipAddr) || method || price;
  show("shipping_card", !!hasShip);
}

function fillOrderMeta(tx) {
  const id = (tx && tx.id) || "";
  const status = (tx && tx.status) || "";
  set("receipt_order_id", id);
  set("receipt_status", status);

  const pu0 = tx && tx.purchase_units && tx.purchase_units[0] || {};
  const cap = pu0.payments && pu0.payments.captures && pu0.payments.captures[0];
  const captureTotal = cap && cap.amount && parseFloat(cap.amount.value) || 0;

  const opts = (pu0.shipping && pu0.shipping.options) || [];
  const selected = opts.find(o => o && o.selected) || opts[0];
  const ship = selected && selected.amount ? parseFloat(selected.amount.value) : 0;

  const items = Math.max(0, +(captureTotal - ship).toFixed(2));

  if (!$("#total_items_amount")?.textContent) set("total_items_amount", fmtMoney(items));
  if (!$("#total_shipping_amount")?.textContent) set("total_shipping_amount", fmtMoney(ship));
  if (!$("#total_order_amount")?.textContent) set("total_order_amount", fmtMoney(captureTotal));
}

/* ========= Public API ========= */
window.receipt = {
  setTransaction: function (tx) {
    ensureTwoCol("buyer_payment_row");
    fillBuyer(tx);
    fillPayment(tx);
    fillAddresses(tx);
    fillOrderMeta(tx);
    renderItemsFromSession(); // items from website_session
  },
  setTotals: function ({ items, shipping, total } = {}) {
    if (typeof items !== "undefined") set("total_items_amount", fmtMoney(items));
    if (typeof shipping !== "undefined") set("total_shipping_amount", fmtMoney(shipping));
    if (typeof total !== "undefined") set("total_order_amount", fmtMoney(total));
  },
  hideSection: function (id) { show(id, false); },
  refreshItemsFromSession: function () { renderItemsFromSession(); }
};

/* ========= DOM Ready ========= */
document.addEventListener("DOMContentLoaded", function () {
  ensureTwoCol("addresses_row");
  ensureTwoCol("buyer_payment_row");
  renderItemsFromSession();
});
