async function onPayPalWebSdkLoaded() {
    try {
        const clientToken = await getBrowserSafeClientToken();
        const sdkInstance = await window.paypal.createInstance({
            clientToken,
            components: ["paypal-payments"],
            pageType: "checkout",
        });
        const paypalPaymentSession = sdkInstance.createPayPalOneTimePaymentSession(paymentSessionOptions);

        if (paypalPaymentSession.hasReturned()) {
            await paypalPaymentSession.resume();
        } else {
            setupPayPalButton(paypalPaymentSession);
            window.remove_loading?.();
        }
    } catch (error) {
        console.error(error);
    }
}

const paymentSessionOptions = {
    async onApprove(data) {
        console.log("onApprove", data);
        const orderData = await captureOrder({
            orderId: data.orderId,
        });
        console.log("Capture result", orderData);
        run_loading();
        set_session_transaction_payload(orderData).then(() => {
            const sid = typeof get_session_id === "function" ? get_session_id() : (window.website_session?.id || "");
            window.location.assign(`receipt.html?session=${encodeURIComponent(sid)}`);
        });

    },
    onCancel(data) {
        console.log("onCancel", data);
    },
    onError(error) {
        console.log("onError", error);
    },
};

async function setupPayPalButton(paypalPaymentSession) {
    document.addEventListener("click", async (event) => {
        if (event.target.tagName === "PAYPAL-BUTTON") {
            if (get_session_basket_purchase_units_items().length < 1) {
                update_session_from_ui(current_product_object).then(function () {
                    update_add_to_cart_cta_based_on_cart();
                });
            }
        const createOrderIdPromiseReference = createOrder();
        try {
            await paypalPaymentSession.start(
            { presentationMode: "direct-app-switch" },
            createOrderIdPromiseReference,
            );
        } catch (error) {
            console.error(error);
            await paypalPaymentSession.start(
            { presentationMode: "auto" },
            createOrderIdPromiseReference,
            );
        }
        }
    });
}