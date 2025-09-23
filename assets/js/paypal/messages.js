async function initMessages() {
    sdkInstance.createPayPalMessages();
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
