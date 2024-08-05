function onApplePayLoaded() {
    debugger;
    if (!window.ApplePaySession) {
        console.error("This device does not support Apple Pay");
        return;
    }

    if (!ApplePaySession.canMakePayments()) {
        console.error(
            "This device is not capable of making Apple Pay payments"
        );
        return;
    }

    const applepay = paypal.Applepay();
    applepay
        .config()
        .then((applepayConfig) => {
            try {
                if (applepayConfig.isEligible) {
                    document.getElementById(
                        "paypalCheckoutContainer_paypal_applepay"
                    ).innerHTML =
                        '<apple-pay-button style="width:100%;" id="btn-appl" buttonstyle="black" type="buy">';
                }

                const paymentRequest = {
                    countryCode: applepayConfig.countryCode,
                    merchantCapabilities: applepayConfig.merchantCapabilities,
                    supportedNetworks: applepayConfig.supportedNetworks,
                    currencyCode: 'USD',

                    requiredShippingContactFields: ["name", "phone", "email", "postalAddress"],
                    requiredBillingContactFields: ["postalAddress"],
                    total: {
                        label: "My Test Label",
                        type: "final",
                        amount: "21",
                    },
                };

                document
                    .getElementById("btn-appl")
                    .addEventListener("click", async (event) => {
                        // var total_input =
                        //     document.getElementById("total_fee_hidden");
                        // if (total_input != undefined) {
                        //     paymentRequest.total.amount = document
                        //         .getElementById("total_fee_hidden")
                        //         .value.match(/[\d+\.]+/)[0];
                        // }

                        const session = new ApplePaySession(4, paymentRequest);
                        session.onvalidatemerchant = (event) => {
                            applepay
                                .validateMerchant({
                                    validationUrl: event.validationURL,
                                    displayName: "My Store",
                                })
                                .then((validateResult) => {
                                    session.completeMerchantValidation(
                                        validateResult.merchantSession
                                    );
                                })
                                .catch((validateError) => {
                                    alert(validateError);
                                    console.error(validateError);
                                    session.abort();
                                });
                        };

                        session.onpaymentauthorized = async function (event) {
                            console.log(
                                "Your billing address is:",
                                event.payment.billingContact
                            );
                            console.log(
                                "Your shipping address is:",
                                event.payment.shippingContact
                            );

                            const orderResponse = await fetch(
                                `/api/orders?isVault=false&isReturning=false`,
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

                            const createOrderJsonRes =
                                await orderResponse.json();
                            const { id } = createOrderJsonRes;
                            console.log({ id });

                            const textarea1 = document.getElementById(
                                "result-createorder-text"
                            );
                            textarea1.innerHTML =
                                JSON.stringify(createOrderJsonRes);

                            applepay
                                .confirmOrder({
                                    orderId: id,
                                    token: event.payment.token,
                                    billingContact:
                                        event.payment.billingContact,
                                    shippingContact:
                                        event.payment.shippingContact,
                                })
                                .then(async (confirmResult) => {
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

                                    session.completePayment(
                                        ApplePaySession.STATUS_SUCCESS
                                    );

                                    // try {
                                    //     await paypal_create_approve(
                                    //         { orderID: id },
                                    //         {}
                                    //     );
                                    // } catch (e) {
                                    //     alert("1: " + e.message);
                                    // }
                                })
                                .catch((confirmError) => {
                                    if (confirmError) {
                                        alert("2" + e.message);
                                        console.error(
                                            "Error confirming order with applepay token"
                                        );
                                        console.error(confirmError);
                                        session.completePayment(
                                            ApplePaySession.STATUS_FAILURE
                                        );
                                    }
                                });
                        };
                        session.begin();
                    });
            } catch (e) {
                alert(e.message);
            }
        })
        .catch((applepayConfigError) => {
            console.error("Error while fetching Apple Pay configuration.");
        });
}


document.addEventListener("DOMContentLoaded", () => {
    // eslint-disable-next-line no-undef
    if (
        ApplePaySession?.supportsVersion(4) &&
        ApplePaySession?.canMakePayments()
    ) {
        onApplePayLoaded().catch(console.error);
    }
});