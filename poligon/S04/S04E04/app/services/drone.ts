import { MapService } from './map';
import { DroneInstruction, LocationResponse } from '../types/drone';

export class DroneService {
    private mapService: MapService;

    constructor() {
        this.mapService = new MapService();
    }

    async processInstruction(instruction: DroneInstruction): Promise<LocationResponse> {
        try {
            // Logowanie instrukcji
            console.log('Processing instruction:', instruction.instruction);

            // Get final coordinates from the instruction
            const coordinates = await this.mapService.getFinalCoordinates(instruction.instruction);
            console.log('Final coordinates:', coordinates);
            
            // Get description of what's at those coordinates (synchronous now)
            const description = this.mapService.getLocationDescription(coordinates);
            console.log('Location description:', description);

            // Zwracamy tylko wymagane pole description
            return { description };
        } catch (error) {
            console.error('Error processing drone instruction:', error);
            // W przypadku błędu zwracamy "puste pole"
            return { description: "puste pole" };
        }
    }
} 