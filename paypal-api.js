import fetch from "node-fetch";

// set some important variables
const { CLIENT_ID, APP_SECRET, MERCHANT_ID } = process.env;

//const CLIENT_ID="AZKhxEQXmqa55rEt7Oa-sYX57JBVwMIHXf0Mo5-9HIqH33IK8QlbZRmafaTB45htQh4iEO_yTFXCySz_";
//const APP_SECRET="EJWU_h3jhQf4_ITipl1U7qbv5bRcRKK5x7QpHpT7_49VI0_BenOtdkjY5NRapo8D7g_PtZWqfsiBA5b7";
//const MERCHANT_ID="B76W5U9HQVEFY";

const base = "https://api.sandbox.paypal.com";

// call the create order method
export async function createOrder(isVault, isReturning) {
  const purchaseAmount = "21.00"; // TODO: pull prices from a database

  const accessToken = await generateAccessToken(isVault);
  const url = `${base}/v2/checkout/orders`;

  const paypal_request_id = `Test=+${Date.now() % 12345678}`;

  const payment_source = eval(isReturning)
    ? {
      apple_pay: {
        stored_credential: {
          payment_initiator: "MERCHANT",
          payment_type: "RECURRING",
          usage: "SUBSEQUENT",
        },
        vault_id: "1dy601151h625622v",
      },
    }
    : {
      apple_pay: {
        stored_credential: {
          payment_initiator: "CUSTOMER",
          payment_type: "RECURRING",
        },
        attributes: {
          vault: {
            store_in_vault: "ON_SUCCESS",
          },
        },
      },
    };

  const requestBody = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: purchaseAmount,
        },
        // "payment_instruction": {
        //   "platform_fees": [
        //     {
        //       "amount": {
        //         "currency_code": "USD",
        //         "value": "1.00"
        //       }

        //     }
        //   ]
        // },
        shipping: {
          name: {
            full_name: "John doc",
          },
          address: {
            address_line_1: "1223",
            address_line_2: "Floor 6",
            admin_area_1: "Jilin",
            admin_area_2: "aa",
            postal_code: "417122",
            country_code: "HK"
          }
        }
      }
    ]
  };

  if (eval(isVault)) {
    requestBody["payment_source"] = payment_source;
  }
  console.log(JSON.stringify(requestBody, null, "  "));
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Auth-Assertion": "eyJhbGciOiJub25lIn0=.eyJpc3MiOiJBWktoeEVRWG1xYTU1ckV0N09hLXNZWDU3SkJWd01JSFhmME1vNS05SElxSDMzSUs4UWxiWlJtYWZhVEI0NWh0UWg0aUVPX3lURlhDeVN6XyIsImVtYWlsIjoidGVzdEluU2VsbGVyM0BwYXlwYWwuY29tIn0=.",
      "PayPal-Request-Id": paypal_request_id,
    },
    body: JSON.stringify(requestBody),
  });
console.log(JSON.stringify(response, null, "  "));
  return handleResponse(response);
}

// capture payment for an order
export async function capturePayment(orderId) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderId}/capture`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Auth-Assertion": "eyJhbGciOiJub25lIn0=.eyJpc3MiOiJBWktoeEVRWG1xYTU1ckV0N09hLXNZWDU3SkJWd01JSFhmME1vNS05SElxSDMzSUs4UWxiWlJtYWZhVEI0NWh0UWg0aUVPX3lURlhDeVN6XyIsImVtYWlsIjoidGVzdEluU2VsbGVyM0BwYXlwYWwuY29tIn0=.",
    },
  });

  return handleResponse(response);
}

// generate access token
export async function generateAccessToken() {
  const auth = Buffer.from(CLIENT_ID + ":" + APP_SECRET).toString("base64");
  console.log(auth);
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "post",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  // console.log(response);
  const jsonData = await handleResponse(response);
  return jsonData.access_token;
}

// generate client token
export async function generateClientToken() {
  const accessToken = await generateAccessToken();
  const response = await fetch(`${base}/v1/identity/generate-token`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "en_US",
      "Content-Type": "application/json",
    },
  });
  console.log("response", response.status);
  const jsonData = await handleResponse(response);
  return jsonData.client_token;
}

async function handleResponse(response) {
  if (response.status === 200 || response.status === 201) {
    return response.json();
  }

  const errorMessage = await response.text();
  throw new Error(errorMessage);
}
