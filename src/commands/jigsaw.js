// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
import puppeteer from "puppeteer-extra";
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import pup from "puppeteer";
import { parseSingleAttachmentUrl } from "../utils/stringUtils.js";
import { SlashCommandBuilder } from "discord.js";
import {
  followUpCustomEmbed,
  replyCustomEmbed,
  sleep,
} from "../utils/discordUtils.js";

puppeteer.use(StealthPlugin());

// const { checkPermissions } = require("../utils/discordUtils");

export default {
  data: new SlashCommandBuilder()
    .setName("jigsaw")
    .setDescription("Generate a puzzle from an image")
    .addAttachmentOption((option) =>
      option.setName("image").setDescription("Puzzle image").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setMinValue(10)
        .setMaxValue(1200)
        .setRequired(true)
        .setName("pieces")
        .setDescription("Amount of pieces")
    )
    .addBooleanOption((option) =>
      option.setName("ping").setDescription("Ping the role").setRequired(false)
    ),
  async execute(interaction) {
    await processGeneratePuzzle(interaction);
  },
};

const getUserInfo = (interaction) => {
  return {
    id: interaction.user.id,
    userName: interaction.nickname || interaction.user.username,
  };
};

let isReplied = false;

const processGeneratePuzzle = async (interaction) => {
  try {
    isReplied = false;
    const userInfo = getUserInfo(interaction);
    const url = parseSingleAttachmentUrl(
      interaction.options._hoistedOptions[0]
    );
    const numberOfPieces = interaction.options._hoistedOptions[1].value;
    const pingTheRole = interaction.options._hoistedOptions[2]?.value || false;

    await replyCustomEmbed(
      interaction,
      "Puzzle is being generated",
      "Please wait till the puzzle is created and converted to multiplayer. With the new way of things working, it may take up to 30 seconds.",
      url,
      undefined,
      `${numberOfPieces} pieces`
    );

    // error?, singlePlayerUrl, multiPlayerUrl?
    const result = await makeWholePuzzle(
      userInfo.userName,
      url,
      numberOfPieces
    );

    isReplied = true;

    const jigsawRole = interaction.guild.roles.cache.find(
      (role) => role.name === "Jigsaw Enjoyer" || role.name === "Jigsaw 35P"
    );
    const rolesChannel = interaction.guild.channels.cache.find(
      (channel) => channel.name === "roles-and-rules"
    );
    const rulesChannel = interaction.guild.channels.cache.find(
      (channel) => channel.name === "rules"
    );
    const chosenChannel = rolesChannel || rulesChannel;
    const pingMessage = `If you would like to be pinged on such events, feel free to get a ${
      jigsawRole || "jigsaw"
    } role in the ${chosenChannel || "roles"} channel!`;
    let puzzleMessage;
    if (result.multiplayerUrl) {
      puzzleMessage = `Let's do some puzzle!`;
      if (pingTheRole) {
        puzzleMessage = puzzleMessage.concat("\n").concat(pingMessage);
      }
    } else {
      puzzleMessage = result.error
        ? result.error
        : `Gomen! I couldn't make a multiplayer version! But here is your singleplayer link. Remember to set it to multiplayer. This message is not displayed publicly, so provide the link manually!`;
    }
    await followUpCustomEmbed(
      interaction,
      result.multiplayerUrl
        ? "Link to the puzzle"
        : result.error || !result.singlePlayerUrl
        ? undefined
        : "Singleplayer puzzle link",
      puzzleMessage,
      url,
      result.multiplayerUrl || result.singlePlayerUrl,
      `${numberOfPieces} pieces`,
      pingTheRole ? jigsawRole : undefined,
      false
    );
  } catch (e) {
    console.error(e);
    const call = isReplied ? followUpCustomEmbed : replyCustomEmbed;
    await call(
      interaction,
      undefined,
      "Couldn't create a puzzle. Check if the puzzle url correct"
    );
  }
};

export const makeWholePuzzle = async (username, imageUrl, nop) => {
  const startPage = "https://jigsawexplorer.com/create-a-custom-jigsaw-puzzle";

  const browser = await puppeteer.launch({
    executablePath: pup.executablePath(),
    args: ["--no-sandbox"],
    headless: "new",
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(startPage, { waitUntil: "domcontentloaded" });

  // url input, class=create-url, name=image-url
  await page.waitForSelector("input[name=image-url]");
  await page.type("input[name=image-url]", imageUrl);

  // url input, class=create-url, name=puzzle-nop
  await page.type("input[name=puzzle-nop]", `${nop}`);
  await page.evaluate(() => {
    const element = document.querySelector("form center input"); // select thrid row td element like so
    element.click();
  });

  // main result page

  await page.waitForSelector("#short-link", { visible: true, timeout: 100000 });
  const sl = await page.$("#short-link");
  const puzzleUrl = await page.evaluate((sl) => sl.value, sl);

  console.log("intermediate link:", puzzleUrl);
  await page.goto(puzzleUrl, { timeout: 100000 });

  let toReturnData = {
    error: undefined,
    singlePlayerUrl: puzzleUrl,
    multiplayerUrl: undefined,
  };

  let isError = false;

  try {
    await page.waitForSelector("#jigex-msgbox-content", {
      visible: true,
      timeout: 5000,
    });

    const el = await page.$("#jigex-msgbox-content");
    if (el) {
      let value = await page.evaluate((el) => el.textContent, el);
      if (
        value.indexOf("The custom jigsaw puzzle subject failed to load") >= 0
      ) {
        isError = true;
      }
    }
  } catch (e) {
    console.error(e);
  }

  if (isError) {
    toReturnData.error = "jigex.com failed to parse the provided image";
    await browser.close();

    return toReturnData;
  }

  try {
    await page.waitForSelector("#jigex-multiplayer-btn", {
      visible: true,
      timeout: 100000,
    });
    await page.click("#jigex-multiplayer-btn");

    await page.waitForSelector("#jigex-player-name", {
      visible: true,
      timeout: 100000,
    });
    await page.type("#jigex-player-name", username);

    await page.waitForSelector("#jigex-invite-btn", {
      visible: true,
      timeout: 100000,
    });
    await sleep(() => {}, 500);
    await page.click("#jigex-invite-btn");

    await page.waitForSelector("#jigex-game-link", {
      visible: true,
      timeout: 100000,
    });
    const n = await page.$("#jigex-game-link");
    toReturnData.multiplayerUrl = await page.evaluate((n) => n.value, n);
    console.debug("successful multiplayer link:", toReturnData.multiplayerUrl);
  } catch (e) {
    console.error(
      `Failed to make multiplayer puzzle link: ${e}. Unsuccessful link: ${toReturnData.multiplayerUrl}, single player link: ${toReturnData.singlePlayerUrl}`
    );
  }

  await browser.close();

  return toReturnData;
};
