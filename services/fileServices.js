const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const crypto = require("crypto");
const fileModel = require("../models/fileModels");

const INPUT_FOLDER = path.join(__dirname, "../input");
const OUTPUT_FOLDER = path.join(__dirname, "../output");

// Ensure input and output folders exist
function ensureFoldersExist() {
  if (!fs.existsSync(INPUT_FOLDER)) {
    fs.mkdirSync(INPUT_FOLDER, { recursive: true });
    console.log("Created input folder.");
  }
  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
    console.log("Created output folder.");
  }
}

ensureFoldersExist(); // Call this function when the service starts

async function getNewFiles() {
  return new Promise((resolve, reject) => {
    fs.readdir(INPUT_FOLDER, (err, files) => {
      if (err) return reject(err);
      const newFiles = files.filter((file) => !fileModel.isProcessed(file));
      resolve(newFiles);
    });
  });
}

async function splitFile(filename) {
  return new Promise((resolve, reject) => {
    const inputFilePath = path.join(INPUT_FOLDER, filename);
    const outputFilePath = path.join(OUTPUT_FOLDER, filename);

    fs.stat(inputFilePath, (err, stats) => {
      if (err) return reject(err);
      if (stats.size <= 10 * 1024 * 1024)
        return reject("File is too small to split.");

      const command = `split -b 10m "${inputFilePath}" "${outputFilePath}_"`;
      exec(command, (error) => {
        if (error) return reject(error);
        console.log(`File ${filename} split successfully.`);
        fileModel.markAsProcessed(filename);
        resolve();
      });
    });
  });
}

async function verifyChunks(filename) {
  return new Promise((resolve, reject) => {
    const inputFilePath = path.join(INPUT_FOLDER, filename);
    const outputFilePath = path.join(OUTPUT_FOLDER, filename);

    // Find all split chunks
    const chunkFiles = fs
      .readdirSync(OUTPUT_FOLDER)
      .filter((f) => f.startsWith(filename + "_"))
      .sort(); // Ensure correct order

    if (chunkFiles.length === 0) {
      return reject(`No chunks found for ${filename}`);
    }

    const reconstructedFile = `${outputFilePath}_reconstructed`;
    const writeStream = fs.createWriteStream(reconstructedFile);

    chunkFiles.forEach((chunk) => {
      const chunkPath = path.join(OUTPUT_FOLDER, chunk);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
    });

    writeStream.end(() => {
      // Compare original and reconstructed file hashes
      const originalHash = getFileHash(inputFilePath);
      const reconstructedHash = getFileHash(reconstructedFile);

      if (originalHash === reconstructedHash) {
        console.log(`File ${filename} integrity verified!`);
        fs.unlinkSync(reconstructedFile); // Remove temp file
      } else {
        console.error(`File ${filename} integrity check failed!`);
      }
      resolve();
    });
  });
}

function getFileHash(filePath) {
  const hash = crypto.createHash("sha256");
  const fileBuffer = fs.readFileSync(filePath);
  hash.update(fileBuffer);
  return hash.digest("hex");
}

module.exports = {
  getNewFiles,
  splitFile,
  verifyChunks,
  INPUT_FOLDER,
  OUTPUT_FOLDER,
};
