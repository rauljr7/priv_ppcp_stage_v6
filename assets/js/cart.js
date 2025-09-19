let cart_products_cache = null;

function cart_page_ready() {
  let el = document.getElementById("cart_page");
  if (!el) {
    return false;
  }
  return true;
}

function get_all_cart_items_flat() {
  ensure_website_session();
  let items_out = [];
  let units = get_session_basket_purchase_units();
  if (Array.isArray(units) === false) {
    return items_out;
  }
  for (let u = 0; u < units.length; u = u + 1) {
    let unit = units[u];
    if (!unit || Array.isArray(unit.items) === false) {
      continue;
    }
    for (let i = 0; i < unit.items.length; i = i + 1) {
      let it = unit.items[i];
      let obj = {
        unit_index: u,
        item_index: i,
        name: it && it.name ? String(it.name) : "",
        quantity: it && typeof it.quantity !== "undefined" ? parseInt(String(it.quantity), 10) : 1,
        unit_amount_value: it && it.unit_amount && it.unit_amount.value ? String(it.unit_amount.value) : "0.00",
        unit_amount_currency: it && it.unit_amount && it.unit_amount.currency_code ? String(it.unit_amount.currency_code) : "USD",
        description: it && it.description ? String(it.description) : ""
      };
      if (isNaN(obj.quantity) === true || obj.quantity < 1) {
        obj.quantity = 1;
      }
      let parsed = parse_item_description(obj.description);
      obj.model_label = parsed.model_label;
      obj.color_label = parsed.color_label;
      items_out.push(obj);
    }
  }
  return items_out;
}

function parse_item_description(desc) {
  let out = { model_label: "", color_label: "" };
  if (typeof desc !== "string") {
    return out;
  }
  let model_idx = desc.indexOf("Widget Model:");
  if (model_idx > -1) {
    let after = desc.slice(model_idx + "Widget Model:".length);
    after = after.trim();
    let stop = after.indexOf("•");
    if (stop > -1) {
      out.model_label = after.slice(0, stop).trim();
    } else {
      out.model_label = after.trim();
    }
  }
  let color_idx = desc.indexOf("Color:");
  if (color_idx > -1) {
    let after_c = desc.slice(color_idx + "Color:".length);
    out.color_label = after_c.trim();
  }
  return out;
}

function format_money(value_str) {
  let n = parseFloat(value_str);
  if (isNaN(n) === true) {
    n = 0;
  }
  return "$" + n.toFixed(2);
}

function compute_subtotal(value_str, qty_int) {
  let u = parseFloat(value_str);
  if (isNaN(u) === true) {
    u = 0;
  }
  let q = qty_int;
  if (typeof q !== "number") {
    q = 1;
  }
  if (q < 1) {
    q = 1;
  }
  let total = u * q;
  return total.toFixed(2);
}

function clear_children(node) {
  if (!node) {
    return;
  }
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function render_empty_cart_message() {
  let cart_page = document.getElementById("cart_page");
  if (!cart_page) {
    return;
  }
  let wrapper = document.createElement("div");
  wrapper.style.minHeight = "calc(100dvh - 120px)";
  wrapper.style.display = "grid";
  wrapper.style.placeItems = "center";

  let msg = document.createElement("div");
  msg.style.textAlign = "center";
  msg.style.fontSize = "1.2rem";

  let span = document.createElement("span");
  span.textContent = "No items in cart! Add products by clicking ";

  let link = document.createElement("a");
  link.href = "product.html";
  link.textContent = "HERE";
  link.style.color = "#dc2626";
  link.style.fontWeight = "700";

  msg.appendChild(span);
  msg.appendChild(link);
  wrapper.appendChild(msg);

  cart_page.replaceWith(wrapper);
}

function hydrate_cart_table_from_session() {
  let items = get_all_cart_items_flat();
  if (items.length === 0) {
    render_empty_cart_message();
    return;
  }

  let tbody = document.getElementById("cart_table_body");
  if (!tbody) {
    return;
  }
  clear_children(tbody);

  for (let idx = 0; idx < items.length; idx = idx + 1) {
    let it = items[idx];

    let tr = document.createElement("tr");
    tr.setAttribute("data-unit-index", String(it.unit_index));
    tr.setAttribute("data-item-index", String(it.item_index));

    let td_actions = document.createElement("td");
    td_actions.style.width = "96px";
    let remove_link = document.createElement("a");
    remove_link.href = "#";
    remove_link.setAttribute("data-remove", "");
    remove_link.setAttribute("aria-label", "Remove " + (it.name || "item"));
    remove_link.textContent = "x";
    td_actions.appendChild(remove_link);

    let td_product = document.createElement("td");
    let product_cell = document.createElement("div");
    product_cell.className = "product_cell";
    let img = document.createElement("img");
    img.className = "product_thumb";
    img.src = "assets/images/widget.png";
    img.alt = "Widget thumbnail";
    let meta = document.createElement("div");
    let name_div = document.createElement("div");
    name_div.textContent = it.name && it.name.length > 0 ? it.name : "Widget";
    let small = document.createElement("small");
    small.textContent = "SKU: WID-001";
    meta.appendChild(name_div);
    meta.appendChild(small);
    product_cell.appendChild(img);
    product_cell.appendChild(meta);
    td_product.appendChild(product_cell);

    let td_price = document.createElement("td");
    td_price.textContent = format_money(it.unit_amount_value);

    let td_options = document.createElement("td");
    let opt1 = document.createElement("div");
    if (it.model_label && it.model_label.length > 0) {
      opt1.textContent = "Widget Model: " + it.model_label;
      opt1.setAttribute("data-model", it.model_label.toLowerCase());
    } else {
      opt1.textContent = "Widget Model:";
    }
    let opt2 = document.createElement("div");
    if (it.color_label && it.color_label.length > 0) {
      opt2.textContent = "Color: " + it.color_label;
      opt2.setAttribute("data-color", it.color_label.toLowerCase());
    } else {
      opt2.textContent = "Color:";
    }
    td_options.appendChild(opt1);
    td_options.appendChild(opt2);

    let td_qty = document.createElement("td");
    td_qty.className = "qty_input";
    let qty_input = document.createElement("input");
    qty_input.type = "number";
    qty_input.name = "quantity";
    qty_input.min = "1";
    qty_input.inputMode = "numeric";
    qty_input.setAttribute("aria-label", "Quantity");
    qty_input.value = String(it.quantity);
    qty_input.id = "quantity_input_" + String(it.unit_index) + "_" + String(it.item_index);
    td_qty.appendChild(qty_input);

    let td_subtotal = document.createElement("td");
    let sub = compute_subtotal(it.unit_amount_value, it.quantity);
    td_subtotal.textContent = format_money(sub);

    tr.appendChild(td_actions);
    tr.appendChild(td_product);
    tr.appendChild(td_price);
    tr.appendChild(td_options);
    tr.appendChild(td_qty);
    tr.appendChild(td_subtotal);

    tbody.appendChild(tr);
  }
}

function collect_quantities_from_dom() {
  let map = {};
  let tbody = document.getElementById("cart_table_body");
  if (!tbody) {
    return map;
  }
  let rows = tbody.querySelectorAll("tr[data-unit-index][data-item-index]");
  for (let r = 0; r < rows.length; r = r + 1) {
    let row = rows[r];
    let u_str = row.getAttribute("data-unit-index");
    let i_str = row.getAttribute("data-item-index");
    let u_idx = parseInt(u_str, 10);
    let i_idx = parseInt(i_str, 10);
    if (isNaN(u_idx) === true || isNaN(i_idx) === true) {
      continue;
    }
    let input = row.querySelector('input[type="number"][name="quantity"]');
    let qty = 1;
    if (input) {
      let n = parseInt(input.value, 10);
      if (isNaN(n) === false && n > 0) {
        qty = n;
      }
    }
    if (!map[u_idx]) {
      map[u_idx] = {};
    }
    map[u_idx][i_idx] = qty;
  }
  return map;
}

function recompute_unit_amount_value(unit_obj) {
  if (!unit_obj) {
    return;
  }
  let total = 0;
  if (Array.isArray(unit_obj.items) === true) {
    for (let i = 0; i < unit_obj.items.length; i = i + 1) {
      let it = unit_obj.items[i];
      if (!it || !it.unit_amount || typeof it.unit_amount.value !== "string") {
        continue;
      }
      let price_num = parseFloat(it.unit_amount.value);
      if (isNaN(price_num) === true) {
        price_num = 0;
      }
      let qty_num = 1;
      if (typeof it.quantity !== "undefined") {
        qty_num = parseInt(String(it.quantity), 10);
        if (isNaN(qty_num) === true || qty_num < 1) {
          qty_num = 1;
        }
      }
      total = total + price_num * qty_num;
    }
  }
  if (!unit_obj.amount) {
    unit_obj.amount = {};
  }
  unit_obj.amount.value = total.toFixed(2);
  if (!unit_obj.amount.currency_code) {
    unit_obj.amount.currency_code = "USD";
  }
}

function update_cart_quantities_and_persist() {
  return new Promise(function (resolve) {
    ensure_website_session();
    let units = get_session_basket_purchase_units();
    if (Array.isArray(units) === false) {
      resolve(false);
      return;
    }

    let qty_map = collect_quantities_from_dom();

    for (let u = 0; u < units.length; u = u + 1) {
      let unit = units[u];
      if (!unit || Array.isArray(unit.items) === false) {
        continue;
      }
      for (let i = 0; i < unit.items.length; i = i + 1) {
        let it = unit.items[i];
        let new_qty = null;
        if (qty_map[u] && typeof qty_map[u][i] !== "undefined") {
          new_qty = qty_map[u][i];
        }
        if (new_qty !== null) {
          it.quantity = String(new_qty);
        }
      }
      recompute_unit_amount_value(unit);
    }

    set_session_basket_purchase_units(units).then(function () {
      resolve(true);
    });
  });
}

function clear_cart_and_persist() {
  return new Promise(function (resolve) {
    ensure_website_session();
    set_session_basket_purchase_units([]).then(function () {
      resolve(true);
    });
  });
}

function handle_click(event) {
  let t = event.target;

  if (t && t.matches("[data-remove]")) {
    event.preventDefault();
    let confirm_delete = window.confirm("Are you sure you want to delete your product(s)?");
    if (confirm_delete === true) {
      clear_cart_and_persist().then(function () {
        window.location.reload();
      });
    }
    return;
  }

  if (t && (t.matches("#update_cart_btn") || t.hasAttribute("data-update-cart"))) {
    update_cart_quantities_and_persist().then(function () {
      window.location.reload();
    });
    return;
  }
}

function init_cart_page() {
  if (cart_page_ready() === false) {
    return;
  }
  ensure_website_session();
  hydrate_cart_table_from_session();
  document.addEventListener("click", handle_click);
}

document.addEventListener("DOMContentLoaded", init_cart_page);
