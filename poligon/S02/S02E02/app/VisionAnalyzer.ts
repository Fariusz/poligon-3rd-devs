import { LLMService, Model } from '../shared/LLMService';

export class VisionAnalyzer {
    private llmService: LLMService;
    private cachedSystemPrompt: string;

    constructor() {
        this.cachedSystemPrompt = `You are an expert in Polish geography and map reading. Your mission is to identify which Polish city these map fragments belong to.

CRITICAL CONTEXT:
- You will analyze 4 map fragments from what should be ONE Polish city
- ONE fragment may be INCORRECT and from a different city - this is a deliberate test
- Focus on identifying the 3 consistent fragments and ignore the outlier
- Your goal is to determine the correct Polish city name

ANALYSIS APPROACH:
1. Extract precise details from each fragment (street names, landmarks, layout)
2. Compare fragments for consistency patterns
3. Identify the outlier fragment (if any)
4. Focus on consistent fragments to determine the city
5. Verify your answer by confirming locations exist in the proposed city

Be extremely precise with Polish street names, landmarks, and geographical features.`;

        this.llmService = new LLMService(this.cachedSystemPrompt, Model.GPT4_1);
    }

    async analyzeMapFragment(fragmentBuffer: Buffer, fragmentNumber: number): Promise<string> {
        const base64Image = fragmentBuffer.toString('base64');
        
        const prompt = `You are analyzing Fragment ${fragmentNumber} of a Polish city map. Your task is to identify which Polish city this fragment belongs to.

IMPORTANT: One of the 4 fragments may be incorrect and from a different city. Focus on extracting precise details.

Analyze this map fragment and provide:

1. **Street Names** (write exactly as shown, including Polish diacritics):
   - List ALL visible street names
   - Note any unusual or distinctive naming patterns

2. **Landmarks and Points of Interest**:
   - Churches, schools, cemeteries, hospitals
   - Government buildings, cultural centers
   - Parks, squares, monuments
   - Shopping centers, markets

3. **Urban Layout**:
   - Street pattern (grid, radial, organic)
   - Building density and type
   - Historical vs modern development indicators

4. **Geographical Features**:
   - Rivers, lakes, coastline
   - Hills, bridges, green areas
   - Proximity to water bodies

5. **Transportation**:
   - Major roads with numbers
   - Railway lines, stations
   - Bus stops, tram lines

6. **Distinctive Features**:
   - Anything unique that could identify this specific location
   - Historical or cultural references in names

Be extremely precise with street names and landmark names as these are key identifiers.

Fragment ${fragmentNumber}: data:image/jpeg;base64,${base64Image}`;

        try {
            // Use lower temperature for more consistent results
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                maxTokens: 1000
            });
            console.log(`\nFragment ${fragmentNumber} analysis:`);
            console.log(response);
            return response;
        } catch (error) {
            console.error(`Error analyzing fragment ${fragmentNumber}:`, error);
            return `Error analyzing fragment ${fragmentNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    async analyzeAllFragmentsTogether(fragments: Buffer[]): Promise<string> {
        console.log('Analyzing all fragments together for better context...');
        
        const fragmentsBase64 = fragments.map((fragment, index) => ({
            number: index + 1,
            data: fragment.toString('base64')
        }));

        const prompt = `You are analyzing 4 map fragments from what should be a single Polish city. CRITICAL: One fragment may be incorrect and from a different city.

Your task:
1. **Consistency Check**: Identify which fragments belong together based on:
   - Similar street naming conventions
   - Compatible urban layout styles  
   - Consistent geographical features
   - Matching architectural/development patterns

2. **Outlier Detection**: Identify any fragment that seems inconsistent:
   - Different naming patterns
   - Incompatible geographical features
   - Different urban planning style

3. **City Identification**: Based on the consistent fragments, determine the Polish city by:
   - Unique street names that exist in that city
   - Characteristic landmarks or geographical features
   - Urban layout typical for that city

4. **Verification**: Ensure the locations you identify actually exist in the proposed city.

IMPORTANT: Focus on the fragments that show consistency. Ignore any outlier fragment when making your final city determination.

Analyze each fragment separately first, then compare for consistency.

Fragments:
${fragmentsBase64.map(f => `Fragment ${f.number}: data:image/jpeg;base64,${f.data}`).join('\n\n')}

End with: "CONSISTENT FRAGMENTS: [list] | OUTLIER: [fragment number or NONE] | IDENTIFIED CITY: [city name]"`;

        try {
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                maxTokens: 2000
            });
            console.log('\nCombined fragments analysis:');
            console.log(response);
            return response;
        } catch (error) {
            console.error('Error analyzing fragments together:', error);
            throw error;
        }
    }
}