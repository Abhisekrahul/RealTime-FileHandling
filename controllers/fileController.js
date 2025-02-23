const fileService = require("../services/fileServices");

async function processFiles() {
  try {
    const files = await fileService.getNewFiles();
    for (const file of files) {
      await fileService.splitFile(file);
      await fileService.verifyChunks(file);
    }
  } catch (error) {
    console.error("Error processing files:", error);
  }
}

module.exports = { processFiles };
