const { MongoClient } = require('mongodb');
const path = require('path');

async function main() {
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'apphub';
  const client = new MongoClient(mongoUrl, { useUnifiedTopology: true });

  try {
    await client.connect();
    const db = client.db(dbName);

    // Try to find the sample project by title
    const title = 'Controle Sua Ansiedade em 15 Minutos';
    const project = await db.collection('ebookProjects').findOne({ title });
    if (!project) {
      console.error('Project not found with title:', title);
      process.exit(1);
    }

    const EbookExportService = require(path.join(__dirname, '..', 'dist', 'services', 'ebook-export.service.js')).EbookExportService;
    const service = new EbookExportService();

    const jobData = {
      form: {
        projectId: project._id.toString(),
        format: 'pdf',
        options: {}
      },
      metadata: {
        userId: project.userId ? project.userId.toString() : (process.env.TEST_USER_ID || '1')
      }
    };

    console.log('Calling processExport for project:', project._id.toString());
    const result = await service.processExport(jobData);
    console.log('Export result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Error running export debug:', err);
    process.exit(1);
  } finally {
    try { await client.close(); } catch (e) {}
  }
}

main();
