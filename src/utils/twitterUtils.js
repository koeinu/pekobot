import { ApiUtils } from "./apiUtils.js";
import { formatTLText, formatMSToHMS, formatNewline } from "./stringUtils.js";

import { CATCH_TWEET_TIMEOUT } from "./constants.js";

import { ETwitterStreamEvent, TwitterApi } from "twitter-api-v2";

import dotenv from "dotenv";
import {
  PEKO_PEKORA_FEED,
  PEKO_STREAM,
  TEST_INA_FEED,
  TEST_PEKORA_FEED,
  TEST_PEKORA_POEM,
  TEST_POEM_FEED,
  TEST_TEST_FEED,
  TEST_TEST_POEM_FEED,
} from "./ids/channels.js";
dotenv.config();

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

console.log(`twitter token: ${BEARER_TOKEN}`);

const client = new TwitterApi(BEARER_TOKEN);
let catchingPoem = false;

const TWITTER_RELAY_DATA = [
  {
    src: "usadapekora",
    feedIds: [TEST_PEKORA_FEED, PEKO_PEKORA_FEED],
    poemIds: [TEST_POEM_FEED, PEKO_STREAM],
  },
  {
    src: "uraakapeko",
    feedIds: [TEST_PEKORA_FEED, PEKO_PEKORA_FEED],
    poemIds: [TEST_PEKORA_POEM, PEKO_STREAM],
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
];

const getUserTweetLink = (tweet, userIdToForward) =>
  `https://twitter.com/${userIdToForward}/status/${tweet.data.id}`;

const sendTweetToChannels = async (discordClient, finalText, channels) => {
  const foundChannels = channels
    .reduce((array, channelToSend) => {
      const fc = discordClient.channels.cache.filter(
        (el) => el.id === channelToSend
      );
      array.push(...fc);
      return array;
    }, [])
    .map((el) => el[1]);

  console.log("found channels to tweet to:", foundChannels);
  foundChannels.forEach((channel) => {
    console.log(`sending to ${channel.name}`);
    channel.send(finalText).catch((e) => {
      console.error(`Couldn't relay tweet to ${channel.name}, ${e}`);
    });
  });
};
const onStreamTweet = async (tweet, discordClient) => {
  const userData = await client.v2.user(tweet.data.author_id);
  const userName = userData.data.username;

  const referencedTweetId =
    tweet.data.referenced_tweets && tweet.data.referenced_tweets.length > 0
      ? tweet.data.referenced_tweets[0].id
      : undefined;
  const referencedTweet = referencedTweetId
    ? await client.v2.singleTweet(referencedTweetId, {
        "tweet.fields": ["author_id", "text"],
      })
    : undefined;
  const referencedUserdata = referencedTweet
    ? await client.v2.user(referencedTweet.data.author_id)
    : undefined;
  const referencedUsername = referencedUserdata
    ? referencedUserdata.data.username
    : undefined;
  const userRelayData = TWITTER_RELAY_DATA.find((el) => el.src === userName);
  const feedChannels = userRelayData?.feedIds || [];
  const poemChannels = userRelayData?.poemIds || [];
  if (referencedTweet && referencedUsername) {
    console.log(
      `Got a retweet ${referencedTweet.data.text} from ${referencedUsername}, feed channels: ${feedChannels}, poem channels: ${poemChannels}`
    );
  } else {
    console.log(
      `Got a tweet ${tweet.data.text} from ${userName}, feed channels: ${feedChannels}, poem channels: ${poemChannels}`
    );
  }

  const translatedData = await formatTweet(
    tweet,
    userName,
    referencedTweet,
    referencedUsername
  );

  await sendTweetToChannels(
    discordClient,
    translatedData.usualText,
    feedChannels
  );

  // for the poems, catch only non-retweets, and only when asked
  if (!catchingPoem || tweet.data.text.indexOf("RT") === 0) {
    return;
  }

  await sendTweetToChannels(
    discordClient,
    translatedData.poemText,
    poemChannels
  );

  stopCatchingTweets();
};

export const connectToStream = async (discordClient) => {
  const rules = await client.v2.streamRules();
  console.log("rules:", rules.data);
  const usersToRelay = TWITTER_RELAY_DATA.map((el) => el.src);
  if (rules.data?.length) {
    if (
      usersToRelay.some(
        (userIdToForward) =>
          !rules.data.some((el) => el.value.includes(userIdToForward))
      )
    ) {
      console.log("deleting the rules");
      await client.v2.updateStreamRules({
        delete: { ids: rules.data.map((rule) => rule.id) },
      });
      console.log("adding a user rule");
      // Add our rules
      await client.v2.updateStreamRules({
        add: usersToRelay.map((el) => {
          return { value: `from:${el}` };
        }),
      });
    }
  } else {
    await client.v2.updateStreamRules({
      add: usersToRelay.map((el) => {
        return { value: `from:${el}` };
      }),
    });
  }

  const stream = await client.v2.searchStream({
    "tweet.fields": ["referenced_tweets", "author_id"],
    expansions: ["referenced_tweets.id"],
  });
  // Enable auto reconnect
  stream.autoReconnect = true;

  stream.on(ETwitterStreamEvent.Data, (tweet) =>
    onStreamTweet(tweet, discordClient).catch((e) => {
      console.error(e);
    })
  );
};

const formatTweet = async (tweet, username, refTweet, refUsername) => {
  const url = getUserTweetLink(tweet, username);
  const refUrl =
    refTweet && refUsername
      ? getUserTweetLink(refTweet, refUsername)
      : undefined;

  const targetText =
    refTweet && tweet.data.text.indexOf("RT") === 0
      ? refTweet.data.text
      : tweet.data.text;
  let tlData = await ApiUtils.GetTranslation(
    targetText,
    undefined,
    undefined,
    true
  );

  const targetUrl =
    refUrl && tweet.data.text.indexOf("RT") === 0 ? refUrl : url;
  let fmtText;
  if (tlData.text) {
    fmtText = formatNewline(targetUrl, formatTLText(tlData.text, tlData.isGpt));
  } else {
    // fallback to deepl
    tlData = await ApiUtils.GetTranslation(tweet.data.text);
    fmtText = formatNewline(targetUrl, formatTLText(tlData.text));
  }

  return {
    poemText: `${username} wrote a poem, peko!\n${fmtText}`,
    usualText:
      refUrl && tweet.data.text.indexOf("RT") === 0
        ? `${username} retweeted ${refUsername}!\n${fmtText}`
        : refUrl
        ? `${username} quoted ${refUsername}!\n${fmtText}`
        : `${username} tweeted!\n${fmtText}`,
  };
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

const stopCatchingTweets = () => {
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
