
async function setupApplepay() {
  const applepay = paypal.Applepay();
  const {
    isEligible,
    countryCode,
    currencyCode,
    merchantCapabilities,
    supportedNetworks,
  } = await applepay.config();


  if (!isEligible) {
    throw new Error("applepay is not eligible");
  }

  document.getElementById("applepay-container").innerHTML =
    '<apple-pay-button id="btn-appl" buttonstyle="black" type="buy" locale="en">';

  document.getElementById("btn-appl").addEventListener("click", onClick);

  async function onClick() {
    console.log({ merchantCapabilities, currencyCode, supportedNetworks })

    const paymentRequest = {
      countryCode: 'CN',
      currencyCode: 'USD',
      merchantCapabilities,
      supportedNetworks,
      requiredBillingContactFields: [
        "name",
        "phone",
        "email",
        "postalAddress",
      ],
      requiredShippingContactFields: [
      ],
      total: {
        label: "Demo (Card is not charged)",
        amount: "10.00",
        type: "final",
      },
    };

    // eslint-disable-next-line no-undef
    let session = new ApplePaySession(4, paymentRequest);
    console.log("[1] Session Create")
    session.onvalidatemerchant = (event) => {
      applepay
        .validateMerchant({
          validationUrl: event.validationURL,
        })
        .then((payload) => {
          session.completeMerchantValidation(payload.merchantSession);
        })
        .catch((err) => {
          console.error(err);
          session.abort();
        });
    };
    console.log("[1] Merchant Validate Complete")
    session.onpaymentmethodselected = () => {
      session.completePaymentMethodSelection({
        newTotal: paymentRequest.total,
      });
    };
    console.log("[1]")
    const isVault = document.getElementById("is-vault").checked;

    session.onpaymentauthorized = async (event) => {

      console.log('Your billing address is:', event.payment.billingContact);
      console.log('Your shipping address is:', event.payment.shippingContact);
      try {
        /* Create Order on the Server Side */
        const orderResponse = await fetch(`/api/orders?isVault=${isVault}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!orderResponse.ok) {
          throw new Error("error creating order")
        }

        const { id } = await orderResponse.json()
        console.log({ id })
        /**
         * Confirm Payment 
         */
        debugger;
        await applepay.confirmOrder({ orderId: id, token: event.payment.token, billingContact: event.payment.billingContact, shippingContact: event.payment.shippingContact });
        debugger;
        /*
        * Capture order (must currently be made on server)
        */
        console.log(event.payment.token, event.payment.billingContact, event.payment.shippingContact)
        await fetch(`/api/orders/${id}/capture`, {
          method: 'POST',
        });

        session.completePayment({
          status: window.ApplePaySession.STATUS_SUCCESS,
        });
      } catch (err) {
        console.error(err);
        session.completePayment({
          status: window.ApplePaySession.STATUS_FAILURE,
        });
      }
    };

    session.oncancel = () => {
      console.log("Apple Pay Cancelled !!")
    }

    session.begin();
  }
}

document.addEventListener("DOMContentLoaded", () => {

  // eslint-disable-next-line no-undef
  if (ApplePaySession?.supportsVersion(4) && ApplePaySession?.canMakePayments()) {
    setupApplepay().catch(console.error);
  }
});
