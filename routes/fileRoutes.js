const express = require("express");
const fileController = require("../controllers/fileController");

const router = express.Router();

router.get("/process", async (req, res) => {
  try {
    await fileController.processFiles();
    res.status(200).send("File processing started.");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
