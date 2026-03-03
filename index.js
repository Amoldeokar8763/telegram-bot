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
keyboard.push(["💬 New Chat"]);
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

function adminMenu() {
return {
reply_markup: {
keyboard: [
["📊 Bot Stats"],
["🟢 Live Status"],
["👥 Users"],
["📢 Broadcast"],
["🚫 Ban User", "♻ Unban User"],
["🔙 Back"]
],
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
bot.sendMessage(id, "⏳ Finding someone for you...");

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

/* ================= ADMIN PANEL ================= */

if (text === "📊 Admin Panel" && id === ADMIN_ID) {
return bot.sendMessage(id, "⚙ Admin Control Panel", adminMenu());
}

if (text === "📊 Bot Stats" && id === ADMIN_ID) {
return bot.sendMessage(
id,
"📊 BOT STATS\n\n" +
"👥 Total Users Ever: " + totalUsers.size + "\n" +
"📅 Today Active Users: " + dailyUsers.size + "\n" +
"💬 Active Chats: " + Object.keys(pairs).length / 2,
adminMenu()
);
}

if (text === "🟢 Live Status" && id === ADMIN_ID) {

return bot.sendMessage(
id,
"🟢 LIVE STATUS\n\n" +
"💬 Active Chats: " + Object.keys(pairs).length / 2 + "\n" +
"⏳ Waiting Users: " + waitingUsers.length + "\n" +
"🟢 Online Today: " + dailyUsers.size,
adminMenu()
);
}

/* ========= INLINE USERS PANEL ========= */

if (text === "👥 Users" && id === ADMIN_ID) {

let users = [...totalUsers];

if (users.length === 0) {
return bot.sendMessage(id, "No users yet.", adminMenu());
}

for (let userId of users) {

await bot.sendMessage(
id,
"User ID: " + userId,
{
reply_markup: {
inline_keyboard: [
[
{ text: "🖼 Profile", callback_data: "profile_" + userId },
{ text: "✉ Warn", callback_data: "warn_" + userId }
],
[
{ text: "🚫 Ban", callback_data: "ban_" + userId }
]
]
}
}
);

}

return;
}

/* ================= BACK ================= */

if (text === "🔙 Back") {
adminMode = null;
return bot.sendMessage(id, "Main Menu", mainMenu(id));
}

if (text === "/start") {
return bot.sendMessage(id, "👋 Welcome to Anonymous Chat", mainMenu(id));
}

/* ================= RANDOM MATCH ================= */

if (text === "💬 New Chat") {

if (pairs[id]) {
return bot.sendMessage(id, "❗ You are in chatting.");
}

return startSearch(id);
}

if (text === "🔄 Next") {

if (pairs[id]) {

if (Date.now() - connectionTime[id] < 5000) {
return bot.sendMessage(id, "⏳ Please wait 5 seconds before skipping.");
}

disconnect(id);
}

return startSearch(id);
}

if (text === "❌ End") {

if (pairs[id]) {

if (Date.now() - connectionTime[id] < 5000) {
return bot.sendMessage(id, "⏳ You cannot end chat within 5 seconds.");
}

disconnect(id);
}

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

/* ================= CALLBACK HANDLER ================= */

bot.on("callback_query", async (query) => {

const data = query.data;
const adminId = query.message.chat.id;

if (adminId !== ADMIN_ID) return;

// PROFILE
if (data.startsWith("profile_")) {

let userId = data.split("_")[1];

try {
let photos = await bot.getUserProfilePhotos(userId);

if (photos.total_count > 0) {
let fileId = photos.photos[0][0].file_id;
await bot.sendPhoto(adminId, fileId, { caption: "Profile of " + userId });
} else {
await bot.sendMessage(adminId, "User has no profile photo.");
}
} catch {
await bot.sendMessage(adminId, "Cannot fetch profile.");
}
}

// WARN
if (data.startsWith("warn_")) {

let userId = data.split("_")[1];
adminMode = "warn_" + userId;

await bot.sendMessage(adminId, "Send warning message for user " + userId);
}

// BAN
if (data.startsWith("ban_")) {

let userId = data.split("_")[1];
bannedUsers.add(Number(userId));

await bot.sendMessage(adminId, "🚫 User " + userId + " banned.");
}

});

// WARNING MESSAGE SEND
bot.on("message", async (msg) => {

if (!adminMode) return;

const id = msg.chat.id;
if (id !== ADMIN_ID) return;

if (adminMode.startsWith("warn_")) {

let userId = adminMode.split("_")[1];
adminMode = null;

try {
await bot.sendMessage(userId, "⚠ Admin Warning:\n\n" + msg.text);
await bot.sendMessage(id, "✅ Warning sent.");
} catch {
await bot.sendMessage(id, "❌ Cannot send warning.");
}

}

});
