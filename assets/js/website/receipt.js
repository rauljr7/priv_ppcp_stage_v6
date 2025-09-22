(function () {
  function pageReady() {
    return !!document.getElementById("receipt_page");
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = (val == null || val === "") ? "—" : String(val);
  }

  function fmtMoney(v) {
    var n = parseFloat(v);
    if (isNaN(n)) n = 0;
    return "$" + n.toFixed(2);
  }

  function byPath(obj, path, fallback) {
    try {
      var parts = path.split(".");
      var cur = obj;
      for (var i = 0; i < parts.length; i++) {
        if (cur == null) return fallback;
        cur = cur[parts[i]];
      }
      return (typeof cur === "undefined" ? fallback : cur);
    } catch (e) {
      return fallback;
    }
  }

  function clearChildren(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function badgeByStatus(status) {
    var s = String(status || "").toUpperCase();
    if (s === "COMPLETED" || s === "APPROVED" || s === "CAPTURED") return { text: "Completed", cls: "status-completed" };
    if (s === "PAYER_ACTION_REQUIRED" || s === "PENDING") return { text: "Pending", cls: "status-pending" };
    if (s === "VOIDED" || s === "CANCELED" || s === "DECLINED") return { text: "Cancelled", cls: "status-cancelled" };
    return { text: status || "Unknown", cls: "status-pending" };
  }

  function parseDate(iso) {
    try {
      if (!iso) return new Date();
      return new Date(iso);
    } catch (e) {
      return new Date();
    }
  }

  function formatCityStatePostal(a2, a1, pc) {
    var city = String(a2 || "").trim();
    var state = String(a1 || "").trim();
    var zip = String(pc || "").trim();
    var parts = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    var left = parts.join(", ");
    return left + (zip ? (left ? " " : "") + zip : "");
  }

  function selectedShippingOption(pu) {
    var opts = byPath(pu, "shipping.options", []);
    if (Array.isArray(opts)) {
      for (var i = 0; i < opts.length; i++) {
        if (opts[i] && opts[i].selected === true) return opts[i];
      }
      if (opts.length > 0) return opts[0];
    }
    return null;
  }

  function itemTotalFromPU(pu) {
    var val = byPath(pu, "amount.breakdown.item_total.value");
    if (typeof val === "string" && val.length > 0) return parseFloat(val) || 0;

    var items = pu && Array.isArray(pu.items) ? pu.items : [];
    var sum = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var unit = parseFloat(byPath(it, "unit_amount.value", "0")) || 0;
      var qty = parseInt(String(it.quantity || "1"), 10);
      if (isNaN(qty) || qty < 1) qty = 1;
      sum += unit * qty;
    }
    return sum;
  }

  function shippingAmountFromPU(pu) {
    var val = byPath(pu, "amount.breakdown.shipping.value");
    if (typeof val === "string" && val.length > 0) return parseFloat(val) || 0;

    var sel = selectedShippingOption(pu);
    if (sel) {
      var sv = parseFloat(byPath(sel, "amount.value", "0")) || 0;
      return sv;
    }
    return 0;
  }

  function renderItems(pu) {
    var tbody = document.getElementById("items_tbody");
    if (!tbody) return;
    clearChildren(tbody);

    var items = pu && Array.isArray(pu.items) ? pu.items : [];
    if (items.length === 0) {
      var row = document.createElement("div");
      row.className = "items-row";
      row.setAttribute("role", "row");
      row.innerHTML = '<div role="cell">No items</div><div role="cell" class="num">—</div><div role="cell" class="num">—</div><div role="cell" class="num">—</div>';
      tbody.appendChild(row);
      return;
    }

    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var name = it.name || "Item";
      var qty = parseInt(String(it.quantity || "1"), 10);
      if (isNaN(qty) || qty < 1) qty = 1;
      var unit = parseFloat(byPath(it, "unit_amount.value", "0")) || 0;
      var subtotal = unit * qty;

      var rowEl = document.createElement("div");
      rowEl.className = "items-row";
      rowEl.setAttribute("role", "row");
      rowEl.innerHTML =
        '<div role="cell">' + name + (it.description ? ' <small class="muted">• ' + it.description + '</small>' : '') + '</div>' +
        '<div role="cell" class="num">' + qty + '</div>' +
        '<div role="cell" class="num">' + fmtMoney(unit) + '</div>' +
        '<div role="cell" class="num">' + fmtMoney(subtotal) + '</div>';
      tbody.appendChild(rowEl);
    }
  }

  function renderAddresses(tx) {
    // Billing from payer
    var payer = tx.payer || {};
    var pname = [byPath(payer, "name.given_name", ""), byPath(payer, "name.surname", "")].filter(Boolean).join(" ");
    var pb = payer.address || {};
    setText("billing_name", pname || "—");
    setText("billing_line1", pb.address_line_1 || "—");
    setText("billing_city_state_postal", formatCityStatePostal(pb.admin_area_2, pb.admin_area_1, pb.postal_code));
    setText("billing_country", pb.country_code || "—");

    // Shipping from PU
    var pu0 = Array.isArray(tx.purchase_units) ? tx.purchase_units[0] : null;
    var ship = pu0 && pu0.shipping ? pu0.shipping : {};
    var sname = byPath(ship, "name.full_name", "");
    var sa = ship.address || {};
    setText("shipping_name", sname || "—");
    setText("shipping_line1", sa.address_line_1 || "—");
    setText("shipping_city_state_postal", formatCityStatePostal(sa.admin_area_2, sa.admin_area_1, sa.postal_code));
    setText("shipping_country", sa.country_code || "—");

    // Method
    var sel = selectedShippingOption(pu0 || {});
    setText("shipping_method", sel ? (sel.label || sel.id || "—") : "—");

    // Auto-hide cleanly if either address truly missing
    if (!sa || !sa.address_line_1) receipt_hide("section_shipping");
    if (!pb || !pb.address_line_1) receipt_hide("section_billing");
  }

  function renderBuyer(tx) {
    var payer = tx.payer || {};
    var name = [byPath(payer, "name.given_name", ""), byPath(payer, "name.surname", "")].filter(Boolean).join(" ");
    var email = payer.email_address || "";
    var phone = byPath(payer, "phone.phone_number.national_number", "");

    setText("buyer_name", name || "—");
    setText("buyer_email", email || "—");
    setText("buyer_phone", phone || "—");
  }

  function renderPayment(tx) {
    var src = tx.payment_source || {};
    var hasAny = false;

    // PayPal
    if (src.paypal) {
      hasAny = true;
      var p = src.paypal;
      setText("pp_email", p.email_address || "—");
      setText("pp_account_id", p.account_id || "—");
      setText("pp_account_status", p.account_status || "—");
      receipt_show("payment_paypal");
    } else {
      receipt_hide("payment_paypal");
    }

    // Other methods shown only if you want to programmatically show them
    // receipt_show("payment_card"); setText("card_brand", "..."); etc.

    if (!hasAny) {
      receipt_hide("section_payment");
    }
  }

  function renderMeta(tx) {
    var orderId = tx.id || "—";
    setText("order_id_value", orderId);

    // Use capture time if available, else now
    var pu0 = Array.isArray(tx.purchase_units) ? tx.purchase_units[0] : null;
    var cap = byPath(pu0, "payments.captures.0", null);
    var dt = parseDate(byPath(cap, "create_time", null));
    try {
      setText("order_date_value", dt.toLocaleString());
    } catch (e) {
      setText("order_date_value", String(dt));
    }

    var badge = badgeByStatus(tx.status);
    var badgeEl = document.getElementById("receipt_status_badge");
    if (badgeEl) {
      badgeEl.textContent = badge.text;
      badgeEl.classList.remove("status-completed", "status-pending", "status-cancelled");
      badgeEl.classList.add(badge.cls);
    }
  }

  function renderTotals(pu) {
    var items = itemTotalFromPU(pu);
    var ship = shippingAmountFromPU(pu);
    var total = items + ship;
    setText("item_total_value", fmtMoney(items));
    setText("shipping_total_value", fmtMoney(ship));
    setText("order_total_value", fmtMoney(total));
  }

  function hydrateFromTransaction(tx) {
    if (!tx) return;

    renderMeta(tx);

    var pu0 = Array.isArray(tx.purchase_units) ? tx.purchase_units[0] : null;
    if (pu0) {
      renderItems(pu0);
      renderTotals(pu0);
    }

    renderAddresses(tx);
    renderBuyer(tx);
    renderPayment(tx);
  }

  /* ---------- Public helpers (tiny API) ---------- */
  function receipt_hide(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add("hide");
  }
  function receipt_show(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("hide");
  }

  function setOrderMeta(meta) {
    if (!meta) return;
    if (meta.id) setText("order_id_value", meta.id);
    if (meta.date) setText("order_date_value", meta.date);
    if (meta.status) {
      var b = badgeByStatus(meta.status);
      var badgeEl = document.getElementById("receipt_status_badge");
      if (badgeEl) {
        badgeEl.textContent = b.text;
        badgeEl.classList.remove("status-completed", "status-pending", "status-cancelled");
        badgeEl.classList.add(b.cls);
      }
    }
  }

  function setAddresses(addresses) {
    if (!addresses) return;
    if (addresses.billing) {
      var b = addresses.billing;
      setText("billing_name", b.name || "—");
      setText("billing_line1", b.line1 || "—");
      setText("billing_city_state_postal", formatCityStatePostal(b.city, b.state, b.postal));
      setText("billing_country", b.country || "—");
      if (!b.line1) receipt_hide("section_billing"); else receipt_show("section_billing");
    }
    if (addresses.shipping) {
      var s = addresses.shipping;
      setText("shipping_name", s.name || "—");
      setText("shipping_line1", s.line1 || "—");
      setText("shipping_city_state_postal", formatCityStatePostal(s.city, s.state, s.postal));
      setText("shipping_country", s.country || "—");
      setText("shipping_method", s.method || "—");
      if (!s.line1) receipt_hide("section_shipping"); else receipt_show("section_shipping");
    }
  }

  function setBuyer(buyer) {
    if (!buyer) return;
    setText("buyer_name", buyer.name || "—");
    setText("buyer_email", buyer.email || "—");
    setText("buyer_phone", buyer.phone || "—");
  }

  function setPayment(payment) {
    // For PayPal
    if (payment && payment.type === "paypal") {
      setText("pp_email", payment.email || "—");
      setText("pp_account_id", payment.account_id || "—");
      setText("pp_account_status", payment.account_status || "—");
      receipt_show("payment_paypal");
      receipt_show("section_payment");
      return;
    }
    // For Card (example)
    if (payment && payment.type === "card") {
      receipt_hide("payment_paypal");
      // setText("card_brand", payment.brand || "—");
      // setText("card_last4", payment.last4 || "—");
      // setText("card_expiry", payment.expiry || "—");
      // receipt_show("payment_card");
      receipt_show("section_payment");
      return;
    }
    // Unknown => hide section
    receipt_hide("section_payment");
  }

  function setItems(itemsArray) {
    var pu = { items: Array.isArray(itemsArray) ? itemsArray : [] };
    renderItems(pu);
    // Totals not recomputed here — use setTotals if you want to override.
  }

  function setTotals(totals) {
    if (!totals) return;
    if (typeof totals.items === "number") setText("item_total_value", fmtMoney(totals.items));
    if (typeof totals.shipping === "number") setText("shipping_total_value", fmtMoney(totals.shipping));
    if (typeof totals.total === "number") setText("order_total_value", fmtMoney(totals.total));
  }

  function setTransaction(tx) { hydrateFromTransaction(tx); }

  // Wire actions
  function handleClick(e) {
    var t = e.target;
    if (t && t.matches("#receipt_print_btn")) {
      window.print();
      return;
    }
  }

  function init() {
    if (!pageReady()) return;

    // Auto-hydrate if you placed a payload in window.transaction_payload
    var payload = window.transaction_payload;
    if (payload && typeof payload === "object") {
      hydrateFromTransaction(payload);
    } else {
      // Minimal placeholder (you can remove this block)
      setOrderMeta({ id: "—", status: "PENDING", date: new Date().toLocaleString() });
    }

    document.addEventListener("click", handleClick);
  }

  // Expose a tiny API
  window.receipt = {
    hide: receipt_hide,
    show: receipt_show,
    setOrderMeta,
    setAddresses,
    setBuyer,
    setPayment,
    setItems,
    setTotals,
    setTransaction
  };

  document.addEventListener("DOMContentLoaded", init);
})();
