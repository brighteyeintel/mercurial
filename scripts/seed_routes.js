// Run with `pnpm seed:routes`

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

async function main() {
// TODO: Replace temporarily / get from environment variables
  const uri = "mongodb+srv://db-user:QF2GTWUGocm0nYlo@mercurial-cluster.fgtju90.mongodb.net/?appName=mercurial-cluster";
  const dbName = "mercurial";

  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  const examplesPath = path.join(process.cwd(), 'route_examples.json');
  const raw = fs.readFileSync(examplesPath, 'utf8');
  const routes = JSON.parse(raw);

  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error('route_examples.json must contain a non-empty array');
  }

  await mongoose.connect(uri, dbName ? { dbName } : undefined);

  const collection = mongoose.connection.db.collection('routes');

  if (process.env.CLEAR_EXISTING === '1') {
    await collection.deleteMany({});
  }

  const result = await collection.insertMany(routes);
  console.log(`Inserted ${result.insertedCount} routes into collection 'routes'.`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
