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
  const name = tx?.payer?.name ? [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ") : "";
  const email = tx?.payer?.email_address || "";
  const phone = tx?.payer?.phone?.phone_number?.national_number || "";

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

  if (ps.paypal) {
    set("pp_email", ps.paypal.email_address || "—");
    set("pp_account_id", ps.paypal.account_id || "—");
    set("pp_account_status", ps.paypal.account_status || "—");
    showById("payment_paypal", true);
    let gp_card_el = document.getElementById("payment_googlepay");
    if (gp_card_el) gp_card_el.classList.add("hide");
    has_payment = true;
  } else {
    showById("payment_paypal", false);
  }

  if (ps.google_pay) {
    let card_el = ensureGooglePayCard();
    if (card_el) card_el.classList.remove("hide");

    let gp = ps.google_pay;
    let gc = gp.card || {};
    let brand = gc.brand || "";
    let last = gc.last_digits || "";
    let display = "";
    if (brand && last) {
      display = brand + " •••• " + last;
    } else if (brand) {
      display = brand;
    } else if (last) {
      display = "•••• " + last;
    } else {
      display = "—";
    }

    set("gp_card", display);
    set("gp_type", gc.type || "—");
    set("gp_name", gp.name || gc.name || "—");

    has_payment = true;
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

  let pu0 = getWebsiteSessionPU0();

  if (!pu0 || !Array.isArray(pu0.items) || pu0.items.length === 0) {
    const tx = window.receipt_last_tx || window.transaction_payload || null;
    const xpu0 = Array.isArray(tx && tx.purchase_units) ? tx.purchase_units[0] : null;
    if (xpu0 && Array.isArray(xpu0.items) && xpu0.items.length > 0) {
      pu0 = xpu0;
    }
  }

  const it = pu0 && Array.isArray(pu0.items) ? pu0.items[0] : null;
  if (!pu0 || !it) return;

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

function fillTotalsFromSession() {
  let items = 0, ship = 0, total = 0;

  const pu0 = getWebsiteSessionPU0();
  if (pu0 && pu0.amount) {
    items = parseFloat(pu0?.amount?.breakdown?.item_total?.value || "0") || 0;
    ship  = parseFloat(pu0?.amount?.breakdown?.shipping?.value   || "0") || 0;
    total = parseFloat(pu0?.amount?.value || (items + ship)) || (items + ship);
  } else {
    const tx = window.receipt_last_tx || window.transaction_payload || null;
    const xpu0 = Array.isArray(tx && tx.purchase_units) ? tx.purchase_units[0] : null;
    if (xpu0 && xpu0.amount) {
      items = parseFloat(xpu0?.amount?.breakdown?.item_total?.value || "0") || 0;
      ship  = parseFloat(xpu0?.amount?.breakdown?.shipping?.value   || "0") || 0;
      total = parseFloat(xpu0?.amount?.value || (items + ship)) || (items + ship);
    }
  }

  set("item_total_value", fmtMoney(items));
  set("shipping_total_value", fmtMoney(ship));
  set("order_total_value", fmtMoney(total));
}

function fillAddresses(tx) {
  let gp = tx && tx.payment_source && tx.payment_source.google_pay ? tx.payment_source.google_pay : null;
  let gp_card = gp && gp.card ? gp.card : null;

  let billing_name = "";
  if (tx && tx.payer && tx.payer.name) {
    billing_name = [tx.payer.name.given_name, tx.payer.name.surname].filter(Boolean).join(" ");
  } else if (gp && typeof gp.name === "string") {
    billing_name = gp.name;
  } else if (gp_card && typeof gp_card.name === "string") {
    billing_name = gp_card.name;
  }

  let billing_addr = null;
  if (tx && tx.payer && tx.payer.address) {
    billing_addr = tx.payer.address;
  } else if (gp_card && gp_card.billing_address) {
    billing_addr = gp_card.billing_address;
  }

  set("billing_name", billing_name || "—");
  set("billing_line1", billing_addr && billing_addr.address_line_1 ? billing_addr.address_line_1 : "—");
  set("billing_city_state_postal", joinCityStatePostal(billing_addr) || "—");
  set("billing_country", billing_addr && billing_addr.country_code ? billing_addr.country_code : "—");

  let has_billing = hasAny([
    billing_name,
    billing_addr && billing_addr.address_line_1,
    joinCityStatePostal(billing_addr),
    billing_addr && billing_addr.country_code
  ]);
  showById("section_billing", has_billing);

  let pu0 = Array.isArray(tx && tx.purchase_units) ? tx.purchase_units[0] : null;
  let ship = pu0 && pu0.shipping ? pu0.shipping : null;
  let ship_name = ship && ship.name && ship.name.full_name ? ship.name.full_name : "";
  let ship_addr = ship && ship.address ? ship.address : null;

  if (!ship_addr) {
    try {
      const raw = localStorage.getItem("website_session");
      const ws = raw ? JSON.parse(raw) : null;
      const s = ws && ws.shipping_information ? ws.shipping_information : null;
      if (s) {
        ship_name = s.full_name || ship_name;
        ship_addr = {
          address_line_1: s.address_line_1 || "",
          address_line_2: s.address_line_2 || "",
          admin_area_2: s.city || "",
          admin_area_1: s.state_province || "",
          postal_code: s.postal_code || "",
          country_code: s.country || "US"
        };
      }
    } catch (_) {}
  }

  set("shipping_name", ship_name || "—");
  set("shipping_line1", ship_addr && ship_addr.address_line_1 ? ship_addr.address_line_1 : "—");
  set("shipping_city_state_postal", joinCityStatePostal(ship_addr) || "—");
  set("shipping_country", ship_addr && ship_addr.country_code ? ship_addr.country_code : "—");

  let method = "—";
  if (ship && Array.isArray(ship.options)) {
    let chosen = ship.options.find(function (o) { return o && o.selected; }) || ship.options[0];
    if (chosen) method = chosen.label || chosen.id || "—";
  } else {
    try {
      const raw = localStorage.getItem("website_session");
      const ws = raw ? JSON.parse(raw) : null;
      const sm = ws && ws.shipping_methods ? ws.shipping_methods : null;
      if (sm && Array.isArray(sm.options)) {
        const sel = sm.selected || "";
        const found = sm.options.find(function (o) { return o && String(o.id) === String(sel); });
        if (found) method = found.label || found.id || method;
      }
    } catch (_) {}
  }
  set("shipping_method", method);

  let has_shipping = hasAny([
    ship_name,
    ship_addr && ship_addr.address_line_1,
    joinCityStatePostal(ship_addr),
    ship_addr && ship_addr.country_code,
    method && method !== "—"
  ]);
  showById("section_shipping", has_shipping);

  let addr_grid = document.querySelector("#section_address_grid .info-grid");
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
    fillTotalsFromSession();
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
