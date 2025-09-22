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