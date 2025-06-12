import * as fs from "fs";
import * as path from "path";
import { ContextBuilderService } from "./ContextBuilderService";
import { LLMService, Model } from "../../../../shared/LLMService";

export class NotebookQASystem {
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly questionsFile: string;
  private readonly answersFile: string;
  private readonly feedbackFile: string;
  private readonly contextBuilder: ContextBuilderService;
  private readonly llmService: LLMService;

  constructor() {
    this.inputDir = path.join(__dirname, "../../data/input");
    this.outputDir = path.join(__dirname, "../../data/output/text");
    this.questionsFile = path.join(this.inputDir, "notes.json");
    this.answersFile = path.join(this.outputDir, "answers.json");
    this.feedbackFile = path.join(this.outputDir, "feedback.json");
    this.contextBuilder = new ContextBuilderService();
    this.llmService = new LLMService(
      "Odpowiedz na pytanie na podstawie poniższego kontekstu notatnika. Odpowiedź powinna być zwięzła i konkretna.",
      Model.GPT4_1,
    );
  }

  /**
   * Zapisuje feedback z Centrali do pliku feedback.json.
   * @param feedbackData Obiekt { [key]: { lastAnswer, hint } }
   */
  saveFeedback(
    feedbackData: Record<string, { lastAnswer: string; hint: string }>,
  ) {
    fs.writeFileSync(
      this.feedbackFile,
      JSON.stringify(feedbackData, null, 2),
      "utf-8",
    );
  }

  /**
   * Wczytuje feedback z Centrali z pliku feedback.json.
   */
  loadFeedback(): Record<string, { lastAnswer: string; hint: string }> {
    if (fs.existsSync(this.feedbackFile)) {
      return JSON.parse(fs.readFileSync(this.feedbackFile, "utf-8"));
    }
    return {};
  }

  /**
   * Automatyczna pętla sprzężenia zwrotnego: generuje odpowiedzi, wysyła do Centrali,
   * przekazuje message+hint do LLM aż Centrala zaakceptuje wszystkie odpowiedzi (code 200).
   */
  async runFeedbackLoop(): Promise<void> {
    let allCorrect = false;
    let iteration = 1;
    let feedbackMap = this.loadFeedback();
    let lastAnswers: Record<string, string> = {};
    let questions: Record<string, string> = {};

    if (!fs.existsSync(this.questionsFile)) {
      throw new Error(`Brak pliku z pytaniami: ${this.questionsFile}`);
    }
    questions = JSON.parse(fs.readFileSync(this.questionsFile, "utf-8"));

    while (!allCorrect) {
      console.log(`\n--- Iteracja ${iteration} ---`);

      // Prompt caching: stały kontekst na początku promptu
      let context = this.contextBuilder.buildContext();
      const staticContext = `Kontekst notatnika:\n${context}\n\n`;

      // Wybierz tylko pytania wymagające odpowiedzi (z feedbackiem lub wszystkie w pierwszej iteracji)
      const keysToAsk = Object.keys(questions).filter((key) => {
        if (Object.keys(feedbackMap).length > 0) {
          return !!feedbackMap[key];
        }
        return true;
      });

      const answers: Record<string, string> = {};

      for (const key of keysToAsk) {
        const question = questions[key];
        let prompt = staticContext;

        // Jeśli dla tego pytania jest feedback, dołącz go do promptu w jasny sposób
        if (feedbackMap[key]) {
          prompt += `Twoja poprzednia odpowiedź na to pytanie brzmiała:\n"${feedbackMap[key].lastAnswer}"\ni była błędna. Podpowiedź brzmi:\n"${feedbackMap[key].hint}"\nSpróbuj ponownie, unikając odpowiedzi "${feedbackMap[key].lastAnswer}".\n\n`;
        }

        prompt += `Pytanie: ${question}\nOdpowiedz zwięźle i konkretnie, bez komentarzy:`;

        try {
          const response = await this.llmService.send({
            messages: [{ role: "user", content: prompt }],
            model: Model.GPT4o,
            temperature: 0.2,
            maxTokens: 256,
          });
          answers[key] = response.trim();
          console.log(
            `Pytanie ${key}: ${question}\nOdpowiedź: ${answers[key]}\n`,
          );
        } catch (error) {
          console.error(
            `❌ Błąd podczas odpowiadania na pytanie ${key}:`,
            error,
          );
          answers[key] = "[Błąd podczas generowania odpowiedzi]";
        }
      }

      // Jeśli to nie pierwsza iteracja, uzupełnij odpowiedzi dla pozostałych pytań (nie wysyłaj ponownie do LLM)
      if (
        Object.keys(feedbackMap).length > 0 &&
        fs.existsSync(this.answersFile)
      ) {
        const prevAnswers = JSON.parse(
          fs.readFileSync(this.answersFile, "utf-8"),
        );
        for (const key of Object.keys(questions)) {
          if (!answers[key] && prevAnswers[key]) {
            answers[key] = prevAnswers[key];
          }
        }
      }

      fs.writeFileSync(
        this.answersFile,
        JSON.stringify(answers, null, 2),
        "utf-8",
      );
      console.log("✅ Odpowiedzi zapisane do:", this.answersFile);

      // Przygotuj payload do Centrali
      const apiKey = process.env.PERSONAL_API_KEY || "YOUR_API_KEY";
      const payload = {
        task: "notes",
        apikey: apiKey,
        answer: answers,
      };

      // Wyślij odpowiedź do Centrali i obsłuż feedback
      try {
        const { reportToCentrala } = await import(
          "../../../../shared/centralaReporter"
        );
        let centralaError = null;
        try {
          await reportToCentrala(payload);
          // Jeśli nie ma błędu, zakończ pętlę
          allCorrect = true;
          console.log("✅ Wszystkie odpowiedzi zaakceptowane przez Centralę!");
        } catch (err: any) {
          // Odczytaj message i hint z błędu Centrali
          if (err?.response?.data) {
            const data = err.response.data;
            // Obsługa pojedynczego błędu lub wielu błędów (jeśli Centrala zwraca więcej niż jeden)
            // Zakładamy, że message zawiera info o numerze pytania
            const { message, hint, debug } = data;
            // Przykład: message: 'Answer for question 01 is incorrect'
            const match = message && message.match(/question (\d+)/);
            if (match) {
              const key = match[1].padStart(2, "0");
              // debug to ostatnia odpowiedź wysłana do Centrali
              this.updateFeedback(key, debug || answers[key] || "", hint || "");
              console.log(`Pytanie ${key}: ${message}`);
              if (hint) console.log(`Hint: ${hint}`);
            } else {
              // fallback: jeśli nie można wyciągnąć numeru pytania, wypisz wszystko
              console.log("Centrala error message:", message);
              if (hint) console.log("Centrala hint:", hint);
            }
            // Kontynuuj pętlę, bo nie wszystkie odpowiedzi są poprawne
            feedbackMap = this.loadFeedback();
            iteration++;
          } else {
            // Inny błąd (np. sieciowy)
            throw err;
          }
        }
      } catch (err) {
        console.error("❌ Błąd podczas wysyłania odpowiedzi do Centrali:", err);
        throw err;
      }
    }
  }

  /**
   * Zaktualizuj feedback dla konkretnego pytania na podstawie odpowiedzi Centrali.
   * @param key - klucz pytania (np. "01")
   * @param lastAnswer - ostatnia błędna odpowiedź
   * @param hint - podpowiedź z Centrali
   */
  updateFeedback(key: string, lastAnswer: string, hint: string) {
    const feedbackMap = this.loadFeedback();
    feedbackMap[key] = { lastAnswer, hint };
    this.saveFeedback(feedbackMap);
  }
}
