const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

let waiting = null;
let pairs = {};
let bannedWords = ["sex", "nude", "abuse"]; // aap badal sakte ho

function disconnect(user) {
  if (pairs[user]) {
    let partner = pairs[user];
    delete pairs[partner];
    delete pairs[user];
    bot.sendMessage(partner, "❌ Stranger left the chat.");
  }
}

bot.on('message', (msg) => {
  const id = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // START
  if (text === '/start') {
    bot.sendMessage(id, "🔎 Partner dhund rahe hain...");

    if (waiting && waiting !== id) {
      pairs[id] = waiting;
      pairs[waiting] = id;

      bot.sendMessage(id, "✅ Stranger se connected!");
      bot.sendMessage(waiting, "✅ Stranger se connected!");

      waiting = null;
    } else {
      waiting = id;
    }
    return;
  }

  // NEXT
  if (text === '/next') {
    disconnect(id);
    bot.sendMessage(id, "🔎 Naya partner dhund rahe hain...");
    waiting = id;
    return;
  }

  // STOP
  if (text === '/stop') {
    disconnect(id);
    bot.sendMessage(id, "⛔ Chat band kar di gayi.");
    return;
  }

  // BAD WORD FILTER
  if (bannedWords.some(word => text.toLowerCase().includes(word))) {
    bot.sendMessage(id, "⚠️ Aapka message allow nahi hai.");
    return;
  }

  // NORMAL MESSAGE FORWARD
  if (pairs[id]) {
    bot.sendMessage(pairs[id], text);
  } else {
    bot.sendMessage(id, "⚠️ Pehle /start dabayein.");
  }
});
