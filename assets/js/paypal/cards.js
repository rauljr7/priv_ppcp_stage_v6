async function initCards() {
  try {
    window.run_loading({id: "card-fields", message: "Loading Card Fields..."});
    let paymentMethodsForCards = await sdkInstance.findEligibleMethods();
    let isCardFieldsEligible = paymentMethodsForCards.isEligible("advanced_cards");
    if (isCardFieldsEligible) {
      await setupCardFields(sdkInstance);
    } else {
      window.remove_loading?.({ id: "card-fields" });
    }
  } catch (err) {
    window.remove_loading?.({ id: "card-fields" });
    console.error("SDK init failed", err);
  }
}

async function setupCardFields(sdk) {
  let cardSession = sdk.createCardFieldsOneTimePaymentSession();

  let numberField = cardSession.createCardFieldsComponent({
    type: "number",
    placeholder: "Card number",
  });

  let expiryField = cardSession.createCardFieldsComponent({
    type: "expiry",
    placeholder: "MM/YY",
  });

  let cvvField = cardSession.createCardFieldsComponent({
    type: "cvv",
    placeholder: "CVV",
  });


  document.querySelector("#paypal-card-fields-number").appendChild(numberField);
  document.querySelector("#paypal-card-fields-expiry").appendChild(expiryField);
  document.querySelector("#paypal-card-fields-cvv").appendChild(cvvField);

  document.addEventListener("click", async (event) => {
      if (event.target.getAttribute("id") === "summary_place_order_btn") {
          try {
          let orderPayload = await createOrder("card");
          let billing_information_from_session = get_session_billing_information();
          const { data, state } = await cardSession.submit(orderPayload.orderId, {
            billingAddress: {
              addressLine1: billing_information_from_session.address_line_1,
              addressLine2: "",
              adminArea1: billing_information_from_session.state_province,
              adminArea2: billing_information_from_session.city,
              countryCode: billing_information_from_session.country,
              postalCode: billing_information_from_session.postal_code
            }
          });

          switch (state) {
            case "succeeded": {
              run_loading({id: "card-fields", message: "Processing Payment..."});
              let orderData = await captureOrder({ orderId: orderPayload.orderId });
              set_session_transaction_payload(orderData).then(() => {
                  let sid = get_session_id();
                  window.location.assign(`receipt.html?session=${encodeURIComponent(sid)}`);
              });
              // TODO: show success UI, redirect, etc.
              break;
            }
            case "canceled": {
              // Buyer dismissed 3DS modal or canceled the flow
              // TODO: show non-blocking message & allow retry
              break;
            }
            case "failed": {
              // Validation or processing failure. data.message may be present
              console.error("Card submission failed", data);
              // TODO: surface error to buyer, allow retry
              break;
            }
            default: {
              // Future-proof for other states (e.g., pending)
              console.warn("Unhandled submit state", state, data);
            }
          }
        } catch (err) {
          console.error("Payment flow error", err);
          window.remove_loading?.({ id: "card-fields" });
          // TODO: Show generic error and allow retry
        }
      }

  });
  window.remove_loading?.({ id: "card-fields" });
}