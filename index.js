const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

let waitingMale = null;
let waitingFemale = null;
let pairs = {};
let userGender = {};
let totalUsers = new Set();
let reports = {};

function disconnect(user) {
  if (pairs[user]) {
    let partner = pairs[user];
    delete pairs[partner];
    delete pairs[user];
    bot.sendMessage(partner, "❌ Stranger left.");
  }
}

bot.on('message', (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  totalUsers.add(id);

  if (!text) return;

  if (text === '/start') {
    bot.sendMessage(id, 
      "Select Gender:\n\n/male\n/female");
    return;
  }

  if (text === '/male' || text === '/female') {
    userGender[id] = text;

    bot.sendMessage(id, "🔎 Partner dhund rahe hain...");

    if (text === '/male') {
      if (waitingFemale) {
        pairs[id] = waitingFemale;
        pairs[waitingFemale] = id;
        bot.sendMessage(id, "✅ Stranger se connected!");
        bot.sendMessage(waitingFemale, "✅ Stranger se connected!");
        waitingFemale = null;
      } else {
        waitingMale = id;
      }
    }

    if (text === '/female') {
      if (waitingMale) {
        pairs[id] = waitingMale;
        pairs[waitingMale] = id;
        bot.sendMessage(id, "✅ Stranger se connected!");
        bot.sendMessage(waitingMale, "✅ Stranger se connected!");
        waitingMale = null;
      } else {
        waitingFemale = id;
      }
    }
    return;
  }

  if (text === '/next') {
    disconnect(id);
    bot.sendMessage(id, "🔎 Naya partner dhund rahe hain...");
    return;
  }

  if (text === '/stop') {
    disconnect(id);
    bot.sendMessage(id, "⛔ Chat band kar di gayi.");
    return;
  }

  if (text === '/report') {
    if (pairs[id]) {
      let partner = pairs[id];
      reports[partner] = (reports[partner] || 0) + 1;
      bot.sendMessage(id, "🚫 User reported.");
    }
    return;
  }

  if (text === '/stats') {
    bot.sendMessage(id, "👥 Total Users: " + totalUsers.size);
    return;
  }

  if (pairs[id]) {
    bot.sendMessage(pairs[id], text);
  } else {
    bot.sendMessage(id, "⚠️ Pehle /start dabayein.");
  }
});
