import { connectToStream } from "./utils/twitterUtils.js";
import { sleep } from "./utils/discordUtils.js";
import { H_M_S, S_MS } from "./utils/constants.js";

export class TwitterClient {
  init(apps) {
    this.apps = apps;
    this.keepConnectingToStreamFeed().catch((e) => {
      console.error(`Critical error when connecting to twitter feed!: ${e}`);
    });
  }

  async keepConnectingToStreamFeed() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await connectToStream(this.apps, this.keepConnectingToStreamFeed)
        .then(() => {
          console.log("Connected to twitter feed");
          this.connectedToStreamFeed = true;
        })
        .catch((e) => {
          console.error(`Can't connect to twitter stream: ${e}`);
        });
      if (this.connectedToStreamFeed) {
        return;
      }

      const MINUTES = 5;
      console.log(`Reconnecting in ${MINUTES} mins..`);

      await sleep(() => {}, MINUTES * H_M_S * S_MS);
      console.log("Another attempt to connect to twitter feed..");
    }
  }
}
