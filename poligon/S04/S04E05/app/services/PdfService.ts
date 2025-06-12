import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse";

export class PdfService {
  private readonly dataDir: string;
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly extractedTextPath: string;

  constructor() {
    this.dataDir = path.join(__dirname, "../../data");
    this.inputDir = path.join(this.dataDir, "input");
    this.outputDir = path.join(this.dataDir, "output/text");
    this.extractedTextPath = path.join(
      this.outputDir,
      "extracted_text_pdf.txt",
    );

    // Create directories if they don't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async extractTextFromPdf(
    pdfName: string,
    startPage: number = 1,
    endPage: number = 18,
  ): Promise<string> {
    console.log("\n🔍 Starting PDF text extraction...");
    console.log("PDF name:", pdfName);
    console.log("Pages:", startPage, "to", endPage);

    // Check if we already have extracted text
    if (fs.existsSync(this.extractedTextPath)) {
      console.log(
        "Found existing extracted text file:",
        this.extractedTextPath,
      );
      const text = fs.readFileSync(this.extractedTextPath, "utf-8");
      console.log(
        "Using existing extracted text (length:",
        text.length,
        "characters)",
      );
      return text;
    }

    console.log("No existing text found, extracting from PDF...");
    const pdfPath = path.join(this.inputDir, pdfName);
    console.log("PDF path:", pdfPath);

    try {
      console.log("Reading PDF file...");
      const dataBuffer = fs.readFileSync(pdfPath);
      console.log(
        "PDF file read successfully, size:",
        (dataBuffer.length / 1024 / 1024).toFixed(2),
        "MB",
      );

      console.log("Parsing PDF content...");
      const data = await pdfParse(dataBuffer);

      // Podziel tekst na strony po znaku form feed (\f)
      const pages = data.text.split("\f");
      const selectedPages = pages.slice(startPage - 1, endPage);
      const extractedText = selectedPages.join("\n\n");

      console.log("PDF parsing completed");
      console.log("Extracted text length:", extractedText.length, "characters");

      // Save the extracted text
      await this.saveExtractedText(extractedText, "extracted_text_pdf.txt");
      return extractedText;
    } catch (error) {
      console.error("\n❌ Error extracting text from PDF:", pdfName);
      console.error("Error details:", error);
      throw error;
    }
  }

  async saveExtractedText(text: string, outputFileName: string): Promise<void> {
    const outputPath = path.join(this.outputDir, outputFileName);
    console.log("\n💾 Saving extracted text...");
    console.log("Output path:", outputPath);

    try {
      fs.writeFileSync(outputPath, text, "utf-8");
      console.log("Successfully saved extracted text");
      console.log("File size:", (text.length / 1024).toFixed(2), "KB");
    } catch (error) {
      console.error("\n❌ Error saving extracted text to:", outputFileName);
      console.error("Error details:", error);
      throw error;
    }
  }
}
