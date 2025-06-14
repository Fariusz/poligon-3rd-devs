export interface Conversation {
  speaker: string;
  content: string;
}

export interface Question {
  id: string;
  question: string;
}

export interface Fact {
  text: string;
  isTrue: boolean;
}

export interface TaskData {
  conversations: Conversation[];
  facts: Fact[];
  questions: Question[];
}

export interface TaskInfo {
  [key: string]: any;
}

export interface TaskToken {
  token: string;
}

export interface AnswerSubmission {
  sus: string;
  questions: Record<string, string>;
}

export interface CentralaRequest {
  task: string;
  apikey: string;
  answer: AnswerSubmission;
}
