// Entry point for the episode

import { ResourceService } from './services/ResourceService';
import { PdfService } from './services/PdfService';
import { PdfImageService } from './services/PdfImageService';
import { TextExtractionService } from './services/TextExtractionService';
import path from 'path';
import fs from 'fs';

async function main() {
    try {
        // Krok 1: Pobierz dane
        console.log('\n📥 Krok 1: Pobieranie danych...');
        const resourceService = new ResourceService();
        await resourceService.downloadResources();
        console.log('✅ Wszystkie pliki zostały pobrane pomyślnie!');

        // Krok 2: Wyciągnij tekst z PDF (strony 1-18)
        console.log('\n📄 Krok 2: Ekstrakcja tekstu z PDF...');
        const pdfService = new PdfService();
        const extractedText = await pdfService.extractTextFromPdf('notatnik-rafala.pdf', 1, 18);
        await pdfService.saveExtractedText(extractedText, 'extracted_text.txt');
        console.log('✅ Ekstrakcja tekstu zakończona pomyślnie!');

        // Krok 3: Przekształć stronę 19 do obrazka
        console.log('\n🖼️ Krok 3: Konwersja strony 19 do obrazka...');
        const pdfImageService = new PdfImageService();
        const imagePath = await pdfImageService.convertPdfPageToImage('notatnik-rafala.pdf', 19);
        console.log('✅ Konwersja strony 19 do obrazka zakończona pomyślnie!');
        console.log('Ścieżka do obrazka:', imagePath);

        // Krok 4: Podziel obrazek na 3 części
        // console.log('\n✂️ Krok 4: Dzielenie obrazka na fragmenty...');
        // await pdfImageService.extractTextRegions(imagePath);
        // console.log('✅ Podział obrazka na fragmenty zakończony pomyślnie!');

        // Wyświetl informacje o zapisanych fragmentach
        // const regionsDir = path.join(__dirname, '../data/output/images/regions');
        // const regions = fs.readdirSync(regionsDir);
        // console.log('\n📁 Zapisane fragmenty:');
        // regions.forEach(region => {
        //     console.log(`- ${region}`);
        // });

    } catch (error) {
        console.error('❌ Błąd w programie:', error);
        process.exit(1);
    }
}

main();