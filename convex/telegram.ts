"use node";

const getTelegramConfig = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return null;
  }

  return {
    chatId,
    endpoint: `https://api.telegram.org/bot${botToken}/sendMessage`,
  };
};

export const sendTelegramWinnerNotification = async (args: {
  chargeFee: boolean;
  jackpot: number;
  lnAddress: string;
  payoutAmount: number;
}) => {
  const lines = [
    "🎉 Game over!",
    `⚡ ${args.lnAddress} just won the jackpot of ${args.jackpot} sats!`,
  ];

  lines.push("");
  lines.push("🎮 Start a new game: https://lastpaywins.com");

  return await sendTelegramMessage(lines.join("\n"));
};

export const sendTelegramMessage = async (text: string) => {
  const config = getTelegramConfig();
  if (!config) {
    return { skipped: true };
  }
  
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Telegram notification failed for chat ${config.chatId}: ${response.status} ${response.statusText} - ${await response.text()}`,
    );
  }

  return { skipped: false };
};
