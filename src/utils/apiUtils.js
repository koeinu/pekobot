import translate from "deepl";
import imageToBase64 from "image-to-base64";
import { ImageAnnotatorClient } from "@google-cloud/vision";

import dotenv from "dotenv";
import { SENTENCE_ENDERS } from "./constants.js";
import { gptGetLanguage, gptl } from "./openaiUtils.js";
import { getMsgInfo, trimBrackets } from "./stringUtils.js";
import extractUrls from "extract-urls";

dotenv.config();

const ocrCache = {};
const tlCache = {};

export class ApiUtils {
  static async OCRRequest(url, hint, isText) {
    if (ocrCache[url]) {
      return ocrCache[url];
    }
    let googleApiKey = process.env.GOOGLE_PK;
    googleApiKey = googleApiKey.replace(/\\n/g, "\n");
    const options = {
      credentials: {
        client_email: process.env.GOOGLE_EMAIL,
        private_key: googleApiKey,
      },
    };
    const client = new ImageAnnotatorClient(options);
    const base64 = await imageToBase64(url);

    const request = {
      image: {
        content: `${base64}`,
      },
      imageContext: {
        languageHints: [hint],
        textDetectionParams: {
          enableTextDetectionConfidenceScore: "true",
        },
      },
    };

    const [result] = await client.textDetection(request);

    let hasError = result?.error?.message;
    if (hasError) {
      throw hasError;
    }
    const toReturn = isText
      ? parsePages(result.fullTextAnnotation?.pages)
      : result.fullTextAnnotation?.text;

    ocrCache[url] = toReturn;
    return toReturn;
  }

  // throws
  static async GetTranslation(
    text,
    source,
    msg = undefined,
    settings,
    isGpt = false,
    isFallback = false,
    isGpt4 = false
  ) {
    if (
      tlCache[text] &&
      tlCache[text].isGpt === isGpt &&
      tlCache[text].isGpt4 === isGpt4
    ) {
      console.log(`cached translation: ${tlCache[text]}`);
      return tlCache[text];
    }
    let textToTranslate = text
      .trim()
      .replace(
        /([！あいうえおアイウエオｱｲｳｴｵぁぃぅぇぉァィゥェォｧｨｩｪｫ])\1\1+/gi,
        "$1$1"
      ); // replace 3+ same characters with 2
    const startTime = new Date();
    let response = undefined;
    let metadata = undefined;
    let isGptResult = isGpt;
    if (isGpt) {
      if (textToTranslate.length > 0) {
        let responseData = { text: undefined };
        await gptGetLanguage(textToTranslate, settings)
          .then((response) => {
            const notTranslatedKeywords = ["eng", "unknown", "undetermined"];
            if (
              response &&
              notTranslatedKeywords.some((w) =>
                response.text.toLowerCase().includes(w)
              )
            ) {
              console.debug(
                `Not translating, as the text is already in English: ${textToTranslate}`
              );
              return Promise.resolve({
                text: textToTranslate,
                data: response.data,
              });
            } else {
              return gptl(msg, settings, textToTranslate, isGpt4);
            }
          })
          .then((res) => {
            responseData = res;
          })
          .catch((e) => {
            console.error(`Couldn't GPTL: ${e}`);
          });

        if (!responseData.text) {
          response = "";
        } else {
          response = trimBrackets(responseData.text);
        }

        metadata = responseData.data;
      } else {
        response = "";
      }

      if (!response || response.length === 0) {
        if (!isFallback) {
          return ApiUtils.GetTranslation(
            text,
            source,
            msg,
            settings,
            false,
            true,
            isGpt4
          );
        } else {
          throw `Both deepl and gptl failed miserably.`;
        }
      }
      if (response.length > 1000) {
        const patterns = response.match(/(\w+\s*)\1+/g);
        patterns.forEach((p) => {
          const spaceSeparated = p.split(" ")[0];
          const firstLetters = p.slice(0, 5);
          const toReplace =
            spaceSeparated.length < firstLetters.length
              ? spaceSeparated
              : firstLetters;
          response = response.replaceAll(p, toReplace);
        });
      }
      if (response.length > 1000) {
        console.error(`${getMsgInfo(msg)}, Too long gptl message: ${response}`);
        if (!isFallback) {
          return ApiUtils.GetTranslation(
            text,
            source,
            msg,
            settings,
            false,
            true,
            isGpt4
          );
        }
      }
    }

    if (!isGpt || !response) {
      isGptResult = false;
      const t = await translate({
        free_api: true,
        text: textToTranslate,
        source_lang: source,
        target_lang: "EN",
        auth_key: "7b78071d-54ca-2f9c-2e1a-909f69927efd:fx",
      });
      response = t.data.translations[0].text;
      if (response.length === 0) {
        if (!isFallback) {
          return ApiUtils.GetTranslation(
            text,
            source,
            msg,
            settings,
            true,
            true,
            isGpt4
          );
        } else {
          throw `Both deepl and gptl failed miserably.`;
        }
      }
    }

    const urls = extractUrls(response);
    if (urls) {
      urls.forEach((escapeUrl) => {
        if (escapeUrl.includes("t.co")) {
          response = response.replaceAll(escapeUrl, `<${escapeUrl}>`);
        }
      });
    }

    const toReturn = {
      time: new Date().getTime() - startTime.getTime(),
      text: response,
      metaData: metadata,
      isGpt: isGptResult,
      isGpt4: isGpt4,
      translated: response !== textToTranslate,
    };

    console.debug(`final translation:`, toReturn);
    tlCache[text] = toReturn;
    return toReturn;
  }
}

const parsePages = (pages) => {
  let result = "";

  console.log(JSON.stringify(pages));
  pages.forEach((page) => {
    page.blocks.forEach((block) => {
      block.paragraphs.forEach((paragraph) => {
        const hasDelimeters = SENTENCE_ENDERS.some((delimeter) =>
          paragraph.words.some((word) =>
            word.symbols.some((symbol) => symbol.text === delimeter)
          )
        );
        paragraph.words.forEach((word) => {
          word.symbols.forEach((symbol) => {
            result = result.concat(symbol.text);
            if (hasDelimeters) {
              // this paragraph has delimeters. we treat it as a proper text
              // line breaks are ok only at the end of a sentence
              if (
                symbol.property?.detectedBreak?.type === "LINE_BREAK" &&
                SENTENCE_ENDERS.includes(symbol.text)
              ) {
                result = result.concat("\n");
              }
            }
          });
        });
        if (!hasDelimeters) {
          // there are no delimeters - rely on paragraphs
          result = result.concat("\n");
        }
      });
      result = result.concat("\n");
    });
    result = result.concat("\n");
  });

  console.log(result);

  return result.trim();
};
