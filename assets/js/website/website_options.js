function make_default_products() {
  let default_products_array = [
    {
      id: "WID-001",
      name: "Widget",
      description: "Your typical widget",
      default_price: {
        currency_code: "USD",
        value: "49.00"
      },
      models: [
        {
          id: "test",
          label: "Testing",
          price: {
            currency_code: "USD",
            value: "0.05"
          }
        },
        {
          id: "standard",
          label: "Standard",
          price: {
            currency_code: "USD",
            value: "49.00"
          }
        },
        {
          id: "premium",
          label: "Premium",
          price: {
            currency_code: "USD",
            value: "69.00"
          }
        }
      ],
      colors: ["Black", "White", "Red", "Blue", "Green"]
    }
  ];
  return default_products_array;
}

function make_default_shipping_options() {
  let default_shipping_options_array = [
    { id: "free", name: "Free Shipping", price: "0.00" },
    { id: "standard", name: "Standard Shipping", price: "7.00" },
    { id: "express", name: "Express Shipping", price: "15.00" }
  ];
  return default_shipping_options_array;
}

async function set_website_products() {
  if (Array.isArray(window.website_products) === false) {
    window.website_products = [];
  }

  let products_database_url = "";
  try {
    products_database_url = document_variable_products_database_url;
  } catch (e) {
    products_database_url = "";
  }

  let loaded_products_array = null;

  if (typeof products_database_url === "string") {
    if (products_database_url.trim().length > 0) {
      try {
        let response = await fetch(products_database_url, { method: "GET", headers: { "Accept": "application/json" } });
        if (response.ok === true) {
          let response_json = await response.json();
          if (Array.isArray(response_json) === true) {
            loaded_products_array = response_json;
          } else if (response_json && typeof response_json === "object") {
            if (Array.isArray(response_json.items) === true) {
              loaded_products_array = response_json.items;
            }
          }
        }
      } catch (e) {
      }
    }
  }

  if (Array.isArray(loaded_products_array) === true) {
    for (let i = 0; i < loaded_products_array.length; i = i + 1) {
      window.website_products.push(loaded_products_array[i]);
    }
  } else {
    let default_products_array = make_default_products();
    for (let j = 0; j < default_products_array.length; j = j + 1) {
      window.website_products.push(default_products_array[j]);
    }
  }

  return window.website_products;
}

function get_website_products() {
  if (Array.isArray(window.website_products) === true) {
    return window.website_products;
  } else {
    return [];
  }
}

async function set_website_shipping_options() {
  if (Array.isArray(window.website_shipping_options) === false) {
    window.website_shipping_options = [];
  }

  let shipping_options_database_url = "";
  try {
    shipping_options_database_url = document_variable_shipping_options_database_url;
  } catch (e) {
    shipping_options_database_url = "";
  }

  let loaded_shipping_options_array = null;

  if (typeof shipping_options_database_url === "string") {
    if (shipping_options_database_url.trim().length > 0) {
      try {
        let response = await fetch(shipping_options_database_url, { method: "GET", headers: { "Accept": "application/json" } });
        if (response.ok === true) {
          let response_json = await response.json();
          if (Array.isArray(response_json) === true) {
            loaded_shipping_options_array = response_json;
          } else if (response_json && typeof response_json === "object") {
            if (Array.isArray(response_json.options) === true) {
              loaded_shipping_options_array = response_json.options;
            }
          }
        }
      } catch (e) {
      }
    }
  }

  if (Array.isArray(loaded_shipping_options_array) === true) {
    for (let i = 0; i < loaded_shipping_options_array.length; i = i + 1) {
      window.website_shipping_options.push(loaded_shipping_options_array[i]);
    }
  } else {
    let default_shipping_options_array = make_default_shipping_options();
    for (let j = 0; j < default_shipping_options_array.length; j = j + 1) {
      window.website_shipping_options.push(default_shipping_options_array[j]);
    }
  }

  return window.website_shipping_options;
}

function get_website_shipping_options() {
  if (Array.isArray(window.website_shipping_options) === true) {
    return window.website_shipping_options;
  } else {
    return [];
  }
}
set_website_shipping_options();