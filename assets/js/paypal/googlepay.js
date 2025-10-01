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
  paymentDataRequest.transactionInfo = getGoogleTransactionInfo(
    purchaseAmount,
    countryCode,
  );

  paymentDataRequest.merchantInfo = merchantInfo;
  paymentDataRequest.callbackIntents = ["PAYMENT_AUTHORIZATION"];

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

async function setupGooglePayButton(sdkInstance) {
  const googlePaySession = sdkInstance.createGooglePayOneTimePaymentSession();
  const purchaseAmount = get_session_total_value();

  try {
    const paymentsClient = new google.payments.api.PaymentsClient({
      environment: "TEST", // Change to "PRODUCTION" for live transactions
      paymentDataCallbacks: {
        onPaymentAuthorized: (paymentData) =>
          onPaymentAuthorized(purchaseAmount, paymentData, googlePaySession),
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