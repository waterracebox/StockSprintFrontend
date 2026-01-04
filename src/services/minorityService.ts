import apiClient from './apiClient';

export interface MinorityQuestion {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  duration: number;
  sortOrder: number;
  createdAt: string;
}

export interface MinorityPayload {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  duration?: number;
}

export const minorityService = {
  async getQuestions(): Promise<MinorityQuestion[]> {
    const res = await apiClient.get('/admin/games/minority');
    return res.data;
  },

  async createQuestion(data: MinorityPayload): Promise<MinorityQuestion> {
    const res = await apiClient.post('/admin/games/minority', data);
    return res.data;
  },

  async updateQuestion(id: number, data: Partial<MinorityPayload>): Promise<void> {
    await apiClient.put(`/admin/games/minority/${id}`, data);
  },

  async deleteQuestion(id: number): Promise<void> {
    await apiClient.delete(`/admin/games/minority/${id}`);
  },

  async reorderQuestions(ids: number[]): Promise<void> {
    await apiClient.patch('/admin/games/minority/reorder', { ids });
  },
};
