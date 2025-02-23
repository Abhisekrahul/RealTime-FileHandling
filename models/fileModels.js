const processedFiles = new Set();

function isProcessed(filename) {
  return processedFiles.has(filename);
}

function markAsProcessed(filename) {
  processedFiles.add(filename);
}

module.exports = { isProcessed, markAsProcessed };
