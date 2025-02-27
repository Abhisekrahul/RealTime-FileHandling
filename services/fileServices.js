const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFDocument } = require("pdf-lib");

const INPUT_FOLDER = path.join(__dirname, "../input");
const OUTPUT_FOLDER = path.join(__dirname, "../output");

// Ensure input and output folders exist
function ensureFoldersExist() {
  if (!fs.existsSync(INPUT_FOLDER)) {
    fs.mkdirSync(INPUT_FOLDER, { recursive: true });
    console.log("📂 Created input folder.");
  }
  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
    console.log("📂 Created output folder.");
  }
}

ensureFoldersExist();

// Function to check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// ✅ Split PDF into multiple parts
async function splitPDF(inputFileName, outputFolder) {
  try {
    const inputFilePath = path.join(INPUT_FOLDER, inputFileName);

    if (!fileExists(inputFilePath)) {
      console.error(`❌ File not found: ${inputFilePath}`);
      return;
    }

    const pdfBytes = fs.readFileSync(inputFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    console.log(
      `📄 Splitting PDF: ${inputFilePath} (Total Pages: ${totalPages})`
    );

    for (let i = 0; i < totalPages; i += 10) {
      const newPdf = await PDFDocument.create();
      const end = Math.min(i + 10, totalPages);

      for (let j = i; j < end; j++) {
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [j]);
        newPdf.addPage(copiedPage);
      }

      const newPdfBytes = await newPdf.save();
      const chunkName = `${path.basename(inputFileName, ".pdf")}_part${
        i / 10 + 1
      }.pdf`;
      const chunkPath = path.join(outputFolder, chunkName);

      fs.writeFileSync(chunkPath, newPdfBytes);
      console.log(`✅ Created chunk: ${chunkPath}`);
    }

    console.log(`🎉 PDF Splitting Completed!`);
  } catch (error) {
    console.error("❌ Error splitting PDF:", error);
  }
}

// ✅ Merge multiple PDF files
async function mergePDFs(outputFileName, inputFolder) {
  try {
    const outputFilePath = path.join(OUTPUT_FOLDER, outputFileName);
    const mergedPdf = await PDFDocument.create();
    const files = fs
      .readdirSync(inputFolder)
      .filter((file) => file.endsWith(".pdf"))
      .sort();

    if (files.length === 0) {
      console.error("❌ No PDF files found in the output folder.");
      return;
    }

    for (const file of files) {
      const filePath = path.join(inputFolder, file);
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputFilePath, mergedPdfBytes);
    console.log(`✅ Merged PDF saved as ${outputFilePath}`);
  } catch (error) {
    console.error("❌ Error merging PDFs:", error);
  }
}

// Example usage
splitPDF("sample.pdf", OUTPUT_FOLDER);
mergePDFs("merged.pdf", OUTPUT_FOLDER);

module.exports = {
  splitPDF,
  mergePDFs,
  INPUT_FOLDER,
  OUTPUT_FOLDER,
};
