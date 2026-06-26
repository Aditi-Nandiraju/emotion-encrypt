/* emotion.js
 * Lexicon + phrase-based emotion classifier.
 * Phrase matching runs first (higher weight), then single-word matching.
 * Includes negation handling for word-level matches only.
 */

const EMOTION_COLORS = {
  anger:   "var(--anger)",
  disgust: "var(--anger)",
  fear:    "var(--fear)",
  joy:     "var(--joy)",
  love:    "var(--joy)",
  neutral: "var(--neutral)",
  sadness: "var(--sadness)",
  surprise:"var(--excitement)"
};

const PHRASES = {
  joy:     ["can't wait","cannot wait","so happy","really happy","best day","love you","so excited","best ever","made my day","over the moon","on top of the world","couldn't be happier","living my best"],
  sadness: ["miss you","wish you were","feel alone","all alone","no one cares","feels empty","so alone","nothing matters","don't care anymore","i give up","lost without","fall apart","heart hurts","breaking my heart","broke my heart","can't go on"],
  anger:   ["go away","get out","leave me alone","get away from","never want to see","don't want to see","can't stand","sick of you","sick of this","fed up","had enough","how dare","shut up","back off","stay away","get lost","i hate you","hate this","i'm done with","done with you","you ruined","ruined everything","this is unacceptable","how could you","you always","you never","stop it","just stop"],
  fear:    ["what if","scared of","afraid of","i'm scared","i'm afraid","don't know what will","not sure what","terrified of","might happen","could go wrong","worst case"],
  surprise:["can't believe","cannot believe","no way","what just happened","out of nowhere","never expected","didn't expect","didn't see that coming","blew my mind","jaw dropped","holy","oh my god","oh my gosh"],
  disgust: ["makes me sick","want to throw up","so gross","how disgusting","absolutely disgusting","repulses me"],
};

const LEXICON = {
  joy:     ["happy","happiness","joyful","joyous","excited","excitement","thrilled","delighted","delight","wonderful","amazing","fantastic","great","love","lovely","loved","loving","glad","pleased","cheerful","elated","ecstatic","awesome","brilliant","excellent","yay","hooray","congratulations","congrats","celebrate","celebration","proud","grateful","thankful","blessed","lucky","win","won","winning","success","succeeded","accomplished","laugh","laughing","smile","smiling","fun","enjoy","enjoyed","pleasure","perfect","beautiful","best","favorite","grateful","radiant","glowing","refreshed","inspired","hopeful","optimistic","pumped","stoked"],
  sadness: ["sad","sadness","unhappy","depressed","depression","miserable","heartbroken","grief","grieve","cry","crying","tears","sorrow","sorrowful","lonely","alone","miss","missing","mourn","mourning","hopeless","despair","despairing","disappointed","disappointment","upset","hurt","pain","suffer","suffering","unfortunate","regret","regretting","sorry","melancholy","gloomy","failed","failure","broken","ashamed","shame","guilty","empty","hollow","numb","worthless","useless","helpless","abandoned","rejected","forgotten","invisible","exhausted","drained","defeated","lost"],
  anger:   ["angry","anger","furious","fury","rage","raging","mad","outraged","outrage","hate","hatred","annoyed","annoying","frustrated","frustration","irritated","irritating","infuriated","livid","enraged","hostile","terrible","awful","horrible","stupid","ridiculous","unacceptable","unfair","betrayed","betrayal","cheated","resentful","resentment","disgusted","disgusting","pathetic","absurd","disgrace","outrageous","never","away","leave","enough","stop","liar","lies","lying","manipulative","selfish","inconsiderate","disrespectful","rude","offensive","insulting","wasted","ruined","destroyed"],
  fear:    ["afraid","fear","fearful","scared","frighten","frightened","terrified","terror","panic","panicking","anxious","anxiety","worried","worry","worrying","nervous","dread","dreading","horror","horrified","phobia","danger","dangerous","unsafe","nightmare","apprehensive","uneasy","scary","dreadful","helpless","vulnerable","exposed","paranoid","suspicious","uncertain","unsure","overwhelmed","shaking","trembling"],
  surprise:["surprised","surprise","shocked","shock","shocking","unexpected","unbelievable","incredible","astonished","astonishment","astonishing","stunned","stunning","wow","whoa","suddenly","sudden","bizarre","extraordinary","remarkable","unreal","jaw","speechless","dumbfounded","baffled"],
  disgust: ["disgusting","disgusted","gross","revolting","repulsive","repulsed","nasty","vile","yuck","sickening","appalling","foul","putrid","rotten","cringe","cringeworthy"],
};

const NEGATIONS = new Set(["not","no","don't","doesn't","didn't","won't","can't","couldn't","wouldn't","shouldn't","isn't","aren't","wasn't","weren't","hardly","barely","scarcely"]);

async function detectEmotions(text) {
  if (!text || !text.trim()) return [];

  const lower = text.toLowerCase();
  const words = lower.match(/\b\w+\b/g) || [];
  const scores = Object.fromEntries(Object.keys(LEXICON).map(e => [e, 0]));

  // Phrase matching (weight 2.5 each — stronger signal than single words)
  for (const [emotion, phrases] of Object.entries(PHRASES)) {
    for (const phrase of phrases) {
      if (lower.includes(phrase)) {
        scores[emotion] += 2.5;
      }
    }
  }

  // Word matching with negation check
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const negated = i > 0 && NEGATIONS.has(words[i - 1]);
    for (const [emotion, keywords] of Object.entries(LEXICON)) {
      if (keywords.includes(word)) {
        scores[emotion] += negated ? -0.5 : 1;
      }
    }
  }

  const total = Object.values(scores).reduce((s, v) => s + Math.max(0, v), 0);

  if (total === 0) {
    return [{ name: "Neutral", color: EMOTION_COLORS.neutral, score: 1 }];
  }

  const sorted = Object.entries(scores)
    .filter(([, v]) => v > 0)
    .map(([emotion, v]) => ({
      name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      color: EMOTION_COLORS[emotion] || "var(--neutral)",
      score: v / total
    }))
    .sort((a, b) => b.score - a.score);

  const topScore = sorted[0].score;
  return sorted.filter(r => r.score >= topScore * 0.65).slice(0, 3);
}
