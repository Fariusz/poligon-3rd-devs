import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Funkcja do wycinania i zapisywania fragmentów obrazu
async function extractFragments() {
    try {
        const __dirname = path.dirname(process.argv[1]);
        const inputPath = path.join(__dirname, '../data/mapa_bw.jpg');
        const outputPath = path.join(__dirname, '../data/split/');

        // Sprawdź czy plik wejściowy istnieje
        if (!fs.existsSync(inputPath)) {
            throw new Error(`Nie znaleziono pliku: ${inputPath}`);
        }

        // Utwórz katalog wyjściowy jeśli nie istnieje
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Pobierz metadane obrazu
        const metadata = await sharp(inputPath).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        console.log(`Rozmiar obrazu: ${width}x${height}`);

        // Definiujemy współrzędne fragmentów (w pikselach)
        // Możesz dostosować te wartości do swojego obrazu
        const fragments = [
            { name: 'fragment_1', x: 0, y: 0, width: width / 2, height: height / 2 },
            { name: 'fragment_2', x: width / 2, y: 0, width: width / 2, height: height / 2 },
            { name: 'fragment_3', x: 0, y: height / 2, width: width / 2, height: height / 2 },
            { name: 'fragment_4', x: width / 2, y: height / 2, width: width / 2, height: height / 2 }
        ];

        // Wycinanie i zapisywanie fragmentów
        for (const fragment of fragments) {
            const outputFile = path.join(outputPath, `${fragment.name}.jpg`);
            
            console.log(`Przetwarzanie ${fragment.name}...`);
            console.log(`Pozycja: x=${fragment.x}, y=${fragment.y}, szerokość=${fragment.width}, wysokość=${fragment.height}`);
            
            await sharp(inputPath)
                .extract({
                    left: Math.floor(fragment.x),
                    top: Math.floor(fragment.y),
                    width: Math.ceil(fragment.width),
                    height: Math.ceil(fragment.height)
                })
                .toFile(outputFile);
                
            console.log(`Zapisano: ${outputFile}`);
        }

        console.log('Wszystkie fragmenty zostały pomyślnie zapisane!');
    } catch (error) {
        console.error('Wystąpił błąd:', error);
    }
}

// Uruchomienie funkcji
extractFragments();