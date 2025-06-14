import { IQuestionHandler, ILLMService, ILogger } from '../interfaces';
import { Conversation, Fact } from '../models';

export class QuestionHandlingService implements IQuestionHandler {
  constructor(
    private readonly llmService: ILLMService,
    private readonly logger: ILogger
  ) {}

  async handleQuestion(
    question: string,
    conversations: Conversation[],
    facts: Fact[],
    liarPerson: string
  ): Promise<string> {
    this.validateInputs(question, conversations, facts, liarPerson);

    this.logger.log(`Processing question: "${question}"`);
    this.logger.log(`Context: ${conversations.length} conversations, ${facts.length} facts, liar: ${liarPerson}`);

    try {
      const context = this.buildContext(conversations, facts, liarPerson, question);
      const answer = await this.llmService.sendMessage(context);

      this.logger.log(`Question processed successfully. Answer: "${answer}"`);
      return answer.trim();
    } catch (error) {
      const errorMessage = `Failed to process question: "${question}"`;
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private validateInputs(
    question: string,
    conversations: Conversation[],
    facts: Fact[],
    liarPerson: string
  ): void {
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new Error('Question is required and must be a non-empty string');
    }

    if (!Array.isArray(conversations) || conversations.length === 0) {
      throw new Error('Conversations array is required and must not be empty');
    }

    if (!Array.isArray(facts) || facts.length === 0) {
      throw new Error('Facts array is required and must not be empty');
    }

    if (!liarPerson || typeof liarPerson !== 'string' || liarPerson.trim().length === 0) {
      throw new Error('Liar person is required and must be a non-empty string');
    }
  }

  private buildContext(
    conversations: Conversation[],
    facts: Fact[],
    liarPerson: string,
    question: string
  ): string {
    const conversationsSection = this.buildConversationsSection(conversations);
    const factsSection = this.buildFactsSection(facts);
    const liarSection = this.buildLiarSection(liarPerson);
    const questionSection = this.buildQuestionSection(question);

    return [
      conversationsSection,
      factsSection,
      liarSection,
      questionSection
    ].join('\n\n');
  }

  private buildConversationsSection(conversations: Conversation[]): string {
    const conversationTexts = conversations
      .map(conv => `${conv.speaker}: ${conv.content}`)
      .join('\n');

    return `Given these conversations:\n${conversationTexts}`;
  }

  private buildFactsSection(facts: Fact[]): string {
    const factTexts = facts
      .map(fact => `- ${fact.text} (${fact.isTrue ? 'true' : 'false'})`)
      .join('\n');

    return `And these facts:\n${factTexts}`;
  }

  private buildLiarSection(liarPerson: string): string {
    return `I know that ${liarPerson} was found to be lying based on inconsistencies with the facts.`;
  }

  private buildQuestionSection(question: string): string {
    return `Please answer this question: ${question}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}
