const { dbRun, dbGet } = require('../config/database');

(async () => {
  try {
    console.log('🧹 Cleaning up duplicate forms from database...');

    // Slugs to remove
    const duplicateSlugs = ['creative-workshop', 'community', 'rawya-gathering', 'ruya-club'];

    for (const slug of duplicateSlugs) {
      await dbRun('DELETE FROM responses WHERE form_id IN (SELECT id FROM forms WHERE slug = ?)', [slug]);
      const res = await dbRun('DELETE FROM forms WHERE slug = ?', [slug]);
      if (res.changes > 0) {
        console.log(`✅ Removed duplicate form: ${slug}`);
      }
    }

    // Ensure official forms exist
    const communityForm = await dbGet("SELECT id FROM forms WHERE slug = 'majarra-community'");
    if (!communityForm) {
      console.log('Inserting official majarra-community form...');
    }

    const roeyaForm = await dbGet("SELECT id FROM forms WHERE slug = 'roeya-club'");
    if (!roeyaForm) {
      console.log('Inserting official roeya-club form...');
    }

    console.log('✨ Cleanup complete! Only official forms remain.');
  } catch (err) {
    console.error('❌ Error cleaning up duplicates:', err);
  }
})();
