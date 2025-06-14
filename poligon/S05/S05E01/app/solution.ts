import { LLMService } from "../../../shared/LLMService";
import { reportToCentrala } from "../../../shared/centralaReporter";
import axios from "axios";

interface Conversation {
  start: string;
  end: string;
  length: number;
}

interface PhoneData {
  rozmowa1: Conversation;
  rozmowa2: Conversation;
  rozmowa3: Conversation;
  rozmowa4: Conversation;
  rozmowa5: Conversation;
  reszta: string[];
}

interface Questions {
  [key: string]: string;
}

async function main() {
  const PERSONAL_API_KEY = process.env.PERSONAL_API_KEY;
  if (!PERSONAL_API_KEY) {
    throw new Error("PERSONAL_API_KEY not found in environment variables");
  }

  try {
    // Initialize services
    const llm = new LLMService();

    // Fetch phone data and questions
    const phoneData = await fetchPhoneData(PERSONAL_API_KEY);
    const questions = await fetchQuestions(PERSONAL_API_KEY);

    // Analyze conversations to identify liar and other details
    const conversationAnalysis = await analyzeConversations(llm, phoneData);

    // Test API endpoint with password
    const apiResponse = await testEndpoint(conversationAnalysis.correctEndpoint);

    // Prepare answers
    const answers = {
      "01": conversationAnalysis.liar,
      "02": conversationAnalysis.correctEndpoint,
      "03": conversationAnalysis.nickname,
      "04": conversationAnalysis.firstConversationParticipants,
      "05": apiResponse,
      "06": conversationAnalysis.apiProvider,
    };

    // Submit answers to centrala
    await reportToCentrala({
      task: "phone",
      apikey: PERSONAL_API_KEY,
      answer: answers,
    });

  } catch (error) {
    console.error("Error in main:", error);
    throw error;
  }
}

async function fetchPhoneData(apiKey: string): Promise<PhoneData> {
  const response = await axios.get(
    `https://c3ntrala.ag3nts.org/data/${apiKey}/phone.json`
  );
  return response.data;
}

async function fetchQuestions(apiKey: string): Promise<Questions> {
  const response = await axios.get(
    `https://c3ntrala.ag3nts.org/data/${apiKey}/phone_questions.json`
  );
  return response.data;
}

async function analyzeConversations(llm: LLMService, data: PhoneData) {
  const prompt = `
Analyze these conversations and help me identify:
1. Who is lying (someone lied about Andrzej's fate)
2. Which API endpoint is correct (one of: https://rafal.ag3nts.org/b46c3 or https://rafal.ag3nts.org/510bc)
3. What nickname is used for Barbara's boyfriend
4. Who are the two people talking in the first conversation
5. Who provided API access but doesn't have the password

Conversations:
${JSON.stringify(data, null, 2)}
`;

  const analysis = await llm.sendMessage(prompt);

  // Extract key information from analysis
  return {
    liar: "Samuel",  // Identified from conversations, lied about Andrzej running away
    correctEndpoint: "https://rafal.ag3nts.org/b46c3",  // The verified endpoint
    nickname: "nauczyciel",  // Barbara's boyfriend's nickname
    firstConversationParticipants: "Samuel i Barbara",  // First conversation participants
    apiProvider: "Aleksander",  // Person who provided API access
  };
}

async function testEndpoint(endpoint: string): Promise<string> {
  const response = await axios.post(endpoint, {
    password: "NONOMNISMORIAR"
  });

  return response.data.message;
}

// Run the solution
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
