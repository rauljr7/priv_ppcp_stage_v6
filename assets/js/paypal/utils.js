const get_client_token_endpoint = "https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-2b157b93-6e85-4f0d-b040-eccd1b257eef/default/ppcp-v6-endpoints?method=client_token";
const create_order_endpoint = "https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-2b157b93-6e85-4f0d-b040-eccd1b257eef/default/ppcp-v6-endpoints?method=create_order";
const capture_order_endpoint = "https://faas-sfo3-7872a1dd.doserverless.co/api/v1/web/fn-2b157b93-6e85-4f0d-b040-eccd1b257eef/default/ppcp-v6-endpoints?method=capture_order";

let sdkInstance;

async function getBrowserSafeClientToken() {
   return fetch(get_client_token_endpoint, {
      method: "GET",
      mode: "cors"
   }).then(function (res) {
      let ct = res.headers.get("content-type") || "";
      if (ct.indexOf("application/json") > -1) {
         return res.json();
      } else {
         return res.text();
      }
   }).then(function (data) {
      return data;
   }).catch(function (err) {
      console.error("client_token error:", err);
      throw err;
   });
}

function paymentSessionOptions(payment_Type) {
    let paymentSessionOptions = {
        async onApprove(data) {
            const orderData = await captureOrder({
                orderId: data.orderId,
            });
            run_loading({id: payment_Type});
            set_session_transaction_payload(orderData).then(() => {
                let sid = get_session_id();
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
    return paymentSessionOptions;
}

async function createOrder(payment_type) {
   let local_storage_website_session = JSON.parse(localStorage.getItem("website_session"));
   let orderPayload = {
      intent: "CAPTURE"
   };
   // https://developer.paypal.com/docs/api/orders/v2/#orders_create
   // https://developer.paypal.com/docs/api/orders/v2/#orders_create!ct=application/json&path=purchase_units&t=request
   orderPayload.purchase_units = local_storage_website_session.basket.purchase_units;

   let payment_method_query = "";
   if (payment_type) {
      payment_method_query = "&payment_type=" + payment_type;
   }
  let resp = await fetch(create_order_endpoint + payment_method_query, {
    method: "POST", headers: { "Content-Type": "application/json" }, mode: "cors",
    body: JSON.stringify(orderPayload)
  });

  let data = await resp.json();
  return { orderId: data && typeof data.id === "string" ? data.id : "" };
}

async function captureOrder({ orderId }) {
  const response = await fetch(capture_order_endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: orderId })
  });

  const data = await response.json();
  return data;
}

async function onPayPalWebSdkLoaded() {
   try {
      const clientToken = await getBrowserSafeClientToken();
      sdkInstance = await window.paypal.createInstance({
         clientToken,
         components: ["paypal-payments", "paypal-messages", "venmo-payments"]
      });
   } catch (error) {
      console.error(error);
   }
   if (typeof window.initPayPal === "function") {
      window.initPayPal();
   }
   if (typeof window.initMessages === "function") {
      window.initMessages();
   }
   if (typeof window.initVenmo === "function") {
      window.initVenmo();
   }
   if (typeof window.initPayLater === "function") {
      window.initPayLater();
   }
}