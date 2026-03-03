console.log("🔥 NEW VERSION RUNNING");
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let waitingUser = null;
let pairs = {};
let reports = {};
let blocked = {};

function menu() {
  return {
    reply_markup: {
      keyboard: [
        ["💬 New Chat"],
        ["🔄 Next", "❌ End"],
        ["🚫 Report"]
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
}

function connect(u1, u2) {
  pairs[u1] = u2;
  pairs[u2] = u1;

  bot.sendMessage(u1, "🎉 You're connected! Say hi 👋", menu());
  bot.sendMessage(u2, "🎉 You're connected! Say hi 👋", menu());
}

function disconnect(user, autoSearch = false) {
  if (pairs[user]) {
    const partner = pairs[user];

    delete pairs[user];
    delete pairs[partner];

    bot.sendMessage(partner, "❌ Stranger left.", menu());

    if (autoSearch) {
      startSearch(partner);
    }
  }
}

function startSearch(id) {
  if (waitingUser && waitingUser !== id) {
    connect(id, waitingUser);
    waitingUser = null;
  } else {
    waitingUser = id;
    bot.sendMessage(id, "⏳ Finding someone for you...", menu());
  }
}

bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  if (blocked[id]) {
    return bot.sendMessage(id, "🚫 You are blocked.");
  }

  if (text === "/start") {
    return bot.sendMessage(
      id,
      "👋 Welcome to Anonymous Chat",
      menu()
    );
  }

  if (text === "💬 New Chat") {
    if (pairs[id]) {
      return bot.sendMessage(id, "⚠️ Already in chat.");
    }
    return startSearch(id);
  }

  if (text === "🔄 Next") {
    disconnect(id, true);
  }

  if (text === "❌ End") {
    disconnect(id, false);
    bot.sendMessage(id, "❌ Chat ended.", menu());
  }

  if (text === "🚫 Report") {
    if (pairs[id]) {
      const partner = pairs[id];
      reports[partner] = (reports[partner] || 0) + 1;

      bot.sendMessage(id, "🚫 User reported.");

      if (reports[partner] >= 3) {
        blocked[partner] = true;
        disconnect(partner, false);
        bot.sendMessage(partner, "🚫 You are blocked (3 reports).");
      }
    }
  }

  // Forward normal messages
  if (pairs[id] && 
      text !== "💬 New Chat" &&
      text !== "🔄 Next" &&
      text !== "❌ End" &&
      text !== "🚫 Report") {

    await bot.sendChatAction(pairs[id], "typing");
    bot.sendMessage(pairs[id], text);
  }
});
