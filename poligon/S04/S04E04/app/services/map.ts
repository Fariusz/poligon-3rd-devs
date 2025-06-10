import { LLMService, Model } from '../../../../shared/LLMService';
import { Coordinates } from '../types/coordinates';

export const MAP_DESCRIPTION = `
You are a drone navigation expert. Your task is to interpret natural language instructions about drone movement and determine the final position on a 4x4 grid.

Here's the detailed description of what's in each cell:

Row 0 (top row):
- (0,0): Starting position (empty field)
- (1,0): grass
- (2,0): tree
- (3,0): house

Row 1:
- (0,1): grass
- (1,1): mill
- (2,1): grass
- (3,1): grass

Row 2:
- (0,2): grass
- (1,2): grass
- (2,2): stones
- (3,2): trees

Row 3 (bottom row):
- (0,3): hills
- (1,3): hills
- (2,3): car
- (3,3): cave

The drone always starts at position (0,0) - top left corner.
Coordinates are in (x,y) format where:
- x increases from left to right (0 to 3)
- y increases from top to bottom (0 to 3)

When given movement instructions in Polish, you must:
1. Start from (0,0)
2. Follow the instructions
3. Return ONLY the final coordinates in "x,y" format

Example instructions and their interpretations:
- "poleciałem w prawo" -> "1,0"
- "poleciałem w dół" -> "0,1"
- "poleciałem jedno pole w prawo" -> "1,0"
- "poleciałem dwa pola w prawo" -> "2,0"
- "poleciałem w prawo i w dół" -> "1,1"

Remember:
- Always start from (0,0)
- Each instruction is a new flight
- Return ONLY coordinates in "x,y" format
- Do not include any other text in your response
`;

export class MapService {
    private llmService: LLMService;
    private locationLLM: LLMService;

    constructor() {
        this.llmService = new LLMService(MAP_DESCRIPTION, Model.GPT4_1);
        this.locationLLM = new LLMService(`
            You are a drone location expert. Your task is to describe what's at a given location on a 4x4 grid.
            Based on the map description, respond with maximum two words in Polish describing what's at the given coordinates.
            Use these translations:
            - grass -> "trawa"
            - tree -> "drzewo"
            - trees -> "dwa drzewa"
            - house -> "dom"
            - mill -> "młyn"
            - stones -> "kamienie"
            - hills -> "wzgórza"
            - car -> "samochód"
            - cave -> "jaskinia"
            - empty field -> "puste pole"
            
            If the location is empty or not specified, respond with "puste pole".
            Do not include any other text in your response.
        `, Model.GPT4_1);
    }

    async getLocationDescription(coordinates: Coordinates): Promise<string> {
        const prompt = `What is located at coordinates (${coordinates.x}, ${coordinates.y})? 
        Respond with maximum two words in Polish describing what's there. 
        If it's empty space, respond with "puste pole".`;
        
        return await this.locationLLM.sendShortAnswer(prompt);
    }

    async getFinalCoordinates(instruction: string): Promise<Coordinates> {
        const coordinates = await this.llmService.sendShortAnswer(instruction);
        const [x, y] = coordinates.split(',').map(Number);
        
        // Walidacja współrzędnych
        if (isNaN(x) || isNaN(y) || x < 0 || x > 3 || y < 0 || y > 3) {
            console.error('Invalid coordinates received:', coordinates);
            return { x: 0, y: 0 }; // W przypadku błędu wracamy do punktu startowego
        }
        
        return { x, y };
    }
} 