import { WebSocket } from "ws";
import { nwc } from "@getalby/sdk";
import fetch from "node-fetch";

const pusherAppKey = "17bfce509dc4758b4b0a";
const wsUrl = `wss://ws-us2.pusher.com/app/${pusherAppKey}?protocol=7&client=js&version=8.0.2&flash=false`;

const headers = {
  "Sec-GPC": "1",
  Origin: "https://www.lastpaywins.com",
  "Cache-Control": "no-cache",
  "Accept-Language": "en-US,en;q=0.9",
  Pragma: "no-cache",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

console.log("Attempting to connect to WebSocket...");

const ws = new WebSocket(wsUrl, { headers });

let lastPayer = "";
let countdownEndTime: number | null = null;
let jackpot = 0;

// Initialize NWC client
const nwcClient = new nwc.NWCClient({
  nostrWalletConnectUrl: process.env.NWC_URL,
});

ws.onopen = () => {
  console.log("Connected to Pusher WebSocket");

  // Subscribe to the channel
  const subscribeMessage = JSON.stringify({
    event: "pusher:subscribe",
    data: { auth: "", channel: "cache-last-payer" },
  });
  ws.send(subscribeMessage);
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);

  // Parse the message
  try {
    const message = JSON.parse(event.data);

    // Check for subscription confirmation
    if (message.event === "pusher_internal:subscription_succeeded") {
      console.log("Successfully subscribed to cache-last-payer channel");
    }

    // Handle other events as needed
    if (message.event === "update") {
      console.log("Received update:", message.data);

      // Parse the update data
      const updateData = JSON.parse(message.data);
      lastPayer = updateData.lnAddress;
      jackpot = updateData.jackpot;

      // Check if the last payer is not k@primal.net
      if (lastPayer !== "k@primal.net") {
        console.log("\x07"); // Bell sound
        console.log(`ALERT: Last payer is ${lastPayer}`);
      }

      // Start the countdown
      countdownEndTime = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    }

    if (message.event === "pusher:cache_miss") {
      console.log("Cache miss occurred");
    }
  } catch (error) {
    console.error("Error parsing message:", error);
  }
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};

ws.onclose = (event) => {
  console.log(
    `WebSocket closed with code ${event.code}. Reason: ${event.reason}`
  );
};

// Countdown and winner check function
async function fetchAndPayInvoice() {
  if (lastPayer === "k@primal.net") {
    console.log("You are currently winning. No need to pay.");
    return;
  }

  try {
    // Fetch invoice
    const response = await fetch("https://www.lastpaywins.com/api/invoice", {
      method: "POST",
    });
    const data = await response.json();
    const invoice = data.payment_request;

    console.log("Fetched invoice:", invoice);

    // Pay invoice using NWC
    const paymentResult = await nwcClient.payInvoice({ invoice });
    console.log("Payment result:", paymentResult);

    if (paymentResult.preimage) {
      console.log("Payment successful! Preimage:", paymentResult.preimage);
    } else {
      console.log("Payment failed or incomplete.");
    }
  } catch (error) {
    console.error("Error fetching or paying invoice:", error);
  }
}

function updateCountdown() {
  if (countdownEndTime) {
    const remainingTime = Math.max(0, countdownEndTime - Date.now());
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);

    console.clear(); // Clear console for better visibility
    console.log(
      `Time remaining: ${minutes}:${seconds.toString().padStart(2, "0")}`
    );
    console.log(
      `Current winner: ${lastPayer === "k@primal.net" ? "You" : lastPayer}`
    );
    console.log(`Current jackpot: ${jackpot} sats`);

    if (remainingTime <= 0) {
      console.log("Countdown finished!");
      countdownEndTime = null;
    }

    // Check if we need to fetch and pay an invoice
    if (lastPayer !== "k@primal.net" && remainingTime > 0) {
      fetchAndPayInvoice();
    }
  }
}

// Run the countdown update every 10 seconds
setInterval(updateCountdown, 10000);

// Keep the script running
process.on("SIGINT", () => {
  ws.close();
  process.exit();
});
