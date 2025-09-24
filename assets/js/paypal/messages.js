async function initMessages() {
    // Only required line is this one from the SDK:
    const messagesInstance = sdkInstance.createPayPalMessages();
    addAmountEventListener();

    const content = await messagesInstance.fetchContent({
      onReady: (content) => {
        let total_amount = get_session_basket_purchase_units()[0].amount.value;
        let unit_amount = get_session_basket_purchase_units()[0].items[0].unit_amount.value;
        let notify_payload = { total_amount: total_amount, unit_amount: unit_amount };
        console.log(notify_payload);
        setMessagesAmount(notify_payload);
      },
    });

    // The rest of this doc is simply wiring up the total amount value to the element "amount" attribute, which you can construct any other way
}

function addAmountEventListener() {
  window.addEventListener("website_session:amount", function (e) {
    let payload = e && e.detail;
    if (!payload) return;
    setMessagesAmount(payload);
  });
}

function setMessagesAmount(payload) {
  console.log("going to set messages amount");
  let total = payload && payload.total_amount;
  let unit = payload && payload.unit_amount;
  if (typeof total === "undefined" || total === null) total = "";
  if (typeof unit === "undefined" || unit === null) unit = total;

  let els = document.querySelectorAll("paypal-message");
  els.forEach(function (el) {
  console.log("iterating through messages amount");
    let locAttr = el.getAttribute("location");
    let loc = "";
    if (typeof locAttr === "string") loc = locAttr.toLowerCase();
    let valueToUse = total;
    if (loc === "product") valueToUse = unit;
    el.setAttribute("amount", String(valueToUse));
  });
}