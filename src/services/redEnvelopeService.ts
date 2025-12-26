import apiClient from './apiClient';

export type RedEnvelopeType = 'PHYSICAL' | 'CASH';

export interface RedEnvelopeItem {
  id: number;
  name: string;
  type: RedEnvelopeType;
  prizeValue: number;
  amount: number;
  displayOrder: number;
  isActive: boolean;
}

export interface RedEnvelopePayload {
  name: string;
  type: RedEnvelopeType;
  prizeValue?: number;
  amount: number;
  displayOrder?: number;
  isActive?: boolean;
}

export const redEnvelopeService = {
  async getItems(): Promise<RedEnvelopeItem[]> {
    const res = await apiClient.get('/admin/games/red-envelope');
    return res.data;
  },

  async createItem(data: RedEnvelopePayload): Promise<RedEnvelopeItem> {
    const res = await apiClient.post('/admin/games/red-envelope', data);
    return res.data;
  },

  async updateItem(id: number, data: Partial<RedEnvelopePayload>): Promise<void> {
    await apiClient.put(`/admin/games/red-envelope/${id}`, data);
  },

  async deleteItem(id: number): Promise<void> {
    await apiClient.delete(`/admin/games/red-envelope/${id}`);
  },
};
