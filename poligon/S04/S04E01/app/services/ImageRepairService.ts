import axios from 'axios';

export interface RepairResult {
    success: boolean;
    message: string;
    newFilename?: string;
    operation: string;
}

export interface ProcessedImage {
    originalFilename: string;
    finalFilename: string;
    finalUrl: string;
    operations: RepairResult[];
    success: boolean;
}

export class ImageRepairService {
    private apiKey: string;
    private baseUrl = 'https://c3ntrala.ag3nts.org';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async repairImage(filename: string, command: 'REPAIR' | 'DARKEN' | 'BRIGHTEN'): Promise<RepairResult> {
        try {
            const commandWithFile = `${command} ${filename}`;
            console.log(`Sending command: ${commandWithFile}`);
            
            const response = await axios.post(`${this.baseUrl}/report`, {
                task: "photos",
                apikey: this.apiKey,
                answer: commandWithFile
            });

            console.log(`${command} Response:`, response.data);

            const message = response.data.message || '';
            
            // Extract new filename from response message
            const newFilename = this.extractNewFilename(message, filename);
            
            return {
                success: response.data.code === 0,
                message: message,
                newFilename: newFilename,
                operation: commandWithFile
            };
        } catch (error: any) {
            console.error(`Error applying ${command} to ${filename}:`, error);
            return {
                success: false,
                message: `Error: ${error.message}`,
                operation: `${command} ${filename}`
            };
        }
    }

    private extractNewFilename(message: string, originalFilename: string): string | undefined {
        // Look for patterns like IMG_123_FXER.PNG or similar
        const patterns = [
            /IMG_\d+_[A-Z]+\.PNG/g,
            /IMG_\d+_repaired\.PNG/g,
            /IMG_\d+_fixed\.PNG/g,
            /IMG_\d+_darkened\.PNG/g,
            /IMG_\d+_brightened\.PNG/g,
            /IMG_\d+_corrected\.PNG/g
        ];
        
        for (const pattern of patterns) {
            const matches = message.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0];
            }
        }
        
        // If no specific pattern found, look for any IMG_*.PNG that's different from original
        const allImages = message.match(/IMG_\d+[^.\s]*\.PNG/g);
        if (allImages) {
            const different = allImages.find(img => img !== originalFilename);
            if (different) {
                return different;
            }
        }
        
        return undefined;
    }

    async processImageIteratively(originalFilename: string, maxAttempts: number = 3): Promise<ProcessedImage> {
        let currentFilename = originalFilename;
        const operations: RepairResult[] = [];
        let success = false;
        
        console.log(`\nProcessing ${originalFilename} iteratively...`);
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`\nAttempt ${attempt} for ${currentFilename}`);
            
            // Try different repair commands in order of preference
            const commands: ('REPAIR' | 'BRIGHTEN' | 'DARKEN')[] = ['REPAIR', 'BRIGHTEN', 'DARKEN'];
            let attemptSuccess = false;
            
            for (const command of commands) {
                const result = await this.repairImage(currentFilename, command);
                operations.push(result);
                
                if (result.success && result.newFilename && result.newFilename !== currentFilename) {
                    console.log(`✅ ${command} successful: ${currentFilename} -> ${result.newFilename}`);
                    currentFilename = result.newFilename;
                    attemptSuccess = true;
                    success = true;
                    break; // Success, move to next iteration
                } else {
                    console.log(`❌ ${command} failed or no improvement: ${result.message}`);
                }
                
                // Small delay between commands to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // If no command in this attempt was successful, stop trying
            if (!attemptSuccess) {
                console.log(`No successful operations in attempt ${attempt}, stopping.`);
                break;
            }
        }
        
        const finalUrl = `https://centrala.ag3nts.org/dane/barbara/${currentFilename}`;
        
        console.log(`Final result for ${originalFilename}: ${currentFilename} (${operations.length} operations)`);
        
        return {
            originalFilename,
            finalFilename: currentFilename,
            finalUrl: finalUrl,
            operations: operations,
            success: success
        };
    }

    async processMultipleImages(filenames: string[]): Promise<ProcessedImage[]> {
        const results: ProcessedImage[] = [];
        
        for (const filename of filenames) {
            console.log(`\n--- Processing ${filename} ---`);
            const result = await this.processImageIteratively(filename);
            results.push(result);
            
            // Delay between processing different images
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return results;
    }

    private isRepairSuccessful(result: RepairResult): boolean {
        if (!result.success) return false;
        if (!result.newFilename) return false;
        
        const message = result.message.toLowerCase();
        
        // Check for positive indicators
        const positiveIndicators = [
            'naprawione',
            'poprawione',
            'fixed',
            'repaired',
            'better',
            'improved',
            'enhanced'
        ];
        
        // Check for negative indicators
        const negativeIndicators = [
            'nie można',
            'niemożliwe',
            'failed',
            'error',
            'problem',
            'uszkodzone'
        ];
        
        const hasPositive = positiveIndicators.some(indicator => message.includes(indicator));
        const hasNegative = negativeIndicators.some(indicator => message.includes(indicator));
        
        return hasPositive && !hasNegative;
    }
}