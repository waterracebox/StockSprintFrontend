import apiClient from './apiClient';

export interface QuizQuestion {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  rewards: { first: number; second: number; third: number; others: number };
  duration: number;
  sortOrder: number;
  createdAt: string;
}

export interface QuizPayload {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  rewards?: { first: number; second: number; third: number; others: number };
  duration?: number;
}

export const quizService = {
  async getQuestions(): Promise<QuizQuestion[]> {
    const res = await apiClient.get('/admin/games/quiz');
    return res.data;
  },

  async createQuestion(data: QuizPayload): Promise<QuizQuestion> {
    const res = await apiClient.post('/admin/games/quiz', data);
    return res.data;
  },

  async updateQuestion(id: number, data: Partial<QuizPayload>): Promise<void> {
    await apiClient.put(`/admin/games/quiz/${id}`, data);
  },

  async deleteQuestion(id: number): Promise<void> {
    await apiClient.delete(`/admin/games/quiz/${id}`);
  },

  async reorderQuestions(ids: number[]): Promise<void> {
    await apiClient.patch('/admin/games/quiz/reorder', { ids });
  },
};
