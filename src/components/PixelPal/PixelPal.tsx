import React, { useRef, useEffect, useCallback, useState } from 'react';
import Box from '../ui/Box';
import { MyPopper as Popper, MyPaper as Paper, MyTypography as Typography, MyFade as Fade } from '../MUI替代';
import { useStore } from '../../store';
import type { PetState } from '../../types';

// Pixel art colors (limited 16-color palette)
const COLORS = {
  bg: 'transparent',
  body1: '#5D4E7A', // purple body
  body2: '#8B7BB8', // lighter purple
  body3: '#3D2E5A', // dark purple
  eyeWhite: '#FFFFFF',
  eyePupil: '#1A1A2E',
  cheek: '#FF9B9B',
  mouth: '#FF6B9D',
  star: '#FFD93D',
  starShine: '#FFF9C4',
};

// Simple pixel pet sprite data (8x8 grid, each cell = 1 "pixel")
// 0=transparent, 1=body1, 2=body2, 3=body3, 4=eyeWhite, 5=eyePupil, 6=cheek, 7=mouth, 8=star
const SPRITES: Record<PetState, number[][]> = {
  idle: [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [1,2,3,4,4,3,2,1],
    [1,2,3,5,5,3,6,1],
    [1,2,3,3,3,3,2,1],
    [0,1,2,2,2,2,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,7,7,0,0,0],
  ],
  speaking: [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [1,2,3,4,4,3,2,1],
    [1,2,3,5,5,3,6,1],
    [1,2,3,3,3,3,2,1],
    [0,1,2,2,2,2,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,7,0,0,7,0,0], // open mouth
  ],
  thinking: [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [1,2,3,4,4,3,2,1],
    [1,2,3,5,5,3,6,1],
    [1,2,3,3,3,3,2,1],
    [0,1,2,2,2,2,1,0],
    [0,8,1,1,1,1,8,0], // stars
    [0,0,0,0,0,0,0,0],
  ],
  notification: [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [1,2,3,4,4,3,2,1],
    [1,2,3,5,5,3,6,1],
    [1,2,3,3,3,3,2,1],
    [0,1,2,2,2,2,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,7,7,0,0,0],
  ],
  sleep: [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [1,2,3,3,3,3,2,1],
    [1,2,3,3,3,3,6,1],
    [1,2,3,3,3,3,2,1],
    [0,1,2,2,2,2,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0],
  ],
};

// Sleeping sprite with open eyes (for sleep state)
const SLEEP_EYES_SPRITE: number[][] = [
  [0,0,1,1,1,1,0,0],
  [0,1,2,2,2,2,1,0],
  [1,2,3,4,4,3,2,1],
  [1,2,3,3,3,3,6,1],
  [1,2,3,3,3,3,2,1],
  [0,1,2,2,2,2,1,0],
  [0,0,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0],
];

const COLOR_MAP: Record<number, string> = {
  0: 'transparent',
  1: COLORS.body1,
  2: COLORS.body2,
  3: COLORS.body3,
  4: COLORS.eyeWhite,
  5: COLORS.eyePupil,
  6: COLORS.cheek,
  7: COLORS.mouth,
  8: COLORS.star,
};

const PIXEL_SIZE = 6; // each sprite pixel = 6 canvas pixels
const SPRITE_SIZE = 8;
const CANVAS_SIZE = SPRITE_SIZE * PIXEL_SIZE;

interface PixelPalProps {
  onClick?: () => void;
}

export const PixelPal: React.FC<PixelPalProps> = ({ onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const petStatus = useStore((s) => s.petStatus);
  const setPetStatus = useStore((s) => s.setPetStatus);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const petRef = useRef({ x: 0, y: 0 });
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drawSprite = useCallback((ctx: CanvasRenderingContext2D, sprite: number[][], offsetY = 0, offsetX = 0, alpha = 1) => {
    ctx.globalAlpha = alpha;
    for (let row = 0; row < SPRITE_SIZE; row++) {
      for (let col = 0; col < SPRITE_SIZE; col++) {
        const colorIndex = sprite[row]?.[col] || 0;
        if (colorIndex === 0) continue;
        const color = COLOR_MAP[colorIndex];
        ctx.fillStyle = color;
        ctx.fillRect(col * PIXEL_SIZE + offsetX, row * PIXEL_SIZE + offsetY, PIXEL_SIZE, PIXEL_SIZE);
      }
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawPet = useCallback((state: PetState, frame: number, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE + 20);

    const sprite = SPRITES[state] || SPRITES.idle;

    // === IDLE: multi-layered floating animation ===
    // Layer 1: slow vertical float (breathing)
    const breatheY = Math.sin(frame * 0.08) * 1.5;
    // Layer 2: slight horizontal drift
    const driftX = Math.sin(frame * 0.06) * 0.8;
    // Layer 3: micro-bob
    const microBob = Math.sin(frame * 0.22) * 0.5;

    const floatY = state === 'idle' ? breatheY + microBob : 0;
    const floatX = state === 'idle' ? driftX : 0;

    // === SPEAKING: mouth animation 2-frame alternation at 4fps ===
    let spriteToDraw = sprite;
    if (state === 'speaking') {
      // Alternate every 7 frames at ~12fps → ~1.7fps mouth cycle
      spriteToDraw = frame % 14 < 7 ? SPRITES.speaking : SPRITES.idle;
    }

    // === THINKING: sway + sparkles ===
    const thinkSway = state === 'thinking' ? Math.sin(frame * 0.18) * 1.2 : 0;

    // Blink animation for idle (every ~5 seconds, blink lasts 0.25s)
    if (state === 'idle' && frame % 60 < 3) {
      spriteToDraw = sprite.map((row, r) =>
        r === 2 || r === 3
          ? row.map((c) => (c === 4 || c === 5 ? 3 : c))
          : row
      );
    }

    // === NOTIFICATION: bounce + horizontal sway ===
    const bounceY = state === 'notification' ? Math.abs(Math.sin(frame * 0.35)) * -5 : 0;
    const swayX = state === 'notification' ? Math.sin(frame * 0.25) * 1.5 : 0;

    drawSprite(ctx, spriteToDraw, floatY + bounceY, floatX + thinkSway + swayX);

    // Draw sparkle for thinking
    if (state === 'thinking') {
      const sparklePhase = frame % 20;
      if (sparklePhase < 10) {
        // Star at top-left and top-right
        ctx.fillStyle = COLORS.star;
        ctx.fillRect(-1, 0, 3, 3);
        ctx.fillStyle = COLORS.starShine;
        ctx.fillRect(0, 1, 1, 1);

        ctx.fillStyle = COLORS.star;
        ctx.fillRect(CANVAS_SIZE - 2, 0, 3, 3);
        ctx.fillStyle = COLORS.starShine;
        ctx.fillRect(CANVAS_SIZE - 1, 1, 1, 1);
      }
    }

    // === SLEEP: floating ZZZ ===
    if (state === 'sleep') {
      // Draw open eyes sprite
      drawSprite(ctx, SLEEP_EYES_SPRITE, 0, 0);

      // ZZZ letters floating upward with wave
      const now = frame;
      const zzz1Y = ((now * 0.8) % 20) - 4;
      const zzz2Y = ((now * 0.8 + 7) % 20) - 4;
      const zzz3Y = ((now * 0.8 + 14) % 20) - 4;
      const zzz1X = Math.sin(now * 0.1) * 0.5;
      const zzz2X = Math.sin(now * 0.1 + 0.5) * 0.5;

      ctx.globalAlpha = Math.max(0, 1 - zzz1Y / 16);
      ctx.fillStyle = COLORS.star;
      ctx.font = 'bold 6px monospace';
      ctx.fillText('z', 1 + zzz1X, zzz1Y + 2);

      ctx.globalAlpha = Math.max(0, 1 - zzz2Y / 16);
      ctx.font = 'bold 5px monospace';
      ctx.fillText('z', 4 + zzz2X, zzz2Y + 4);

      ctx.globalAlpha = Math.max(0, 1 - zzz3Y / 16);
      ctx.font = 'bold 4px monospace';
      ctx.fillText('z', 7, zzz3Y + 6);

      ctx.globalAlpha = 1;
    }

    // Shadow (moves slightly with drift)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(CANVAS_SIZE / 2 + floatX * 0.5, CANVAS_SIZE + 4, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }, [drawSprite]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTime = 0;
    const animate = (timestamp: number) => {
      const delta = timestamp - lastTime;
      if (delta > 80) { // ~12fps animation
        frameRef.current++;
        timeRef.current++;
        drawPet(petStatus.state, frameRef.current, canvas);
        lastTime = timestamp;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [petStatus.state, drawPet]);

  // Auto-dismiss notification/thinking message bubble after 5 seconds
  useEffect(() => {
    if (petStatus.state === 'notification' || petStatus.state === 'thinking') {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = setTimeout(() => {
        setPetStatus({ state: 'idle', message: undefined });
      }, 5000);
    }
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [petStatus.state, petStatus.message, setPetStatus]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - petRef.current.x, y: e.clientY - petRef.current.y };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    petRef.current = { x: newX, y: newY };

    // Determine snap position
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    let position: typeof petStatus.position = 'bottom-right';

    if (newX < halfW) {
      position = newY < halfH ? 'top-left' : 'bottom-left';
    } else {
      position = newY < halfH ? 'top-right' : 'bottom-right';
    }

    setPetStatus({ x: newX, y: newY, position });
  }, [isDragging, setPetStatus]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Position calculation
  const getPositionStyle = () => {
    const { position } = petStatus;
    const margin = 16;
    // Main content is max-width 480px, centered via flex+mx:'auto'
    // Pet should sit at bottom-right of the content area
    const contentWidth = 480;
    const vw = window.innerWidth;
    const contentLeft = (vw - contentWidth) / 2;
    const contentRight = contentLeft + contentWidth;

    switch (position) {
      case 'bottom-right':
        return { left: contentRight + margin, bottom: margin, right: 'auto', top: 'auto' };
      case 'bottom-left':
        return { left: contentLeft - margin - CANVAS_SIZE, bottom: margin, right: 'auto', top: 'auto' };
      case 'top-right':
        return { left: contentRight + margin, top: margin, right: 'auto', bottom: 'auto' };
      case 'top-left':
        return { left: contentLeft - margin - CANVAS_SIZE, top: margin, right: 'auto', bottom: 'auto' };
      default:
        return { left: contentRight + margin, bottom: margin, right: 'auto', top: 'auto' };
    }
  };

  const [_showTooltip, setShowTooltip] = useState(false);

  return (
    <>
      <Box
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        sx={{
          position: 'fixed',
          ...getPositionStyle(),
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 9999,
          userSelect: 'none',
          transition: isDragging ? 'none' : 'all 0.3s ease',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE + 20}
          style={{ display: 'block', imageRendering: 'pixelated' }}
        />
      </Box>

      {/* Pet message bubble */}
      <Popper
        open={!!petStatus.message && petStatus.state !== 'sleep'}
        placement="top"
        transition
        anchorEl={null}
        sx={{ zIndex: 99998 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={300}>
            <Paper
              sx={{
                position: 'fixed',
                bottom: petStatus.position.startsWith('top') ? 'auto' : 80,
                top: petStatus.position.startsWith('top') ? 80 : 'auto',
                ...(petStatus.position === 'bottom-right' || petStatus.position === 'top-right'
                  ? { right: 16 }
                  : { left: 16 }),
                maxWidth: 240,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(30, 20, 50, 0.95)',
                color: 'white',
                fontSize: 13,
              }}
            >
              <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.4 }}>
                {petStatus.message}
              </Typography>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
};

export default PixelPal;
