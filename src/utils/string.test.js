import {
  getTextMessageContent,
  extractCommandMessage,
  formGPTPrompt,
} from "./stringUtils.js";

describe("string utils", () => {
  test("test 1", () => {
    const str = extractCommandMessage("~gpt tell me the current time");
    expect(str).toEqual("tell me the current time");
  });
  test("test 2", () => {
    const str = extractCommandMessage("~gpt\ntell me the current time");
    expect(str).toEqual("tell me the current time");
  });
  test("test 3", () => {
    const str = extractCommandMessage("~gpt ぺこなんだよ");
    expect(str).toEqual("ぺこなんだよ");
  });
  test("extract msg", async () => {
    const str = await getTextMessageContent({
      content: "~gpt tell me the current time",
      embeds: [],
    });
    expect(str).toEqual("tell me the current time");
  });
  test("gpt prompt 1", () => {
    const str = formGPTPrompt(
      "user 1",
      "some text",
      "user 2",
      "~gpt also some text"
    );
    expect(str).toEqual("user 1: some text\n" + "user 2: also some text");
  });
  test("gpt prompt 2", () => {
    const str = formGPTPrompt("user 1", "some text", "user 2", "~gpt");
    expect(str).toEqual("user 1: some text");
  });
  test("gpt prompt 3", () => {
    const str = formGPTPrompt(
      undefined,
      undefined,
      "user 2",
      "~gpt also some text"
    );
    expect(str).toEqual("user 2: also some text");
  });
  test("gpt prompt 4", () => {
    const str = formGPTPrompt(undefined, undefined, "user 2", "~gpt");
    expect(str).toEqual("");
  });
});
