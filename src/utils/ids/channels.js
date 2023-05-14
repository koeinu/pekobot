export const TEST_ASSISTANT = "1101686456029810728";
export const TEST_MAIN = "1070086039445717124";
export const TEST_2_MAIN = "1105130450835484732";
export const TEST_MOD = "1100568255837524079";
export const TEST_RNG = "1101619891037016126";

export const TEST_ANOTHER_TEST_CHANNEL = "1102642982710169661";
export const TEST_PEKORA_FEED = "1098377642111160330";
export const TEST_PEKORA_POEM = "1098777254298918973";
export const TEST_POEM_FEED = "1098777254298918973";
export const TEST_RP_PEKO_N = "1101728640170987560";
export const TEST_RP_PEKO_S = "1101745455366418482";
export const TEST_RP_INA_S = "1101746184185454634";
export const TEST_RP_INA_N = "1101746355338219520";

export const RP_CHANNELS_2 = [TEST_RP_INA_N, TEST_RP_PEKO_N];
export const RP_CHANNELS = [TEST_RP_INA_S, TEST_RP_PEKO_S, ...RP_CHANNELS_2];

export const TEST_USUAL_PEKO_GPT = "1101835539407175793";
export const TEST_TEST_FEED = "1098777824954957834";
export const TEST_TEST_POEM_FEED = "1098777887827574884";
export const TEST_INA_FEED = "1098909222349053963";
export const PEKO_STREAM = "1056187525753999442";
export const PEKO_TEST = "1063492591716405278";
export const PEKO_MOD = "1100569163220652092";
export const PEKO_PEKORA_FEED = "683200298629857331";

export const TEST_MIKO_FEED = "1107078067752554587";
export const MIKO_TEST_MAIN = "1099142582342254673";

export const PEKO_GPT = "1103424255439409255";

export const DDF_CONSULTING = "1098913878445920306";
export const CREATOR = "184334990614593537";
export const SNAXXX_STREAM = "1011279225728278690";

export const TEST_ENABLED_CHANNELS = [TEST_MAIN, TEST_2_MAIN, MIKO_TEST_MAIN];

export const PEKO_ALLOWED_RNG = [
  ...TEST_ENABLED_CHANNELS,
  "683140641001308319", // general
  "683144592572678145", // pekora-chat
  "1056187525753999442", // stream-chat
  "683145190369919006", // other-vtubers
  "745266706913427498", // member-only
  "683145574916292695", // off-topic
  "831949711778906203", // anime
  "683146108838346752", // video-games
  "970659065300652042", // gacha
  "1063492591716405278", // test
];

export const PEKO_ALLOWED_GPT = [
  ...PEKO_ALLOWED_RNG,
  "683436248592810007", // mod chat
  "1103424255439409255", // gpt test
  "1105626228221816903", // gpt
];

export const MIKO_ALLOWED_RNG_GPT = [
  ...TEST_ENABLED_CHANNELS,
  "584977240358518786", // 35p-lounge
  "867983773915050004", // 35p-lounge-nihongo
  "1050715545898598441", // miko-chat
  "766902949414436884", // stream-chat
];

export const ASSISTANT_CHANNELS = [TEST_ASSISTANT, PEKO_GPT];

export const PEKO_GPT_OK_CHANNEL = "1105626228221816903";
export const TEST_GPT_OK_CHANNEL = "1105626636247904306";
