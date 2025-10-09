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

  let payButton = document.querySelector("#pay-button");
  window.remove_loading?.({ id: "card-fields" });
}