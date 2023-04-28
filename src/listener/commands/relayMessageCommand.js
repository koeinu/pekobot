import { AbstractCommand } from "../abstractCommand.js";
import { formatTL } from "../../utils/stringUtils.js";

import { fetchMessage } from "../../utils/discordUtils.js";

import { addRelay, loadRelays, updateRelays } from "../../model/relay.js";

import { allowedAuthors, channels, targetChannels } from "./relayChannels.js";

export class RelayMessageCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "relay";
    this.channels = channels;
    this.targetChannels = targetChannels;
    this.intercept = true;
  }
  async execute(msg, discordClient) {
    const text = msg.content;
    const relaysFile = loadRelays();
    if (relaysFile.enabled === false) {
      return;
    }
    console.log(text, "relaying to channels: ", this.targetChannels);
    const foundChannels = this.targetChannels
      .reduce((array, channelToSend) => {
        const foundChannels = discordClient.channels.cache.filter(
          (el) => el.id === channelToSend
        );
        array.push(...foundChannels);
        return array;
      }, [])
      .map((el) => el[1]);

    const msgToSend = formatTL(text);

    foundChannels.forEach((channel) => {
      console.log(
        `sending ${msgToSend} to ${channel.name} on ${channel.guild.name}`
      );
      channel
        .send(msgToSend)
        .then((sentMessage) => {
          addRelay({
            sourceId: msg.id,
            source: {
              guildId: msg.guild.id,
              channelId: msg.channel.id,
              messageId: msg.id,
              createdTimestamp: msg.createdTimestamp,
            },
            target: {
              guildId: sentMessage.guild.id,
              channelId: sentMessage.channel.id,
              messageId: sentMessage.id,
            },
            content: msgToSend,
          });
        })
        .catch((e) => {
          console.error(`Couldn't relay TL: ${e}`);
        });
    });
  }

  async executeUpdate(oldMsg, newMsg, discordClient) {
    const oldText = oldMsg.content;
    const newText = newMsg.content;

    console.log("trying to update ", oldText, "to", newText);

    const relaysFile = loadRelays();
    const relays = relaysFile.relays;
    const cachedElements = relays.filter((el) => el.sourceId === oldMsg.id);
    if (cachedElements.length > 0) {
      const formattedNewText = formatTL(newText);
      for (let i = 0; i < cachedElements.length; i++) {
        const targetData = cachedElements[i].target;
        if (!targetData) {
          continue;
        }
        const message = await fetchMessage(discordClient, targetData);
        if (!message) {
          continue;
        }
        await message.edit(formattedNewText);
        const index = relays.indexOf(cachedElements[i]);
        if (index > -1) {
          relays[index].content = formattedNewText;
        }
      }
      updateRelays(relays);
    }
  }

  async executeDelete(msg, discordClient) {
    const text = msg.content;

    console.log("trying to delete ", text);

    const relaysFile = loadRelays();
    const relays = relaysFile.relays;
    const cachedElements = relays.filter((el) => el.sourceId === msg.id);
    if (cachedElements.length > 0) {
      for (let i = 0; i < cachedElements.length; i++) {
        const targetData = cachedElements[i].target;
        if (!targetData) {
          continue;
        }
        const message = await fetchMessage(discordClient, targetData);
        if (!message) {
          continue;
        }
        await message.delete();
        const index = relays.indexOf(cachedElements[i]);
        if (index > -1) {
          relays.splice(index, 1);
        }
      }
      updateRelays(relays);
    }
  }

  async commandMatch(msg) {
    const text = msg.content;
    if (!allowedAuthors.includes(msg.author.id)) {
      // Zabine
      console.log("SKIPPING AUTHOR", msg.author, ":", text);
      return false;
    }
    const trimmedText = text.trim();
    if (
      trimmedText.indexOf("chat:") === 0 ||
      trimmedText.indexOf("chat;") === 0
    ) {
      return true;
    }
    const firstWord = trimmedText.match(/[a-zA-Z]+/i);
    // console.log("first word:", firstWord);
    if (
      firstWord &&
      (trimmedText.indexOf(":") === firstWord[0].length ||
        trimmedText.indexOf(";") === firstWord[0].length) &&
      firstWord[0].length <= 3 &&
      !firstWord[0].includes("http")
    ) {
      console.log("relaying translation:", text);
      return true;
    } else if (trimmedText.indexOf(">") === 0) {
      console.log("relaying summary:", text);
      return true;
    } else {
      return false;
    }
  }
}
