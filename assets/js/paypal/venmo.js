async function initVenmo() {
    //window.run_loading({id: "venmo"});
    const paymentMethods = await sdkInstance.findEligibleMethods({
        currencyCode: "USD",
    });
if (paymentMethods.isEligible("venmo")) {
    const venmoPaymentSession = sdkInstance.createVenmoOneTimePaymentSession(
        paymentSessionOptions("venmo"),
    );

    document.addEventListener("click", async (event) => {
        if (event.target.tagName === "VENMO-BUTTON") {
            if (get_session_basket_purchase_units_items().length < 1) {
                await update_session_from_ui(current_product_object).then(function() {
                    update_add_to_cart_cta_based_on_cart();
                });
            }
            const createOrderIdPromiseReference = createOrder("venmo");
            try {
                await venmoPaymentSession.start({
                        presentationMode: "auto"
                    },
                    createOrderIdPromiseReference,
                );
            } catch (error) {
                console.error(error);
                //window.remove_loading?.({ id: "venmo" });
            }
        }
        //window.remove_loading?.({ id: "venmo" });
    });
}
}