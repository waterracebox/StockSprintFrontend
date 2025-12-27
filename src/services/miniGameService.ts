import apiClient from './apiClient';

export interface MiniGameParticipant {
    userId: number;
    displayName: string;
    avatar: string | null;
}

export interface MiniGameParticipantsResponse {
    participants: MiniGameParticipant[];
    packets: any[];
}

export const miniGameService = {
    async fetchParticipants(): Promise<MiniGameParticipantsResponse> {
        const res = await apiClient.get('/minigame/participants');
        return {
            participants: res.data.participants || [],
            packets: res.data.packets || [],
        };
    },
};
