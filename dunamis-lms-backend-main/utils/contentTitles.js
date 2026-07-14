const Content = require("../model/content.model");

async function buildContentTitleMaps(records) {
  const moduleIds = [
    ...new Set(
      records.map((r) => r.moduleId && r.moduleId.toString()).filter(Boolean)
    ),
  ];
  const maps = { moduleTitles: {}, lessonTitles: {}, topicTitles: {} };
  if (!moduleIds.length) return maps;

  const docs = await Content.find(
    { "modules._id": { $in: moduleIds } },
    "modules"
  ).lean();

  for (const doc of docs) {
    for (const module of doc.modules || []) {
      maps.moduleTitles[module._id.toString()] = module.title;
      for (const lesson of module.lessons || []) {
        maps.lessonTitles[lesson._id.toString()] = lesson.title;
        for (const topic of lesson.topics || []) {
          maps.topicTitles[topic._id.toString()] = topic.title;
        }
      }
    }
  }
  return maps;
}

module.exports = { buildContentTitleMaps };
