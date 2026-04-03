const ADMIN_ID = 7479846101;

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

console.log("🔥 FINAL VERSION RUNNING");

let totalUsers = new Set();
let pairs = {};
let bannedUsers = new Set();
let adminMode = null;

let dailyUsers = new Set();
let todayDate = new Date().toDateString();

let waitingUsers = [];
let connectionTime = {};

/* ================= MENU ================= */

function mainMenu(userId) {

let keyboard = [];

if (pairs[userId]) {
    keyboard.push(["🔄 Next", "❌ End"]);
    keyboard.push(["🚫 Report"]);
} else {
    if (waitingUsers.includes(userId)) {
        keyboard.push(["❌ Stop"]);
    } else {
        keyboard.push(["💬 New Chat"]);
    }
}

if (userId === ADMIN_ID) {
    keyboard.push(["📊 Admin Panel"]);
}

return {
    reply_markup: {
        keyboard: keyboard,
        resize_keyboard: true
    }
};
}

/* ================= MATCH SYSTEM ================= */

function connect(u1, u2) {
pairs[u1] = u2;
pairs[u2] = u1;

connectionTime[u1] = Date.now();
connectionTime[u2] = Date.now();

bot.sendMessage(u1, "🎉 You're connected! Say hi 👋", mainMenu(u1));
bot.sendMessage(u2, "🎉 You're connected! Say hi 👋", mainMenu(u2));
}

function disconnect(id) {
if (pairs[id]) {
    const partner = pairs[id];

    delete pairs[id];
    delete pairs[partner];

    delete connectionTime[id];
    delete connectionTime[partner];

    bot.sendMessage(partner, "❌ Stranger left.", mainMenu(partner));
}
}

function startSearch(id) {

bot.sendMessage(id, "⏳ Finding someone for you...", {
    reply_markup: {
        keyboard: [["❌ Stop"]],
        resize_keyboard: true
    }
});

// ensure no duplicate
waitingUsers = waitingUsers.filter(user => user !== id);

// match if available
if (waitingUsers.length > 0) {
    const partner = waitingUsers.shift();
    connect(id, partner);
} else {
    waitingUsers.push(id);
}
}

/* ================= MESSAGE HANDLER ================= */

bot.on("message", async (msg) => {

const id = msg.chat.id;
const text = msg.text;

if (!text) return;

totalUsers.add(id);

// daily reset
const currentDate = new Date().toDateString();
if (currentDate !== todayDate) {
    dailyUsers.clear();
    todayDate = currentDate;
}
dailyUsers.add(id);

if (bannedUsers.has(id)) {
    return bot.sendMessage(id, "🚫 You are banned.");
}

/* ================= START ================= */

if (text === "/start") {
    return bot.sendMessage(id, "👋 Welcome to Anonymous Chat", mainMenu(id));
}

/* ================= STOP (FIXED) ================= */

if (text === "❌ Stop") {

    if (waitingUsers.includes(id)) {
        waitingUsers = waitingUsers.filter(user => user !== id);
        return bot.sendMessage(id, "✅ Search stopped.", mainMenu(id));
    }

    if (pairs[id]) {
        disconnect(id);
        return bot.sendMessage(id, "❌ Chat ended.", mainMenu(id));
    }

    return bot.sendMessage(id, "⚠ You are not searching.", mainMenu(id));
}

/* ================= NEW CHAT ================= */

if (text === "💬 New Chat") {

    if (pairs[id]) {
        return bot.sendMessage(id, "❗ You are already chatting.");
    }

    return startSearch(id);
}

/* ================= NEXT ================= */

if (text === "🔄 Next") {

    if (pairs[id]) {

        if (Date.now() - connectionTime[id] < 5000) {
            return bot.sendMessage(id, "⏳ Please wait 5 seconds.");
        }

        disconnect(id);
    }

    return startSearch(id);
}

/* ================= END ================= */

if (text === "❌ End") {

    if (pairs[id]) {

        if (Date.now() - connectionTime[id] < 5000) {
            return bot.sendMessage(id, "⏳ Wait before ending.");
        }

        disconnect(id);
    }

    waitingUsers = waitingUsers.filter(user => user !== id);

    return bot.sendMessage(id, "❌ Chat ended.", mainMenu(id));
}

/* ================= REPORT ================= */

if (text === "🚫 Report") {
    disconnect(id);
    return bot.sendMessage(id, "🚫 User reported.", mainMenu(id));
}

/* ================= MESSAGE FORWARD ================= */

if (pairs[id]) {
    await bot.sendChatAction(pairs[id], "typing");
    bot.sendMessage(pairs[id], text);
}

});
