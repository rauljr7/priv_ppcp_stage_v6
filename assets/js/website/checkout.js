let checkout_current_session = null;

function checkout_page_ready() {
  let page_el = document.getElementById("checkout_page");
  if (!page_el) {
    return false;
  }
  return true;
}

function count_cart_items() {
  let count = 0;
  ensure_website_session();
  if (typeof get_session_basket_purchase_units_items === "function") {
    let items_array = get_session_basket_purchase_units_items();
    if (Array.isArray(items_array) === true) {
      count = items_array.length;
    }
  } else {
    if (window.website_session && window.website_session.basket && Array.isArray(window.website_session.basket.purchase_units) === true) {
      for (let i = 0; i < window.website_session.basket.purchase_units.length; i = i + 1) {
        let pu = window.website_session.basket.purchase_units[i];
        if (pu && Array.isArray(pu.items) === true) {
          count = count + pu.items.length;
        }
      }
    }
  }
  return count;
}

function show_empty_cart_message_on_checkout() {
  let container = document.getElementById("page_container");
  if (!container) {
    return;
  }
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  let wrapper = document.createElement("div");
  wrapper.setAttribute("id", "empty_cart_wrapper");
  wrapper.setAttribute("style", "min-height:calc(100dvh - 56px);display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;");
  let msg = document.createElement("p");
  msg.setAttribute("style", "font-size:1.25rem;margin:0;");
  let link = document.createElement("a");
  link.href = "product.html";
  link.textContent = "HERE";
  link.setAttribute("style", "color:#dc2626;font-weight:700;text-decoration:underline;margin-left:6px;");
  let before = document.createTextNode("No items in cart! Add products by clicking");
  msg.appendChild(before);
  msg.appendChild(document.createTextNode(" "));
  msg.appendChild(link);
  wrapper.appendChild(msg);
  container.appendChild(wrapper);
}

function ensure_shipping_options_loaded() {
  return new Promise(function (resolve) {
    if (typeof get_website_shipping_options === "function") {
      let existing = get_website_shipping_options();
      if (Array.isArray(existing) === true && existing.length > 0) {
        resolve(existing);
        return;
      }
    } else {
      if (Array.isArray(window.website_shipping_options) === true && window.website_shipping_options.length > 0) {
        resolve(window.website_shipping_options);
        return;
      }
    }

    if (typeof set_website_shipping_options === "function") {
      set_website_shipping_options().then(function () {
        if (typeof get_website_shipping_options === "function") {
          let after = get_website_shipping_options();
          if (Array.isArray(after) === true) {
            resolve(after);
            return;
          }
        } else {
          if (Array.isArray(window.website_shipping_options) === true) {
            resolve(window.website_shipping_options);
            return;
          }
        }
        resolve([]);
      });
    } else {
      resolve([]);
    }
  });
}

function set_input_value_by_id(id_str, value_str) {
  let el = document.getElementById(id_str);
  if (!el) {
    return;
  }
  el.value = value_str;
}

function hydrate_contact_from_session(sess) {
  if (!sess || !sess.contact_information) {
    return;
  }
  if (typeof sess.contact_information.email === "string") {
    set_input_value_by_id("contact_email_input", sess.contact_information.email);
  }
}

function hydrate_billing_from_session(sess) {
  if (!sess || !sess.billing_information) {
    return;
  }
  let b = sess.billing_information;
  if (typeof b.full_name === "string") {
    set_input_value_by_id("bill_name_input", b.full_name);
  }
  if (typeof b.phone === "string") {
    set_input_value_by_id("bill_phone_input", b.phone);
  }
  if (typeof b.address_line_1 === "string") {
    set_input_value_by_id("bill_address_input", b.address_line_1);
  }
  if (typeof b.city === "string") {
    set_input_value_by_id("bill_city_input", b.city);
  }
  if (typeof b.state_province === "string") {
    set_input_value_by_id("bill_state_input", b.state_province);
  }
  if (typeof b.postal_code === "string") {
    set_input_value_by_id("bill_postal_input", b.postal_code);
  }
  if (typeof b.country === "string") {
    set_input_value_by_id("bill_country_input", b.country);
  }
}

function hydrate_shipping_info_from_session(sess) {
  if (!sess || !sess.shipping_information) {
    return;
  }
  let s = sess.shipping_information;
  if (typeof s.full_name === "string") {
    set_input_value_by_id("ship_name_input", s.full_name);
  }
  if (typeof s.phone === "string") {
    set_input_value_by_id("ship_phone_input", s.phone);
  }
  if (typeof s.address_line_1 === "string") {
    set_input_value_by_id("ship_address_input", s.address_line_1);
  }
  if (typeof s.city === "string") {
    set_input_value_by_id("ship_city_input", s.city);
  }
  if (typeof s.state_province === "string") {
    set_input_value_by_id("ship_state_input", s.state_province);
  }
  if (typeof s.postal_code === "string") {
    set_input_value_by_id("ship_postal_input", s.postal_code);
  }
  if (typeof s.country === "string") {
    set_input_value_by_id("ship_country_input", s.country);
  }
}

function clear_children(node) {
  if (!node) {
    return;
  }
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function build_option(value_str, label_str, id_str) {
  let opt = document.createElement("option");
  if (id_str) {
    opt.id = id_str;
  }
  opt.value = value_str;
  opt.textContent = label_str;
  return opt;
}

function populate_shipping_select_from_options(options_array, selected_id) {
  let select_el = document.getElementById("ship_method_select");
  if (!select_el) {
    return;
  }
  clear_children(select_el);

  let has_selected = false;
  if (typeof selected_id === "string") {
    if (selected_id.length > 0) {
      has_selected = true;
    }
  }

  if (has_selected === false) {
    let placeholder_opt = build_option("", "Select Shipping Method", "ship_opt_placeholder");
    placeholder_opt.disabled = true;
    placeholder_opt.selected = true;
    select_el.appendChild(placeholder_opt);
  }

  if (Array.isArray(options_array) === true && options_array.length > 0) {
    for (let i = 0; i < options_array.length; i = i + 1) {
      let opt = options_array[i];

      let id_str = "";
      if (typeof opt.name === "string") {
        if (opt.name.toLowerCase().indexOf("free") > -1) {
          id_str = "free";
        } else if (opt.name.toLowerCase().indexOf("standard") > -1) {
          id_str = "standard";
        } else if (opt.name.toLowerCase().indexOf("express") > -1) {
          id_str = "express";
        }
      }
      if (id_str.length === 0 && typeof opt.id === "string") {
        id_str = opt.id;
      }

      let label_text = "";
      if (typeof opt.name === "string") {
        label_text = opt.name;
      } else {
        label_text = id_str;
      }

      let option_id_attr = "ship_opt_" + id_str;
      let option_el = build_option(id_str, label_text, option_id_attr);

      if (has_selected === true) {
        if (selected_id === id_str) {
          option_el.selected = true;
        }
      }

      select_el.appendChild(option_el);
    }
  }
}

function get_shipping_option_price_by_id(options_array, id_value) {
  let price_num = 0;
  if (Array.isArray(options_array) === true) {
    for (let i = 0; i < options_array.length; i = i + 1) {
      let opt = options_array[i];
      let id_str = "";
      if (typeof opt.name === "string") {
        if (opt.name.toLowerCase().indexOf("free") > -1) {
          id_str = "free";
        } else if (opt.name.toLowerCase().indexOf("standard") > -1) {
          id_str = "standard";
        } else if (opt.name.toLowerCase().indexOf("express") > -1) {
          id_str = "express";
        }
      }
      if (id_str.length === 0 && typeof opt.id === "string") {
        id_str = opt.id;
      }
      if (id_str === id_value) {
        if (typeof opt.price === "string") {
          let n = parseFloat(opt.price);
          if (isNaN(n) === false) {
            price_num = n;
          }
        } else if (opt.amount && typeof opt.amount.value === "string") {
          let n2 = parseFloat(opt.amount.value);
          if (isNaN(n2) === false) {
            price_num = n2;
          }
        }
      }
    }
  }
  return price_num;
}

function format_money_value(num) {
  let n = num;
  if (typeof n !== "number") {
    n = 0;
  }
  let fixed = n.toFixed(2);
  return "$" + fixed;
}

function get_subtotal_from_session(sess) {
  let subtotal = 0;
  if (!sess || !sess.basket) {
    return subtotal;
  }
  if (Array.isArray(sess.basket.purchase_units) === true && sess.basket.purchase_units.length > 0) {
    let pu = sess.basket.purchase_units[0];
    if (pu && pu.amount && pu.amount.breakdown && pu.amount.breakdown.item_total && typeof pu.amount.breakdown.item_total.value === "string") {
      let n0 = parseFloat(pu.amount.breakdown.item_total.value);
      if (isNaN(n0) === false) {
        subtotal = n0;
        return subtotal;
      }
    }
    if (pu && pu.amount && typeof pu.amount.value === "string") {
      let n = parseFloat(pu.amount.value);
      if (isNaN(n) === false) {
        subtotal = n;
      }
    } else if (pu && Array.isArray(pu.items) === true) {
      for (let i = 0; i < pu.items.length; i = i + 1) {
        let it = pu.items[i];
        if (it && it.unit_amount && typeof it.unit_amount.value === "string") {
          let unit = parseFloat(it.unit_amount.value);
          if (isNaN(unit) === false) {
            let qty = 1;
            if (typeof it.quantity === "string") {
              let qn = parseInt(it.quantity, 10);
              if (isNaN(qn) === false && qn > 0) {
                qty = qn;
              }
            }
            subtotal = subtotal + unit * qty;
          }
        }
      }
    }
  }
  return subtotal;
}

function update_summary_totals() {
  ensure_website_session();
  let sess = window.website_session;
  let subtotal_num = get_subtotal_from_session(sess);
  let shipping_id = "";
  if (sess && sess.shipping_methods && typeof sess.shipping_methods.selected === "string" && sess.shipping_methods.selected.length > 0) {
    shipping_id = sess.shipping_methods.selected;
  }
  let shipping_options = [];
  if (typeof get_website_shipping_options === "function") {
    shipping_options = get_website_shipping_options();
  } else {
    if (Array.isArray(window.website_shipping_options) === true) {
      shipping_options = window.website_shipping_options;
    }
  }
  let shipping_num = get_shipping_option_price_by_id(shipping_options, shipping_id);
  let total_num = subtotal_num + shipping_num;

  let sub_el = document.getElementById("summary_subtotal_value");
  if (sub_el) {
    sub_el.textContent = format_money_value(subtotal_num);
  }
  let ship_el = document.getElementById("summary_shipping_value");
  if (ship_el) {
    ship_el.textContent = format_money_value(shipping_num);
  }
  let tot_el = document.getElementById("summary_total_value");
  if (tot_el) {
    tot_el.textContent = format_money_value(total_num);
  }
}

function hydrate_shipping_methods_section(sess) {
  ensure_shipping_options_loaded().then(function (options_array) {
    let selected_id = "";
    if (sess && sess.shipping_methods && typeof sess.shipping_methods.selected === "string") {
      selected_id = sess.shipping_methods.selected;
    }
    populate_shipping_select_from_options(options_array, selected_id);
    if (typeof set_session_purchase_unit_amount_breakdown === "function") {
      set_session_purchase_unit_amount_breakdown(0).then(function () {
        update_summary_totals();
        run_all_section_checks();
      });
    } else {
      update_summary_totals();
      run_all_section_checks();
    }
  });
}

function hydrate_checkout_from_session() {
  ensure_website_session();
  checkout_current_session = window.website_session;
  hydrate_contact_from_session(checkout_current_session);
  hydrate_billing_from_session(checkout_current_session);
  hydrate_shipping_info_from_session(checkout_current_session);
  hydrate_shipping_methods_section(checkout_current_session);
  set_session_purchase_unit_shipping_from_top_level(0);
  run_all_section_checks();
}

function collect_contact_patch_from_dom() {
  let patch = {};
  let email_el = document.getElementById("contact_email_input");
  if (email_el) {
    patch.email = email_el.value;
  }
  return patch;
}

function collect_billing_patch_from_dom() {
  let b = {};
  let n = document.getElementById("bill_name_input");
  if (n) {
    b.full_name = n.value;
  }
  let p = document.getElementById("bill_phone_input");
  if (p) {
    b.phone = p.value;
  }
  let a1 = document.getElementById("bill_address_input");
  if (a1) {
    b.address_line_1 = a1.value;
  }
  let c = document.getElementById("bill_city_input");
  if (c) {
    b.city = c.value;
  }
  let s = document.getElementById("bill_state_input");
  if (s) {
    b.state_province = s.value;
  }
  let z = document.getElementById("bill_postal_input");
  if (z) {
    b.postal_code = z.value;
  }
  let co = document.getElementById("bill_country_input");
  if (co) {
    b.country = co.value;
  }
  return b;
}

function collect_shipping_info_patch_from_dom() {
  let s = {};
  let n = document.getElementById("ship_name_input");
  if (n) {
    s.full_name = n.value;
  }
  let p = document.getElementById("ship_phone_input");
  if (p) {
    s.phone = p.value;
  }
  let a1 = document.getElementById("ship_address_input");
  if (a1) {
    s.address_line_1 = a1.value;
  }
  let c = document.getElementById("ship_city_input");
  if (c) {
    s.city = c.value;
  }
  let st = document.getElementById("ship_state_input");
  if (st) {
    s.state_province = st.value;
  }
  let z = document.getElementById("ship_postal_input");
  if (z) {
    s.postal_code = z.value;
  }
  let co = document.getElementById("ship_country_input");
  if (co) {
    s.country = co.value;
  }
  return s;
}

function collect_shipping_methods_patch_from_dom() {
  let patch = {};
  let select_el = document.getElementById("ship_method_select");
  if (select_el) {
    let value_str = String(select_el.value || "");
    if (value_str.length > 0) {
      patch.selected = value_str;
    }
  }
  return patch;
}

function open_next_section(current_details_el) {
  if (!current_details_el) {
    return;
  }
  let all = Array.prototype.slice.call(document.querySelectorAll(".checkout-left-card details"));
  let idx = all.indexOf(current_details_el);
  if (idx === -1) {
    return;
  }
  current_details_el.open = false;
  if (idx + 1 < all.length) {
    let next = all[idx + 1];
    next.open = true;
    next.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function get_trimmed_value_by_id(id_str) {
  let el = document.getElementById(id_str);
  if (!el) {
    return "";
  }
  let v = String(el.value || "");
  return v.trim();
}

function ensure_summary_title_cache(summary_el) {
  if (!summary_el) {
    return;
  }
  let base = summary_el.getAttribute("data-base-title");
  if (!base) {
    let current = String(summary_el.textContent || "");
    let cleaned = current.replace("✅", "").trim();
    summary_el.setAttribute("data-base-title", cleaned);
  }
}

function set_summary_complete_state(summary_id, is_complete) {
  let summary_el = document.getElementById(summary_id);
  if (!summary_el) {
    return;
  }
  ensure_summary_title_cache(summary_el);
  let base = summary_el.getAttribute("data-base-title") || "";
  if (is_complete === true) {
    summary_el.textContent = base + " ✅";
    summary_el.style.background = "#dcfce7";
  } else {
    summary_el.textContent = base;
    summary_el.style.background = "";
  }
}

function contact_section_is_complete() {
  let email = get_trimmed_value_by_id("contact_email_input");
  if (email.length === 0) {
    return false;
  }
  if (email.indexOf("@") === -1) {
    return false;
  }
  return true;
}

function billing_section_is_complete() {
  let name = get_trimmed_value_by_id("bill_name_input");
  let phone = get_trimmed_value_by_id("bill_phone_input");
  let a1 = get_trimmed_value_by_id("bill_address_input");
  let city = get_trimmed_value_by_id("bill_city_input");
  let state = get_trimmed_value_by_id("bill_state_input");
  let postal = get_trimmed_value_by_id("bill_postal_input");
  let country = get_trimmed_value_by_id("bill_country_input");
  if (name.length === 0) return false;
  if (phone.length === 0) return false;
  if (a1.length === 0) return false;
  if (city.length === 0) return false;
  if (state.length === 0) return false;
  if (postal.length === 0) return false;
  if (country.length === 0) return false;
  return true;
}

function shipping_info_section_is_complete() {
  let name = get_trimmed_value_by_id("ship_name_input");
  let phone = get_trimmed_value_by_id("ship_phone_input");
  let a1 = get_trimmed_value_by_id("ship_address_input");
  let city = get_trimmed_value_by_id("ship_city_input");
  let state = get_trimmed_value_by_id("ship_state_input");
  let postal = get_trimmed_value_by_id("ship_postal_input");
  let country = get_trimmed_value_by_id("ship_country_input");
  if (name.length === 0) return false;
  if (phone.length === 0) return false;
  if (a1.length === 0) return false;
  if (city.length === 0) return false;
  if (state.length === 0) return false;
  if (postal.length === 0) return false;
  if (country.length === 0) return false;
  return true;
}

function shipping_methods_section_is_complete() {
  let select_el = document.getElementById("ship_method_select");
  if (!select_el) {
    return false;
  }
  let v = String(select_el.value || "");
  if (v.length === 0) {
    return false;
  }
  return true;
}

function run_all_section_checks() {
  let contact_ok = contact_section_is_complete();
  set_summary_complete_state("contact_summary", contact_ok);

  let billing_ok = billing_section_is_complete();
  set_summary_complete_state("billing_summary", billing_ok);

  let ship_info_ok = shipping_info_section_is_complete();
  set_summary_complete_state("shipping_info_summary", ship_info_ok);

  let ship_methods_ok = shipping_methods_section_is_complete();
  set_summary_complete_state("shipping_methods_summary", ship_methods_ok);
}

function handle_click(event) {
  let t = event.target;

  if (t && t.matches("[data-next]")) {
    let details = t.closest("details");
    if (details) {
      open_next_section(details);
    }
    run_all_section_checks();
    return;
  }

  if (t && t.matches("[data-same-as-billing]")) {
    let b = collect_billing_patch_from_dom();
    set_session_shipping_information({
      same_as_billing: true,
      full_name: b.full_name || "",
      phone: b.phone || "",
      address_line_1: b.address_line_1 || "",
      city: b.city || "",
      state_province: b.state_province || "",
      postal_code: b.postal_code || "",
      country: b.country || ""
    }).then(function () {
      hydrate_shipping_info_from_session(window.website_session);
      run_all_section_checks();
    });
    return;
  }
}

function handle_input(event) {
  let t = event.target;

  if (t && t.matches("#contact_email_input")) {
    let patch = collect_contact_patch_from_dom();
    set_session_contact_information(patch).then(function () {
      set_session_purchase_unit_shipping_from_top_level(0);
    });
    run_all_section_checks();
    return;
  }

  if (t && (t.matches("#bill_name_input") || t.matches("#bill_phone_input") || t.matches("#bill_address_input") || t.matches("#bill_city_input") || t.matches("#bill_state_input") || t.matches("#bill_postal_input") || t.matches("#bill_country_input"))) {
    let patch = collect_billing_patch_from_dom();
    set_session_billing_information(patch).then(function () {
      set_session_purchase_unit_shipping_from_top_level(0);
    });
    run_all_section_checks();
    return;
  }

  if (t && (t.matches("#ship_name_input") || t.matches("#ship_phone_input") || t.matches("#ship_address_input") || t.matches("#ship_city_input") || t.matches("#ship_state_input") || t.matches("#ship_postal_input") || t.matches("#ship_country_input"))) {
    let patch = collect_shipping_info_patch_from_dom();
    set_session_shipping_information(patch).then(function () {
      set_session_purchase_unit_shipping_from_top_level(0);
    });
    run_all_section_checks();
    return;
  }
}

function handle_change(event) {
  let t = event.target;

  if (t && t.matches("#ship_method_select")) {
    const selectedId = String(t.value || "");
    if (!selectedId) return;

    // Canonical path: one helper keeps session + PU + breakdown in sync
    set_session_selected_shipping(selectedId).then(function () {
      update_summary_totals();
      run_all_section_checks();
    });

    return;
  }
}

function init_checkout_page() {
  if (checkout_page_ready() === false) {
    return;
  }

  ensure_website_session();

  let items_count = count_cart_items();
  if (items_count <= 0) {
    show_empty_cart_message_on_checkout();
    return;
  }

  hydrate_checkout_from_session();

  document.addEventListener("click", handle_click);
  document.addEventListener("input", handle_input);
  document.addEventListener("change", handle_change);
}

document.addEventListener("DOMContentLoaded", init_checkout_page);
