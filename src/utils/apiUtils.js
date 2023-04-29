import translate from "deepl";
import imageToBase64 from "image-to-base64";
import { ImageAnnotatorClient } from "@google-cloud/vision";

import dotenv from "dotenv";
import { SENTENCE_ENDERS } from "./constants.js";
import { gptl } from "./openaiUtils.js";
import { trimBrackets } from "./stringUtils.js";

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
  static async GetTranslation(text, source, msg = undefined, isGpt = false) {
    if (tlCache[text] && tlCache[text].isGpt === isGpt) {
      console.log(`cached translation: ${tlCache[text]}`);
      return tlCache[text];
    }
    const startTime = new Date();
    let response = undefined;
    let metadata = undefined;
    let isGptResult = isGpt;
    if (isGpt) {
      if (text.length > 0) {
        let responseData = { text: undefined };
        await gptl(msg, text)
          .then((res) => {
            responseData = res;
          })
          .catch((e) => {
            console.error(`Couldn't GPTL: ${e}`);
          });

        if (!responseData.text) {
          response = undefined;
        } else {
          response = trimBrackets(responseData.text);
          if (response.includes("initmsg")) {
            response = text;
          }
        }

        metadata = responseData.data;
      } else {
        response = "";
      }
    }
    if (!isGpt || !response) {
      isGptResult = false;
      const t = await translate({
        free_api: true,
        text: text,
        source_lang: source,
        target_lang: "EN",
        auth_key: "7b78071d-54ca-2f9c-2e1a-909f69927efd:fx",
      });
      response = t.data.translations[0].text;
    }
    const toReturn = {
      time: new Date().getTime() - startTime.getTime(),
      text: response,
      metaData: metadata,
      isGpt: isGptResult,
    };

    console.warn(`final translation: ${response}`);
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
