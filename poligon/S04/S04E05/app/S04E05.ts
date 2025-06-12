// Entry point for the episode

import { ResourceService } from "./services/ResourceService";
import { PdfService } from "./services/PdfService";
import { PdfImageService } from "./services/PdfImageService";
import { TextExtractionService } from "./services/TextExtractionService";
import path from "path";
import fs from "fs";

async function main() {
  try {
    // Krok 1: Pobierz dane
    console.log("\n📥 Krok 1: Pobieranie danych...");
    const resourceService = new ResourceService();
    await resourceService.downloadResources();
    console.log("✅ Wszystkie pliki zostały pobrane pomyślnie!");

    // Krok 2: Wyciągnij tekst z PDF (strony 1-18)
    console.log("\n📄 Krok 2: Ekstrakcja tekstu z PDF...");
    const pdfService = new PdfService();
    const extractedText = await pdfService.extractTextFromPdf(
      "notatnik-rafala.pdf",
      1,
      18,
    );
    await pdfService.saveExtractedText(extractedText, "extracted_text_pdf.txt");
    console.log("✅ Ekstrakcja tekstu zakończona pomyślnie!");

    // Krok 3: Przekształć stronę 19 do obrazka
    console.log("\n🖼️ Krok 3: Konwersja strony 19 do obrazka...");
    const pdfImageService = new PdfImageService();
    const imagePath = await pdfImageService.convertPdfPageToImage(
      "notatnik-rafala.pdf",
      19,
    );
    console.log("✅ Konwersja strony 19 do obrazka zakończona pomyślnie!");
    console.log("Ścieżka do obrazka:", imagePath);

    // Krok 4: Ekstrakcja tekstu z obrazu strony 19 (Vision GPT-4.1)
    const extractedImageTextPath = path.join(
      __dirname,
      "../data/output/text/extracted_text_image.txt",
    );
    let extractedImageText: string;
    if (fs.existsSync(extractedImageTextPath)) {
      console.log(
        "\n🤖 Krok 4: Plik z wyciągniętym tekstem z obrazu już istnieje, pomijam wysyłkę do LLM.",
      );
      extractedImageText = fs.readFileSync(extractedImageTextPath, "utf-8");
    } else {
      console.log(
        "\n🤖 Krok 4: Ekstrakcja tekstu z obrazu strony 19 (Vision GPT-4.1)...",
      );
      const textExtractionService = new TextExtractionService();
      extractedImageText =
        await textExtractionService.extractTextFromImage("page_19.png");
      console.log("✅ Ekstrakcja tekstu z obrazu zakończona pomyślnie!");
    }

    // Krok 5: Odpowiedz na pytania i wyślij odpowiedzi do Centrali
    const { NotebookQASystem } = await import("./services/NotebookQASystem");
    const qaSystem = new NotebookQASystem();
    await qaSystem.runFeedbackLoop();
  } catch (error) {
    console.error("❌ Błąd w programie:", error);
    process.exit(1);
  }
}

main();
