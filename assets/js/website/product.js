let current_product_object = null;

function product_page_ready() {
  let page_el = document.getElementById("product_page");
  if (!page_el) {
    return false;
  }
  return true;
}

function ensure_products_loaded() {
  return new Promise(function (resolve) {
    if (typeof get_website_products === "function") {
      let existing = get_website_products();
      if (Array.isArray(existing) === true && existing.length > 0) {
        resolve(existing);
        return;
      }
    } else {
      if (Array.isArray(window.website_products) === true && window.website_products.length > 0) {
        resolve(window.website_products);
        return;
      }
    }

    if (typeof set_website_products === "function") {
      set_website_products().then(function () {
        if (typeof get_website_products === "function") {
          let after = get_website_products();
          if (Array.isArray(after) === true) {
            resolve(after);
            return;
          }
        } else {
          if (Array.isArray(window.website_products) === true) {
            resolve(window.website_products);
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

function pick_primary_product(products_array) {
  if (Array.isArray(products_array) === false) {
    return null;
  }
  if (products_array.length === 0) {
    return null;
  }
  return products_array[0];
}

function set_text(node, value) {
  if (!node) {
    return;
  }
  node.textContent = value;
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

function format_unit_price_value(price_object) {
  if (!price_object) {
    return "";
  }
  if (typeof price_object.value === "string") {
    return "$" + price_object.value;
  } else {
    return "";
  }
}

function render_title_and_id(product_object) {
  let title_el = document.getElementById("product_title");
  if (title_el) {
    if (typeof product_object.name === "string") {
      set_text(title_el, product_object.name);
    }
  }

  let panel_el = document.getElementById("product_right_panel");
  if (panel_el) {
    if (typeof product_object.id === "string") {
      panel_el.setAttribute("data-product-id", product_object.id);
    } else {
      panel_el.removeAttribute("data-product-id");
    }
  }
}

function render_models(product_object) {
  let select_el = document.getElementById("model_select");
  if (!select_el) {
    return;
  }

  if (Array.isArray(product_object.models) === true && product_object.models.length > 0) {
    clear_children(select_el);
    for (let i = 0; i < product_object.models.length; i = i + 1) {
      let model_obj = product_object.models[i];
      let option_id_str = "model_option_" + String(model_obj.id);
      let option_el = build_option(String(model_obj.id), String(model_obj.label), option_id_str);
      if (i === 0) {
        option_el.selected = true;
      }
      select_el.appendChild(option_el);
    }
  }
}

function render_colors(product_object) {
  let select_el = document.getElementById("color_select");
  if (!select_el) {
    return;
  }

  if (Array.isArray(product_object.colors) === true && product_object.colors.length > 0) {
    clear_children(select_el);
    for (let i = 0; i < product_object.colors.length; i = i + 1) {
      let color_label = product_object.colors[i];
      let value_normalized = String(color_label).toLowerCase();
      let option_id_str = "color_" + value_normalized;
      let option_el = build_option(value_normalized, String(color_label), option_id_str);
      if (i === 0) {
        option_el.selected = true;
      }
      select_el.appendChild(option_el);
    }
  }
}

function find_model_by_id(product_object, model_id) {
  if (!product_object) {
    return null;
  }
  if (Array.isArray(product_object.models) === false) {
    return null;
  }
  for (let i = 0; i < product_object.models.length; i = i + 1) {
    let m = product_object.models[i];
    if (String(m.id) === String(model_id)) {
      return m;
    }
  }
  return null;
}

function map_model_label_to_id(product_object, model_label) {
  if (!product_object || !Array.isArray(product_object.models)) {
    return "";
  }
  if (typeof model_label !== "string") {
    return "";
  }
  let target = model_label.trim().toLowerCase();
  for (let i = 0; i < product_object.models.length; i = i + 1) {
    let m = product_object.models[i];
    if (typeof m.label === "string") {
      if (m.label.trim().toLowerCase() === target) {
        return String(m.id);
      }
    }
  }
  return "";
}

function get_selected_model_id() {
  let select_el = document.getElementById("model_select");
  if (!select_el) {
    return "";
  }
  return String(select_el.value);
}

function get_selected_model_label() {
  let select_el = document.getElementById("model_select");
  if (!select_el) {
    return "";
  }
  let option = select_el.options[select_el.selectedIndex];
  if (option) {
    return String(option.textContent);
  } else {
    return "";
  }
}

function get_selected_color_value() {
  let select_el = document.getElementById("color_select");
  if (!select_el) {
    return "";
  }
  return String(select_el.value);
}

function get_selected_color_label() {
  let select_el = document.getElementById("color_select");
  if (!select_el) {
    return "";
  }
  let option = select_el.options[select_el.selectedIndex];
  if (option) {
    return String(option.textContent);
  } else {
    return "";
  }
}

function get_quantity_value() {
  let input_el = document.getElementById("quantity_input");
  if (!input_el) {
    return 1;
  }
  let n = parseInt(input_el.value, 10);
  if (isNaN(n) === true) {
    return 1;
  }
  if (n < 1) {
    return 1;
  }
  return n;
}

function set_quantity_value(n) {
  let input_el = document.getElementById("quantity_input");
  if (!input_el) {
    return;
  }
  input_el.value = String(n);
}

function get_unit_price_object_for_model(product_object, model_id) {
  let model_obj = find_model_by_id(product_object, model_id);
  if (model_obj && model_obj.price) {
    return model_obj.price;
  }
  if (product_object && product_object.default_price) {
    return product_object.default_price;
  }
  return { currency_code: "USD", value: "0.00" };
}

function compute_amount_value_string(unit_value_string, quantity_int) {
  let unit_num = parseFloat(unit_value_string);
  if (isNaN(unit_num) === true) {
    unit_num = 0;
  }
  let qty = quantity_int;
  if (typeof qty !== "number") {
    qty = 1;
  }
  if (qty < 1) {
    qty = 1;
  }
  let total = unit_num * qty;
  let fixed = total.toFixed(2);
  return fixed;
}

function render_price_for_selection(product_object) {
  let model_id = get_selected_model_id();
  let unit_price_obj = get_unit_price_object_for_model(product_object, model_id);
  let price_value_el = document.getElementById("product_price_value");
  if (price_value_el) {
    let formatted = format_unit_price_value(unit_price_obj);
    if (formatted.length > 0) {
      set_text(price_value_el, formatted);
    }
  }
  let price_line_el = document.getElementById("product_price_line");
  if (price_line_el) {
    let currency_code_value = "USD";
    if (unit_price_obj && typeof unit_price_obj.currency_code === "string") {
      currency_code_value = unit_price_obj.currency_code;
    }
    price_line_el.setAttribute("data-currency", currency_code_value);
  }
}

function extract_after_label(text, label) {
  if (typeof text !== "string") {
    return "";
  }
  let idx = text.indexOf(label);
  if (idx === -1) {
    return "";
  }
  let start = idx + label.length;
  let rest = text.substring(start).trim();
  let dot = rest.indexOf("•");
  if (dot > -1) {
    return rest.substring(0, dot).trim();
  } else {
    return rest.trim();
  }
}

function parse_model_label_from_description(desc) {
  return extract_after_label(desc, "Widget Model: ");
}

function parse_color_label_from_description(desc) {
  return extract_after_label(desc, "Color: ");
}

function read_existing_cart_primary_item() {
  let items = [];
  if (typeof get_session_basket_purchase_units_items === "function") {
    items = get_session_basket_purchase_units_items();
  } else {
    if (window.website_session && window.website_session.basket && Array.isArray(window.website_session.basket.purchase_units) === true) {
      for (let i = 0; i < window.website_session.basket.purchase_units.length; i = i + 1) {
        let pu = window.website_session.basket.purchase_units[i];
        if (pu && Array.isArray(pu.items) === true) {
          for (let j = 0; j < pu.items.length; j = j + 1) {
            items.push(pu.items[j]);
          }
        }
      }
    }
  }
  if (items.length > 0) {
    return items[0];
  } else {
    return null;
  }
}

function hydrate_controls_from_session_selection(product_object) {
  let item = read_existing_cart_primary_item();
  if (!item) {
    return;
  }

  let qty_int = 1;
  if (typeof item.quantity === "string") {
    let qn = parseInt(item.quantity, 10);
    if (isNaN(qn) === false && qn > 0) {
      qty_int = qn;
    }
  }
  set_quantity_value(qty_int);

  let model_label = "";
  let color_label = "";
  if (typeof item.description === "string") {
    model_label = parse_model_label_from_description(item.description);
    color_label = parse_color_label_from_description(item.description);
  }

  let model_id = map_model_label_to_id(product_object, model_label);
  let model_select = document.getElementById("model_select");
  if (model_select && model_id.length > 0) {
    model_select.value = model_id;
  }

  let color_value = "";
  if (typeof color_label === "string") {
    color_value = color_label.trim().toLowerCase();
  }
  let color_select = document.getElementById("color_select");
  if (color_select && color_value.length > 0) {
    color_select.value = color_value;
  }
}

function build_item_from_selection(product_object) {
  let model_id = get_selected_model_id();
  let model_label = get_selected_model_label();
  let color_label = get_selected_color_label();
  let qty = get_quantity_value();
  let unit_price_obj = get_unit_price_object_for_model(product_object, model_id);

  let desc_parts = [];
  if (model_label) {
    desc_parts.push("Widget Model: " + model_label);
  }
  if (color_label) {
    desc_parts.push("Color: " + color_label);
  }
  let description_text = desc_parts.join(" • ");

  let item_object = {
    name: product_object && product_object.name ? product_object.name : "Widget",
    quantity: String(qty),
    description: description_text,
    category: "PHYSICAL_GOODS",
    unit_amount: {
      currency_code: unit_price_obj && unit_price_obj.currency_code ? unit_price_obj.currency_code : "USD",
      value: unit_price_obj && unit_price_obj.value ? String(unit_price_obj.value) : "0.00"
    }
  };
  return item_object;
}

function build_purchase_unit_from_selection(product_object, session_id_string) {
  let item_object = build_item_from_selection(product_object);
  let qty = get_quantity_value();
  let unit_price_obj = get_unit_price_object_for_model(product_object, get_selected_model_id());
  let amount_value = compute_amount_value_string(unit_price_obj.value, qty);
  let currency_code_value = unit_price_obj && unit_price_obj.currency_code ? unit_price_obj.currency_code : "USD";

  let purchase_unit_object = {
    reference_id: session_id_string ? session_id_string : "",
    description: "Widget Website Basket",
    amount: {
      currency_code: currency_code_value,
      value: amount_value
    },
    items: [item_object]
  };
  return purchase_unit_object;
}

function ensure_session_id_value() {
  return new Promise(function (resolve) {
    let current_id = "";
    if (typeof get_session_id === "function") {
      current_id = get_session_id();
    } else {
      if (window.website_session && typeof window.website_session.id === "string") {
        current_id = window.website_session.id;
      }
    }

    if (typeof current_id === "string") {
      if (current_id.length > 0) {
        resolve(current_id);
        return;
      }
    }

    let new_id_value = "sess_" + String(Date.now());
    if (typeof set_session_id === "function") {
      set_session_id(new_id_value).then(function () {
        resolve(new_id_value);
      });
    } else {
      if (window.website_session) {
        window.website_session.id = new_id_value;
      } else {
        window.website_session = { id: new_id_value };
      }
      resolve(new_id_value);
    }
  });
}

function redirect_to_cart() {
  let target_url = "cart.html";
  if (typeof window !== "undefined") {
    window.location.assign(target_url);
  }
}

function update_session_from_ui(product_object) {
  return new Promise(function (resolve) {
    ensure_website_session();
    ensure_session_id_value().then(function (sid) {
      let pu = build_purchase_unit_from_selection(product_object, sid);

      let existing_units = get_session_basket_purchase_units();
      if (Array.isArray(existing_units) === true && existing_units.length > 0) {
        let existing = existing_units[0];
        if (is_plain_object(existing.shipping) === true) {
          pu.shipping = deep_merge(existing.shipping, {});
        }
      }

      let basket_patch_object = { purchase_units: [pu] };
      set_session_basket(basket_patch_object).then(function () {
        resolve(true);
      });
    });
  });
}

function update_add_to_cart_cta_based_on_cart() {
  let button_el = document.getElementById("add_to_cart_btn");
  if (!button_el) {
    return;
  }

  let items_in_cart_count = 0;
  ensure_website_session();

  if (typeof get_session_basket_purchase_units_items === "function") {
    let items_array = get_session_basket_purchase_units_items();
    if (Array.isArray(items_array) === true) {
      items_in_cart_count = items_array.length;
    }
  } else {
    if (window.website_session && window.website_session.basket) {
      if (Array.isArray(window.website_session.basket.purchase_units) === true) {
        for (let i = 0; i < window.website_session.basket.purchase_units.length; i = i + 1) {
          let pu = window.website_session.basket.purchase_units[i];
          if (pu && Array.isArray(pu.items) === true) {
            items_in_cart_count = items_in_cart_count + pu.items.length;
          }
        }
      }
    }
  }

  if (items_in_cart_count > 0) {
    set_text(button_el, "Update Cart");
  } else {
    set_text(button_el, "Add to Cart");
  }
}

function hydrate_product_card(product_object) {
  render_title_and_id(product_object);
  render_models(product_object);
  render_colors(product_object);
  hydrate_controls_from_session_selection(product_object);
  render_price_for_selection(product_object);
  update_add_to_cart_cta_based_on_cart();
}

function on_model_or_color_or_qty_change() {
  if (!current_product_object) {
    return;
  }
  render_price_for_selection(current_product_object);
  update_add_to_cart_cta_based_on_cart();
}

function handle_input(event) {
  let t = event.target;

  if (t && t.matches("#quantity_input")) {
    on_model_or_color_or_qty_change();
    return;
  }

  if (t && t.matches("#model_select")) {
    on_model_or_color_or_qty_change();
    return;
  }

  if (t && t.matches("#color_select")) {
    on_model_or_color_or_qty_change();
    return;
  }
}

function handle_change(event) {
  let t = event.target;

  if (t && t.matches("#quantity_input")) {
    on_model_or_color_or_qty_change();
    return;
  }
  if (t && t.matches("#model_select")) {
    on_model_or_color_or_qty_change();
    return;
  }
  if (t && t.matches("#color_select")) {
    on_model_or_color_or_qty_change();
    return;
  }
}

function handle_click(event) {
  let t = event.target;

  if (t && (t.matches("#add_to_cart_btn") || t.hasAttribute("data-add-to-cart"))) {
    if (!current_product_object) {
      return;
    }
    update_session_from_ui(current_product_object).then(function () {
      update_add_to_cart_cta_based_on_cart();
      redirect_to_cart();
    });
    return;
  }
}

function init_product_page() {
  if (product_page_ready() === false) {
    return;
  }

  ensure_website_session();

  ensure_products_loaded().then(function (products_array) {
    current_product_object = pick_primary_product(products_array);
    if (current_product_object) {
      hydrate_product_card(current_product_object);
    } else {
      update_add_to_cart_cta_based_on_cart();
    }
  });

  document.addEventListener("click", handle_click);
  document.addEventListener("input", handle_input);
  document.addEventListener("change", handle_change);
}

document.addEventListener("DOMContentLoaded", init_product_page);
