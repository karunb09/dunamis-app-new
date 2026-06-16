// In-memory MongoDB for integration tests. Spins up a throwaway mongod via
// mongodb-memory-server and connects mongoose to it, so tests run against real
// Mongo semantics (indexes, $addToSet, updateOne modifiedCount) without a
// shared/stateful database.
//
// NOTE: mongodb-memory-server downloads a mongod binary on first use. That
// download needs network access the first time; once cached it runs offline.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod = null;

// Pin a mongod version that has builds for all common platforms (incl.
// arm64/ubuntu2204). Override with MONGOMS_VERSION if you need a different one.
const MONGO_VERSION = process.env.MONGOMS_VERSION || "7.0.14";

async function startMemoryMongo() {
  mongod = await MongoMemoryServer.create({ binary: { version: MONGO_VERSION } });
  await mongoose.connect(mongod.getUri(), { dbName: "test" });
  return mongoose.connection;
}

async function stopMemoryMongo() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
  mongod = null;
}

async function clearCollections() {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
}

module.exports = { startMemoryMongo, stopMemoryMongo, clearCollections };
