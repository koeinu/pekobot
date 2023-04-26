import { NlpManager } from "node-nlp";

const manager = new NlpManager({ languages: ["en"], forceNER: true });
// Adds the utterances and intents for the NLP
manager.addDocument("en", "peko-bot", "pekobot.answer");
manager.addDocument("en", "pekobot", "pekobot.answer");
manager.addDocument("en", "peko bot", "pekobot.answer");

// Train also the NLG
// manager.addAnswer("en", "greetings.bye", "Till next time");
// manager.addAnswer("en", "greetings.bye", "see you soon!");
// manager.addAnswer("en", "greetings.hello", "Hey there!");
manager.addAnswer("en", "pekobot.answer", "peko");

// Train and save the model.
(async () => {
  await manager.train();
  manager.save();
})();

export const pekoCheck = async (str) => {
  const response = await manager.process("en", str);
  return response.answer;
};
