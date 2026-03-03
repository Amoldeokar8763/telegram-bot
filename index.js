const ADMIN_ID = 7479846101;

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

console.log("🔥 CLEAN VERSION RUNNING");

let totalUsers = new Set();
let pairs = {};
let bannedUsers = new Set();
let adminMode = null;

let waitingMale = null;
let waitingFemale = null;

function mainMenu(userId) {
  if (userId === ADMIN_ID) {
    return {
      reply_markup: {
        keyboard: [
          ["💬 New Chat"],
          ["🔄 Next", "❌ End"],
          ["🚫 Report"],
          ["📊 Admin Panel"]
        ],
        resize_keyboard: true
      }
    };
  }

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

function adminMenu() {
  return {
    reply_markup: {
      keyboard: [
        ["📊 Bot Stats"],
        ["📢 Broadcast"],
        ["🚫 Ban User", "♻ Unban User"],
        ["🟢 Live Status"],
        ["🔙 Back"]
      ],
      resize_keyboard: true
    }
  };
}

function connect(u1, u2) {
  pairs[u1] = u2;
  pairs[u2] = u1;

  bot.sendMessage(u1, "🎉 You're connected! Say hi 👋", mainMenu(u1));
  bot.sendMessage(u2, "🎉 You're connected! Say hi 👋", mainMenu(u2));
}

function disconnect(id) {
  if (pairs[id]) {
    const partner = pairs[id];
    delete pairs[id];
    delete pairs[partner];
    bot.sendMessage(partner, "❌ Stranger left.", mainMenu(partner));
  }
}

function startSearch(id, gender) {
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

  totalUsers.add(id);

  if (bannedUsers.has(id)) {
    return bot.sendMessage(id, "🚫 You are banned.");
  }

  // ADMIN PANEL OPEN
  if (text === "📊 Admin Panel" && id === ADMIN_ID) {
    return bot.sendMessage(id, "⚙ Admin Control Panel", adminMenu());
  }

  // ADMIN BACK
  if (text === "🔙 Back") {
    return bot.sendMessage(id, "Main Menu", mainMenu(id));
  }

  // BOT STATS
  if (text === "📊 Bot Stats" && id === ADMIN_ID) {
    return bot.sendMessage(
      id,
      "📊 Bot Stats\n\n" +
      "👥 Total Users: " + totalUsers.size + "\n" +
      "💬 Active Chats: " + Object.keys(pairs).length / 2,
      adminMenu()
    );
  }

  // LIVE STATUS
  if (text === "🟢 Live Status" && id === ADMIN_ID) {
    return bot.sendMessage(
      id,
      "🟢 Live Status\n\n" +
      "👥 Total Users: " + totalUsers.size + "\n" +
      "💬 Active Chats: " + Object.keys(pairs).length / 2,
      adminMenu()
    );
  }

  // BROADCAST
  if (text === "📢 Broadcast" && id === ADMIN_ID) {
    adminMode = "broadcast";
    return bot.sendMessage(id, "Send message to broadcast:");
  }

  if (adminMode === "broadcast" && id === ADMIN_ID) {
    adminMode = null;
    totalUsers.forEach(userId => {
      bot.sendMessage(userId, "📢 Announcement:\n\n" + text);
    });
    return bot.sendMessage(id, "✅ Broadcast sent.", adminMenu());
  }

  // BAN
  if (text === "🚫 Ban User" && id === ADMIN_ID) {
    adminMode = "ban";
    return bot.sendMessage(id, "Send User ID to ban:");
  }

  if (adminMode === "ban" && id === ADMIN_ID) {
    bannedUsers.add(Number(text));
    adminMode = null;
    return bot.sendMessage(id, "✅ User banned.", adminMenu());
  }

  // UNBAN
  if (text === "♻ Unban User" && id === ADMIN_ID) {
    adminMode = "unban";
    return bot.sendMessage(id, "Send User ID to unban:");
  }

  if (adminMode === "unban" && id === ADMIN_ID) {
    bannedUsers.delete(Number(text));
    adminMode = null;
    return bot.sendMessage(id, "✅ User unbanned.", adminMenu());
  }

  // START
  if (text === "/start") {
    return bot.sendMessage(id, "👋 Welcome to Anonymous Chat", mainMenu(id));
  }

  // NEW CHAT
  if (text === "💬 New Chat") {
    return bot.sendMessage(
      id,
      "Select gender:",
      {
        reply_markup: {
          keyboard: [
            ["👨 Male", "👩 Female"],
            ["🔙 Back"]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  if (text === "👨 Male") {
    return startSearch(id, "male");
  }

  if (text === "👩 Female") {
    return startSearch(id, "female");
  }

  if (text === "🔄 Next") {
    disconnect(id);
    return bot.sendMessage(id, "Use New Chat again.", mainMenu(id));
  }

  if (text === "❌ End") {
    disconnect(id);
    return bot.sendMessage(id, "❌ Chat ended.", mainMenu(id));
  }

  if (text === "🚫 Report") {
    disconnect(id);
    return bot.sendMessage(id, "🚫 User reported.", mainMenu(id));
  }

  // MESSAGE FORWARD
  if (pairs[id]) {
    await bot.sendChatAction(pairs[id], "typing");
    bot.sendMessage(pairs[id], text);
  }
});
