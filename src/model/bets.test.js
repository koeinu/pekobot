import {
  createChoiceBet,
  findChoiceBetWinners,
  initializeBets,
  makeBet,
  makeChoicesBetStructuresArray,
  parseBetChoices,
  toggleBets,
  createSimpleBet,
  loadBets,
} from "./bets.js";

import { describe, test, expect } from "@jest/globals";

const TEST_FILENAME = "testbets.json";

describe("Testing the bets", () => {
  test("create bet", () => {
    const testDesc = "test description";
    createSimpleBet(TEST_FILENAME, testDesc);
    const bets = loadBets(TEST_FILENAME);
    expect(bets.description).toEqual(testDesc);
  });

  test("clear bets", () => {
    initializeBets(TEST_FILENAME);
    const bets = loadBets(TEST_FILENAME);
    expect(bets.description).toEqual(undefined);
  });

  test("simple betting", () => {
    const testDesc = "test description";
    createSimpleBet(TEST_FILENAME, testDesc);
    const bets = loadBets(TEST_FILENAME);
    expect(bets.description).toEqual(testDesc);

    toggleBets(TEST_FILENAME, true);

    makeBet(TEST_FILENAME, { id: 1, userName: "Test user" }, [
      { value: "some bet" },
    ]);
    makeBet(TEST_FILENAME, { id: 2, userName: "Test user 2" }, [
      { value: "some bet 2" },
    ]);
    makeBet(TEST_FILENAME, { id: 3, userName: "Test user 3" }, [
      { value: "some bet 3" },
    ]);
    makeBet(TEST_FILENAME, { id: 4, userName: "Test user 4" }, [
      { value: "some bet 4" },
    ]);

    const updatedBets = loadBets(TEST_FILENAME);
    console.log(updatedBets);
  });

  test("choice betting", () => {
    const testDesc = "test description";
    const betCategories = "Category 1; Category 2";
    const betContents =
      "Option 1, Option 2, Option 3; Option 4, Option 5, Option 6";
    console.log(betCategories, betContents);
    const parsedBetChoices = parseBetChoices(betCategories, betContents);

    createChoiceBet(
      TEST_FILENAME,
      testDesc,
      makeChoicesBetStructuresArray(parsedBetChoices)
    );
    const bets = loadBets(TEST_FILENAME);
    expect(bets.description).toEqual(testDesc);

    toggleBets(TEST_FILENAME, true);

    makeBet(TEST_FILENAME, { id: 1, userName: "Test user" }, [
      { value: "Option 2" },
      { value: "Option 6" },
    ]);
    makeBet(TEST_FILENAME, { id: 2, userName: "Test user 2" }, [
      { value: "Option 2" },
      { value: "Option 4" },
    ]);
    makeBet(TEST_FILENAME, { id: 1, userName: "Test user" }, [
      { value: "Option 2" },
      { value: "Option 5" },
    ]);

    const updatedBets = loadBets(TEST_FILENAME);
    console.log(JSON.stringify(updatedBets));

    findChoiceBetWinners(TEST_FILENAME, "Category 2", "Option 4");
  });
});
