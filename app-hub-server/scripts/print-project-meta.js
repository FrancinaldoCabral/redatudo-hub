const { MongoClient, ObjectId } = require('mongodb');
(async () => {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'apphub';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  const title = 'Controle Sua Ansiedade em 15 Minutos';
  const project = await db.collection('ebookProjects').findOne({ title });
  console.log(JSON.stringify(project?.metadata?.currentCover || project?.metadata || { notFound: true }, null, 2));
  await client.close();
})();
