import { LLMService } from '../../../shared/LLMService';
import { Coordinates } from './types/coordinates';

export const MAP_DESCRIPTION = `
You are navigating a 4x4 grid map. Here's the detailed description of what's in each cell:

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
`;

export class MapService {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService(MAP_DESCRIPTION);
    }

    async getLocationDescription(coordinates: Coordinates): Promise<string> {
        const prompt = `Based on the map description, what is located at coordinates (${coordinates.x}, ${coordinates.y})? 
        Respond with maximum two words in Polish describing what's there. 
        If it's empty space, respond with "puste pole".`;
        
        return await this.llmService.sendShortAnswer(prompt);
    }

    async getFinalCoordinates(instruction: string): Promise<Coordinates> {
        const coordinates = await this.llmService.sendShortAnswer(instruction);
        const [x, y] = coordinates.split(',').map(Number);
        return { x, y };
    }
} 