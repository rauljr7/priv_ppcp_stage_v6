async function initGooglePay() {
  try {
    setupGooglePayButton(sdkInstance);
  } catch (error) {
    console.error(error);
  }
}

function getGoogleTransactionInfo(purchaseAmount, countryCode) {
  const totalAmount = parseFloat(purchaseAmount);
  const subtotal = (totalAmount * 0.9).toFixed(2);
  const tax = (totalAmount * 0.1).toFixed(2);

  return {
    displayItems: [
      {
        label: "Widget",
        type: "SUBTOTAL",
        price: get_session_subtotal_value(),
      },
      /* {
        label: "Tax",
        type: "TAX",
        price: tax,
      }, */
    ],
    countryCode: countryCode,
    currencyCode: "USD",
    totalPriceStatus: "FINAL",
    totalPrice: get_session_total_value(),
    totalPriceLabel: "Total",
  };
}

async function getGooglePaymentDataRequest(purchaseAmount, googlePayConfig) {
  const {
    allowedPaymentMethods,
    merchantInfo,
    apiVersion,
    apiVersionMinor,
    countryCode,
  } = googlePayConfig;

  const baseRequest = {
    apiVersion,
    apiVersionMinor,
  };
  const paymentDataRequest = Object.assign({}, baseRequest);

  paymentDataRequest.allowedPaymentMethods = allowedPaymentMethods;
  paymentDataRequest.shippingOptionRequired  = true;
  paymentDataRequest.shippingAddressRequired = true;
  paymentDataRequest.shippingAddressParameters = {
    allowedCountryCodes: ['US'],
    phoneNumberRequired: true
  };
  // Update shipping options from session (Which should have been obtained from server)
  paymentDataRequest.shippingOptionParameters = {
    shippingOptions: window.website_shipping_options.map((o,i)=>({ id:(o.id||String(i+1).padStart(3,"0")), label:(o.name||`Option ${i+1}`) }))
  };
  if (get_session_selected_shipping_id() !== "") {
    paymentDataRequest.shippingOptionParameters.defaultSelectedOptionId = get_session_selected_shipping_id();
  }

  paymentDataRequest.transactionInfo = getGoogleTransactionInfo(
    purchaseAmount,
    countryCode,
  );

  paymentDataRequest.merchantInfo = merchantInfo;
  paymentDataRequest.callbackIntents = ["PAYMENT_AUTHORIZATION", "SHIPPING_OPTION", "SHIPPING_ADDRESS"];

  return paymentDataRequest;
}

async function onPaymentAuthorized(
  purchaseAmount,
  paymentData,
  googlePaySession,
) {
  try {
    const orderPayload = await createOrder("google-pay");

    const { status } = await googlePaySession.confirmOrder({
      orderId: orderPayload.orderId,
      paymentMethodData: paymentData.paymentMethodData,
    });

    if (status !== "PAYER_ACTION_REQUIRED") {
      const orderData = await captureOrder({ orderId: orderPayload.orderId });
      run_loading({id: "google-pay", message: "Processing Payment..."});
      set_session_transaction_payload(orderData).then(() => {
          let sid = get_session_id();
          window.location.assign(`receipt.html?session=${encodeURIComponent(sid)}`);
      });
      console.log(JSON.stringify(orderData, null, 2));
    }

    return { transactionState: "SUCCESS" };
  } catch (err) {
    window.remove_loading?.({ id: "google-pay" });
    console.error("Payment authorization error:", err);
    return {
      transactionState: "ERROR",
      error: {
        message: err.message,
      },
    };
  }
}

async function onGooglePayButtonClick(
  purchaseAmount,
  paymentsClient,
  googlePayConfig,
) {
  try {
    const paymentDataRequest = await getGooglePaymentDataRequest(
      purchaseAmount,
      googlePayConfig,
    );

    paymentsClient.loadPaymentData(paymentDataRequest);
  } catch (error) {
    console.error(error);
  }
}

async function onPaymentDataChanged(payment_data) {
  let response_update = {};
  let trigger = "";
  if (payment_data && typeof payment_data.callbackTrigger === "string") {
    trigger = payment_data.callbackTrigger;
  }

  if (trigger === "SHIPPING_OPTION") {
    response_update = await handle_google_pay_shipping_options_change(payment_data);
  } else if (trigger === "SHIPPING_ADDRESS") {
    response_update = await handle_google_pay_shipping_address_change(payment_data);
  }
  // Google Pay's payload to be remapped to PayPal's for the session
  await remap_google_payload_to_session(payment_data);
  return response_update;
}

async function setupGooglePayButton(sdkInstance) {
  const googlePaySession = sdkInstance.createGooglePayOneTimePaymentSession();
  const purchaseAmount = get_session_total_value();

  try {
    const paymentsClient = new google.payments.api.PaymentsClient({
      environment: "TEST", // Change to "PRODUCTION" for live transactions
      paymentDataCallbacks: {
        onPaymentAuthorized: (paymentData) => {
          return onPaymentAuthorized(purchaseAmount, paymentData, googlePaySession);
        },
        onPaymentDataChanged: onPaymentDataChanged
      },
    });

    const googlePayConfig = await googlePaySession.getGooglePayConfig();

    const isReadyToPay = await paymentsClient.isReadyToPay({
      allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
      apiVersion: googlePayConfig.apiVersion,
      apiVersionMinor: googlePayConfig.apiVersionMinor,
    });

    if (isReadyToPay.result) {
      const button = paymentsClient.createButton({
        onClick: async () => {
          if (get_session_basket_purchase_units_items().length < 1) {
              await update_session_from_ui(current_product_object).then(function () {
                  update_add_to_cart_cta_based_on_cart();
              });
          }
          onGooglePayButtonClick(
            purchaseAmount,
            paymentsClient,
            googlePayConfig,
          );
        }
      });

      document.getElementById("googlepay-button-container").appendChild(button);
    }
  } catch (error) {
    console.error("Setup error:", error);
  }
}

// Helper functions

function remap_google_payload_to_session(payment_data) {
  return new Promise(function (resolve) {
    let ops = [];

    let contact_patch = {};
    if (payment_data && typeof payment_data.emailAddress === "string" && payment_data.emailAddress) {
      contact_patch.email = payment_data.emailAddress;
    } else if (payment_data && typeof payment_data.email === "string" && payment_data.email) {
      contact_patch.email = payment_data.email;
    }
    if (Object.keys(contact_patch).length > 0) {
      ops.push(set_session_contact_information(contact_patch));
    }

    let shipping_patch = {};
    let shipping_has = false;
    let ship = null;
    if (payment_data && payment_data.shippingAddress && typeof payment_data.shippingAddress === "object") {
      ship = payment_data.shippingAddress;
    }
    if (ship) {
      if (typeof ship.name === "string" && ship.name) {
        shipping_patch.full_name = ship.name;
        shipping_has = true;
      } else if (typeof ship.recipientName === "string" && ship.recipientName) {
        shipping_patch.full_name = ship.recipientName;
        shipping_has = true;
      }
      if (typeof ship.address1 === "string" && ship.address1) {
        shipping_patch.address_line_1 = ship.address1;
        shipping_has = true;
      } else if (typeof ship.addressLine1 === "string" && ship.addressLine1) {
        shipping_patch.address_line_1 = ship.addressLine1;
        shipping_has = true;
      }
      if (typeof ship.address2 === "string" && ship.address2) {
        shipping_patch.address_line_2 = ship.address2;
        shipping_has = true;
      } else if (typeof ship.addressLine2 === "string" && ship.addressLine2) {
        shipping_patch.address_line_2 = ship.addressLine2;
        shipping_has = true;
      }
      if (typeof ship.locality === "string" && ship.locality) {
        shipping_patch.city = ship.locality;
        shipping_has = true;
      }
      if (typeof ship.administrativeArea === "string" && ship.administrativeArea) {
        shipping_patch.state_province = ship.administrativeArea;
        shipping_has = true;
      }
      if (typeof ship.postalCode === "string" && ship.postalCode) {
        shipping_patch.postal_code = ship.postalCode;
        shipping_has = true;
      }
      if (typeof ship.countryCode === "string" && ship.countryCode) {
        shipping_patch.country = ship.countryCode;
        shipping_has = true;
      }
      if (typeof ship.phoneNumber === "string" && ship.phoneNumber) {
        shipping_patch.phone = ship.phoneNumber;
        shipping_has = true;
      }
      if (shipping_has) {
        ops.push(set_session_shipping_information(shipping_patch));
      }
    }

    let billing_patch = {};
    let billing_has = false;
    let bill = null;
    if (payment_data && payment_data.billingAddress && typeof payment_data.billingAddress === "object") {
      bill = payment_data.billingAddress;
    } else if (
      payment_data &&
      payment_data.paymentMethodData &&
      payment_data.paymentMethodData.info &&
      typeof payment_data.paymentMethodData.info.billingAddress === "object"
    ) {
      bill = payment_data.paymentMethodData.info.billingAddress;
    }
    if (bill) {
      if (typeof bill.name === "string" && bill.name) {
        billing_patch.full_name = bill.name;
        billing_has = true;
      } else if (typeof bill.recipientName === "string" && bill.recipientName) {
        billing_patch.full_name = bill.recipientName;
        billing_has = true;
      }
      if (typeof bill.address1 === "string" && bill.address1) {
        billing_patch.address_line_1 = bill.address1;
        billing_has = true;
      } else if (typeof bill.addressLine1 === "string" && bill.addressLine1) {
        billing_patch.address_line_1 = bill.addressLine1;
        billing_has = true;
      }
      if (typeof bill.address2 === "string" && bill.address2) {
        billing_patch.address_line_2 = bill.address2;
        billing_has = true;
      } else if (typeof bill.addressLine2 === "string" && bill.addressLine2) {
        billing_patch.address_line_2 = bill.addressLine2;
        billing_has = true;
      }
      if (typeof bill.locality === "string" && bill.locality) {
        billing_patch.city = bill.locality;
        billing_has = true;
      }
      if (typeof bill.administrativeArea === "string" && bill.administrativeArea) {
        billing_patch.state_province = bill.administrativeArea;
        billing_has = true;
      }
      if (typeof bill.postalCode === "string" && bill.postalCode) {
        billing_patch.postal_code = bill.postalCode;
        billing_has = true;
      }
      if (typeof bill.countryCode === "string" && bill.countryCode) {
        billing_patch.country = bill.countryCode;
        billing_has = true;
      }
      if (typeof bill.phoneNumber === "string" && bill.phoneNumber) {
        billing_patch.phone = bill.phoneNumber;
        billing_has = true;
      }
      if (billing_has) {
        ops.push(set_session_billing_information(billing_patch));
      }
    }

    if (ops.length > 0) {
      Promise.all(ops).then(function () { resolve(true); }).catch(function () { resolve(false); });
    } else {
      resolve(false);
    }
  });
}

async function handle_google_pay_shipping_options_change(payment_data) {
  let response_update = {};

  let selected_id = "";
  if (payment_data && payment_data.shippingOptionData && typeof payment_data.shippingOptionData.id === "string") {
    selected_id = payment_data.shippingOptionData.id;
  }

  if (!selected_id) {
    return response_update;
  }

  await set_session_selected_shipping(selected_id);

  let pu_list = get_session_basket_purchase_units();
  let pu0 = Array.isArray(pu_list) && pu_list.length ? pu_list[0] : {};
  let total_price = "0.00";
  let currency_code = "USD";

  if (pu0 && pu0.amount && typeof pu0.amount.value === "string") {
    total_price = pu0.amount.value;
  }
  if (pu0 && pu0.amount && typeof pu0.amount.currency_code === "string") {
    currency_code = pu0.amount.currency_code;
  }

  let shipping_options = [];
  if (Array.isArray(window.website_shipping_options) === true) {
    for (let i = 0; i < window.website_shipping_options.length; i = i + 1) {
      let o = window.website_shipping_options[i] || {};
      let id_val = "";
      if (typeof o.id === "string" && o.id.length > 0) {
        id_val = o.id;
      } else {
        id_val = String(i + 1).padStart(3, "0");
      }
      let label_val = "";
      if (typeof o.name === "string" && o.name.length > 0) {
        label_val = o.name;
      } else {
        label_val = "Option " + (i + 1);
      }
      shipping_options.push({ id: id_val, label: label_val });
    }
  }

  response_update.newTransactionInfo = {
    totalPrice: String(total_price),
    totalPriceStatus: "FINAL",
    currencyCode: currency_code
  };

  response_update.newShippingOptionParameters = {
    defaultSelectedOptionId: selected_id,
    shippingOptions: shipping_options
  };

  return response_update;
}

async function handle_google_pay_shipping_address_change(payment_data) {
  let response_update = {};

  let country_code = "";
  if (payment_data && payment_data.shippingAddress && typeof payment_data.shippingAddress.countryCode === "string") {
    country_code = payment_data.shippingAddress.countryCode;
  }

  if (country_code !== "US") {
    response_update.error = {
      reason: "SHIPPING_ADDRESS_UNSERVICEABLE",
      message: "Sorry, we only ship within the U.S.",
      intent: "SHIPPING_ADDRESS"
    };
    return response_update;
  }

  let shipping_options = [];
  if (Array.isArray(window.website_shipping_options) === true) {
    for (let i = 0; i < window.website_shipping_options.length; i = i + 1) {
      let o = window.website_shipping_options[i] || {};
      let id_val = "";
      if (typeof o.id === "string" && o.id.length > 0) {
        id_val = o.id;
      } else {
        id_val = String(i + 1).padStart(3, "0");
      }
      let label_val = "";
      if (typeof o.name === "string" && o.name.length > 0) {
        label_val = o.name;
      } else {
        label_val = "Option " + (i + 1);
      }
      shipping_options.push({ id: id_val, label: label_val });
    }
  }

  let default_id = "";
  if (typeof get_session_selected_shipping_id === "function") {
    default_id = get_session_selected_shipping_id();
  }
  if (!default_id && shipping_options.length > 0) {
    default_id = shipping_options[0].id;
  }

  if (default_id) {
    await set_session_selected_shipping(default_id);
  }

  let pu_list = get_session_basket_purchase_units();
  let pu0 = Array.isArray(pu_list) && pu_list.length ? pu_list[0] : {};
  let total_price = "0.00";
  let currency_code = "USD";
  if (pu0 && pu0.amount && typeof pu0.amount.value === "string") {
    total_price = pu0.amount.value;
  }
  if (pu0 && pu0.amount && typeof pu0.amount.currency_code === "string") {
    currency_code = pu0.amount.currency_code;
  }

  response_update.newShippingOptionParameters = {
    defaultSelectedOptionId: default_id,
    shippingOptions: shipping_options
  };

  response_update.newTransactionInfo = {
    totalPrice: String(total_price),
    totalPriceStatus: "FINAL",
    currencyCode: currency_code
  };

  return response_update;
}