import { LLMService, Model } from '../shared/LLMService';

export class CityIdentifier {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService(
            'You are an expert in Polish geography and urban planning. You specialize in identifying Polish cities based on their street layouts, naming conventions, and geographical features.',
            Model.GPT4o
        );
    }

    async identifyCity(fragmentAnalyses: string[]): Promise<string> {
        const combinedAnalysis = fragmentAnalyses.join('\n\n---FRAGMENT SEPARATOR---\n\n');
        
        const cityIdentificationPrompt = `You are an expert in Polish geography. Analyze these 4 map fragment analyses to determine which Polish city they belong to.

CRITICAL INSTRUCTIONS:
- One fragment may be incorrect and from a different city
- Focus on fragments showing consistent patterns
- Verify that locations actually exist in your proposed city
- Use distinctive street names and landmarks as key identifiers

MAP FRAGMENT ANALYSES:
${combinedAnalysis}

Analysis steps:

1. **CONSISTENCY CHECK** - Group fragments by:
   - Street naming patterns and conventions
   - Urban layout compatibility (grid vs organic)
   - Geographical feature consistency
   - Development style similarity

2. **OUTLIER DETECTION** - Identify inconsistent fragments:
   - Different naming conventions
   - Incompatible geography
   - Conflicting urban planning styles

3. **CITY IDENTIFICATION** - Using consistent fragments only:
   - Match specific street names to known Polish cities
   - Consider unique geographical features
   - Verify urban layout matches city characteristics
   - Confirm landmarks exist in proposed city

4. **VERIFICATION** - Double-check your answer:
   - Do the street names actually exist in this city?
   - Do geographical features match?
   - Is the urban layout consistent with the city?

Provide systematic analysis then conclude with: "FINAL ANSWER: [CITY_NAME]"

Use proper Polish spelling (e.g., "Świnoujście", "Warszawa", "Kraków").`;

        try {
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: cityIdentificationPrompt }],
                temperature: 0.1,
                maxTokens: 1500
            });
            console.log('\nCity identification analysis:');
            console.log(response);
            
            // Extract city name from response
            const finalAnswerMatch = response.match(/FINAL ANSWER:\s*([A-ZĄĆĘŁŃÓŚŹŻ\s-]+)/i);
            if (finalAnswerMatch) {
                const cityName = finalAnswerMatch[1].trim();
                console.log(`Extracted city name: ${cityName}`);
                return cityName;
            }

            
            throw new Error('Could not extract city name from response');
        } catch (error) {
            console.error('Error identifying city:', error);
            throw error;
        }
    }

    async identifyInstitute(fragmentAnalyses: string[]): Promise<string> {
        const combinedAnalysis = fragmentAnalyses.join('\n\n---\n\n');
        
        const institutePrompt = `Analyze these Polish map fragments to find specific institutions or locations. The error "are we sure this particular institute is there?" suggests we need a precise location, not just a city name.

MAP FRAGMENT ANALYSES:
${combinedAnalysis}

Search for SPECIFIC named locations:

**Educational Institutions:**
- Universities, colleges, schools (with names)
- Research institutes, academies
- Libraries with specific names

**Healthcare & Government:**
- Hospitals, clinics (with names)
- Government buildings, offices
- Courts, municipal buildings

**Cultural & Religious:**
- Museums, cultural centers (with names)
- Churches with specific denominations/names
- Theaters, opera houses

**Named Areas & Landmarks:**
- Specific cemeteries (e.g., "Cmentarz ewangelicko-augsburski")
- Named districts or neighborhoods
- Historical sites, monuments
- Major intersections or squares

**Key Focus Areas:**
- Look for any institution names in street names
- Check for building labels or area designations
- Note specific cemetery names or denominational references
- Identify any educational or institutional buildings

Pay special attention to:
- "Cmentarz ewangelicko-augsburski" (specific cemetery name)
- Any building or location names mentioned
- Street intersections that might identify a specific location
- Any references to universities, institutes, or schools

The answer should be a SPECIFIC LOCATION or BUILDING NAME, not just a city.

End with: "LOCATION: [SPECIFIC_LOCATION_NAME]" or "LOCATION: NONE FOUND"`;

        try {
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: institutePrompt }],
                temperature: 0.1,
                maxTokens: 1000
            });
            console.log('\nLocation identification analysis:');
            console.log(response);
            
            // Extract location name from response
            const locationMatch = response.match(/LOCATION:\s*(.+)/i);
            if (locationMatch) {
                const locationName = locationMatch[1].trim();
                console.log(`Extracted location name: ${locationName}`);
                return locationName;
            }
            
            return 'NONE FOUND';
        } catch (error) {
            console.error('Error identifying location:', error);
            return 'NONE FOUND';
        }
    }



    async identifyCityWithoutOutliers(fragmentAnalyses: string[]): Promise<string> {
        const outliersPrompt = `Analyze these 4 map fragments and identify which ones are outliers (don't belong with the others):

${fragmentAnalyses.map((analysis, i) => `FRAGMENT ${i + 1}:\n${analysis}`).join('\n\n---\n\n')}

First, identify which fragments seem to belong together based on:
- Similar street naming patterns
- Consistent geographical features  
- Compatible urban layouts
- Similar landmarks or infrastructure

Then, identify the Polish city based ONLY on the consistent fragments, ignoring any outliers.

End your response with: "CONSISTENT FRAGMENTS: [list] FINAL ANSWER: [CITY_NAME]"`;

        try {
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: outliersPrompt }],
                temperature: 0.1,
                maxTokens: 1500
            });
            console.log('\nOutlier analysis:');
            console.log(response);
            
            // Extract city name from response
            const finalAnswerMatch = response.match(/FINAL ANSWER:\s*([A-ZĄĆĘŁŃÓŚŹŻ\s-]+)/i);
            if (finalAnswerMatch) {
                const cityName = finalAnswerMatch[1].trim();
                console.log(`Extracted city name from outlier analysis: ${cityName}`);
                return cityName;
            }
            

            
            // If nothing found, return original analysis
            return await this.identifyCity(fragmentAnalyses);
        } catch (error) {
            console.error('Error in outlier analysis:', error);
            // Fall back to original method
            return await this.identifyCity(fragmentAnalyses);
        }
    }

    async verifyCity(cityName: string, fragmentAnalyses: string[]): Promise<boolean> {
        const verificationPrompt = `Please verify if the city "${cityName}" is consistent with the following map fragment analyses:

${fragmentAnalyses.join('\n\n---\n\n')}

Check if:
1. The street names mentioned actually exist in ${cityName}
2. The geographical features match ${cityName}'s location
3. The urban layout is consistent with ${cityName}'s known characteristics
4. Any landmarks mentioned are actually located in ${cityName}

Respond with "VERIFIED: YES" if the city matches the analyses, or "VERIFIED: NO" if there are significant inconsistencies.

Also explain your reasoning.`;

        try {
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: verificationPrompt }],
                temperature: 0.05,
                maxTokens: 500
            });
            console.log('\nCity verification:');
            console.log(response);
            
            return response.includes('VERIFIED: YES');
        } catch (error) {
            console.error('Error verifying city:', error);
            return false;
        }
    }
}