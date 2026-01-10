/**
 * 遊戲狀態介面
 * 對應後端的 GAME_STATE_UPDATE 事件
 */
export interface GameState {
    currentDay: number;      // 當前遊戲天數（0 = 未開始，1~120 = 進行中）
    isGameStarted: boolean;  // 遊戲是否已啟動
    countdown: number;       // 倒數秒數（距離下一天）
    totalDays: number;       // 遊戲總天數（預設 120）
    maxLeverage?: number;    // 最大槓桿倍數（可選，因為舊版 API 可能不返回）
    dailyInterestRate?: number; // 【新增】日利率
    maxLoanAmount?: number;     // 【新增】每日最高借款額度
}

/**
 * 股價歷史單筆記錄
 * 對應後端的 PriceHistoryItem
 */
export interface StockData {
    day: number;              // 遊戲天數
    price: number;            // 股價
    title: string | null;     // 新聞標題（可能為空）
    news: string | null;      // 新聞內容（可能為空）
    effectiveTrend: string;   // 生效中的趨勢（例如：盤整、利多）
}

/**
 * 個人資產資訊
 */
export interface PersonalAssets {
    cash: number;   // 現金
    stocks: number; // 持股數量
    debt: number;   // 負債金額
    dailyBorrowed?: number; // 【新增】當日已借金額
    loanSharkVisitCount?: number; // 【新增】地下錢莊訪問次數
}

/**
 * 活躍合約訂單
 */
export interface ActiveContract {
    id: number;
    type: string; // 'LONG' | 'SHORT'
    leverage: number;
    quantity: number;
    margin: number;
    entryPrice: number;
    day: number;
}

/**
 * 【新增】新聞歷史單筆記錄
 */
export interface NewsItem {
    day: number;
    title: string;
    content: string;
}

/**
 * 完整狀態同步 Payload
 * 對應後端的 FULL_SYNC_STATE 事件
 */
export interface FullSyncPayload {
    gameStatus: GameState;
    price: {
        current: number;        // 當前股價
        history: StockData[];   // 股價歷史（Day 1 ~ currentDay）
    };
    personal: PersonalAssets;   // 個人資產
    activeContracts?: ActiveContract[]; // 活躍合約列表
    newsHistory?: NewsItem[];   // 【新增】新聞歷史
    leaderboard?: any[];        // 排行榜（預留欄位）
}