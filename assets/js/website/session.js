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
      resolve(pu.shipping);
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

function set_session_basket_purchase_units(units_array) {
  return new Promise(function (resolve) {
    ensure_website_session();
    if (!window.website_session.basket) {
      window.website_session.basket = {};
    }
    if (Array.isArray(units_array) === true) {
      window.website_session.basket.purchase_units = units_array;
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
