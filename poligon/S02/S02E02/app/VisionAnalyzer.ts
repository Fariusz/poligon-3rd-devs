import { LLMService, Model } from "../shared/LLMService";

export class VisionAnalyzer {
  private llmService: LLMService;
  private cachedSystemPrompt: string;

  constructor() {
    this.cachedSystemPrompt = `You are an expert in Polish geography and map reading specialized in analyzing street layouts and urban patterns.

CRITICAL CONTEXT:
- You're analyzing a fragment from what should be ONE Polish city
- Focus on precise identification of street names and landmarks
- Pay special attention to:
  * Street names with exact Polish spelling
  * Religious buildings (churches, cemeteries)
  * Educational institutions
  * Major landmarks
  * Urban layout patterns

Your goal is to extract specific, verifiable details that can help identify the city.`;

    this.llmService = new LLMService(this.cachedSystemPrompt, Model.GPT4o);
  }

  async analyzeMapFragment(
    fragmentBuffer: Buffer,
    fragmentNumber: number,
  ): Promise<string> {
    const base64Image = fragmentBuffer.toString("base64");

    const prompt = `Analyze this Polish city map fragment and extract these specific details:

1. STREET NAMES (exact Polish spelling with diacritics)
2. RELIGIOUS BUILDINGS:
   - Churches with denominations
   - Cemeteries with types
3. EDUCATIONAL INSTITUTIONS
4. MAJOR LANDMARKS
5. URBAN PATTERN TYPE:
   - Grid/radial/organic layout
   - Density characteristics
   - Water features if any

FORMAT YOUR RESPONSE:
Streets: [list]
Religious: [list]
Education: [list]
Landmarks: [list]
Pattern: [description]

Be extremely precise with Polish names and locations.

Fragment ${fragmentNumber}: data:image/jpeg;base64,${base64Image}`;

    try {
      // Use lower temperature for more consistent results
      const response = await this.llmService.send({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        maxTokens: 1000,
      });
      console.log(`\nFragment ${fragmentNumber} analysis:`);
      console.log(response);
      return response;
    } catch (error) {
      console.error(`Error analyzing fragment ${fragmentNumber}:`, error);
      return `Error analyzing fragment ${fragmentNumber}: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }

  async analyzeAllFragmentsTogether(fragments: Buffer[]): Promise<string> {
    console.log("Analyzing all fragments together for better context...");

    const fragmentsBase64 = fragments.map((fragment, index) => ({
      number: index + 1,
      data: fragment.toString("base64"),
    }));

    const prompt = `Compare these map fragments and determine if they represent the same Polish city.

FOCUS ON:
1. Street name patterns and language
2. Religious buildings (especially cemeteries)
3. Educational institutions
4. Urban layout style
5. Distinctive landmarks

For each consistent element you find, verify it exists in a real Polish city.

List any fragment that seems different from others, explaining why.

RESPONSE FORMAT:
Matching Elements: [list key features that appear in multiple fragments]
Inconsistencies: [list any contradictions]
Identified City: [name with proper Polish spelling]
Verification: [list at least 3 verifiable locations]

Fragments:
${fragmentsBase64.map((f) => `Fragment ${f.number}: data:image/jpeg;base64,${f.data}`).join("\n\n")}`;

    try {
      const response = await this.llmService.send({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        maxTokens: 2000,
      });
      console.log("\nCombined fragments analysis:");
      console.log(response);
      return response;
    } catch (error) {
      console.error("Error analyzing fragments together:", error);
      throw error;
    }
  }
}
