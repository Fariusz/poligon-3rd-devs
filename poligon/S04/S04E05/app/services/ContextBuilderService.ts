import * as fs from "fs";
import * as path from "path";

export class ContextBuilderService {
  private readonly dataDir: string;
  private readonly textDir: string;
  private readonly pdfTextFile: string;
  private readonly imageTextFile: string;

  constructor() {
    this.dataDir = path.join(__dirname, "../../data");
    this.textDir = path.join(this.dataDir, "output/text");
    this.pdfTextFile = path.join(this.textDir, "extracted_text_pdf.txt");
    this.imageTextFile = path.join(this.textDir, "extracted_text_image.txt");
  }

  /**
   * Łączy tekst z PDF (strony 1-18) i tekst z OCR (strona 19) w jeden kontekst dla LLM.
   * @returns {string} Połączony kontekst
   */
  buildContext(): string {
    let pdfText = "";
    let imageText = "";

    if (fs.existsSync(this.pdfTextFile)) {
      pdfText = fs.readFileSync(this.pdfTextFile, "utf-8").trim();
    } else {
      console.warn(`[ContextBuilderService] Brak pliku: ${this.pdfTextFile}`);
    }

    if (fs.existsSync(this.imageTextFile)) {
      imageText = fs.readFileSync(this.imageTextFile, "utf-8").trim();
    } else {
      console.warn(`[ContextBuilderService] Brak pliku: ${this.imageTextFile}`);
    }

    const context = [
      pdfText,
      "\n\n--- OCR strona 19 ---\n\n",
      imageText
    ].join("");

    return context.trim();
  }
}
