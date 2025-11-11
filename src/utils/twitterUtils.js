import { ApiUtils } from "./apiUtils.js";
import { formatMSToHMS, formatNewline, formatTLText } from "./stringUtils.js";

import { CATCH_TWEET_TIMEOUT } from "./constants.js";

import dotenv from "dotenv";
import {
  MIKO_TWEETS_FEED,
  PEKO_MEMBER_STREAM,
  PEKO_PEKORA_FEED,
  PEKO_STREAM,
  TEST_INA_FEED,
  TEST_MIKO_FEED,
  TEST_PEKORA_FEED,
  TEST_PEKORA_POEM,
  TEST_POEM_FEED,
  TEST_TEST_FEED,
  TEST_TEST_POEM_FEED,
} from "./ids/channels.js";

dotenv.config();

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const MEMBER_MODE = process.env.MEMBER_MODE;

console.log(`twitter token: ${BEARER_TOKEN}`);

export let catchingPoem = false;

export const TWITTER_RELAY_DATA = [
  {
    src: "usadapekora",
    feedIds: [TEST_PEKORA_FEED, PEKO_PEKORA_FEED],
    poemIds: [TEST_POEM_FEED, MEMBER_MODE ? PEKO_MEMBER_STREAM : PEKO_STREAM],
  },
  {
    src: "uraakapeko",
    feedIds: [TEST_PEKORA_FEED, PEKO_PEKORA_FEED],
    poemIds: [TEST_PEKORA_POEM, MEMBER_MODE ? PEKO_MEMBER_STREAM : PEKO_STREAM],
  },
  {
    src: "koeinu",
    feedIds: [TEST_TEST_FEED],
    poemIds: [TEST_TEST_POEM_FEED],
  },
  {
    src: "ninomaeinanis",
    feedIds: [TEST_INA_FEED],
    poemIds: [],
  },
  {
    src: "wooperfuri",
    feedIds: [TEST_INA_FEED],
    poemIds: [],
  },
  {
    src: "sakuramiko35",
    feedIds: [TEST_MIKO_FEED, MIKO_TWEETS_FEED],
    poemIds: [],
  },
  {
    src: "mikochisub",
    feedIds: [TEST_MIKO_FEED, MIKO_TWEETS_FEED],
    poemIds: [],
  },
];

const getUserTweetLink = (tweet, userIdToForward) =>
  `https://twitter.com/${userIdToForward}/status/${tweet.data.id}`;

const sendTweetToChannels = async (
  discordClient,
  finalText,
  channels,
  settings
) => {
  console.warn("finding channels to tweet to:", channels);
  const foundChannels = channels
    .reduce((array, channelToSend) => {
      const fc = discordClient.channels.cache.filter(
        (el) => el.id === channelToSend
      );
      array.push(...fc);
      return array;
    }, [])
    .map((el) => el[1]);

  console.warn(
    "found channels to tweet to:",
    foundChannels.map((el) => el.name)
  );
  if (settings.inactive) {
    console.log("inactive mode, doing nothing");
    return;
  }
  foundChannels.forEach((channel) => {
    console.log(`sending to ${channel.name}`);
    channel.send(finalText).catch((e) => {
      console.error(`Couldn't relay tweet to ${channel.name}, ${e}`);
    });
  });
};

const formatTweet = async (
  settings,
  tweet,
  username,
  refTweet,
  refUsername
) => {
  const url = getUserTweetLink(tweet, username);
  const refUrl =
    refTweet && refUsername
      ? getUserTweetLink(refTweet, refUsername)
      : undefined;

  const isRetweet = tweet.data.text.indexOf("RT") === 0;
  let targetText = isRetweet ? refTweet.data.text : tweet.data.text;

  const targetUrl = refUrl && isRetweet ? refUrl : url;

  if (isRetweet) {
    return {
      poemText: undefined,
      usualText: `${username} retweeted ${refUsername}!\n${targetUrl}`,
    };
  } else {
    let tlData = await ApiUtils.GetTranslation(
      targetText,
      undefined,
      undefined,
      settings,
      true,
      false,
      true
    );

    let fmtText;
    fmtText = formatNewline(targetUrl, formatTLText(tlData.text, tlData.isGpt));

    return {
      poemText: `${username} wrote a poem!\n${fmtText}`,
      usualText: refUrl
        ? `${username} quoted ${refUsername}!\n${fmtText}`
        : `${username} tweeted!\n${fmtText}`,
    };
  }
};

let timeoutId = undefined;
export const catchTweets = () => {
  stopCatchingTweets();
  console.log(
    `started catching tweets, timeout is ${formatMSToHMS(CATCH_TWEET_TIMEOUT)}`
  );
  catchingPoem = true;
  timeoutId = setTimeout(stopCatchingTweets, CATCH_TWEET_TIMEOUT);
};

export const stopCatchingTweets = () => {
  catchingPoem = false;
  console.log("stopped catching tweets");
  interruptTweetsCatchingTimeout();
};

const interruptTweetsCatchingTimeout = () => {
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
    timeoutId = undefined;
  }
};
