import { ImageDownloader } from '../utils/ImageDownloader';
import { ImageQualityAnalyzer, QualityAnalysis } from '../utils/ImageQualityAnalyzer';
import { PersonAnalyzer, PersonAnalysis } from '../utils/PersonAnalyzer';
import { DescriptionGenerator, DescriptionResult } from '../utils/DescriptionGenerator';

export interface PhotoAnalysisResult {
    imageUrl: string;
    isPersonPhoto: boolean;
    personDescription?: string;
}

export class PhotoService {
    private qualityAnalyzer: ImageQualityAnalyzer;
    private personAnalyzer: PersonAnalyzer;
    private descriptionGenerator: DescriptionGenerator;

    constructor() {
        this.qualityAnalyzer = new ImageQualityAnalyzer();
        this.personAnalyzer = new PersonAnalyzer();
        this.descriptionGenerator = new DescriptionGenerator();
    }

    async analyzeImageQuality(imageUrl: string): Promise<QualityAnalysis> {
        return await this.qualityAnalyzer.analyzeQuality(imageUrl);
    }

    async analyzePerson(imageUrl: string): Promise<PersonAnalysis> {
        return await this.personAnalyzer.analyzePerson(imageUrl);
    }

    async analyzeMultipleImages(imageUrls: string[]): Promise<Array<{ url: string; analysis: PersonAnalysis }>> {
        const results = [];
        
        for (const imageUrl of imageUrls) {
            console.log(`Analyzing: ${imageUrl}`);
            const analysis = await this.personAnalyzer.analyzePerson(imageUrl);
            results.push({ url: imageUrl, analysis });
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return results;
    }

    async createBarbaraDescription(
        processedImages: Array<{ url: string; filename: string }>
    ): Promise<DescriptionResult> {
        // Analyze each processed image for person details
        const personAnalyses = [];
        
        for (const image of processedImages) {
            console.log(`Analyzing processed image: ${image.filename}`);
            const analysis = await this.personAnalyzer.analyzePerson(image.url);
            personAnalyses.push({ filename: image.filename, analysis });
        }
        
        // Generate comprehensive description
        return await this.descriptionGenerator.createBarbaraDescription(personAnalyses);
    }

    async improveDescriptionWithHints(description: string, hints: string[]): Promise<string> {
        return await this.descriptionGenerator.improveDescription(description, hints);
    }

    // Legacy method for backward compatibility
    async findBarbaraPhotos(imageUrls: string[]): Promise<string[]> {
        const analyses = await this.analyzeMultipleImages(imageUrls);
        return analyses
            .filter(item => item.analysis.isPersonPhoto && item.analysis.confidence > 50)
            .map(item => item.url);
    }
}