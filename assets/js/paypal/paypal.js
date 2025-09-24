async function initPayPal() {
    const paypalPaymentSession = sdkInstance.createPayPalOneTimePaymentSession(paymentSessionOptions("paypal"));
    if (paypalPaymentSession.hasReturned()) {
        await paypalPaymentSession.resume();
    } else {
        setupPayPalButton(paypalPaymentSession);
    }
}

async function setupPayPalButton(paypalPaymentSession) {
    document.addEventListener("click", async (event) => {
        if (event.target.tagName === "PAYPAL-BUTTON") {
        if (get_session_basket_purchase_units_items().length < 1) {
            await update_session_from_ui(current_product_object).then(function () {
                update_add_to_cart_cta_based_on_cart();
            });
        }
        const createOrderIdPromiseReference = createOrder();
        try {
            await paypalPaymentSession.start(
            { presentationMode: "auto" },
            createOrderIdPromiseReference,
            );
        } catch (error) {
            console.error(error);
        }
        }
    });
    window.remove_loading?.({ id: "paypal" });
}