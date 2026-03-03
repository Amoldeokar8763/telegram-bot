const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

let waitingMale = null;
let waitingFemale = null;
let pairs = {};
let users = {};
let reports = {};

function mainMenu() {
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

function connectUsers(user1, user2) {
  pairs[user1] = user2;
  pairs[user2] = user1;

  bot.sendMessage(user1, "✅ Connected to Stranger!");
  bot.sendMessage(user2, "✅ Connected to Stranger!");
}

function disconnect(userId, autoSearch = false) {
  if (pairs[userId]) {
    const partner = pairs[userId];

    delete pairs[userId];
    delete pairs[partner];

    bot.sendMessage(partner, "❌ Stranger left.");

    if (autoSearch && users[partner]) {
      startSearch(partner);
    }
  }
}

function startSearch(userId) {
  const gender = users[userId]?.gender;
  bot.sendMessage(userId, "🔎 Searching for partner...");

  if (gender === "male") {
    if (waitingFemale && waitingFemale !== userId) {
      connectUsers(userId, waitingFemale);
      waitingFemale = null;
    } else {
      waitingMale = userId;
    }
  }

  if (gender === "female") {
    if (waitingMale && waitingMale !== userId) {
      connectUsers(userId, waitingMale);
      waitingMale = null;
    } else {
      waitingFemale = userId;
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
      mainMenu()
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
    disconnect(id, false);
    bot.sendMessage(id, "⛔ Chat ended.", mainMenu());
  }

  if (data === "report") {
    if (pairs[id]) {
      const partner = pairs[id];

      reports[partner] = (reports[partner] || 0) + 1;

      bot.sendMessage(id, "🚫 User reported.");

      if (reports[partner] >= 3) {
        disconnect(partner, false);
        bot.sendMessage(partner, "🚫 You are temporarily blocked (3 reports).");
      }
    }
  }

  bot.answerCallbackQuery(query.id);
});
