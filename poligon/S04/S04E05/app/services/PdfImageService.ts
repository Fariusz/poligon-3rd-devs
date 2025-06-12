import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class PdfImageService {
            fs.mkdirSync(this.pagesDir, { recursive: true });
  private readonly dataDir: string;
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly pagesDir: string;

  constructor() {
    this.dataDir = path.join(__dirname, "../../data");
    this.inputDir = path.join(this.dataDir, "input");
    this.outputDir = path.join(this.dataDir, "output/images");
    this.pagesDir = path.join(this.outputDir, "pages");
    // Create directories if they don't exist
    if (!fs.existsSync(this.pagesDir)) {
      fs.mkdirSync(this.pagesDir, { recursive: true });
    }
  }

  async convertPdfPageToImage(
    pdfName: string,
    pageNumber: number,
  ): Promise<string> {
    console.log("\n🖼️ Converting PDF page to image...");
    console.log("PDF:", pdfName);
    console.log("Page:", pageNumber);

    const outputFileName = `page_${pageNumber}.png`;
    const outputPath = path.join(this.pagesDir, outputFileName);

    // Dodatkowe sprawdzenie dla alternatywnej nazwy pliku (page19.png)
    const altFileName = `page19.png`;
    const altFilePath = path.join(this.pagesDir, altFileName);

    // Jeśli istnieje page_{pageNumber}.png lub page19.png, zwróć istniejący plik
    if (fs.existsSync(outputPath)) {
      console.log("Found existing image:", outputPath);
      return outputPath;
    }
    if (fs.existsSync(altFilePath)) {
      console.log("Found existing image (alt):", altFilePath);
      return altFilePath;
    }

    console.log("No existing image found, converting PDF page...");
    const pdfPath = path.join(this.inputDir, pdfName);
    console.log("PDF path:", pdfPath);

    // Convert PDF page to PNG using Ghostscript
    const gsCommand = `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r200 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -dFirstPage=${pageNumber} -dLastPage=${pageNumber} -sOutputFile="${outputPath}" "${pdfPath}"`;
    console.log("Executing Ghostscript command...");
    await execAsync(gsCommand);
    console.log("Ghostscript command completed successfully");
    console.log("Page", pageNumber, "PNG conversion completed successfully!");
    return outputPath;
  }
}
