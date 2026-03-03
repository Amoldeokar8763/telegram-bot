const ADMIN_ID = 7479846101;

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

console.log("🔥 RANDOM MATCH VERSION RUNNING");

let totalUsers = new Set();
let pairs = {};
let bannedUsers = new Set();
let adminMode = null;

let dailyUsers = new Set();
let todayDate = new Date().toDateString();

let waitingUsers = [];

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

function startSearch(id) {
bot.sendMessage(id, "⏳ Finding someone for you...");

// Remove if already waiting
waitingUsers = waitingUsers.filter(user => user !== id);

if (waitingUsers.length > 0) {

const randomIndex = Math.floor(Math.random() * waitingUsers.length);
const partner = waitingUsers[randomIndex];

waitingUsers.splice(randomIndex, 1);
connect(id, partner);

} else {
waitingUsers.push(id);
}
}

bot.on("message", async (msg) => {
const id = msg.chat.id;
const text = msg.text;

totalUsers.add(id);

const currentDate = new Date().toDateString();
if (currentDate !== todayDate) {
dailyUsers.clear();
todayDate = currentDate;
}

dailyUsers.add(id);

if (bannedUsers.has(id)) {
return bot.sendMessage(id, "🚫 You are banned.");
}

// ADMIN PANEL
if (text === "📊 Admin Panel" && id === ADMIN_ID) {
return bot.sendMessage(id, "⚙ Admin Control Panel", adminMenu());
}

if (text === "📊 Bot Stats" && id === ADMIN_ID) {
return bot.sendMessage(
id,
"📊 Bot Stats\n\n" +
"👥 Total Users: " + totalUsers.size + "\n" +
"📅 Today Active: " + dailyUsers.size + "\n" +
"💬 Active Chats: " + Object.keys(pairs).length / 2,
adminMenu()
);
}

if (text === "🟢 Live Status" && id === ADMIN_ID) {
return bot.sendMessage(
id,
"🟢 Live Status\n\n" +
"👥 Total Users: " + totalUsers.size + "\n" +
"📅 Today Active: " + dailyUsers.size + "\n" +
"💬 Active Chats: " + Object.keys(pairs).length / 2,
adminMenu()
);
}

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

if (text === "🚫 Ban User" && id === ADMIN_ID) {
adminMode = "ban";
return bot.sendMessage(id, "Send User ID to ban:");
}

if (adminMode === "ban" && id === ADMIN_ID) {
bannedUsers.add(Number(text));
adminMode = null;
return bot.sendMessage(id, "✅ User banned.", adminMenu());
}

if (text === "♻ Unban User" && id === ADMIN_ID) {
adminMode = "unban";
return bot.sendMessage(id, "Send User ID to unban:");
}

if (adminMode === "unban" && id === ADMIN_ID) {
bannedUsers.delete(Number(text));
adminMode = null;
return bot.sendMessage(id, "✅ User unbanned.", adminMenu());
}

if (text === "🔙 Back") {
adminMode = null;
return bot.sendMessage(id, "Main Menu", mainMenu(id));
}

if (text === "/start") {
return bot.sendMessage(id, "👋 Welcome to Anonymous Chat", mainMenu(id));
}

// RANDOM MATCH LOGIC

if (text === "💬 New Chat") {

if (pairs[id]) {
return bot.sendMessage(id, "❗ You are in chatting.");
}

return startSearch(id);
}

if (text === "🔄 Next") {

// If chatting → auto disconnect + new match
if (pairs[id]) {
disconnect(id);
}

return startSearch(id);
}

if (text === "❌ End") {
disconnect(id);
waitingUsers = waitingUsers.filter(user => user !== id);
return bot.sendMessage(id, "❌ Chat ended.", mainMenu(id));
}

if (text === "🚫 Report") {
disconnect(id);
return bot.sendMessage(id, "🚫 User reported.", mainMenu(id));
}

if (pairs[id]) {
await bot.sendChatAction(pairs[id], "typing");
bot.sendMessage(pairs[id], text);
}
});
