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
    const outputFileName = path.parse(filename).name; // Get file name without extension
    const fileExtension = path.extname(filename); // Get file extension
    const outputPrefix = path.join(OUTPUT_FOLDER, `${outputFileName}_`); // Prefix for chunks

    fs.stat(inputFilePath, (err, stats) => {
      if (err) return reject(err);
      if (stats.size <= 10 * 1024 * 1024)
        return reject("File is too small to split.");

      // Read file and split into chunks
      const readStream = fs.createReadStream(inputFilePath, {
        highWaterMark: 10 * 1024 * 1024,
      });
      let index = 0;

      readStream.on("data", (chunk) => {
        const chunkFileName = `${outputPrefix}${String(index).padStart(
          3,
          "0"
        )}${fileExtension}`;
        fs.writeFileSync(chunkFileName, chunk);
        index++;
      });

      readStream.on("end", () => {
        console.log(
          `File ${filename} split successfully into ${index} chunks.`
        );
        fileModel.markAsProcessed(filename);
        resolve();
      });

      readStream.on("error", (error) => {
        reject(error);
      });
    });
  });
}

async function verifyChunks(filename) {
  return new Promise((resolve, reject) => {
    const outputFileName = path.parse(filename).name; // Get file name without extension
    const fileExtension = path.extname(filename); // Get file extension
    const chunkPattern = new RegExp(
      `^${outputFileName}_\\d{3}\\${fileExtension}$`
    ); // Matches "file_000.pdf"

    // Find all split chunks
    const chunkFiles = fs
      .readdirSync(OUTPUT_FOLDER)
      .filter((f) => chunkPattern.test(f)) // Filter files matching the pattern
      .sort(); // Ensure correct order

    if (chunkFiles.length === 0) {
      return reject(` No chunks found for ${filename}`);
    }

    console.log(
      ` Found ${chunkFiles.length} chunks for ${filename}:`,
      chunkFiles
    );

    const inputFilePath = path.join(INPUT_FOLDER, filename);
    const reconstructedFile = path.join(
      OUTPUT_FOLDER,
      `${outputFileName}_reconstructed${fileExtension}`
    );
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
