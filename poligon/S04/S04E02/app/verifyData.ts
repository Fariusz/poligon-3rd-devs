import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';

dotenv.config({ path: path.join(__dirname, '../../../..', '.env') });

if (!process.env.OPENAI_API_KEY) {
    console.error('Please set OPENAI_API_KEY in .env file');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function verifyData(): Promise<void> {
    const dataDir = path.join(__dirname, '..', 'data');
    const verifyData = fs.readFileSync(path.join(dataDir, 'verify.txt'), 'utf-8')
        .split('\n')
        .filter(line => line.trim() !== '');

    console.log('Verifying data...\n');
    const correctIds: string[] = [];

    for (const line of verifyData) {
        try {
            const response = await openai.chat.completions.create({
                model: "ft:gpt-4.1-mini-2025-04-14:personal:loth:BgdSO79J",
                messages: [
                    {
                        role: "system",
                        content: "validate data"
                    },
                    {
                        role: "user",
                        content: line
                    }
                ]
            });

            const result = response.choices[0].message.content;
            console.log(`Line: ${line}`);
            console.log(`Result: ${result}\n`);

            // Jeśli odpowiedź to "1", dodaj ID do listy poprawnych
            if (result === "1") {
                const id = line.split('=')[0];
                correctIds.push(id);
            }
        } catch (error) {
            console.error(`Error processing line "${line}":`, error);
        }
    }

    // Wyślij wyniki do centrali
    if (correctIds.length > 0) {
        console.log('Sending correct IDs to centrala:', correctIds);
        await reportJsonToCentrala({
            task: "research",
            answer: correctIds
        });
    } else {
        console.log('No correct answers found');
    }
}

verifyData(); 