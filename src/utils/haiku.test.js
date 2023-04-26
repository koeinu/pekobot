import { describe, expect, test } from "@jest/globals";

import { detectHaiku } from "./haiku.js";
import { preprocessString } from "./haiku";

describe("Haiku matching tests", () => {
  test("process string 1", () => {
    const str = preprocessString(
      "I hope I live long enough to witness Skynet happen.:PekoHeh:"
    );

    console.log(str);
  });
  test("basic haiku", () => {
    const haiku = detectHaiku(
      "some user triggered the haiku here by chance and was mildly amused"
    );

    expect(haiku).toBeDefined();
  });
  test("haiku with an emoji", () => {
    const haiku = detectHaiku(
      "I hope I live long enough to witness Skynet happen.:PekoHeh:"
    );

    !expect(haiku).not.toBeDefined();
  });
  test("haiku with sentences", () => {
    const haiku = detectHaiku(
      "Also, I see that it can make Haikyu too? Is that Automatic?"
    );

    !expect(haiku).not.toBeDefined();
  });
});
