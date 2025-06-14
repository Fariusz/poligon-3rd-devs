import { ILiarDetector, ILogger } from '../interfaces';
import { Conversation, Fact } from '../models';

export class LiarDetectionService implements ILiarDetector {
  constructor(private readonly logger: ILogger) {}

  findLiar(conversations: Conversation[], facts: Fact[]): string {
    this.validateInputs(conversations, facts);

    this.logger.log('Starting liar detection analysis');
    this.logger.log(`Analyzing ${conversations.length} conversations against ${facts.length} facts`);

    const speakerInconsistencies = this.calculateInconsistencies(conversations, facts);
    const liar = this.identifyLiarFromInconsistencies(speakerInconsistencies);

    this.logger.log(`Liar detection completed. Identified liar: ${liar}`);
    return liar;
  }

  private validateInputs(conversations: Conversation[], facts: Fact[]): void {
    if (!Array.isArray(conversations) || conversations.length === 0) {
      throw new Error('Conversations array is required and must not be empty');
    }

    if (!Array.isArray(facts) || facts.length === 0) {
      throw new Error('Facts array is required and must not be empty');
    }

    this.validateConversations(conversations);
    this.validateFacts(facts);
  }

  private validateConversations(conversations: Conversation[]): void {
    conversations.forEach((conv, index) => {
      if (!conv.speaker || typeof conv.speaker !== 'string') {
        throw new Error(`Invalid conversation at index ${index}: speaker is required and must be a string`);
      }

      if (!conv.content || typeof conv.content !== 'string') {
        throw new Error(`Invalid conversation at index ${index}: content is required and must be a string`);
      }
    });
  }

  private validateFacts(facts: Fact[]): void {
    facts.forEach((fact, index) => {
      if (!fact.text || typeof fact.text !== 'string') {
        throw new Error(`Invalid fact at index ${index}: text is required and must be a string`);
      }

      if (typeof fact.isTrue !== 'boolean') {
        throw new Error(`Invalid fact at index ${index}: isTrue is required and must be a boolean`);
      }
    });
  }

  private calculateInconsistencies(
    conversations: Conversation[],
    facts: Fact[]
  ): Map<string, number> {
    const speakerInconsistencies = new Map<string, number>();
    const falseFacts = facts.filter(fact => !fact.isTrue);

    this.logger.log(`Found ${falseFacts.length} false facts to check against`);

    for (const conversation of conversations) {
      this.initializeSpeakerIfNeeded(speakerInconsistencies, conversation.speaker);

      const inconsistencyCount = this.countInconsistenciesInStatement(
        conversation.content,
        falseFacts
      );

      if (inconsistencyCount > 0) {
        const currentCount = speakerInconsistencies.get(conversation.speaker) || 0;
        speakerInconsistencies.set(conversation.speaker, currentCount + inconsistencyCount);

        this.logger.log(
          `Found ${inconsistencyCount} inconsistencies in statement by ${conversation.speaker}: "${conversation.content}"`
        );
      }
    }

    return speakerInconsistencies;
  }

  private initializeSpeakerIfNeeded(
    speakerInconsistencies: Map<string, number>,
    speaker: string
  ): void {
    if (!speakerInconsistencies.has(speaker)) {
      speakerInconsistencies.set(speaker, 0);
    }
  }

  private countInconsistenciesInStatement(statement: string, falseFacts: Fact[]): number {
    const normalizedStatement = this.normalizeText(statement);
    let inconsistencyCount = 0;

    for (const fact of falseFacts) {
      const normalizedFactText = this.normalizeText(fact.text);

      if (this.statementContainsFact(normalizedStatement, normalizedFactText)) {
        inconsistencyCount++;
        this.logger.log(`Statement contains false fact: "${fact.text}"`);
      }
    }

    return inconsistencyCount;
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim();
  }

  private statementContainsFact(statement: string, factText: string): boolean {
    return statement.includes(factText);
  }

  private identifyLiarFromInconsistencies(
    speakerInconsistencies: Map<string, number>
  ): string {
    if (speakerInconsistencies.size === 0) {
      throw new Error('No speakers found in conversations');
    }

    let maxInconsistencies = 0;
    let liar = '';

    for (const [speaker, count] of speakerInconsistencies) {
      this.logger.log(`${speaker}: ${count} inconsistencies`);

      if (count > maxInconsistencies) {
        maxInconsistencies = count;
        liar = speaker;
      }
    }

    if (!liar || maxInconsistencies === 0) {
      // If no inconsistencies found, return the first speaker as fallback
      const firstSpeaker = Array.from(speakerInconsistencies.keys())[0];
      this.logger.log(`No clear liar found, returning first speaker: ${firstSpeaker}`);
      return firstSpeaker;
    }

    this.logger.log(`Liar identified: ${liar} with ${maxInconsistencies} inconsistencies`);
    return liar;
  }
}
