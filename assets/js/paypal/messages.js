async function initMessages() {
    // Only required line is this one from the SDK:
    sdkInstance.createPayPalMessages();

    // The rest of this doc is simply wiring up the total amount value to the element "amount" attribute, which you can construct any other way
    addAmountEventListener();

  // optional: set initial amount from session on first load
  try {
    let initial_amount = get_session_basket_purchase_units()[0].amount.value;
    setMessagesAmount(initial_amount);
  } catch {}
}

function addAmountEventListener() {
  window.addEventListener("website_session:amount", (e) => {
    const newAmount = e?.detail;
    if (newAmount == null) return;
    setMessagesAmount(newAmount);
  });
}

function setMessagesAmount(amount) {
  const els = document.querySelectorAll("paypal-message");
  els.forEach((el) => {
    el.setAttribute("amount", String(amount));
  });
}
