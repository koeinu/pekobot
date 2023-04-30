import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();
const token = process.env.TG_BOT_TOKEN;

export const originalConsoleLog = console.log;
export const originalConsoleError = console.error;
export const originalConsoleWarn = console.warn;

const MESSAGE_MAX_LENGTH = 4000;

export class TelegramBotWrapper {
  constructor() {
    if (token) {
      try {
        this.bot = new TelegramBot(token, { polling: true });
      } catch (e) {
        console.error(e);
      }
      // this.bot.on("channel_post", (msg) => {
      //   const chatId = msg.chat.id;
      //
      //   // send a message to the chat acknowledging receipt of their message
      //   this.bot.sendMessage(chatId, "Received your message");
      // });
    }
    this.logsId = -1001906303858;
    this.errorsId = -1001920972703;
    this.warningsId = -1001838776203;
  }

  async sendMessage(id, str) {
    const parts = str.match(/.{1,4000}/g);
    for (let part of parts) {
      await this.bot.sendMessage(id, part).catch((e) => {
        originalConsoleError(e);
      });
    }
  }

  makeString(...args) {
    return args
      .map((el) => JSON.stringify(el, null, 1))
      .join(" ")
      .replaceAll("\\n", "")
      .replaceAll("\n", "")
      .replaceAll('"', "");
  }

  sendLog(...args) {
    if (this.bot) {
      this.sendMessage(this.logsId, this.makeString(...args)).catch((e) => {
        originalConsoleError(e);
      });
    }
  }
  sendError(...args) {
    this.sendMessage(this.errorsId, this.makeString(...args)).catch((e) => {
      originalConsoleError(e);
    });
  }
  sendWarning(...args) {
    this.sendMessage(this.warningsId, this.makeString(...args)).catch((e) => {
      originalConsoleError(e);
    });
  }
}

// Matches "/echo [whatever]"
