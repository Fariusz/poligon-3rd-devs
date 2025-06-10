import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { DroneService } from './services/drone';
import { DroneInstruction } from './types/drone';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;
const TIMEOUT_MS = 14000; // 14 sekund (z zapasem 1 sekundy)
const droneService = new DroneService();

const app = express();
app.use(cors());
app.use(express.json());

// Logowanie z timestampem
function log(message: string, data?: any, type: 'info' | 'error' | 'request' | 'response' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: 'ℹ️',
        error: '❌',
        request: '📥',
        response: '📤'
    }[type];
    console.log(`\n${prefix} [${timestamp}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs))
    ]);
}

// Endpoint testowy
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Drone navigation server is running",
        endpoints: {
            drone: "/drone (POST)",
            health: "/ (GET)"
        }
    });
});

// Endpoint drona
app.post("/drone", async (req, res) => {
    log("Incoming Request", { method: req.method, url: req.originalUrl, body: req.body }, "request");

    const instruction: DroneInstruction = req.body;
    if (!instruction || !instruction.instruction) {
        log("Empty or invalid instruction", req.body, "error");
        return res.json({ description: "puste pole" });
    }

    try {
        const result = await withTimeout(
            droneService.processInstruction(instruction),
            TIMEOUT_MS
        );
        if (!result.description || typeof result.description !== "string") {
            log("Invalid response format", result, "error");
            return res.json({ description: "puste pole" });
        }
        log("Outgoing Response", result, "response");
        res.json({ description: result.description });
    } catch (error) {
        log("Timeout or error while processing instruction", error, "error");
        res.json({ description: "puste pole" });
    }
});

app.listen(PORT, () => {
    log("Server started", {
        port: PORT,
        localUrl: `http://localhost:${PORT}`,
        azylUrl: `https://azyl-${process.env.AZYL_PORT || '50005'}.ag3nts.org/drone`,
        timeout: `${TIMEOUT_MS}ms`
    }, "info");
}); 