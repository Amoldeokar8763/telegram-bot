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

// 🔥 DYNAMIC MENU
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

// 🔥 UPDATED ADMIN MENU
function adminMenu() {
return {
reply_markup: {
keyboard: [
["📊 Bot Stats"],
["🟢 Live Status"],
["👥 Users"],
["✉ Message User"],
["📢 Broadcast"],
["🚫 Ban User", "♻ Unban User"],
["🔙 Back"]
],
resize_keyboard: true
}
};
}

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

let activeChats = Object.keys(pairs).length / 2;
let waitingCount = waitingUsers.length;
let onlineToday = dailyUsers.size;

return bot.sendMessage(
id,
"🟢 LIVE STATUS\n\n" +
"💬 Active Chats: " + activeChats + "\n" +
"⏳ Waiting Users: " + waitingCount + "\n" +
"🟢 Online Today: " + onlineToday,
adminMenu()
);
}

// 👥 USERS LIST
if (text === "👥 Users" && id === ADMIN_ID) {

let list = [...totalUsers];

if (list.length === 0) {
return bot.sendMessage(id, "No users yet.", adminMenu());
}

let message = "👥 Users List:\n\n";
list.forEach(u => message += u + "\n");

return bot.sendMessage(id, message, adminMenu());
}

// PROFILE VIEW
if (text && text.startsWith("/profile") && id === ADMIN_ID) {

let userId = text.split(" ")[1];

if (!userId) {
return bot.sendMessage(id, "Usage: /profile USER_ID");
}

try {
let photos = await bot.getUserProfilePhotos(userId);

if (photos.total_count > 0) {
let fileId = photos.photos[0][0].file_id;
return bot.sendPhoto(id, fileId, { caption: "Profile of " + userId });
} else {
return bot.sendMessage(id, "User has no profile photo.");
}
} catch {
return bot.sendMessage(id, "Cannot fetch profile.");
}
}

// PRIVATE MESSAGE MODE
if (text === "✉ Message User" && id === ADMIN_ID) {
adminMode = "privateMessage";
return bot.sendMessage(id, "Send like:\nUSER_ID message");
}

if (adminMode === "privateMessage" && id === ADMIN_ID) {

adminMode = null;

let parts = text.split(" ");
let userId = parts[0];
let msgText = parts.slice(1).join(" ");

if (!userId || !msgText) {
return bot.sendMessage(id, "Invalid format.");
}

try {
await bot.sendMessage(userId, "⚠ Admin Warning:\n\n" + msgText);
return bot.sendMessage(id, "✅ Message sent.", adminMenu());
} catch {
return bot.sendMessage(id, "❌ Cannot send message.", adminMenu());
}
}

if (text === "🔙 Back") {
adminMode = null;
return bot.sendMessage(id, "Main Menu", mainMenu(id));
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
