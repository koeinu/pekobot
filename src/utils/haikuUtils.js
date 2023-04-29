import { syllable } from "syllable";

const checkLine = (line) => {
  if (line.length < 4) {
    return true;
  }
  if (line[line.length - 1].match(/[.,!?]/)) {
    return false;
  }
  if (line[line.length - 2].match(/[.,!?]/)) {
    return false;
  }

  return true;
};

export const preprocessString = (str) =>
  str
    .replace(/:[a-zA-Z]+:/g, "")
    .replace(/\n/g, " ")
    .split(" ")
    .map((el) => el.trim())
    .filter((el) => el.length > 0);

export const detectHaiku = (str) => {
  const sylData = preprocessString(str).map((el) => {
    return { word: el, syl: syllable(el) };
  });
  let line1 = 0;
  let line2 = 0;
  let line3 = 0;

  let l1 = [];
  let l2 = [];
  let l3 = [];

  for (let i = 0; i < sylData.length; i++) {
    const s = sylData[i];
    if (line1 < 5) {
      line1 += s.syl;
      l1.push(s.word);
    } else if (line2 < 7) {
      line2 += s.syl;
      l2.push(s.word);
    } else {
      line3 += s.syl;
      l3.push(s.word);
    }
  }

  if (!checkLine(l1) || !checkLine(l2) || !checkLine(l3)) {
    return undefined;
  }

  return line1 === 5 && line2 === 7 && line3 === 5 ? { l1, l2, l3 } : undefined;
};
