import { LLMService } from "../../../shared/LLMService";
import { reportToCentrala } from "../../../shared/centralaReporter";
import axios from "axios";
import { Logger } from "./utils/Logger";

interface PhoneData {
  rozmowa1: {
    start: string;
    end: string;
    length: number;
  };
  rozmowa2: {
    start: string;
    end: string;
    length: number;
  };
  rozmowa3: {
    start: string;
    end: string;
    length: number;
  };
  rozmowa4: {
    start: string;
    end: string;
    length: number;
  };
  rozmowa5: {
    start: string;
    end: string;
    length: number;
  };
  reszta: string[];
}

interface Questions {
  "01": string;
  "02": string;
  "03": string;
  "04": string;
  "05": string;
  "06": string;
}

class PhoneTaskSolver {
  private readonly logger: Logger;
  private readonly llm: LLMService;
  private readonly apiKey: string;

  constructor() {
    this.logger = new Logger("PhoneTask");
    this.llm = new LLMService();
    this.apiKey = process.env.PERSONAL_API_KEY || "";

    if (!this.apiKey) {
      throw new Error("PERSONAL_API_KEY not found in environment variables");
    }
  }

  private async fetchPhoneData(): Promise<PhoneData> {
    this.logger.log("Fetching phone data...");
    const response = await axios.get(
      `https://c3ntrala.ag3nts.org/data/${this.apiKey}/phone.json`,
    );
    return response.data;
  }

  private async fetchQuestions(): Promise<Questions> {
    this.logger.log("Fetching questions...");
    const response = await axios.get(
      `https://c3ntrala.ag3nts.org/data/${this.apiKey}/phone_questions.json`,
    );
    return response.data;
  }

  private async analyzeConversations(data: PhoneData): Promise<any> {
    this.logger.log("Analyzing conversations...");
    const prompt = `Analyze these conversation fragments about Rafal and others carefully:

Start pieces:
${Object.entries(data)
  .filter(([key]) => key.startsWith("rozmowa"))
  .map(([key, conv]) => `${key}:\n"${conv.start}"\n"${conv.end}"\n`)
  .join("\n")}

Additional fragments:
${data.reszta.map((fragment) => `"${fragment}"`).join("\n")}

Based on these conversations:
1. Who lied during the conversations about Andrzej's fate?
2. What is the correct API endpoint mentioned (one of: https://rafal.ag3nts.org/b46c3 or https://rafal.ag3nts.org/510bc)?
3. What nickname is used for Barbara's boyfriend?
4. Who are the two people talking in first conversation?
5. Who provided API access but didn't have the password and is still working on getting it?

Provide ONLY a JSON response in this exact format:
{
  "01": "name of the liar",
  "02": "correct endpoint URL",
  "03": "nickname",
  "04": "Person1 i Person2",
  "06": "name of API provider"
}`;

    const analysis = await this.llm.sendMessage(prompt);
    try {
      return JSON.parse(analysis);
    } catch (e) {
      this.logger.error("Failed to parse LLM response", e as Error);
      throw e;
    }
  }

  private async testEndpoint(endpoint: string): Promise<string> {
    this.logger.log(`Testing endpoint ${endpoint}...`);
    try {
      const response = await axios.post(endpoint, {
        password: "NONOMNISMORIAR",
      });
      return response.data.message;
    } catch (e) {
      this.logger.error("Failed to test endpoint", e as Error);
      throw e;
    }
  }

  public async solve(): Promise<void> {
    try {
      // 1. Fetch data
      const phoneData = await this.fetchPhoneData();
      const questions = await this.fetchQuestions();

      // 2. Analyze conversations
      const analysis = await this.analyzeConversations(phoneData);

      // 3. Test endpoint
      const endpointResponse = await this.testEndpoint(analysis["02"]);
      analysis["05"] = endpointResponse;

      // 4. Submit results
      await reportToCentrala({
        task: "phone",
        apikey: this.apiKey,
        answer: analysis,
      });

      this.logger.log("Task completed successfully");
    } catch (error) {
      this.logger.error("Error solving phone task", error as Error);
      throw error;
    }
  }
}

async function main(): Promise<void> {
  const solver = new PhoneTaskSolver();
  await solver.solve();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal application error:", error);
    process.exit(1);
  });
}

export { PhoneTaskSolver };
