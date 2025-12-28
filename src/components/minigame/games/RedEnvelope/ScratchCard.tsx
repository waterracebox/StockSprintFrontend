import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Socket } from 'socket.io-client';

interface Props {
    prizeName: string;
    prizeValue?: number;
    type?: 'PHYSICAL' | 'CASH';
    socket?: Socket | null;
    onComplete?: () => void;
}

const BASE_WIDTH = 320;
const BASE_HEIGHT = 200;
const SCRATCH_LINE_WIDTH = 30;
const CHECK_INTERVAL = 200; // 毫秒節流檢查
const SCRATCH_THRESHOLD = 0.8; // 中央區域刮除比例門檻
const REGION_RATIO = 0.6; // 取中間 60% 區域檢測

const ScratchCard: React.FC<Props> = ({ prizeName, prizeValue, type, socket, onComplete }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const lastCheckRef = useRef(0);
    const completedRef = useRef(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: BASE_WIDTH, height: BASE_HEIGHT });

    const triggerWinConfetti = useCallback(() => {
        confetti({
            particleCount: 140,
            spread: 80,
            startVelocity: 60,
            origin: { x: 0.5, y: 1 },
            colors: ['#FFD700', '#DC143C', '#FFFFFF'],
            zIndex: 12000,
        });
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const hostWidth = containerRef.current.getBoundingClientRect().width;
        const width = Math.max(220, Math.min(BASE_WIDTH, hostWidth - 24));
        const height = (width / BASE_WIDTH) * BASE_HEIGHT;
        setCanvasSize({ width, height });
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctxRef.current = ctx;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
        canvas.style.width = `${canvasSize.width}px`;
        canvas.style.height = `${canvasSize.height}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置變形避免重複 scale
        ctx.scale(dpr, dpr);
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        const coverImg = new Image();
        coverImg.src = '/images/scratch-layer.jpg';
        coverImg.onload = () => {
            ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
            ctx.imageSmoothingEnabled = true;
            // 先鋪滿不透明底色，確保完全遮蔽文字，再用素材覆蓋（source-atop 保留紋理且維持不透明）
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
            ctx.globalCompositeOperation = 'source-atop';
            ctx.drawImage(coverImg, 0, 0, canvasSize.width, canvasSize.height);
            ctx.globalCompositeOperation = 'destination-out';
            console.info(`${new Date().toISOString()} [ScratchCard] 覆蓋層繪製完成 (${canvasSize.width}x${canvasSize.height}), 素材: ${coverImg.naturalWidth}x${coverImg.naturalHeight}`);
        };
        coverImg.onerror = () => {
            console.error(`${new Date().toISOString()} [ScratchCard] 圖片載入失敗 /images/scratch-layer.jpg`);
        };

        return () => {
            ctxRef.current = null;
        };
    }, [canvasSize.height, canvasSize.width]);

    const emitComplete = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        setIsCompleted(true);
        triggerWinConfetti();
        if (socket) {
            socket.emit('MINIGAME_ACTION', { type: 'SCRATCH_COMPLETE' });
        }
        if (onComplete) onComplete();
    }, [onComplete, socket, triggerWinConfetti]);

    const checkCompletion = useCallback((force?: boolean) => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas || completedRef.current) return;

        const now = Date.now();
        if (!force && now - lastCheckRef.current < CHECK_INTERVAL) return;
        lastCheckRef.current = now;

        const dpr = window.devicePixelRatio || 1;
        const regionW = canvasSize.width * REGION_RATIO * dpr;
        const regionH = canvasSize.height * REGION_RATIO * dpr;
        const offsetX = (canvasSize.width * dpr - regionW) / 2;
        const offsetY = (canvasSize.height * dpr - regionH) / 2;

        const imageData = ctx.getImageData(offsetX, offsetY, regionW, regionH);
        const { data } = imageData;
        let transparent = 0;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 128) transparent++;
        }
        const ratio = transparent / (data.length / 4);
        if (ratio > SCRATCH_THRESHOLD) emitComplete();
    }, [canvasSize.height, canvasSize.width, emitComplete]);

    const getPoint = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = (event.target as HTMLCanvasElement).getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * canvasSize.width;
        const y = ((event.clientY - rect.top) / rect.height) * canvasSize.height;
        return { x, y };
    }, [canvasSize.height, canvasSize.width]);

    const drawLine = useCallback((point: { x: number; y: number }) => {
        const ctx = ctxRef.current;
        if (!ctx || completedRef.current) return;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = SCRATCH_LINE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,1)';

        ctx.beginPath();
        const last = lastPointRef.current;
        if (last) {
            ctx.moveTo(last.x, last.y);
        } else {
            ctx.moveTo(point.x, point.y);
        }
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.restore();
        lastPointRef.current = point;
    }, []);

    const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = true;
        lastPointRef.current = null;
        const point = getPoint(event);
        drawLine(point);
        checkCompletion();
        event.currentTarget.setPointerCapture(event.pointerId);
    }, [checkCompletion, drawLine, getPoint]);

    const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const point = getPoint(event);
        drawLine(point);
        checkCompletion();
    }, [checkCompletion, drawLine, getPoint]);

    const endDrawing = useCallback((event?: React.PointerEvent<HTMLCanvasElement>) => {
        drawingRef.current = false;
        lastPointRef.current = null;
        checkCompletion(true);
        if (event) {
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch (error) {
                // ignore if capture was not set
            }
        }
    }, [checkCompletion]);

    const isCash = type === 'CASH';

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: Math.max(canvasSize.width + 24, 320),
                maxWidth: '92vw',
                height: canvasSize.height + 170,
                maxHeight: '90vh',
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                background: '#b71c1c',
            }}
        >
            {/* Layer 1: 背景 */}
            <img
                src="/images/open-packet-bg.webp"
                alt="open-packet-bg"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
            />

            {/* Layer 2: 獎品文字 */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffd966',
                    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    padding: '32px 18px 18px',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ fontSize: 18, opacity: 0.9, marginBottom: 6 }}>恭喜獲得</div>
                <div style={{ fontSize: 28, fontWeight: 900, textAlign: 'center', marginBottom: 10 }}>{prizeName || '神秘獎品'}</div>
                {isCash ? (
                    <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.95 }}>遊戲獎金：${Number(prizeValue ?? 0).toLocaleString()}</div>
                ) : (
                    <div style={{ fontSize: 16, opacity: 0.85 }}>請洽工作人員領取實體獎品</div>
                )}
            </div>

            {/* Layer 3: 刮刮樂覆蓋層 */}
            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrawing}
                onPointerLeave={endDrawing}
                onPointerCancel={endDrawing}
                style={{
                    position: 'absolute',
                    top: 90,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${canvasSize.width}px`,
                    height: `${canvasSize.height}px`,
                    zIndex: 3,
                    touchAction: 'none',
                    transition: 'opacity 0.4s ease',
                    opacity: isCompleted ? 0 : 1,
                }}
            />
        </div>
    );
};

export default ScratchCard;
