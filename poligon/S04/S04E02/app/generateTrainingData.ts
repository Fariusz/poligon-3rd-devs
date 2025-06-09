import * as fs from 'fs';
import * as path from 'path';

interface TrainingExample {
    messages: {
        role: 'system' | 'user' | 'assistant';
        content: string;
    }[];
}

function generateTrainingData(): void {
    const dataDir = path.join(__dirname, '..', 'data');
    const outputFile = path.join(dataDir, 'training_data.jsonl');

    // Read input files
    const correctData = fs.readFileSync(path.join(dataDir, 'correct.txt'), 'utf-8')
        .split('\n')
        .filter(line => line.trim() !== '');

    const incorrectData = fs.readFileSync(path.join(dataDir, 'incorect.txt'), 'utf-8')
        .split('\n')
        .filter(line => line.trim() !== '');

    // Generate training examples
    const trainingExamples: TrainingExample[] = [
        // Correct examples
        ...correctData.map(line => ({
            messages: [
                {
                    role: 'system' as const,
                    content: 'validate data'
                },
                {
                    role: 'user' as const,
                    content: line
                },
                {
                    role: 'assistant' as const,
                    content: '1'
                }
            ]
        })),
        // Incorrect examples
        ...incorrectData.map(line => ({
            messages: [
                {
                    role: 'system' as const,
                    content: 'validate data'
                },
                {
                    role: 'user' as const,
                    content: line
                },
                {
                    role: 'assistant' as const,
                    content: '0'
                }
            ]
        }))
    ];

    // Write to JSONL file
    const jsonlContent = trainingExamples
        .map(example => JSON.stringify(example))
        .join('\n');

    fs.writeFileSync(outputFile, jsonlContent);
    console.log(`Generated training data with ${correctData.length} correct and ${incorrectData.length} incorrect examples`);
    console.log(`Output saved to: ${outputFile}`);
}

generateTrainingData(); 