import { moderateMessage } from "./utils/openaiUtils.js";

moderateMessage("child violence is unforgivable").then((r) => {
  console.log(r);
});
