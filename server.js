const express = require("express");
const fileRoutes = require("./routes/fileRoutes");
const cronJob = require("./config/cronjob");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to the File Processing API!");
});

// Routes
app.use("/api/files", fileRoutes);

// Start the cron job
cronJob.startMonitoring();

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
