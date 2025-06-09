import { ImageProcessor } from './ImageProcessor';
import { VisionAnalyzer } from './VisionAnalyzer';
import { CityIdentifier } from './CityIdentifier';
import { reportToCentrala } from '../shared/centralaReporter';
import * as fs from 'fs';
import * as path from 'path';

export class MapAnalyzer {
    private imageProcessor: ImageProcessor;
    private visionAnalyzer: VisionAnalyzer;
    private cityIdentifier: CityIdentifier;

    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.visionAnalyzer = new VisionAnalyzer();
        this.cityIdentifier = new CityIdentifier();
    }

    async run(): Promise<void> {
        try {
            console.log('Starting map analysis...');
            
            // Load pre-existing fragments from files
            const fragments = await this.loadFragmentsFromFiles();
            
            // Define possible task names
            const possibleTaskNames = ['mp3', 'mapy', 'maps', 'fragmenty', 'mapa', 'city', 'miasto'];
            
            // Analyze each fragment individually
            console.log('\nAnalyzing map fragments individually...');
            const fragmentAnalyses: string[] = [];
            
            for (let i = 0; i < fragments.length; i++) {
                const analysis = await this.visionAnalyzer.analyzeMapFragment(fragments[i], i + 1);
                fragmentAnalyses.push(analysis);
                
                // Add delay to avoid rate limiting
                if (i < fragments.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            // Try to identify specific institute first (based on error message)
            console.log('\nLooking for specific institutes...');
            const instituteName = await this.cityIdentifier.identifyInstitute(fragmentAnalyses);
            
            if (instituteName && instituteName !== 'NONE FOUND') {
                console.log(`\nFound institute: ${instituteName}`);
                
                // Try reporting institute name
                console.log('\nTrying to report institute name...');
                try {
                    await reportToCentrala({
                        task: 'mp3',
                        apikey: process.env.PERSONAL_API_KEY,
                        answer: instituteName
                    });
                    console.log('Successfully reported institute to Centrala!');
                    return;
                } catch (error: any) {
                    console.log('Institute reporting failed, trying city identification...');
                }
            }
            
            // Identify the city based on fragment analyses
            console.log('\nIdentifying the city...');
            let cityName = await this.cityIdentifier.identifyCity(fragmentAnalyses);
            
            console.log(`\nIdentified city: ${cityName}`);
            
            // Try reporting to Centrala with different task names
            console.log('\nTrying different task names...');
            
            for (const taskName of possibleTaskNames) {
                console.log(`\nTrying task name: ${taskName}`);
                try {
                    await reportToCentrala({
                        task: taskName,
                        apikey: process.env.PERSONAL_API_KEY,
                        answer: cityName
                    });
                    console.log(`Successfully reported to Centrala with task: ${taskName}!`);
                    return; // Success, exit
                } catch (error: any) {
                    console.log(`Task name ${taskName} failed:`, error.response?.data?.message || error.message);
                    continue; // Try next task name
                }
            }
            
            // If all task names fail, try alternative analysis
            {
                console.log('All task names failed, trying alternative analysis...');
                
                // Try alternative analysis focusing on consistent fragments only
                console.log('\nTrying analysis without potential outlier fragments...');
                const alternativeCityName = await this.cityIdentifier.identifyCityWithoutOutliers(fragmentAnalyses);
                
                if (alternativeCityName !== cityName) {
                    console.log(`\nAlternative identification: ${alternativeCityName}`);
                    
                    for (const taskName of possibleTaskNames) {
                        try {
                            await reportToCentrala({
                                task: taskName,
                                apikey: process.env.PERSONAL_API_KEY,
                                answer: alternativeCityName
                            });
                            console.log(`Successfully reported alternative answer with task: ${taskName}!`);
                            return;
                        } catch (secondError: any) {
                            continue;
                        }
                    }
                    console.log('Alternative analysis also failed for all task names.');
                }
                
                throw new Error('All attempts failed with all task names'); // Re-throw if all attempts fail
            }
            
        } catch (error) {
            console.error('Error in map analysis:', error);
            throw error;
        }
    }

    async loadFragmentsFromFiles(): Promise<Buffer[]> {
        const fragmentsDir = path.join(__dirname, '../fragments');
        const fragments: Buffer[] = [];

        try {
            console.log('Loading fragments from files...');
            
            // Load fragments 1-4
            for (let i = 1; i <= 4; i++) {
                const fragmentPath = path.join(fragmentsDir, `fragment_${i}.jpg`);
                if (fs.existsSync(fragmentPath)) {
                    const fragmentBuffer = fs.readFileSync(fragmentPath);
                    fragments.push(fragmentBuffer);
                    console.log(`Loaded fragment ${i} from: ${fragmentPath}`);
                } else {
                    throw new Error(`Fragment ${i} not found at: ${fragmentPath}`);
                }
            }
            
            console.log(`Loaded ${fragments.length} fragments`);
            return fragments;
            
        } catch (error) {
            console.error('Error loading fragments:', error);
            throw new Error('Failed to load map fragments from files');
        }
    }

    private extractCityFromCombinedAnalysis(analysis: string): string | null {
        // Try to extract city name from combined analysis
        const cityMatches = [
            /IDENTIFIED CITY:\s*([A-ZĄĆĘŁŃÓŚŹŻ\s-]+)/i,
            /FINAL ANSWER:\s*([A-ZĄĆĘŁŃÓŚŹŻ\s-]+)/i,
            /CITY:\s*([A-ZĄĆĘŁŃÓŚŹŻ\s-]+)/i
        ];
        
        for (const regex of cityMatches) {
            const match = analysis.match(regex);
            if (match) {
                return match[1].trim();
            }
        }
        
        return null;
    }
}