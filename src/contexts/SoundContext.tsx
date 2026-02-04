import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Howl, Howler } from 'howler';

// ==================== 類型定義 ====================
type SfxType = 'coins';

interface SoundContextValue {
    /** 播放音效 */
    playSfx: (type: SfxType) => void;
    /** BGM 音量 (0.0 ~ 1.0) */
    bgmVolume: number;
    /** SFX 音量 (0.0 ~ 1.0) */
    sfxVolume: number;
    /** 設定 BGM 音量 */
    setBgmVolume: (vol: number) => void;
    /** 設定 SFX 音量 */
    setSfxVolume: (vol: number) => void;
    /** BGM 靜音狀態 */
    isBgmMuted: boolean;
    /** SFX 靜音狀態 */
    isSfxMuted: boolean;
    /** 切換 BGM 靜音 */
    toggleBgmMute: () => void;
    /** 切換 SFX 靜音 */
    toggleSfxMute: () => void;
}

// ==================== Context 建立 ====================
const SoundContext = createContext<SoundContextValue | null>(null);

// ==================== 常數設定 ====================
const BGM_PLAYLIST = [
    '/sounds/bgm/bgm_01.mp3',
    '/sounds/bgm/bgm_02.mp3',
    '/sounds/bgm/bgm_03.mp3',
    '/sounds/bgm/bgm_04.mp3',
    '/sounds/bgm/bgm_05.mp3',
    '/sounds/bgm/bgm_06.mp3',
    '/sounds/bgm/bgm_07.mp3',
    '/sounds/bgm/bgm_08.mp3',
    '/sounds/bgm/bgm_09.mp3',
    '/sounds/bgm/bgm_10.mp3',
    '/sounds/bgm/bgm_11.mp3',
    '/sounds/bgm/bgm_12.mp3',
    '/sounds/bgm/bgm_13.mp3',
    '/sounds/bgm/bgm_14.mp3',
    '/sounds/bgm/bgm_15.mp3',
    '/sounds/bgm/bgm_16.mp3',
];

const CROSSFADE_DURATION = 6000; // 6 秒交叉淡入淡出
const DEFAULT_BGM_VOLUME = 0.3;
const DEFAULT_SFX_VOLUME = 0.8;

// ==================== Provider 組件 ====================
export const SoundProvider: React.FC<{ children: React.ReactNode; disableBgm?: boolean }> = ({ children, disableBgm = false }) => {
    // ========== 狀態管理 ==========
    const [bgmVolume, setBgmVolumeState] = useState(DEFAULT_BGM_VOLUME);
    const [sfxVolume, setSfxVolumeState] = useState(DEFAULT_SFX_VOLUME);
    const [isBgmMuted, setIsBgmMuted] = useState(false);
    const [isSfxMuted, setIsSfxMuted] = useState(false);

    // ========== Refs（不觸發重新渲染） ==========
    const currentTrackRef = useRef<Howl | null>(null);
    const fadingOutTrackRef = useRef<Howl | null>(null); // 追蹤正在淡出的音軌
    const currentIndexRef = useRef(-1); // 從 -1 開始，讓第一首歌是 bgm_01
    const fadeTimeoutRef = useRef<number | null>(null);
    const fadeTimeoutStartTimeRef = useRef<number>(0); // 記錄 timeout 開始時間
    const fadeTimeoutRemainingRef = useRef<number>(0); // 記錄剩餘時間
    const hasInteractedRef = useRef(false);
    const sfxInstancesRef = useRef<{ [key in SfxType]?: Howl }>({});

    // ========== 音量控制（實際應用到 Howl 實例） ==========
    const setBgmVolume = useCallback((vol: number) => {
        const clampedVol = Math.max(0, Math.min(1, vol));
        setBgmVolumeState(clampedVol);
        if (currentTrackRef.current) {
            currentTrackRef.current.volume(clampedVol);
        }
    }, []);

    const setSfxVolume = useCallback((vol: number) => {
        const clampedVol = Math.max(0, Math.min(1, vol));
        setSfxVolumeState(clampedVol);
        // 更新所有已載入的 SFX 音量
        Object.values(sfxInstancesRef.current).forEach(sfx => {
            if (sfx) sfx.volume(clampedVol);
        });
    }, []);

    // ========== 靜音切換 ==========
    const toggleBgmMute = useCallback(() => {
        setIsBgmMuted(prev => {
            const newMuted = !prev;
            if (currentTrackRef.current) {
                currentTrackRef.current.mute(newMuted);
            }
            return newMuted;
        });
    }, []);

    const toggleSfxMute = useCallback(() => {
        setIsSfxMuted(prev => {
            const newMuted = !prev;
            Object.values(sfxInstancesRef.current).forEach(sfx => {
                if (sfx) sfx.mute(newMuted);
            });
            return newMuted;
        });
    }, []);

    // ========== BGM 交叉淡入淡出邏輯 ==========
    const playNextTrack = useCallback(() => {
        // 清除舊的 timeout
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        // 計算下一首歌的索引
        const nextIndex = (currentIndexRef.current + 1) % BGM_PLAYLIST.length;
        console.log(`[BGM] 準備播放第 ${nextIndex + 1} 首：${BGM_PLAYLIST[nextIndex]}`);

        // 取得當前歌曲
        const currentTrack = currentTrackRef.current;

        // 載入下一首歌
        const nextTrack = new Howl({
            src: [BGM_PLAYLIST[nextIndex]],
            volume: currentTrack ? 0 : bgmVolume,
            loop: false,
            html5: true,
            preload: true,
            onloaderror: (_, error) => {
                console.error(`[BGM] 載入失敗: ${BGM_PLAYLIST[nextIndex]}`, error);
            },
            onload: () => {
                console.log(`[BGM] 載入成功: ${BGM_PLAYLIST[nextIndex]}，時長: ${nextTrack.duration()}s`);
            },
            onplay: () => {
                console.log(`[BGM] 開始播放: ${BGM_PLAYLIST[nextIndex]}`);
            },
            onplayerror: (_, error) => {
                console.error(`[BGM] 播放錯誤: ${BGM_PLAYLIST[nextIndex]}`, error);
            },
            // 移除 onend，避免與 timeout 衝突導致重複創建實例
        });

        if (!currentTrack) {
            // ========== 第一首歌：直接播放 ==========
            nextTrack.mute(isBgmMuted);
            const playResult = nextTrack.play();
            console.log('[BGM] 嘗試播放第一首歌，play() 返回:', playResult);
            
            currentTrackRef.current = nextTrack;
            currentIndexRef.current = nextIndex;

            // 等待載入完成後設定 timeout
            nextTrack.once('load', () => {
                const duration = nextTrack.duration() * 1000;
                if (duration > 0) {
                    const triggerTime = Math.max(1000, duration - CROSSFADE_DURATION);
                    console.log(`[BGM] 設定 timeout: ${triggerTime}ms 後切換下一首`);
                    fadeTimeoutStartTimeRef.current = Date.now(); // 記錄開始時間
                    fadeTimeoutRemainingRef.current = triggerTime; // 記錄總時間
                    fadeTimeoutRef.current = window.setTimeout(() => {
                        console.log('[BGM] Timeout 觸發，準備切換下一首');
                        playNextTrack();
                    }, triggerTime);
                }
            });
        } else {
            // ========== 後續歌曲：交叉淡入淡出 ==========
            console.log('[BGM] 開始交叉淡入淡出（6 秒）');
            
            // 淡出當前歌曲並追蹤
            const currentVolume = currentTrack.volume();
            fadingOutTrackRef.current = currentTrack; // 追蹤淡出中的音軌
            currentTrack.fade(currentVolume, 0, CROSSFADE_DURATION);
            setTimeout(() => {
                currentTrack.stop();
                currentTrack.unload();
                fadingOutTrackRef.current = null; // 清除追蹤
                console.log('[BGM] 舊歌曲已停止並卸載');
            }, CROSSFADE_DURATION + 100);

            // 立即播放並淡入下一首
            nextTrack.mute(isBgmMuted);
            nextTrack.play();
            nextTrack.fade(0, bgmVolume, CROSSFADE_DURATION);

            // 更新 refs
            currentTrackRef.current = nextTrack;
            currentIndexRef.current = nextIndex;

            // 等待載入完成後設定 timeout
            nextTrack.once('load', () => {
                const duration = nextTrack.duration() * 1000;
                if (duration > 0) {
                    const triggerTime = Math.max(1000, duration - CROSSFADE_DURATION);
                    console.log(`[BGM] 設定 timeout: ${triggerTime}ms 後切換下一首`);
                    fadeTimeoutStartTimeRef.current = Date.now(); // 記錄開始時間
                    fadeTimeoutRemainingRef.current = triggerTime; // 記錄總時間
                    fadeTimeoutRef.current = window.setTimeout(() => {
                        console.log('[BGM] Timeout 觸發，準備切換下一首');
                        playNextTrack();
                    }, triggerTime);
                }
            });
        }
    }, [bgmVolume, isBgmMuted]);

    // ========== BGM 自動啟動（含 Autoplay 阻擋處理） ==========
    useEffect(() => {
        // 若禁用 BGM，直接返回
        if (disableBgm) {
            console.log('[BGM] 此頁面已禁用背景音樂');
            return;
        }

        // 預載所有音效（但不播放）
        console.log('[Audio] 預載音效檔案...');
        sfxInstancesRef.current['coins'] = new Howl({
            src: ['/sounds/coin.mp3'],
            volume: sfxVolume,
            preload: true,
            onload: () => {
                console.log('[SFX] 預載成功: coin.mp3');
            },
            onloaderror: (_, error) => {
                console.error('[SFX] 預載失敗: coin.mp3', error);
            },
        });

        // 若瀏覽器阻擋 autoplay，則在使用者首次互動時啟動
        const handleFirstInteraction = () => {
            if (hasInteractedRef.current) {
                return; // 已經啟動過，直接返回
            }
            
            hasInteractedRef.current = true;
            console.log('[Audio] 使用者首次互動，解鎖 AudioContext');
            
            // 立即移除事件監聽器，避免重複觸發
            document.removeEventListener('click', handleFirstInteraction, true);
            document.removeEventListener('touchstart', handleFirstInteraction, true);
            document.removeEventListener('keydown', handleFirstInteraction, true);
            
            // 強制 unlock Howler 的全域 AudioContext
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                console.log('[Audio] 偵測到 AudioContext suspended，嘗試恢復...');
                Howler.ctx.resume().then(() => {
                    console.log('[Audio] AudioContext 已恢復');
                }).catch((err) => {
                    console.warn('[Audio] AudioContext 恢復失敗:', err);
                });
            } else if (Howler.ctx) {
                console.log('[Audio] AudioContext 狀態:', Howler.ctx.state);
            }
            
            // 【新增】預熱 AudioContext（播放極短的低音量音效避免首次延遲）
            const warmupSound = new Howl({
                src: ['/sounds/coin.mp3'],
                volume: 0.001, // 極低音量，幾乎無聲
                onload: () => {
                    const playId = warmupSound.play();
                    console.log('[Audio] AudioContext 預熱中...');
                    setTimeout(() => {
                        warmupSound.stop(playId);
                        warmupSound.unload();
                        console.log('[Audio] AudioContext 預熱完成');
                        
                        // 預熱完成後啟動 BGM
                        if (!disableBgm) {
                            console.log('[BGM] AudioContext 已解鎖，啟動背景音樂');
                            playNextTrack();
                        }
                    }, 100);
                },
            });
        };

        // Page Visibility API：頁面隱藏時暫停，恢復時繼續
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // 頁面被隱藏（例如按 Home 鍵），暫停所有音樂
                console.log('[BGM] 頁面隱藏，快速淡出後暫停音樂（避免音爆）');
                
                // 【關鍵】清除 timeout 並計算剩餘時間
                if (fadeTimeoutRef.current !== null) {
                    clearTimeout(fadeTimeoutRef.current);
                    const elapsed = Date.now() - fadeTimeoutStartTimeRef.current;
                    fadeTimeoutRemainingRef.current = Math.max(0, fadeTimeoutRemainingRef.current - elapsed);
                    console.log(`[BGM] Timeout 已暫停，剩餘時間: ${fadeTimeoutRemainingRef.current}ms`);
                    fadeTimeoutRef.current = null;
                }
                
                // 【關鍵】先快速淡出再暫停，避免硬切導致音爆
                if (currentTrackRef.current) {
                    const track = currentTrackRef.current;
                    const currentVolume = track.volume();
                    track.fade(currentVolume, 0.001, 50); // 50ms 快速淡出到極低音量
                    setTimeout(() => {
                        track.pause();
                        track.volume(currentVolume); // 恢復原音量，以便恢復時使用
                    }, 60);
                }
                if (fadingOutTrackRef.current) {
                    const track = fadingOutTrackRef.current;
                    const currentVolume = track.volume();
                    track.fade(currentVolume, 0.001, 50);
                    setTimeout(() => {
                        track.pause();
                        track.volume(currentVolume);
                    }, 60);
                }
            } else {
                // 頁面恢復，只繼續播放當前音軌（淡出中的音軌不恢復）
                console.log('[BGM] 頁面恢復，繼續音樂（使用漸增避免音爆）');
                if (currentTrackRef.current && hasInteractedRef.current) {
                    const track = currentTrackRef.current;
                    const targetVolume = bgmVolume;
                    
                    // 【關鍵】使用漸增恢復，避免音爆
                    track.volume(0.01); // 先設極低音量
                    track.play();
                    
                    // 300ms 漸增到目標音量
                    setTimeout(() => {
                        track.fade(0.01, targetVolume, 300);
                    }, 50);
                    
                    // 【關鍵】重新設定 timeout，使用剩餘時間
                    if (fadeTimeoutRemainingRef.current > 0) {
                        console.log(`[BGM] 重新設定 timeout: ${fadeTimeoutRemainingRef.current}ms 後切換下一首`);
                        fadeTimeoutStartTimeRef.current = Date.now();
                        fadeTimeoutRef.current = window.setTimeout(() => {
                            console.log('[BGM] Timeout 觸發（恢復後），準備切換下一首');
                            playNextTrack();
                        }, fadeTimeoutRemainingRef.current);
                    }
                }
                // 【修改】不恢復淡出中的音軌，讓它自然結束
            }
        };

        // 註冊使用者互動事件監聽（使用 capture 階段確保優先執行）
        document.addEventListener('click', handleFirstInteraction, true);
        document.addEventListener('touchstart', handleFirstInteraction, true);
        document.addEventListener('keydown', handleFirstInteraction, true);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 清理函數
        return () => {
            document.removeEventListener('click', handleFirstInteraction, true);
            document.removeEventListener('touchstart', handleFirstInteraction, true);
            document.removeEventListener('keydown', handleFirstInteraction, true);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            
            // 【關鍵】先快速淡出再停止，避免路由切換時硬切導致音爆
            const cleanupTrack = (track: Howl) => {
                const currentVolume = track.volume();
                if (currentVolume > 0.001) {
                    console.log('[BGM] 清理前快速淡出（避免音爆）');
                    track.fade(currentVolume, 0.001, 50); // 50ms 快速淡出
                    setTimeout(() => {
                        track.stop();
                        track.unload();
                    }, 60);
                } else {
                    track.stop();
                    track.unload();
                }
            };
            
            if (currentTrackRef.current) {
                cleanupTrack(currentTrackRef.current);
            }
            if (fadingOutTrackRef.current) {
                cleanupTrack(fadingOutTrackRef.current);
            }
        };
    }, [playNextTrack, disableBgm]);

    // ========== SFX 播放邏輯 ==========
    const playSfx = useCallback((type: SfxType) => {
        console.log(`[SFX] playSfx 被調用，類型: ${type}，靜音狀態: ${isSfxMuted}`);
        
        // 若 SFX 靜音，則不播放
        if (isSfxMuted) {
            console.log('[SFX] SFX 已靜音，跳過播放');
            return;
        }

        // 檢查 AudioContext 狀態
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            console.warn('[SFX] AudioContext 處於 suspended 狀態，嘗試恢復...');
            Howler.ctx.resume();
        }

        // 使用已預載的音效實例
        const sfx = sfxInstancesRef.current[type];
        if (sfx) {
            // 【關鍵】首次播放使用漸增，避免爆音
            if (!(sfx as any)._hasPlayedOnce) {
                console.log(`[SFX] 首次播放 ${type}，使用漸增避免爆音`);
                sfx.volume(0.01); // 先設極低音量
                const playId = sfx.play();
                
                // 200ms 後漸增到目標音量
                setTimeout(() => {
                    sfx.fade(0.01, sfxVolume, 200, playId);
                }, 50);
                
                (sfx as any)._hasPlayedOnce = true;
            } else {
                // 正常播放
                console.log(`[SFX] 執行 play()，音效類型: ${type}`);
                sfx.volume(sfxVolume);
                const playId = sfx.play();
                console.log(`[SFX] play() 返回 ID: ${playId}`);
            }
        } else {
            console.error(`[SFX] 音效實例不存在: ${type}（應該在初始化時預載）`);
        }
    }, [isSfxMuted, sfxVolume]);

    // ========== Context Value ==========
    const value: SoundContextValue = {
        playSfx,
        bgmVolume,
        sfxVolume,
        setBgmVolume,
        setSfxVolume,
        isBgmMuted,
        isSfxMuted,
        toggleBgmMute,
        toggleSfxMute,
    };

    return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

// ==================== Custom Hook ====================
export const useSound = (): SoundContextValue => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound 必須在 SoundProvider 內部使用');
    }
    return context;
};
