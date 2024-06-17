import fetch from "node-fetch";

// set some important variables
const { CLIENT_ID, APP_SECRET, MERCHANT_ID } = process.env;
//const CLIENT_ID="AZKhxEQXmqa55rEt7Oa-sYX57JBVwMIHXf0Mo5-9HIqH33IK8QlbZRmafaTB45htQh4iEO_yTFXCySz_";
//const APP_SECRET="EJWU_h3jhQf4_ITipl1U7qbv5bRcRKK5x7QpHpT7_49VI0_BenOtdkjY5NRapo8D7g_PtZWqfsiBA5b7";
//const MERCHANT_ID="B76W5U9HQVEFY";
const base = "https://api-m.sandbox.paypal.com";

// call the create order method
export async function createOrder() {
  const purchaseAmount = "0.01"; // TODO: pull prices from a database
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: purchaseAmount,
          },
          payee: {
            merchant_id: MERCHANT_ID,
          }
        },
      ],
    }),
  });

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
  console.log(response);
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
  console.log('response', response.status)
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
