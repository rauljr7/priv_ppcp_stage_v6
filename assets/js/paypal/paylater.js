async function initPayLater() {
    //window.run_loading({id: "paylater"});
    const paylaterPaymentSession = sdkInstance.createPayPalOneTimePaymentSession(paymentSessionOptions("paypal"));
    if (paylaterPaymentSession.hasReturned()) {
        await paylaterPaymentSession.resume();
    } else {
        let paymentMethods = await sdkInstance.findEligibleMethods({
            currencyCode: "USD",
        });
        if (paymentMethods.isEligible("paylater")) {
        const paylaterPaymentMethodDetails = paymentMethods.getDetails("paylater");
        setupPayLaterButton(sdkInstance, paylaterPaymentMethodDetails);
        }
    }
}

async function setupPayLaterButton(sdkInstance, paylaterPaymentMethodDetails) {
  const paylaterPaymentSession = sdkInstance.createPayLaterOneTimePaymentSession(paymentSessionOptions("paypal"));
  const { productCode, countryCode } = paylaterPaymentMethodDetails;
  const paylaterButton = document.querySelector("paypal-pay-later-button");

  paylaterButton.productCode = productCode;
  paylaterButton.countryCode = countryCode;

    document.addEventListener("click", async (event) => {
        if (event.target.tagName === "PAYPAL-PAY-LATER-BUTTON") {
        if (get_session_basket_purchase_units_items().length < 1) {
            await update_session_from_ui(current_product_object).then(function () {
                update_add_to_cart_cta_based_on_cart();
            });
        }
        const createOrderIdPromiseReference = createOrder();
        try {
            await paylaterPaymentSession.start(
            { presentationMode: "auto" },
            createOrderIdPromiseReference,
            );
        } catch (error) {
            console.error(error);
            //window.remove_loading?.({ id: "paylater" });
        }
        }
    });
    //window.remove_loading?.({ id: "paylater" });
}