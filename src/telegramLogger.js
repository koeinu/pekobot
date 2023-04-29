import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();
const token = process.env.TG_BOT_TOKEN;

export class TelegramBotWrapper {
  constructor() {
    if (token) {
      this.bot = new TelegramBot(token, { polling: true });
      this.bot.on("channel_post", (msg) => {
        const chatId = msg.chat.id;

        // send a message to the chat acknowledging receipt of their message
        this.bot.sendMessage(chatId, "Received your message");
      });
    }
    this.logsId = -1001906303858;
    this.errorsId = -1001906303858;
  }

  sendLog(message) {
    if (this.bot) {
      this.bot.sendMessage(this.logsId, message);
    }
  }
  sendError(message) {
    if (this.bot) {
      this.bot.sendMessage(this.errorsId, message);
    }
  }
}

// Matches "/echo [whatever]"