/**
 * 教學步驟型別定義
 * 
 * - fairyPlacement: 整個 Tooltip 相對於聚光燈目標的方位（對應 react-joyride placement）
 * - fairyDialogPlacement: 對話泡泡相對於精靈圖片的方位
 * - fairyType: 精靈圖片類型（決定使用哪張圖）
 */

import type { Step } from 'react-joyride';

/**
 * 精靈圖片類型
 * center = fairy_center.webp, left = fairy_left.webp, right = fairy_right.webp
 */
export type FairyType = 'center' | 'left' | 'right';

/**
 * 對話泡泡相對於精靈圖片的位置
 */
export type FairyDialogPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * 精靈定位方向（對應 react-joyride placement + 'center'）
 */
export type FairyPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

/**
 * 教學步驟擴充資料（附加在 step.data 上）
 */
export interface TutorialStepData {
    /** 精靈（整個 Tooltip）相對於聚光燈目標的方位 */
    fairyPlacement: FairyPlacement;
    /** 對話泡泡相對於精靈圖片的方位 */
    fairyDialogPlacement: FairyDialogPlacement;
    /** 精靈圖片類型 */
    fairyType: FairyType;
    /** 是否需要使用者互動才能前進（content 包含「請點擊」時自動判定） */
    requiresInteraction?: boolean;
    /** 互動完成後觸發推進的事件名稱 */
    advanceOn?: string;
    /** 是否為寬內容（如表格），泡泡會自動加寬 */
    wideContent?: boolean;
}

/**
 * 完整的教學步驟定義
 * 繼承 react-joyride Step，並強制 data 為 TutorialStepData
 */
export interface TutorialStep extends Omit<Step, 'data'> {
    data: TutorialStepData;
}
