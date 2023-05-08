import { AbstractCommand } from "../abstractCommand.js";
import {
  formatTL,
  getMsgInfo,
  textIsRelayTL,
} from "../../utils/stringUtils.js";

import { fetchMessage } from "../../utils/discordUtils.js";

import { addRelay, loadRelays, updateRelays } from "../../model/relay.js";

import { PEKO_STREAM, SNAXXX_STREAM } from "../../utils/ids/channels.js";
import { RELAY_AUTHORS } from "../../utils/ids/users.js";

export class RelayMessageCommand extends AbstractCommand {
  constructor() {
    super();
    this.name = "relay";
    this.allowedChannels = [SNAXXX_STREAM];
    this.targetChannels = [PEKO_STREAM];
    this.intercept = true;
  }
  async execute(msg, discordClient) {
    const text = msg.content;
    const relaysFile = loadRelays();
    if (relaysFile.enabled === false) {
      return;
    }
    console.debug(
      `${this.name} triggered, ${getMsgInfo(msg)}, sending to: ${
        this.targetChannels
      }`
    );
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
    if (!RELAY_AUTHORS.includes(msg.author.id)) {
      return false;
    }
    const trimmedText = text.trim();
    return textIsRelayTL(trimmedText);
  }
}
