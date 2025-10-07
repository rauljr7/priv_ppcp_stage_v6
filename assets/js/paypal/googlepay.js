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
  paymentDataRequest.shippingOptionParameters = {
    shippingOptions: window.website_shipping_options.map((o,i)=>({ id:(o.id||String(i+1).padStart(3,"0")), label:(o.name||`Option ${i+1}`) }))
  };
  if (get_session_selected_shipping_id() !== "") {
    paymentDataRequest.shippingOptionParameters.defaultSelectedOptionId = get_session_selected_shipping_id();
  }
  console.log(paymentDataRequest);

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
    const orderPayload = await createOrder();

    console.log(orderPayload);

    const { status } = await googlePaySession.confirmOrder({
      orderId: orderPayload.orderId,
      paymentMethodData: paymentData.paymentMethodData,
    });

    if (status !== "PAYER_ACTION_REQUIRED") {
      const orderData = await captureOrder({ orderId: orderPayload.orderId });
      console.log(JSON.stringify(orderData, null, 2));
    }

    return { transactionState: "SUCCESS" };
  } catch (err) {
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

  if (payment_data && payment_data.callbackTrigger === "SHIPPING_OPTION") {
    let selected_id = "";
    if (payment_data.shippingOptionData && typeof payment_data.shippingOptionData.id === "string") {
      selected_id = payment_data.shippingOptionData.id;
    }

    if (selected_id) {
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
    }
  }

  if (payment_data.callbackTrigger === 'SHIPPING_ADDRESS') {
      let country_code = payment_data.shippingAddress.countryCode;
      if (country_code !== 'US') {
          response_update.error = {
              reason: 'SHIPPING_ADDRESS_UNSERVICEABLE',
              message: 'Sorry, we only ship within the U.S.',
              intent: 'SHIPPING_ADDRESS'
          };
      } else {
          let shipping_array = await fetch_shipping_options();
          let remapped_parameters = remap_shipping_for_gpay(shipping_array);
          response_update.newShippingOptionParameters = remapped_parameters;
          let default_option_id = remapped_parameters.defaultSelectedOptionId;
          let default_option = remapped_parameters.shippingOptions.find(option => option.id === default_option_id);
          let shipping_cost = parseFloat(default_option.label.replace(/[^0-9.]/g, ''));
          let basket_subtotal = parseFloat(get_basket_item_total());
          let combined_total = (basket_subtotal + shipping_cost).toFixed(2);
          let base_transaction_info = build_google_transaction_info(
              gpay_payment_data_request.transactionInfo.countryCode
          );
          base_transaction_info.totalPrice = combined_total;
          base_transaction_info.totalPriceStatus = 'FINAL';
          response_update.newTransactionInfo = base_transaction_info;
      }
  }

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
        onClick: () =>
          onGooglePayButtonClick(
            purchaseAmount,
            paymentsClient,
            googlePayConfig,
          ),
      });

      document.getElementById("googlepay-button-container").appendChild(button);
    }
  } catch (error) {
    console.error("Setup error:", error);
  }
}