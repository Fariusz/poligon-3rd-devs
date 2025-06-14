import * as fs from "fs";
import * as path from "path";
import { ContextBuilderService } from "./ContextBuilderService";
import { LLMService, Model } from "../../../../shared/LLMService";

import { reportToCentrala } from "../../../../shared/centralaReporter";

export class NotebookQASystem {
  private readonly inputDir: string;
  private readonly outputDir: string;
  private readonly questionsFile: string;
  private readonly answersFile: string;
  private readonly contextBuilder: ContextBuilderService;
  private readonly llmService: LLMService;

  // In-memory feedback for this run only
  private feedbackMap: Record<string, { lastAnswers: string[]; hint: string }> =
    {};

  // Bind statically imported reportToCentrala for linearity
  private readonly reportToCentrala = reportToCentrala;

  constructor() {
    this.inputDir = path.join(__dirname, "../../data/input");
    this.outputDir = path.join(__dirname, "../../data/output/text");
    this.questionsFile = path.join(this.inputDir, "notes.json");
    this.answersFile = path.join(this.outputDir, "answers.json");
    this.contextBuilder = new ContextBuilderService();
    this.llmService = new LLMService(
      "Odpowiedz na pytanie na podstawie poniższego kontekstu notatnika. Odpowiedź powinna być zwięzła i konkretna.",
      Model.GPT4_1,
    );
  }

  /**
   * Automatyczna pętla sprzężenia zwrotnego: generuje odpowiedzi, wysyła do Centrali,
   * przekazuje message+hint do LLM aż Centrala zaakceptuje wszystkie odpowiedzi (code 200).
   */
  async runFeedbackLoop(): Promise<void> {
    let allCorrect = false;
    let iteration = 1;
    // In-memory feedback map, reset on each run
    this.feedbackMap = {};
    let correctAnswers: Record<string, string> = {};
    let questions: Record<string, string> = {};

    if (!fs.existsSync(this.questionsFile)) {
      throw new Error(`Brak pliku z pytaniami: ${this.questionsFile}`);
    }
    questions = JSON.parse(fs.readFileSync(this.questionsFile, "utf-8"));

    // Set to track questions already accepted by Centrala
    const doneKeys = new Set<string>();

    const sortedKeys = Object.keys(questions).sort();

    for (let i = 0; i < sortedKeys.length; i++) {
      const key = sortedKeys[i];
      let done = false;

      iteration = 1;
      while (!done) {
        console.log(`\n==============================`);
        console.log(`--- Iteracja ${iteration} ---`);
        console.log(`Przetwarzane pytanie: ${key}`);
        iteration++;

        // Budujemy kontekst i prompt pojedynczo dla pytania
        let context = this.contextBuilder.buildContext();
        const staticContext = `Kontekst notatnika:\n${context}\n\n`;

        let prompt = staticContext;

        if (this.feedbackMap[key]) {
          console.log(`🔴 Błędne odpowiedzi do tej pory dla pytania ${key}:`);
          const lastAnswers = this.feedbackMap[key].lastAnswers || [];
          const hint = this.feedbackMap[key].hint || "";
          lastAnswers.forEach((ans: string, idx: number) => {
            console.log(`  ${idx + 1}. ${ans}`);
          });
          if (lastAnswers.length > 0) {
            prompt += `Twoje poprzednie odpowiedzi na pytanie ${key} były błędne:\n`;
            lastAnswers.forEach((ans, idx) => {
              prompt += `  ${idx + 1}. "${ans}"\n`;
            });
            prompt += `Podpowiedź brzmi: "${hint}".\n`;
            prompt += `Spróbuj ponownie, unikając powyższych odpowiedzi i wykorzystując podpowiedź.\n\n`;
          } else if (hint) {
            prompt += `Podpowiedź brzmi: "${hint}". Wykorzystaj ją w odpowiedzi.\n\n`;
          }
        } else {
          console.log(`🟢 Brak błędnych odpowiedzi dla pytania ${key}`);
        }

        prompt += `Pytanie: ${questions[key]}\n`;

        // Dodaj pułapki i instrukcje specyficzne dla pytań
        if (key === "01") {
          prompt +=
            "Odpowiedź nie jest podana wprost. Przeanalizuj cały kontekst i wywnioskuj odpowiedź na podstawie dostępnych informacji.\n";
        }
        if (key === "03") {
          prompt +=
            "Zwróć szczególną uwagę na drobny, szary tekst pod rysunkiem – może być kluczowy dla odpowiedzi.\n";
        }
        if (key === "04") {
          prompt +=
            "Data nie jest podana wprost – oblicz ją na podstawie informacji z kontekstu i podaj w formacie YYYY-MM-DD.\n";
        }
        if (key === "05") {
          prompt +=
            "Tekst pochodzi z OCR i może zawierać błędy, szczególnie w nazwie miejscowości. Miejscowość leży niedaleko miasta silnie związanego z historią AIDevs. Nazwa może być rozbita na dwa fragmenty.\n";
        }

        prompt += "Odpowiedz zwięzle i konkretnie, bez komentarzy:";

        let answer: string;

        // Wyraźny log promptu wysyłanego do LLM
        console.log(`\nWysyłam pytanie ${key} do LLM:`);
        console.log("PROMPT:\n" + prompt.slice(0, 1200)); // ogranicz długość promptu w logu

        try {
          const startLLM = Date.now();
          answer = await this.llmService.send({
            messages: [{ role: "user", content: prompt }],
            model: Model.GPT4_1,
            temperature: 0.2,
            maxTokens: 256,
          });
          const llmTime = ((Date.now() - startLLM) / 1000).toFixed(2);
          answer = answer.trim();
          // Wyraźny log odpowiedzi LLM
          console.log("\nOtrzymano odpowiedź z LLM:");
          console.log("ODPOWIEDŹ:", answer);
          console.log(`⏱️ Czas oczekiwania na LLM: ${llmTime} sekund`);
        } catch (error) {
          console.error(
            `❌ Błąd podczas odpowiadania na pytanie ${key}:`,
            error,
          );
          answer = "[Błąd podczas generowania odpowiedzi]";
        }

        correctAnswers[key] = answer;

        // Uzupełnij odpowiedzi dla pozostałych pytań zachowując je z poprzedniego stanu lub pusty string
        for (const qKey of Object.keys(questions)) {
          if (!correctAnswers[qKey]) {
            correctAnswers[qKey] = "";
          }
        }

        // Twórz pełny, posortowany obiekt odpowiedzi na wszystkie pytania
        const fullAnswers: Record<string, string> = {};
        Object.keys(questions)
          .sort()
          .forEach((qKey) => {
            fullAnswers[qKey] = correctAnswers[qKey];
          });

        // Zapisz pełne odpowiedzi do pliku
        fs.writeFileSync(
          this.answersFile,
          JSON.stringify(fullAnswers, null, 2),
          "utf-8",
        );
        console.log("✅ Odpowiedzi zapisane do:", this.answersFile);

        const apiKey = process.env.PERSONAL_API_KEY || "YOUR_API_KEY";
        const payload = {
          task: "notes",
          apikey: apiKey,
          answer: fullAnswers,
        };

        // Import reportToCentrala statically at the top of the file for strict linearity
        try {
          const startCentrala = Date.now();
          await this.reportToCentrala(payload);
          const centralaTime = ((Date.now() - startCentrala) / 1000).toFixed(2);
          console.log(
            `✅ Odpowiedź na pytanie ${key} zaakceptowana przez Centralę`,
          );
          console.log(
            `⏱️ Czas oczekiwania na Centralę: ${centralaTime} sekund`,
          );
          done = true;
        } catch (err: any) {
          if (err?.response?.data) {
            const data = err.response.data;
            const { message, hint, debug } = data;
            const match = message && message.match(/question (\d+)/);
            if (match) {
              const failedKey = match[1].padStart(2, "0");
              // In-memory feedback only
              if (!this.feedbackMap[failedKey]) {
                this.feedbackMap[failedKey] = { lastAnswers: [], hint: "" };
              }
              // ZAWSZE dopisuj nową odpowiedź do historii, nawet jeśli się powtarza
              this.feedbackMap[failedKey].lastAnswers.push(
                debug || fullAnswers[failedKey] || "",
              );
              this.feedbackMap[failedKey].hint = hint || "";
              console.log(`Pytanie ${failedKey}: ${message}`);
              if (hint) console.log(`Hint: ${hint}`);
            } else {
              console.log("Centrala error message:", message);
              if (hint) console.log("Centrala hint:", hint);
            }
            done = false;
          } else {
            console.error(
              "❌ Błąd podczas wysyłania odpowiedzi do Centrali:",
              err,
            );
            throw err;
          }
        }
      }

      // Wyraźny separator po każdej iteracji
      console.log("\n==============================\n");
    }

    allCorrect = true;
  }

  // updateFeedback is no longer needed, feedback is kept in memory only
}
