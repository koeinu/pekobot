import { ApiUtils } from "./apiUtils.js";
import { formatMSToHMS, formatNewline, formatTLText } from "./stringUtils.js";

import { CATCH_TWEET_TIMEOUT } from "./constants.js";

import { ETwitterStreamEvent, TwitterApi } from "twitter-api-v2";

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

export const client = new TwitterApi(BEARER_TOKEN);
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

export const getTweetById = async (tweetId) => {
  return await client.v2.singleTweet(tweetId, {
    "tweet.fields": ["referenced_tweets", "text", "author_id"],
    "user.fields": ["name"],
  });
};

export const getTweetChainTextParts = (tweetId) => {
  return getTweetById(tweetId)
    .then(async (res) => {
      const parts = [];
      const data = res.data;
      const userData = await client.v2.user(data.author_id);
      const refData = data.referenced_tweets;
      if (refData && refData.length > 0 && refData[0].type === "replied_to") {
        // need to get more
        const refId = refData[0].id;
        const refTweetTextParts = await getTweetChainTextParts(refId);
        parts.push(...refTweetTextParts);
      }
      parts.push({ userData: userData.data, text: data.text });
      return parts;
    })
    .catch((e) => {
      console.error(`Couldn't get a tweet chain: ${e}`);
    });
};

const onStreamTweet = async (tweet, botApps) => {
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
    console.warn(
      `Got a retweet ${referencedTweet.data.text} from ${referencedUsername}, feed channels: ${feedChannels}, poem channels: ${poemChannels}`
    );
  } else {
    console.warn(
      `Got a tweet ${tweet.data.text} from ${userName}, feed channels: ${feedChannels}, poem channels: ${poemChannels}`
    );
  }

  for (let botApp of botApps) {
    const translatedData = await formatTweet(
      botApp.settings,
      tweet,
      userName,
      referencedTweet,
      referencedUsername
    );

    await sendTweetToChannels(
      botApp.client,
      translatedData.usualText,
      feedChannels,
      botApp.settings
    );

    // for the poems, catch only non-retweets, and only when asked
    if (
      !catchingPoem ||
      tweet.data.text.indexOf("RT") === 0 ||
      poemChannels.length === 0 ||
      !translatedData.poemText
    ) {
      continue;
    }
    stopCatchingTweets();

    await sendTweetToChannels(
      botApp.client,
      translatedData.poemText,
      poemChannels,
      botApp.settings
    );
  }
};

export const connectToStream = async (botApps, startConnectingCallback) => {
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
        add: [
          {
            value: usersToRelay
              .map((el) => {
                return `from:${el}`;
              })
              .join(" OR "),
          },
        ],
      });
    }
  } else {
    await client.v2.updateStreamRules({
      add: [
        {
          value: usersToRelay
            .map((el) => {
              return `from:${el}`;
            })
            .join(" OR "),
        },
      ],
    });
  }

  const stream = await client.v2.searchStream({
    "tweet.fields": ["referenced_tweets", "author_id"],
    expansions: ["referenced_tweets.id"],
  });
  // Enable auto reconnect
  stream.autoReconnect = true;

  stream.on(ETwitterStreamEvent.Data, (tweet) =>
    onStreamTweet(tweet, botApps).catch((e) => {
      console.error(`Tweet relay failed: ${e}`);
    })
  );
  stream.on(ETwitterStreamEvent.DataError, (error) => {
    console.error("Twitter data error:", error.message);
  });
  stream.on(ETwitterStreamEvent.Error, (error) => {
    console.error("Twitter error:", error.message || error.error || error);
  });
  stream.on(ETwitterStreamEvent.Connected, () => {
    console.error("Twitter stream connected");
  });
  stream.on(ETwitterStreamEvent.ConnectionLost, () => {
    console.error("Twitter connection lost");
  });
  stream.on(ETwitterStreamEvent.ConnectionError, (error) => {
    console.error("Twitter connection error:", error.message);
  });
  stream.on(ETwitterStreamEvent.TweetParseError, (error) => {
    console.error("Twitter tweet parse error:", error.message);
  });
  stream.on(ETwitterStreamEvent.ConnectionClosed, () => {
    console.error("Twitter connection error");
  });
  // stream.on(ETwitterStreamEvent.DataKeepAlive, () => {
  //   console.warn("Twitter data keep alive");
  // });
  stream.on(ETwitterStreamEvent.ReconnectAttempt, (tries) => {
    console.error("Twitter reconnecting, attempts:", tries);
  });
  stream.on(ETwitterStreamEvent.ReconnectError, (tries) => {
    console.error("Twitter reconnect error, attempts:", tries);
  });
  stream.on(ETwitterStreamEvent.ReconnectLimitExceeded, () => {
    console.error("Twitter reconnect limit exceeded");
    stream.destroy();
    startConnectingCallback();
  });
  stream.on(ETwitterStreamEvent.Reconnected, () => {
    console.error("Twitter stream reconnected");
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
      false
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
