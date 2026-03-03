const ADMIN_ID = 7479846101;

console.log("🔥 NEW VERSION RUNNING");
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });
let waitingMale = null;
let waitingFemale = null;
let pairs = {};
let users = {};
let totalUsers = new Set();

function mainMenu() {
  return {
    reply_markup: {
      keyboard: [
        ["💬 New Chat"],
        ["👤 Profile", "📊 Users"],
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

  bot.sendMessage(u1, "🎉 Connected! Say hi 👋", mainMenu());
  bot.sendMessage(u2, "🎉 Connected! Say hi 👋", mainMenu());
}

function disconnect(id, auto = false) {
  if (pairs[id]) {
    const partner = pairs[id];
    delete pairs[id];
    delete pairs[partner];

    bot.sendMessage(partner, "❌ Stranger left.", mainMenu());

    if (auto) startSearch(partner);
  }
}

function startSearch(id) {
  const gender = users[id]?.gender;

  if (!gender) {
    return bot.sendMessage(id, "⚠️ Set gender first in Profile.");
  }

  bot.sendMessage(id, "⏳ Finding someone for you...");

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

  if (text === "/stats") {
  if (id !== ADMIN_ID) {
    return bot.sendMessage(id, "⛔ Not authorized.");
  }

  return bot.sendMessage(
    id,
    "📊 Bot Stats\n\n" +
    "👥 Total Users: " + totalUsers.size + "\n" +
    "💬 Active Chats: " + Object.keys(pairs).length / 2
  );
}

  if (!users[id]) {
    users[id] = { gender: null, reports: 0 };
    totalUsers.add(id);
  }

  if (text === "/start") {
    return bot.sendMessage(
      id,
      "👋 Welcome to Anonymous Chat\nSet your gender in Profile.",
      mainMenu()
    );
  }

  if (text === "👤 Profile") {
    return bot.sendMessage(
      id,
      "Select your gender:",
      {
        reply_markup: {
          keyboard: [
            ["👨 Set Male", "👩 Set Female"],
            ["🔙 Back"]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  if (text === "👨 Set Male") {
    users[id].gender = "male";
    return bot.sendMessage(id, "✅ Gender set to Male.", mainMenu());
  }

  if (text === "👩 Set Female") {
    users[id].gender = "female";
    return bot.sendMessage(id, "✅ Gender set to Female.", mainMenu());
  }

  if (text === "🔙 Back") {
    return bot.sendMessage(id, "Main Menu", mainMenu());
  }

  if (text === "📊 Users") {
    return bot.sendMessage(
      id,
      "👥 Total Users: " + totalUsers.size,
      mainMenu()
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
    bot.sendMessage(id, "❌ Chat ended.", mainMenu());
  }

  if (text === "🚫 Report") {
    if (pairs[id]) {
      const partner = pairs[id];
      users[partner].reports++;

      bot.sendMessage(id, "🚫 User reported.");

      if (users[partner].reports >= 3) {
        disconnect(partner, false);
        bot.sendMessage(partner, "🚫 Blocked (3 reports).");
      }
    }
  }

  if (pairs[id] &&
      !text.includes("💬") &&
      !text.includes("👤") &&
      !text.includes("📊") &&
      !text.includes("🔄") &&
      !text.includes("❌") &&
      !text.includes("🚫")) {

    await bot.sendChatAction(pairs[id], "typing");
    bot.sendMessage(pairs[id], text);
  }
});
