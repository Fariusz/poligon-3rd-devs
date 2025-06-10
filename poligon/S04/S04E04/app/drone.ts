import { MapService } from './services/map';
import { DroneInstruction, LocationResponse } from './types/drone';

export class DroneService {
    private mapService: MapService;

    constructor() {
        this.mapService = new MapService();
    }

    async processInstruction(instruction: DroneInstruction): Promise<LocationResponse> {
        try {
            // Get final coordinates from the instruction
            const coordinates = await this.mapService.getFinalCoordinates(instruction.instruction);
            
            // Get description of what's at those coordinates
            const description = await this.mapService.getLocationDescription(coordinates);

            return { description };
        } catch (error) {
            console.error('Error processing drone instruction:', error);
            throw error;
        }
    }
} 