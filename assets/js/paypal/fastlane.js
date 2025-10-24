async function initFastLane() {
  fastlane.setLocale("en_us");
  // Render Fastlane watermark
  const fastlaneWatermark = await fastlane.FastlaneWatermarkComponent({
    includeAdditionalInfo: true,
  });
  fastlaneWatermark.render("#watermark-container");
  // Handle email submission
  const email_input = document.getElementById("contact_email_input");
  email_input.addEventListener("input", async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_input.value)) {
      console.warn("Invalid email format");
      return;
    }
    const {
      customerContextId
    } = await fastlane.identity.lookupCustomerByEmail(email_input.value);
    let shouldRenderFastlaneMemberExperience = false;
    let profileData;
    if (customerContextId) {
      const response = await fastlane.identity.triggerAuthenticationFlow(customerContextId);
      if (response.authenticationState === "succeeded") {
        shouldRenderFastlaneMemberExperience = true;
        profileData = response.profileData;
      }
    }
    // Route to appropriate experience
    if (shouldRenderFastlaneMemberExperience) {
      renderFastlaneMemberExperience(profileData);
    } else {
      renderFastlaneGuestExperience();
    }
  });
}

function setShippingAddressDisplay(shippingAddress) {
  const {
    name: { fullName },
    address: { addressLine1, adminArea2, adminArea1, postalCode },
  } = shippingAddress;
  console.log(`<b>${fullName}</b><br><b>${adminArea2}</b><br><b>${adminArea1}</b><br><b>${postalCode}</b>`);
}

async function renderFastlaneMemberExperience(profileData) {
  if (profileData.shippingAddress) {
    setShippingAddressDisplay(profileData.shippingAddress);
    // Allow address changes
    const changeAddressButton = document.getElementById("change-shipping-button");
    changeAddressButton.addEventListener("click", async () => {
      const {
        selectedAddress,
        selectionChanged
      } = await fastlane.profile.showShippingAddressSelector();
      if (selectionChanged) {
        profileData.shippingAddress = selectedAddress;
        setShippingAddressDisplay(profileData.shippingAddress);
      }
    });
    // Render payment component with shipping address
    const fastlanePaymentComponent = await fastlane.FastlanePaymentComponent({
      options: {},
      shippingAddress: profileData.shippingAddress,
    });
    fastlanePaymentComponent.render("#payment-container");
  }
}

async function renderFastlaneGuestExperience() {
  const cardTestingInfo = document.getElementById("card-testing-info");
  cardTestingInfo.removeAttribute("hidden");
  const FastlanePaymentComponent = await fastlane.FastlanePaymentComponent({});
  await FastlanePaymentComponent.render("#card-container");
}

async function createOrder(paymentToken) {
  const response = await fetch("/paypal-api/checkout/orders/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PayPal-Request-Id": Date.now().toString(),
    },
    body: JSON.stringify({
      paymentSource: {
        card: {
          singleUseToken: paymentToken,
        },
      },
      purchaseUnits: [
        {
          amount: {
            currencyCode: "USD",
            value: "10.00",
            breakdown: {
              itemTotal: {
                currencyCode: "USD",
                value: "10.00",
              },
            },
          },
        },
      ],
      intent: "CAPTURE",
    }),
  });
  const orderResponse = await response.json();

  return orderResponse;
}