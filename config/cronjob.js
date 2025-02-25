const cron = require("node-cron");
const fileController = require("../controllers/fileController");

function startMonitoring() {
  cron.schedule("*/1 * * * *", async () => {
    console.log("Checking for new files...");
    await fileController.processFiles();
  });
}

module.exports = { startMonitoring };
