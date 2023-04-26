import { parseVideoId } from "../../utils/youtubeUtils.js";

describe("Links filter tests", () => {
  test("test 1", () => {
    const videoId = parseVideoId("https://www.youtube.com/watch?v=J22a5H6rR9M");
    expect(videoId).toEqual("J22a5H6rR9M");
  });
  test("test 2", () => {
    const videoId = parseVideoId("https://youtu.be/J22a5H6rR9M");
    expect(videoId).toEqual("J22a5H6rR9M");
  });
  test("test 3", () => {
    const videoId = parseVideoId("https://youtube.com/live/J22a5H6rR9M");
    expect(videoId).toEqual("J22a5H6rR9M");
  });
  test("test 4", () => {
    const videoId = parseVideoId(
      "https://www.youtube.com/watch?v=J22a5H6rR9M&t=215s"
    );
    expect(videoId).toEqual("J22a5H6rR9M");
  });
});
