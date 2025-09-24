async function initMessages() {
    // Only required line is this one from the SDK:
    sdkInstance.createPayPalMessages();

    // The rest of this doc is simply wiring up the total amount value to the element "amount" attribute, which you can construct any other way
    addAmountEventListener();

  // Optionally, set initial amount from session on first load (PayPal has autoload already)
  setTimeout(() => {
    try {
      let pu0 = get_session_basket_purchase_units()[0];
      let total_amount = pu0.amount.value;
      let unit_amount = pu0.items[0].unit_amount.value;
      let notify_payload = { total_amount: total_amount, unit_amount: unit_amount };
      setMessagesAmount(notify_payload);
    } catch {}
  }, 1000);

}

function addAmountEventListener() {
  window.addEventListener("website_session:amount", function (e) {
    let payload = e && e.detail;
    if (!payload) return;
    setMessagesAmount(payload);
  });
}

function setMessagesAmount(payload) {
  let total = payload && payload.total_amount;
  let unit = payload && payload.unit_amount;
  if (typeof total === "undefined" || total === null) total = "";
  if (typeof unit === "undefined" || unit === null) unit = total;

  let els = document.querySelectorAll("paypal-message");
  els.forEach(function (el) {
    let locAttr = el.getAttribute("location");
    let loc = "";
    if (typeof locAttr === "string") loc = locAttr.toLowerCase();
    let valueToUse = total;
    if (loc === "product") valueToUse = unit;
    el.setAttribute("amount", String(valueToUse));
  });
}