import { LLMService, Model } from '../shared/LLMService';

export class CityIdentifier {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService(
            'You are an expert in Polish geography and urban planning. You specialize in identifying Polish cities based on their street layouts, naming conventions, and geographical features.',
            Model.GPT4_1
        );
    }

    async identifyCity(fragmentAnalyses: string[]): Promise<string> {
        const combinedAnalysis = fragmentAnalyses.join('\n\n---FRAGMENT SEPARATOR---\n\n');
        
        const cityIdentificationPrompt = `You are an expert in Polish geography and urban planning. Your task is to analyze these 4 map fragments and identify the Polish city they represent.

CRITICAL INSTRUCTIONS:
1. ONE FRAGMENT IS INCORRECT - One of these fragments is from a different city and should be identified as an outlier
2. BE PRECISE - Focus on specific, verifiable details:
   - Exact street names and their spelling
   - Specific landmarks and their locations
   - Unique geographical features
   - Distinctive urban patterns
3. VERIFICATION - For each fragment:
   - Confirm street names exist in the proposed city
   - Verify landmarks are in correct locations
   - Check geographical features match the city's layout
   - Validate urban planning patterns

MAP FRAGMENT ANALYSES:
${combinedAnalysis}

Analysis steps:

1. **DETAILED FRAGMENT ANALYSIS**
   For each fragment, identify:
   - Street names and their exact spelling
   - Landmarks and their locations
   - Geographical features
   - Urban layout characteristics

2. **OUTLIER IDENTIFICATION**
   Mark fragment as outlier if it shows:
   - Different street naming conventions
   - Incompatible geographical features
   - Conflicting urban patterns
   - Non-existent landmarks in the main city

3. **CITY IDENTIFICATION**
   Using only consistent fragments:
   - Match specific street names to known Polish cities
   - Verify all landmarks exist in the proposed city
   - Confirm geographical features match
   - Validate urban layout patterns

4. **FINAL VERIFICATION**
   Double-check:
   - All street names exist in the proposed city
   - Landmarks are in correct locations
   - Geography matches the city's layout
   - Urban patterns are consistent

Provide your analysis in this format:
1. List which fragment is the outlier and why
2. Explain why the remaining fragments belong together
3. Provide evidence for the identified city
4. End with: "FINAL ANSWER: [CITY_NAME]"

Use proper Polish spelling (e.g., "Świnoujście", "Warszawa", "Kraków").`;

        try {
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: cityIdentificationPrompt }],
                temperature: 0.05,
                maxTokens: 2000
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
        const verificationPrompt = `You are an expert in Polish geography. Verify if "${cityName}" is the correct city for these map fragments.

MAP FRAGMENT ANALYSES:
${fragmentAnalyses.join('\n\n---\n\n')}

VERIFICATION STEPS:

1. **STREET NAME VERIFICATION**
   - List all street names mentioned in the fragments
   - Confirm each street exists in ${cityName}
   - Note any streets that don't exist in ${cityName}

2. **LANDMARK VERIFICATION**
   - List all landmarks mentioned
   - Verify each landmark exists in ${cityName}
   - Check if landmarks are in correct locations

3. **GEOGRAPHICAL FEATURE VERIFICATION**
   - List geographical features (rivers, hills, etc.)
   - Confirm these features exist in ${cityName}
   - Verify their relative positions

4. **URBAN LAYOUT VERIFICATION**
   - Analyze the urban planning patterns
   - Compare with ${cityName}'s known layout
   - Check for any inconsistencies

5. **OUTLIER ANALYSIS**
   - Identify any fragments that don't match ${cityName}
   - Explain why they don't belong
   - Note any patterns that suggest a different city

Provide your analysis in this format:
1. List any streets that don't exist in ${cityName}
2. List any landmarks that don't exist or are in wrong locations
3. List any geographical inconsistencies
4. List any urban layout mismatches
5. End with: "VERIFIED: YES" if ${cityName} is correct, or "VERIFIED: NO" if there are significant inconsistencies

If you find that this is definitely not ${cityName}, suggest which city it might be and why.`;

        try {
            const response = await this.llmService.send({
                messages: [{ role: 'user', content: verificationPrompt }],
                temperature: 0.05,
                maxTokens: 1500
            });
            console.log('\nCity verification analysis:');
            console.log(response);
            
            const isVerified = response.includes('VERIFIED: YES');
            
            if (!isVerified) {
                // Extract alternative city suggestion if present
                const alternativeCityMatch = response.match(/suggest.*?([A-ZĄĆĘŁŃÓŚŹŻ\s-]+)/i);
                if (alternativeCityMatch) {
                    console.log(`Alternative city suggested: ${alternativeCityMatch[1].trim()}`);
                }
            }
            
            return isVerified;
        } catch (error) {
            console.error('Error verifying city:', error);
            return false;
        }
    }
}