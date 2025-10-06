require('dotenv').config();

module.exports = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
    },
    twelveData: {
        apiKey: process.env.TWELVE_DATA_API_KEY
    }
};