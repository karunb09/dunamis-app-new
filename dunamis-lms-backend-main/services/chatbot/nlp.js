const { containerBootstrap } = require("@nlpjs/core");
const { Nlp } = require("@nlpjs/nlp");
const { LangEn } = require("@nlpjs/lang-en-min");
const { TEACHING_LANGUAGES } = require("../../constants/languages");
const { CORPUS } = require("./corpus");

const MIN_SCORE = 0.6;

// Topics share the "course" token: to the classifier, "guitar fees" and
// "guitar foundations fees" are the same question.
const TOKEN_BY_ENTITY = {
  course: "course",
  topic: "course",
  category: "category",
  city: "city",
  branch: "branch",
  instructor: "instructor",
  language: "language",
};

const fillPlaceholders = (text) => text.replace(/%(\w+)%/g, (match, name) => TOKEN_BY_ENTITY[name] || name);

const stripSuffix = (name, pattern) => {
  const stripped = String(name || "").replace(pattern, "").trim();
  return stripped && stripped.length >= 3 && stripped !== name ? stripped : null;
};

function addEntities(nlp, knowledge) {
  const add = (entity, id, texts) => {
    const clean = [...new Set(texts.filter(Boolean).map((text) => String(text).trim()))].filter(
      (text) => text.length >= 3
    );
    if (clean.length) nlp.addNerRuleOptionTexts("en", entity, id, clean);
  };

  for (const course of knowledge.courses) add("course", course.id, [course.name]);
  for (const topic of knowledge.topics) add("topic", topic.id, [topic.name]);
  for (const category of knowledge.categories) add("category", category.id, [category.name]);
  for (const city of knowledge.cities) add("city", city.id, [city.name]);
  for (const branch of knowledge.branches) {
    add("branch", branch.id, [branch.name, stripSuffix(branch.name, /\s+(centre|center|branch)$/i)]);
  }

  const firstNameCounts = new Map();
  for (const instructor of knowledge.instructors) {
    const key = instructor.firstName.toLowerCase();
    firstNameCounts.set(key, (firstNameCounts.get(key) || 0) + 1);
  }
  for (const instructor of knowledge.instructors) {
    const uniqueFirst = firstNameCounts.get(instructor.firstName.toLowerCase()) === 1;
    add("instructor", instructor.id, [instructor.name, uniqueFirst ? instructor.firstName : null]);
  }

  for (const language of TEACHING_LANGUAGES) add("language", language, [language]);
}

async function buildNlp(knowledge) {
  const container = await containerBootstrap();
  container.use(LangEn);
  const nlp = new Nlp({ container, autoSave: false, nlu: { log: false } });
  nlp.addLanguage("en");

  addEntities(nlp, knowledge);

  for (const [intent, phrases] of Object.entries(CORPUS)) {
    for (const phrase of phrases) nlp.addDocument("en", fillPlaceholders(phrase), intent);
  }
  for (const faq of knowledge.faqs) {
    if (faq.title) nlp.addDocument("en", faq.title, `faq.${faq.id}`);
  }
  const knownIntents = new Set([
    ...Object.keys(CORPUS),
    ...knowledge.faqs.map((faq) => `faq.${faq.id}`),
  ]);
  for (const { text, intent } of knowledge.taught) {
    if (knownIntents.has(intent)) nlp.addDocument("en", text, intent);
  }

  await nlp.train();
  return nlp;
}

let current = null;
let training = null;

// Retrains only when the knowledge signature changes; the new model replaces
// the old one only once train() has resolved.
function getNlp(knowledge) {
  const { signature } = knowledge;
  if (current?.signature === signature) return Promise.resolve(current.nlp);
  if (training?.signature === signature) return training.promise;

  const promise = buildNlp(knowledge)
    .then((nlp) => {
      current = { signature, nlp };
      return nlp;
    })
    .finally(() => {
      if (training?.promise === promise) training = null;
    });
  training = { signature, promise };
  return promise;
}

// NER runs separately from classification: nlp.process() here does not return
// enum entities, so names are extracted first and swapped for their token.
async function classify(text, knowledge) {
  const nlp = await getNlp(knowledge);
  const { entities = [] } = await nlp.extractEntities("en", text);

  const found = [];
  const taken = [];
  for (const entity of [...entities].sort((a, b) => b.accuracy - a.accuracy || b.len - a.len)) {
    if (entity.type !== "enum" || !TOKEN_BY_ENTITY[entity.entity]) continue;
    if (taken.some(([start, end]) => entity.start <= end && entity.end >= start)) continue;
    taken.push([entity.start, entity.end]);
    found.push({ entity: entity.entity, option: entity.option, start: entity.start, end: entity.end });
  }

  let masked = text;
  for (const entity of [...found].sort((a, b) => b.start - a.start)) {
    masked = `${masked.slice(0, entity.start)} ${TOKEN_BY_ENTITY[entity.entity]} ${masked.slice(entity.end + 1)}`;
  }

  const result = await nlp.process("en", masked);
  const matched = result.intent && result.intent !== "None" && result.score >= MIN_SCORE;

  const pick = (name) => found.find((entity) => entity.entity === name)?.option || null;
  return {
    intent: matched ? result.intent : null,
    score: Number(result.score) || 0,
    entities: {
      courseId: pick("course"),
      topicId: pick("topic"),
      categoryId: pick("category"),
      cityId: pick("city"),
      branchId: pick("branch"),
      instructorId: pick("instructor"),
      language: pick("language"),
    },
  };
}

module.exports = { classify, getNlp };
