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
        console.log("获取金额中...");
        fetch("/getAmount", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((data) => data.json())
            .then((amount) => {
                console.log("获取金额成功, 金额为:", amount);

                console.log({
                    merchantCapabilities,
                    currencyCode,
                    supportedNetworks,
                });

                // const amount = await fetch("/getAmount", {
                //     method: "GET",
                //     headers: {
                //         "Content-Type": "application/json",
                //     },
                // });

                const paymentRequest = {
                    countryCode: "CN",
                    currencyCode: "USD",
                    merchantCapabilities,
                    supportedNetworks,
                    requiredBillingContactFields: [
                        "name",
                        "phone",
                        "email",
                        "postalAddress",
                    ],
                    requiredShippingContactFields: [],
                    total: {
                        label: "Demo (Card is not charged)",
                        amount: amount,
                        type: "final",
                    },
                };

                // eslint-disable-next-line no-undef
                let session = new ApplePaySession(4, paymentRequest);
                console.log("[1] Session Create");
                session.onvalidatemerchant = (event) => {
                    applepay
                        .validateMerchant({
                            validationUrl: event.validationURL,
                        })
                        .then((payload) => {
                            session.completeMerchantValidation(
                                payload.merchantSession
                            );
                        })
                        .catch((err) => {
                            console.error(err);
                            session.abort();
                        });
                };
                console.log("[1] Merchant Validate Complete");
                session.onpaymentmethodselected = () => {
                    session.completePaymentMethodSelection({
                        newTotal: paymentRequest.total,
                    });
                };
                console.log("[1]");
                const isVault = document.getElementById("is-vault").checked;
                const isReturning =
                    document.getElementById("is-returning").checked;

                session.onpaymentauthorized = async (event) => {
                    console.log(
                        "Your billing address is:",
                        event.payment.billingContact
                    );
                    console.log(
                        "Your shipping address is:",
                        event.payment.shippingContact
                    );
                    try {
                        /* Create Order on the Server Side */
                        const orderResponse = await fetch(
                            `/api/orders?isVault=${isVault}&isReturning=${isReturning}`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                            }
                        );
                        if (!orderResponse.ok) {
                            throw new Error("error creating order");
                        }

                        const createOrderJsonRes = await orderResponse.json();
                        const { id } = createOrderJsonRes;
                        console.log({ id });

                        const textarea1 = document.getElementById(
                            "result-createorder-text"
                        );
                        textarea1.innerHTML =
                            JSON.stringify(createOrderJsonRes);
                        /**
                         * Confirm Payment
                         */
                        debugger;
                        await applepay.confirmOrder({
                            orderId: id,
                            token: event.payment.token,
                            billingContact: event.payment.billingContact,
                            shippingContact: event.payment.shippingContact,
                        });
                        debugger;
                        /*
                         * Capture order (must currently be made on server)
                         */

                        console.log(
                            event.payment.token,
                            event.payment.billingContact,
                            event.payment.shippingContact
                        );

                        if (!eval(isReturning)) {
                            /*
                             * Capture order (must currently be made on server)
                             */
                            const captureResponse = await fetch(
                                `/api/orders/${id}/capture`,
                                {
                                    method: "POST",
                                }
                            );
                            const captureOrderJsonRes =
                                await captureResponse.json();
                            const textarea2 = document.getElementById(
                                "result-capture-text"
                            );
                            textarea2.innerHTML =
                                JSON.stringify(captureOrderJsonRes);
                        }

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
                    console.log("Apple Pay Cancelled !!");
                };

                session.begin();
            });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // eslint-disable-next-line no-undef
    if (
        ApplePaySession?.supportsVersion(4) &&
        ApplePaySession?.canMakePayments()
    ) {
        setupApplepay().catch(console.error);
    }
});

console.log("Hello VConsole");
