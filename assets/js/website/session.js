function make_default_session() {
  let obj = {
    id: "",
    basket: {
      purchase_units: [],
      paypal_order_id: "",
      fastlane: {
        enabled: false,
        profileData: {}
      }
    },
    contact_information: {},
    billing_information: {},
    shipping_information: {},
    shipping_methods: {
      selected: "",
      options: []
    },
    transaction_payload: null
  };
  return obj;
}

function compute_item_total_from_items(items) {
  let total = 0;
  if (Array.isArray(items) === true) {
    for (let i = 0; i < items.length; i = i + 1) {
      let it = items[i] || {};
      let unit = 0;
      if (it.unit_amount && typeof it.unit_amount.value === "string") {
        let n = parseFloat(it.unit_amount.value);
        if (isNaN(n) === false) unit = n;
      }
      let qty = 1;
      if (typeof it.quantity !== "undefined") {
        let qn = parseInt(String(it.quantity), 10);
        if (isNaN(qn) === false && qn > 0) qty = qn;
      }
      total = total + unit * qty;
    }
  }
  return Number(total.toFixed(2));
}

function get_selected_shipping_amount_from_session(sess) {
  let id = "";
  let options = [];
  if (sess && sess.shipping_methods) {
    if (typeof sess.shipping_methods.selected === "string") {
      id = sess.shipping_methods.selected;
    }
    if (Array.isArray(sess.shipping_methods.options) === true) {
      options = sess.shipping_methods.options;
    }
  }
  if (!id || options.length === 0) return 0;

  for (let i = 0; i < options.length; i = i + 1) {
    let opt = options[i];
    if (String(opt.id) === String(id)) {
      if (opt.amount && typeof opt.amount.value === "string") {
        let n = parseFloat(opt.amount.value);
        return isNaN(n) ? 0 : n;
      }
      if (typeof opt.price === "string") {
        let n2 = parseFloat(opt.price);
        return isNaN(n2) ? 0 : n2;
      }
    }
  }
  return 0;
}

function set_session_purchase_unit_amount_breakdown_all() {
  return set_session_purchase_unit_amount_breakdown(0);
}

function is_plain_object(val) {
  if (val === null) {
    return false;
  }
  if (typeof val !== "object") {
    return false;
  }
  if (Array.isArray(val) === true) {
    return false;
  }
  return true;
}

function digits_only(str) {
  if (typeof str !== "string") {
    return "";
  }
  let out = "";
  for (let i = 0; i < str.length; i = i + 1) {
    let ch = str.charAt(i);
    if (ch >= "0" && ch <= "9") {
      out = out + ch;
    }
  }
  return out;
}

function ensure_purchase_unit_index(pu_index) {
  ensure_website_session();
  if (!window.website_session.basket) {
    window.website_session.basket = {};
  }
  if (!Array.isArray(window.website_session.basket.purchase_units)) {
    window.website_session.basket.purchase_units = [];
  }
  while (window.website_session.basket.purchase_units.length <= pu_index) {
    window.website_session.basket.purchase_units.push({});
  }
  return window.website_session.basket.purchase_units[pu_index];
}

function set_session_purchase_unit_shipping_from_top_level(pu_index) {
  return new Promise(function (resolve) {
    ensure_website_session();

    let index_value = 0;
    if (typeof pu_index === "number") {
      if (pu_index >= 0) {
        index_value = pu_index;
      }
    }

    let pu = ensure_purchase_unit_index(index_value);
    let sess = window.website_session;

    let selected_id = "";
    if (sess && sess.shipping_methods && typeof sess.shipping_methods.selected === "string") {
      selected_id = sess.shipping_methods.selected;
    }

    let options_src = [];
    if (sess && sess.shipping_methods && Array.isArray(sess.shipping_methods.options) === true && sess.shipping_methods.options.length > 0) {
      options_src = sess.shipping_methods.options;
    } else {
      if (typeof get_website_shipping_options === "function") {
        let site_opts = get_website_shipping_options();
        if (Array.isArray(site_opts) === true) {
          options_src = site_opts;
        }
      } else {
        if (Array.isArray(window.website_shipping_options) === true) {
          options_src = window.website_shipping_options;
        }
      }
    }

    let options_out = [];
    for (let i = 0; i < options_src.length; i = i + 1) {
      let opt = options_src[i];

      let id_val = "";
      if (typeof opt.id === "string" && opt.id.length > 0) {
        id_val = opt.id;
      } else if (typeof opt.name === "string") {
        let name_l = opt.name.toLowerCase();
        if (name_l.indexOf("free") > -1) {
          id_val = "free";
        } else if (name_l.indexOf("standard") > -1) {
          id_val = "standard";
        } else if (name_l.indexOf("express") > -1) {
          id_val = "express";
        }
      }

      let label_val = "";
      if (typeof opt.label === "string" && opt.label.length > 0) {
        label_val = opt.label;
      } else if (typeof opt.name === "string") {
        label_val = opt.name;
      }

      let amount_val = "0.00";
      let currency_val = "USD";
      if (opt.amount && typeof opt.amount.value === "string") {
        amount_val = opt.amount.value;
        if (typeof opt.amount.currency_code === "string" && opt.amount.currency_code.length > 0) {
          currency_val = opt.amount.currency_code;
        }
      } else if (typeof opt.price === "string") {
        amount_val = opt.price;
      }

      let is_selected = false;
      if (typeof selected_id === "string" && selected_id.length > 0) {
        if (id_val === selected_id) {
          is_selected = true;
        }
      }

      options_out.push({
        id: id_val,
        label: label_val,
        selected: is_selected,
        type: "SHIPPING",
        amount: {
          currency_code: currency_val,
          value: amount_val
        }
      });
    }

    if (options_out.length > 0) {
      let any_selected = false;
      for (let k = 0; k < options_out.length; k = k + 1) {
        if (options_out[k].selected === true) {
          any_selected = true;
        }
      }
      if (any_selected === false) {
        options_out[0].selected = true;
      }
    }

    let fullname_val = "";
    if (sess && sess.shipping_information && typeof sess.shipping_information.full_name === "string") {
      fullname_val = sess.shipping_information.full_name;
    } else if (sess && sess.billing_information && typeof sess.billing_information.full_name === "string") {
      fullname_val = sess.billing_information.full_name;
    }

    let email_val = "";
    if (sess && sess.contact_information && typeof sess.contact_information.email === "string") {
      email_val = sess.contact_information.email;
    }

    let phone_src = "";
    if (sess && sess.shipping_information && typeof sess.shipping_information.phone === "string") {
      phone_src = sess.shipping_information.phone;
    } else if (sess && sess.billing_information && typeof sess.billing_information.phone === "string") {
      phone_src = sess.billing_information.phone;
    }

    let digits = digits_only(phone_src);
    let country_code_val = "1";
    let national_number_val = digits;

    if (digits.length === 11) {
      if (digits.charAt(0) === "1") {
        country_code_val = "1";
        national_number_val = digits.substring(1);
      }
    } else if (digits.length === 10) {
      country_code_val = "1";
      national_number_val = digits;
    }

    let addr1 = "";
    let addr2 = "";
    let city = "";
    let state = "";
    let postal = "";
    let country = "";

    if (sess && sess.shipping_information) {
      if (typeof sess.shipping_information.address_line_1 === "string") {
        addr1 = sess.shipping_information.address_line_1;
      }
      if (typeof sess.shipping_information.address_line_2 === "string") {
        addr2 = sess.shipping_information.address_line_2;
      }
      if (typeof sess.shipping_information.city === "string") {
        city = sess.shipping_information.city;
      }
      if (typeof sess.shipping_information.state_province === "string") {
        state = sess.shipping_information.state_province;
      }
      if (typeof sess.shipping_information.postal_code === "string") {
        postal = sess.shipping_information.postal_code;
      }
      if (typeof sess.shipping_information.country === "string") {
        country = sess.shipping_information.country;
      }
    }

    let shipping_out = {
      type: "SHIPPING",
      options: options_out,
      name: {
        full_name: fullname_val
      },
      email_address: email_val,
      phone_number: {
        country_code: country_code_val,
        national_number: national_number_val
      },
      address: {
        address_line_1: addr1,
        address_line_2: addr2,
        admin_area_2: city,
        admin_area_1: state,
        postal_code: postal,
        country_code: country || "US"
      }
    };

    let merged = {};
    if (is_plain_object(pu.shipping) === true) {
      merged = deep_merge(pu.shipping, shipping_out);
    } else {
      merged = shipping_out;
    }
    pu.shipping = merged;

    if (typeof window.website_session.id === "string") {
      if (window.website_session.id.length > 0) {
        if (typeof pu.reference_id !== "string" || pu.reference_id.length === 0) {
          pu.reference_id = window.website_session.id;
        }
      }
    }

    let units = [];
    if (window.website_session && window.website_session.basket && Array.isArray(window.website_session.basket.purchase_units) === true) {
      units = window.website_session.basket.purchase_units.slice();
    }
    while (units.length <= index_value) {
      units.push({});
    }
    units[index_value] = pu;

    set_session_basket({ purchase_units: units }).then(function () {
      set_session_purchase_unit_amount_breakdown(typeof pu_index === "number" ? pu_index : 0);
      resolve(pu.shipping);
    });
  });
}

// --- Shipping selection helpers you can call from anywhere ---

function get_session_selected_shipping_id() {
  ensure_website_session();
  let sess = window.website_session || {};

  if (sess.shipping_methods && typeof sess.shipping_methods.selected === "string") {
    if (sess.shipping_methods.selected.length > 0) {
      return sess.shipping_methods.selected;
    }
  }

  // fallback: derive from PU[0].shipping.options if present
  if (sess.basket && Array.isArray(sess.basket.purchase_units) === true && sess.basket.purchase_units.length > 0) {
    let pu0 = sess.basket.purchase_units[0];
    if (pu0 && pu0.shipping && Array.isArray(pu0.shipping.options) === true) {
      for (let i = 0; i < pu0.shipping.options.length; i = i + 1) {
        let opt = pu0.shipping.options[i];
        if (opt && opt.selected === true && typeof opt.id === "string") {
          return opt.id;
        }
      }
    }
  }

  return "";
}

function get_session_selected_shipping_option() {
  ensure_website_session();
  let sess = window.website_session || {};
  let selected_id = get_session_selected_shipping_id();

  // prefer top-level options
  if (sess.shipping_methods && Array.isArray(sess.shipping_methods.options) === true) {
    for (let i = 0; i < sess.shipping_methods.options.length; i = i + 1) {
      let opt = sess.shipping_methods.options[i];
      if (opt && String(opt.id) === String(selected_id)) {
        return opt;
      }
    }
  }

  // fallback: purchase_unit[0].shipping.options
  if (sess.basket && Array.isArray(sess.basket.purchase_units) === true && sess.basket.purchase_units.length > 0) {
    let pu0 = sess.basket.purchase_units[0];
    if (pu0 && pu0.shipping && Array.isArray(pu0.shipping.options) === true) {
      for (let i = 0; i < pu0.shipping.options.length; i = i + 1) {
        let opt = pu0.shipping.options[i];
        if (opt && String(opt.id) === String(selected_id)) {
          return opt;
        }
      }
    }
  }

  return null;
}

// Compute the total of all line items (price * qty) for a PU
function compute_purchase_unit_items_total(pu) {
  let total = 0;
  if (pu && Array.isArray(pu.items) === true) {
    for (let i = 0; i < pu.items.length; i = i + 1) {
      let it = pu.items[i];
      if (!it || !it.unit_amount || typeof it.unit_amount.value !== "string") {
        continue;
      }
      let price = parseFloat(it.unit_amount.value);
      if (isNaN(price) === true) {
        price = 0;
      }
      let qty = 1;
      if (typeof it.quantity !== "undefined") {
        let qn = parseInt(String(it.quantity), 10);
        if (isNaN(qn) === false && qn > 0) {
          qty = qn;
        }
      }
      total = total + price * qty;
    }
  }
  return total;
}

// Read selected shipping id from top-level session
function get_selected_shipping_id_from_session(sess) {
  if (sess && sess.shipping_methods && typeof sess.shipping_methods.selected === "string") {
    return sess.shipping_methods.selected;
  }
  return "";
}

// Find a shipping option by id in the best available source
function find_shipping_option_by_id(sess, id) {
  // Prefer top-level shipping_methods.options
  if (sess && sess.shipping_methods && Array.isArray(sess.shipping_methods.options) === true) {
    for (let i = 0; i < sess.shipping_methods.options.length; i = i + 1) {
      let opt = sess.shipping_methods.options[i];
      if (opt && String(opt.id) === String(id)) {
        return opt;
      }
    }
  }
  // Fallback to PU[0].shipping.options
  if (sess && sess.basket && Array.isArray(sess.basket.purchase_units) === true && sess.basket.purchase_units.length > 0) {
    let pu0 = sess.basket.purchase_units[0];
    if (pu0 && pu0.shipping && Array.isArray(pu0.shipping.options) === true) {
      for (let j = 0; j < pu0.shipping.options.length; j = j + 1) {
        let o = pu0.shipping.options[j];
        if (o && String(o.id) === String(id)) {
          return o;
        }
      }
    }
  }
  return null;
}

// Set PU[pu_index].amount and amount.breakdown (item_total + shipping)
function set_session_purchase_unit_amount_breakdown(pu_index) {
  return new Promise(function (resolve) {
    ensure_website_session();

    let idx = typeof pu_index === "number" ? pu_index : 0;
    let units = get_session_basket_purchase_units();
    if (Array.isArray(units) === false || units.length <= idx) {
      resolve(false);
      return;
    }

    let sess = typeof get_website_session === "function" ? get_website_session() : window.website_session;
    let pu = units[idx];

    let currency = "USD";
    if (pu && pu.amount && typeof pu.amount.currency_code === "string") {
      currency = pu.amount.currency_code;
    } else if (pu && Array.isArray(pu.items) === true && pu.items.length > 0) {
      let first = pu.items[0];
      if (first && first.unit_amount && typeof first.unit_amount.currency_code === "string") {
        currency = first.unit_amount.currency_code;
      }
    }

    let items_total_num = compute_purchase_unit_items_total(pu);

    let selected_id = get_selected_shipping_id_from_session(sess);
    let shipping_opt = find_shipping_option_by_id(sess, selected_id);
    let shipping_num = 0;
    if (shipping_opt) {
      if (shipping_opt.amount && typeof shipping_opt.amount.value === "string") {
        let sn = parseFloat(shipping_opt.amount.value);
        if (isNaN(sn) === false) {
          shipping_num = sn;
        }
      } else if (typeof shipping_opt.price === "string") {
        let sn2 = parseFloat(shipping_opt.price);
        if (isNaN(sn2) === false) {
          shipping_num = sn2;
        }
      }
    }

    let total_num = items_total_num + shipping_num;

    if (!pu.amount) {
      pu.amount = {};
    }
    pu.amount.currency_code = currency;
    pu.amount.value = total_num.toFixed(2);
    pu.amount.breakdown = {
      item_total: {
        currency_code: currency,
        value: items_total_num.toFixed(2)
      },
      shipping: {
        currency_code: currency,
        value: shipping_num.toFixed(2)
      }
    };

    units[idx] = pu;

    set_session_basket_purchase_units(units).then(function () {
      resolve(true);
    });
  });
}

// Canonical single-call updater for shipping selection:
// 1) update top-level selection
// 2) sync PU[0].shipping from top-level
// 3) recompute PU[0].amount.breakdown (item_total + shipping)
function set_session_selected_shipping(selectedId) {
  return new Promise(function (resolve) {
    let setTop = set_session_shipping_methods({ selected: String(selectedId) });
    setTop.then(function () {
      set_session_purchase_unit_shipping_from_top_level(0).then(function () {
        set_session_purchase_unit_amount_breakdown(0).then(function () {
          resolve(true);
        });
      });
    });
  });
}

function deep_merge(target, patch) {
  if (Array.isArray(target) === true && Array.isArray(patch) === true) {
    let copy = [];
    for (let i = 0; i < patch.length; i = i + 1) {
      copy.push(patch[i]);
    }
    return copy;
  }

  if (is_plain_object(target) === true && is_plain_object(patch) === true) {
    let out = {};
    let t_keys = Object.keys(target);
    for (let i = 0; i < t_keys.length; i = i + 1) {
      let k = t_keys[i];
      out[k] = target[k];
    }
    let p_keys = Object.keys(patch);
    for (let j = 0; j < p_keys.length; j = j + 1) {
      let k2 = p_keys[j];
      let src = out[k2];
      let add = patch[k2];
      if (is_plain_object(src) === true && is_plain_object(add) === true) {
        out[k2] = deep_merge(src, add);
      } else if (Array.isArray(src) === true && Array.isArray(add) === true) {
        out[k2] = deep_merge(src, add);
      } else {
        out[k2] = add;
      }
    }
    return out;
  }

  return patch;
}

function storage_key() {
  return "website_session";
}

function load_session_from_storage() {
  try {
    let raw = localStorage.getItem(storage_key());
    if (typeof raw !== "string") {
      let legacy = localStorage.getItem("website_session_v1");
      if (typeof legacy === "string") {
        raw = legacy;
      } else {
        return null;
      }
    }
    let parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed) === false) {
      return parsed;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

function persist_session_to_storage(session_obj) {
  try {
    let serialized = JSON.stringify(session_obj);
    localStorage.setItem(storage_key(), serialized);
    return true;
  } catch (e) {
    return false;
  }
}

function ensure_website_session() {
  if (typeof window.website_session === "undefined") {
    let stored = load_session_from_storage();
    if (is_plain_object(stored) === true) {
      window.website_session = stored;
    } else {
      window.website_session = make_default_session();
    }
  } else {
    if (is_plain_object(window.website_session) === false) {
      let stored_again = load_session_from_storage();
      if (is_plain_object(stored_again) === true) {
        window.website_session = stored_again;
      } else {
        window.website_session = make_default_session();
      }
    }
  }
  return window.website_session;
}

function on_dom_content_loaded() {
  ensure_website_session();
}

document.addEventListener("DOMContentLoaded", on_dom_content_loaded);

/* getters */

function get_website_session() {
  return window.website_session;
}

function get_session_id() {
  if (window.website_session) {
    return window.website_session.id;
  } else {
    return "";
  }
}

function get_session_basket() {
  if (window.website_session && window.website_session.basket) {
    return window.website_session.basket;
  } else {
    return {};
  }
}

function get_session_basket_purchase_units() {
  let basket = get_session_basket();
  if (basket.purchase_units) {
    return basket.purchase_units;
  } else {
    return [];
  }
}

function get_session_basket_purchase_units_items() {
  let units = get_session_basket_purchase_units();
  let items = [];
  for (let i = 0; i < units.length; i = i + 1) {
    let u = units[i];
    if (u && Array.isArray(u.items) === true) {
      for (let j = 0; j < u.items.length; j = j + 1) {
        items.push(u.items[j]);
      }
    }
  }
  return items;
}

function get_session_contact_information() {
  if (window.website_session && window.website_session.contact_information) {
    return window.website_session.contact_information;
  } else {
    return {};
  }
}

function get_session_contact_intormation() {
  if (window.website_session && window.website_session.contact_information) {
    return window.website_session.contact_information;
  } else if (window.website_session && window.website_session.contact_intormation) {
    return window.website_session.contact_intormation;
  } else {
    return {};
  }
}

function get_session_billing_information() {
  if (window.website_session && window.website_session.billing_information) {
    return window.website_session.billing_information;
  } else {
    return {};
  }
}

function get_session_shipping_information() {
  if (window.website_session && window.website_session.shipping_information) {
    return window.website_session.shipping_information;
  } else {
    return {};
  }
}

function get_session_shipping_methods() {
  if (window.website_session && window.website_session.shipping_methods) {
    return window.website_session.shipping_methods;
  } else {
    return {};
  }
}

function get_session_transaction_payload() {
  if (window.website_session) {
    return window.website_session.transaction_payload;
  } else {
    return null;
  }
}

/* setters (Promise-based, with persistence) */

function set_website_session(patch) {
  return new Promise(function (resolve) {
    let current = ensure_website_session();
    if (is_plain_object(patch) === true) {
      window.website_session = deep_merge(current, patch);
    }
    persist_session_to_storage(window.website_session);
    resolve(window.website_session);
  });
}

function set_session_id(id_value) {
  return new Promise(function (resolve) {
    ensure_website_session();
    if (typeof id_value === "string") {
      window.website_session.id = id_value;
    }
    persist_session_to_storage(window.website_session);
    resolve(window.website_session.id);
  });
}

function set_session_basket(basket_patch) {
  return new Promise(function (resolve) {
    ensure_website_session();
    if (is_plain_object(basket_patch) === true) {
      let current = window.website_session.basket || {};
      window.website_session.basket = deep_merge(current, basket_patch);
    }
    persist_session_to_storage(window.website_session);
    resolve(window.website_session.basket);
  });
}

function sanitize_purchase_unit_array(units_array) {
  if (Array.isArray(units_array) !== true) {
    return [];
  }

  function is_nonempty_string(v) {
    return (typeof v === "string" && v.trim().length > 0);
  }

  function only_digits(str) {
    return String(str == null ? "" : str).replace(/\D+/g, "");
  }

  function is_valid_email(email) {
    // Lightweight email sanity check (good enough for client-side hygiene)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
  }

  function normalize_country_code(cc) {
    // E.164 country code: 1–3 digits (no +)
    var d = only_digits(cc);
    if (/^\d{1,3}$/.test(d)) {
      return d;
    }
    return "";
  }

  function normalize_national_number(nn) {
    var d = only_digits(nn);
    if (d.length >= 7 && d.length <= 15) {
      return d;
    }
    return "";
  }

  var out = [];

  for (var i = 0; i < units_array.length; i++) {
    var unit = JSON.parse(JSON.stringify(units_array[i] || {}));

    if (unit && unit.shipping) {
      if (!is_nonempty_string(unit.shipping.email_address) || !is_valid_email(unit.shipping.email_address)) {
        // remove invalid / empty email
        if (unit.shipping.hasOwnProperty("email_address")) {
          delete unit.shipping.email_address;
        }
      }

      if (unit.shipping.hasOwnProperty("phone_number") && unit.shipping.phone_number) {
        var cc = normalize_country_code(unit.shipping.phone_number.country_code);
        var nn = normalize_national_number(unit.shipping.phone_number.national_number);

        if (is_nonempty_string(cc) && is_nonempty_string(nn)) {
          unit.shipping.phone_number.country_code = cc;
          unit.shipping.phone_number.national_number = nn;
        } else {
          // Remove entire phone_number object if either part is missing/invalid
          delete unit.shipping.phone_number;
        }
      }
    }

    out.push(unit);
  }

  return out;
}

function set_session_basket_purchase_units(units_array) {
  return new Promise(function (resolve) {
    ensure_website_session();
    if (!window.website_session.basket) {
      window.website_session.basket = {};
    }
    if (Array.isArray(units_array) === true) {
      // Sanitize before persisting
      var clean_units = sanitize_purchase_unit_array(units_array);
      window.website_session.basket.purchase_units = clean_units;
    }
    persist_session_to_storage(window.website_session);
    resolve(get_session_basket_purchase_units());
  });
}

function set_session_basket_purchase_units_items(items_array, unit_index) {
  return new Promise(function (resolve) {
    ensure_website_session();
    if (!window.website_session.basket) {
      window.website_session.basket = {};
    }
    if (!Array.isArray(window.website_session.basket.purchase_units)) {
      window.website_session.basket.purchase_units = [];
    }

    let idx = 0;
    if (typeof unit_index === "number") {
      if (unit_index >= 0) {
        idx = unit_index;
      }
    }

    while (window.website_session.basket.purchase_units.length <= idx) {
      window.website_session.basket.purchase_units.push({});
    }

    if (Array.isArray(items_array) === true) {
      window.website_session.basket.purchase_units[idx].items = items_array;
    }
    persist_session_to_storage(window.website_session);
    resolve(get_session_basket_purchase_units_items());
  });
}

function set_session_contact_information(contact_patch) {
  return new Promise(function (resolve) {
    ensure_website_session();
    let current = window.website_session.contact_information || {};
    if (is_plain_object(contact_patch) === true) {
      window.website_session.contact_information = deep_merge(current, contact_patch);
    }
    persist_session_to_storage(window.website_session);
    resolve(window.website_session.contact_information);
  });
}

function set_session_contact_intormation(contact_patch) {
  return set_session_contact_information(contact_patch);
}

function set_session_billing_information(billing_patch) {
  return new Promise(function (resolve) {
    ensure_website_session();
    let current = window.website_session.billing_information || {};
    if (is_plain_object(billing_patch) === true) {
      window.website_session.billing_information = deep_merge(current, billing_patch);
    }
    persist_session_to_storage(window.website_session);
    resolve(window.website_session.billing_information);
  });
}

function set_session_shipping_information(shipping_patch) {
  return new Promise(function (resolve) {
    ensure_website_session();
    let current = window.website_session.shipping_information || {};
    if (is_plain_object(shipping_patch) === true) {
      window.website_session.shipping_information = deep_merge(current, shipping_patch);
    }
    persist_session_to_storage(window.website_session);
    resolve(window.website_session.shipping_information);
  });
}

function set_session_shipping_methods(methods_patch) {
  return new Promise(function (resolve) {
    ensure_website_session();
    let current = window.website_session.shipping_methods || {};
    if (is_plain_object(methods_patch) === true) {
      window.website_session.shipping_methods = deep_merge(current, methods_patch);
    }
    persist_session_to_storage(window.website_session);
    resolve(window.website_session.shipping_methods);
  });
}

function set_session_transaction_payload(payload) {
  return new Promise(function (resolve) {
    ensure_website_session();
    window.website_session.transaction_payload = payload;
    persist_session_to_storage(window.website_session);
    resolve(window.website_session.transaction_payload);
  });
}

function clear_session() {
  return new Promise(function (resolve) {
    window.website_session = make_default_session();
    persist_session_to_storage(window.website_session);
    resolve(window.website_session);
  });
}

/* explicit window exposure for this file */
window.ensure_website_session = ensure_website_session;
window.get_website_session = get_website_session;
window.get_session_id = get_session_id;
window.get_session_basket = get_session_basket;
window.get_session_basket_purchase_units = get_session_basket_purchase_units;
window.get_session_basket_purchase_units_items = get_session_basket_purchase_units_items;
window.get_session_contact_information = get_session_contact_information;
window.get_session_contact_intormation = get_session_contact_intormation;
window.get_session_billing_information = get_session_billing_information;
window.get_session_shipping_information = get_session_shipping_information;
window.get_session_shipping_methods = get_session_shipping_methods;
window.get_session_transaction_payload = get_session_transaction_payload;

window.set_website_session = set_website_session;
window.set_session_id = set_session_id;
window.set_session_basket = set_session_basket;
window.set_session_basket_purchase_units = set_session_basket_purchase_units;
window.set_session_basket_purchase_units_items = set_session_basket_purchase_units_items;
window.set_session_contact_information = set_session_contact_information;
window.set_session_contact_intormation = set_session_contact_intormation;
window.set_session_billing_information = set_session_billing_information;
window.set_session_shipping_information = set_session_shipping_information;
window.set_session_shipping_methods = set_session_shipping_methods;
window.set_session_transaction_payload = set_session_transaction_payload;
window.set_session_purchase_unit_shipping_from_top_level = set_session_purchase_unit_shipping_from_top_level;
window.clear_session = clear_session;
