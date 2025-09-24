async function initMessages() {
    // Only required line is this one from the SDK:
    sdkInstance.createPayPalMessages();

    // The rest of this doc is simply wiring up the total amount value to the element "amount" attribute, which you can construct any other way
    addAmountEventListener();

  // Optionally, set initial amount from session on first load (PayPal has autoload already)
  try {
    let initial_amount = get_session_basket_purchase_units()[0].amount.value;
    setMessagesAmount(initial_amount);
  } catch {}
}

function addAmountEventListener() {
  window.addEventListener("website_session:amount", function (e) {
    var payload = e && e.detail;
    if (!payload) return;
    setMessagesAmount(payload);
  });
}

function setMessagesAmount(payload) {
  var total = payload && payload.total_amount;
  var unit = payload && payload.unit_amount;
  if (typeof total === "undefined" || total === null) total = "";
  if (typeof unit === "undefined" || unit === null) unit = total;

  var els = document.querySelectorAll("paypal-message");
  els.forEach(function (el) {
    var locAttr = el.getAttribute("location");
    var loc = "";
    if (typeof locAttr === "string") loc = locAttr.toLowerCase();
    var valueToUse = total;
    if (loc === "product") valueToUse = unit;
    el.setAttribute("amount", String(valueToUse));
  });
}