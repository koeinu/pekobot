import {
  MIKO_SERVER,
  PEKO_SERVER,
  TEST_SERVER,
  TEST_SERVER_2,
} from "./ids/guilds.js";

export const MOODS_DATA = {};
MOODS_DATA[PEKO_SERVER] = {
  moods: {
    joke: [
      "<:PekoWheeze:1085512844541440000>",
      "<:PekoPrankStare:892820347232067615>",
    ],
    smug: [
      "<:PekomonNousagiDoya:890383978828271648>",
      "<:PekoPrankStare:892820347232067615>",
      "<:PekoHehSmug:1008006386451497080>",
    ],
    happy: [
      "<:PekoYaySupport:1015010669709492254>",
      "<:PekoYayCheer:683470634806018089>",
    ],
    anger: ["<:PekoPout:722170844473982986>", "<:PekoDerp:709152458978492477>"],
    shock: ["<:pek:775493108154236938>", "<:PekoDerp:709152458978492477>"],
    sad: ["<:PekoSad:745275854304837632>", "<:PekoDerp:709152458978492477>"],
    disappoint: ["<:PekoDerp:709152458978492477>"],
    scare: ["<:PekoScaryStare:683467489925267472>"],
    love: ["<:PekoKyaaa:749644030962565171>"],
  },
  moodsReacts: {
    laugh: [
      "<:PekoWheeze:1085512844541440000>",
      "<:PekoPrankStare:892820347232067615>",
    ],
    smug: [
      "<:PekomonNousagiDoya:890383978828271648>",
      "<:PekoPrankStare:892820347232067615>",
      "<:PekoHehSmug:1008006386451497080>",
    ],
    happy: [
      "<:PekoYaySupport:1015010669709492254>",
      "<:PekoYayCheer:683470634806018089>",
    ],
    anger: ["<:PekoPout:722170844473982986>", "<:PekoDerp:709152458978492477>"],
    shock: ["<:pek:775493108154236938>", "<:PekoDerp:709152458978492477>"],
    sad: ["<:PekoSad:745275854304837632>", "<:PekoDerp:709152458978492477>"],
    disappointed: ["<:PekoDerp:709152458978492477>"],
    scared: ["<:PekoScaryStare:683467489925267472>"],
    blush: ["<:PekoKyaaa:749644030962565171>"],
    love: ["<:PekoKyaaa:749644030962565171>"],
  },
  actions: {
    "wake up": [
      "<:PekoTiredSleepy:790657629902209076>",
      "<:PekoAwake:730919165740974141>",
      "<:PekoAwakeDokiDoki:922668515390025798>",
    ],
    sleep: [
      "<:PekoSleepZzz1:899468713508610098>",
      "<:PekoSleepZzz2:899468728666845214>",
    ],
    ok: ["<:PekoCoolOkay:717826022808092874>"],
    no: ["<:PekoNo:1084473460572561418>"],
    hi: ["<:PekoGreetKonichiwa:826481264466329630>"],
    shrug: ["<:PekoShrug:819720198692798484>"],
  },
};
MOODS_DATA[MIKO_SERVER] = {
  moods: {
    joke: ["<:MikoLaugh:752940509088973070>"],
    smug: ["<:CMikoSmug2:796990042894630963>"],
    happy: ["<:dMikoHappy:756202823842267337>"],
    anger: ["<:MikoStare:894980081666129951>"],
    shock: ["<:fMikoShocked:925789799619641404>"],
    sad: ["<:MikoSad:602387449263554593>"],
    disappoint: ["<:MikoDisappointed2:910551501934583918>"],
    scare: ["(<:MikoSpooked:619303815895580672>"],
    love: ["<:MikoLove:1042078964321099897>"],
  },
  moodsReacts: {
    laugh: ["<:MikoWheeze2:929026384993615874>"],
    smug: ["<:MikoProudSmug:869942608221319178>"],
    happy: ["<:MikoYAAY:842784472948408349>"],
    anger: ["<:FAQ:727196984951439380>"],
    shock: ["<:MikoWTF:840266812041461780>"],
    sad: ["<:MikoSad2:959436316888666153>"],
    disappointed: ["<:MikoDisappointed:959436345275727872>"],
    scared: ["<:MikoSpooked:619303815895580672>"],
    blush: ["<:MikooAo2:815557810929795074>"],
    love: ["<:MikooAo2:815557810929795074>"],
  },
  actions: {
    "wake up": [],
    sleep: ["<:MikoSleep:748584468331102269>"],
    ok: ["<:MikoApprob:821442006454108240>"],
    no: [],
    hi: ["<:MikoSalute:749277748777844788>"],
    shrug: [],
  },
};
MOODS_DATA[TEST_SERVER] = MOODS_DATA[PEKO_SERVER];
MOODS_DATA[TEST_SERVER_2] = MOODS_DATA[MIKO_SERVER];
