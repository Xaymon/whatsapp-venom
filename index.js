const venom = require("venom-bot");
const nodemailer = require("nodemailer");
require("dotenv").config();
const puppeteer = require("puppeteer");
const cron = require("node-cron");

const chatName = "Whatapps test";

async function captureExchangeRate() {
  const browser = await puppeteer.launch({
    executablePath: "/snap/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
  });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.bcel.com.la/bcel/exchange-rate.html", {
      waitUntil: networkidle2, // faster than networkidle2 "domcontentloaded"
      timeout: 60000,
    });

    // Wait for the table to appear
    await page.waitForSelector("div.table-responsive", { timeout: 30000 });

    const table = await page.$("div.table-responsive");
    if (table) {
      await table.screenshot({ path: "exchange_rate.png" });
      console.log("✅ Screenshot saved: exchange_rate.png");
    } else {
      console.log("❌ Exchange rate table not found!");
    }
  } catch (err) {
    console.error("❌ Puppeteer capture failed:", err);
  } finally {
    await browser.close();
  }
}


const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "xaymonmohn@gmail.com",
    pass: process.env.GMAIL,
  },
});

// Send QR code to mail
async function sendQrCodeByEmail(qrCodeBase64) {
  const mailOptions = {
    from: "xaymonmohn@gmail.com",
    to: "xaymonmohn@gmail.com",
    subject: "WhatsApp QR Code Login",
    html: `
      <h2>QR Code Login</h2>
      <p>SCAN QR Code HERE!!!</p>
      <img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code" />
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Sent QR Code to Gmail successfully");
  } catch (error) {
    console.error("❌ Gmail not sent:", error);
  }
}

venom
  .create(
    {
      session: "my-bot-session",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    // --- QR callback ---
    (base64Qr, asciiQR, attempts, urlCode) => {
      console.log("📲 New QR Code generated, attempt:", attempts);
      console.log(asciiQR); // show QR in terminal
      sendQrCodeByEmail(base64Qr.replace(/^data:image\/png;base64,/, ""));
    },
    // --- Status callback ---
    (statusSession, session) => {
      console.log("🟢 Status:", statusSession);
      console.log("📂 Session name:", session);
    }
  )
  .then((client) => start(client))
  .catch((error) => {
    console.error(error);
  });

async function start(client) {
  // cron.schedule("0 3,10 * * *", async () => { //UTC
  //   console.log("✅ WhatsApp client is ready!");

    try {
      console.log("⏰ Running scheduled task: 10AM or 5PM daily");
      // Step 1: Capture exchange rate
      await captureExchangeRate();

      // Step 2: Load screenshot
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB"); // Format: DD/MM/YYYY
      const timeStr = now.getHours() === 10 ? "10AM" : "5PM";
      const caption = `${dateStr} ${timeStr}`;
      const chats = await client.getAllChats();
      const group = chats.find((chat) => chat.name === chatName);

      if (group) {
        // await client.sendText(group.id._serialized, { caption });
        await client.sendImage(
          group.id._serialized,
          "exchange_rate.png",
          "ExchangeRate",
          caption
        );
        console.log(`📤 Sent message to ${chatName}`);
      } else {
        console.log(`❌ ${chatName} not found!`);
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
    }
  // });
}
