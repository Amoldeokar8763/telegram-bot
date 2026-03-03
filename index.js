const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let waiting = null;
let pairs = {};
let users = {};
let reports = {};

function mainMenu() {
  return {
    reply_markup: {
      keyboard: [
        ["💬 New Chat"],
        ["🔄 Next", "❌ End"],
        ["🚫 Report"]
      ],
      resize_keyboard: true
    }
  };
}

function connect(u1, u2) {
  pairs[u1] = u2;
  pairs[u2] = u1;

  bot.sendMessage(u1, "🎉 You're connected! Say hi 👋");
  bot.sendMessage(u2, "🎉 You're connected! Say hi 👋");
}

function disconnect(user, auto = false) {
  if (pairs[user]) {
    const partner = pairs[user];
    delete pairs[user];
    delete pairs[partner];

    bot.sendMessage(partner, "❌ User left the chat.");

    if (auto) startSearch(partner);
  }
}

function startSearch(id) {
  bot.sendMessage(id, "⏳ Finding someone for you...", mainMenu());

  if (waiting && waiting !== id) {
    connect(id, waiting);
    waiting = null;
  } else {
    waiting = id;
  }
}

bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  if (!users[id]) users[id] = { blocked: false };

  if (users[id].blocked) {
    return bot.sendMessage(id, "🚫 You are blocked.");
  }

  if (text === "/start") {
    return bot.sendMessage(
      id,
      "👋 Welcome to Anonymous Chat",
      mainMenu()
    );
  }

  if (text === "💬 New Chat") {
    startSearch(id);
  }

  if (text === "🔄 Next") {
    disconnect(id, true);
  }

  if (text === "❌ End") {
    disconnect(id, false);
    bot.sendMessage(id, "❌ Chat ended.", mainMenu());
  }

  if (text === "🚫 Report") {
    if (pairs[id]) {
      const partner = pairs[id];
      reports[partner] = (reports[partner] || 0) + 1;
      bot.sendMessage(id, "🚫 User reported.");

      if (reports[partner] >= 3) {
        users[partner].blocked = true;
        disconnect(partner, false);
        bot.sendMessage(partner, "🚫 You are blocked (3 reports).");
      }
    }
  }

  if (pairs[id] && text && !text.startsWith("💬") && !text.startsWith("🔄") && !text.startsWith("❌") && !text.startsWith("🚫")) {
    await bot.sendChatAction(pairs[id], "typing");
    bot.sendMessage(pairs[id], text);
  }
});
