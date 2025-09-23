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
        const orderData = await captureOrder({
            orderId: data.orderId,
        });
        run_loading();
        set_session_transaction_payload(orderData).then(() => {
            let sid = get_session_id();
            window.location.assign(`receipt.html?session=${encodeURIComponent(sid)}`);
        });

    },
    onShippingAddressChange(data) {
        console.log("onShippingAddressChange", data);

        const countryCode = data?.shippingAddress?.countryCode ?? "US";
        if (countryCode !== "US") {
            throw new Error(data?.errors?.COUNTRY_ERROR);
        }

        return [
  {
    "id": "yolo",
    "label": "Yolo Shipping",
    "selected": false,
    "type": "SHIPPING",
    "amount": {
      "currency_code": "USD",
      "value": "0.00"
    }
  },
  {
    "id": "nono",
    "label": "Nono Shipping!!!",
    "selected": false,
    "type": "SHIPPING",
    "amount": {
      "currency_code": "USD",
      "value": "12.00"
    }
  },
  {
    "id": "dada",
    "label": "dada Shipping",
    "selected": true,
    "type": "SHIPPING",
    "amount": {
      "currency_code": "USD",
      "value": "25.00"
    }
  }
]
    },
    onShippingOptionsChange(data) {
        console.log("onShippingOptionsChange", data);

        const selectedShippingOption = data?.selectedShippingOption?.id;
        if (selectedShippingOption === "SHIP_UNV") {
            throw new Error(data?.errors?.METHOD_UNAVAILABLE);
        }
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
            await update_session_from_ui(current_product_object).then(function () {
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