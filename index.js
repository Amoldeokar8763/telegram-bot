const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let waitingMale = null;
let waitingFemale = null;
let pairs = {};
let users = {};
let reports = {};

function menu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "👨 Male", callback_data: "male" },
          { text: "👩 Female", callback_data: "female" }
        ],
        [
          { text: "🔄 Next", callback_data: "next" },
          { text: "❌ End Chat", callback_data: "stop" }
        ],
        [
          { text: "🚫 Report", callback_data: "report" }
        ]
      ]
    }
  };
}

function connect(u1, u2) {
  pairs[u1] = u2;
  pairs[u2] = u1;
  bot.sendMessage(u1, "✅ Connected!");
  bot.sendMessage(u2, "✅ Connected!");
}

function disconnect(user, auto = false) {
  if (pairs[user]) {
    const partner = pairs[user];
    delete pairs[user];
    delete pairs[partner];
    bot.sendMessage(partner, "❌ Stranger left.");
    if (auto && users[partner]) startSearch(partner);
  }
}

function startSearch(id) {
  const gender = users[id]?.gender;
  bot.sendMessage(id, "🔎 Searching for partner...");

  if (gender === "male") {
    if (waitingFemale && waitingFemale !== id) {
      connect(id, waitingFemale);
      waitingFemale = null;
    } else {
      waitingMale = id;
    }
  }

  if (gender === "female") {
    if (waitingMale && waitingMale !== id) {
      connect(id, waitingMale);
      waitingMale = null;
    } else {
      waitingFemale = id;
    }
  }
}

bot.on("message", async (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  if (!users[id]) users[id] = { gender: null };

  if (text === "/start") {
    return bot.sendMessage(
      id,
      "👋 Welcome to Anonymous Chat\n\nSelect your gender:",
      menu()
    );
  }

  if (pairs[id] && text && !text.startsWith("/")) {
    await bot.sendChatAction(pairs[id], "typing");
    bot.sendMessage(pairs[id], text);
  }
});

bot.on("callback_query", async (query) => {
  const id = query.message.chat.id;
  const data = query.data;

  if (!users[id]) users[id] = { gender: null };

  if (data === "male" || data === "female") {
    users[id].gender = data;
    startSearch(id);
  }

  if (data === "next") {
    disconnect(id, true);
  }

  if (data === "stop") {
    disconnect(id);
    bot.sendMessage(id, "⛔ Chat ended.", menu());
  }

  if (data === "report") {
    if (pairs[id]) {
      const partner = pairs[id];
      reports[partner] = (reports[partner] || 0) + 1;
      bot.sendMessage(id, "🚫 Reported.");
      if (reports[partner] >= 3) {
        disconnect(partner);
        bot.sendMessage(partner, "🚫 Blocked (3 reports).");
      }
    }
  }

  bot.answerCallbackQuery(query.id);
});
