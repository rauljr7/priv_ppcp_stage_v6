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
    shippingOptions: window.website_shipping_options.map((o,i)=>(
      { id:`${String(i+1).padStart(3,"0")}`,
      label:`$${(parseFloat(o.price)||0).toFixed(2)}`
    }))
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
    const orderPayload = createOrder();

    const { status } = await googlePaySession.confirmOrder({
      orderId: orderPayload.orderId,
      paymentMethodData: paymentData.paymentMethodData,
    });

    if (status !== "PAYER_ACTION_REQUIRED") {
      const orderData = await captureOrder({ orderId: id });
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

  if (payment_data.callbackTrigger === 'SHIPPING_OPTION') {
      let selected_option_id = payment_data.shippingOptionData.id;
      let available_options = gpay_payment_data_request.shippingOptionParameters.shippingOptions;
      let selected_option = available_options.find(option => option.id === selected_option_id);
      let shipping_cost = parseFloat(selected_option.label.replace(/[^0-9.]/g, ''));
      let basket_subtotal = parseFloat(get_basket_item_total());
      let combined_total = (basket_subtotal + shipping_cost).toFixed(2);
      let base_transaction_info = build_google_transaction_info(
          gpay_payment_data_request.transactionInfo.countryCode
      );
      base_transaction_info.totalPrice = combined_total;
      base_transaction_info.totalPriceStatus = 'FINAL';
      response_update.newTransactionInfo = base_transaction_info;
      response_update.newShippingOptionParameters = {
          defaultSelectedOptionId: selected_option_id,
          shippingOptions: available_options
      };
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