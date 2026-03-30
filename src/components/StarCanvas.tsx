'use client';
import { useEffect, useRef } from 'react';

interface BgStar {
  x: number; y: number; r: number;
  vx: number; vy: number;
  alpha: number; alphaChange: number;
}
interface ShootingStar {
  x: number; y: number; len: number;
  speed: number; angle: number; active: boolean; delay: number;
}
interface Planet {
  x: number; y: number; r: number;
  type: 'gas' | 'rocky';
  baseColor: string;
  c1: string;
  c2: string;
  glow: string;
  vx: number; vy: number;
}
interface ConstellationNode {
  x: number; y: number; vx: number; vy: number; r: number;
}

export default function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let bgStars: BgStar[] = [];
    let shootingStars: ShootingStar[] = [];
    let planets: Planet[] = [];
    let constNodes: ConstellationNode[] = []; 
    // Trigger the very first meteor burst within the first 2-5 seconds (60fps)
    let showerTimer = Math.random() * 150 + 100; 

    const initScene = () => {
      // 1. Realistic Deep Space Stars
      const numBgStars = Math.floor((canvas.width * canvas.height) / 2000);
      bgStars = Array.from({ length: numBgStars }, () => {
        const isBig = Math.random() > 0.98;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: isBig ? Math.random() * 1.5 + 0.5 : Math.random() * 0.8 + 0.1,
          vx: (Math.random() - 0.5) * 0.2, // Independent horizontal drift
          vy: (Math.random() - 0.5) * 0.2, // Independent vertical drift
          alpha: Math.random(),
          alphaChange: (Math.random() * 0.02) + 0.005, // Fast twinkling
        };
      });

      // 2. Realistic Meteors (Large pool for showers)
      shootingStars = Array.from({ length: 18 }, () => createShootingStar(canvas));

      // 3. Procedurally Generated 3D Planets (No External Images)
      const planetTemplates: { type: 'gas' | 'rocky', base: string, c1: string, c2: string, glow: string }[] = [
        // Fictional Earth-like Oasis / Water World
        { type: 'rocky', base: '#0ea5e9', c1: '#22c55e', c2: '#0369a1', glow: 'rgba(56, 189, 248, 0.4)' },
        // Lava / Desert Planet
        { type: 'rocky', base: '#b91c1c', c1: '#ea580c', c2: '#7f1d1d', glow: 'rgba(239, 68, 68, 0.4)' },
        // Deep Purple/Gold Gas Giant
        { type: 'gas', base: '#7e22ce', c1: '#f59e0b', c2: '#4c1d95', glow: 'rgba(168, 85, 247, 0.4)' },
        // Frozen Ice World
        { type: 'rocky', base: '#e0f2fe', c1: '#7dd3fc', c2: '#0284c7', glow: 'rgba(224, 242, 254, 0.3)' }
      ];

      planets = planetTemplates.map(pt => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 20 + 12, // Distant
        type: pt.type,
        baseColor: pt.base,
        c1: pt.c1,
        c2: pt.c2,
        glow: pt.glow,
        vx: (Math.random() - 0.5) * 0.1, // Fast orbit
        vy: (Math.random() - 0.5) * 0.1,
      }));

      // 4. Subtle Nakshatra Network Points
      const numNodes = Math.floor((canvas.width * canvas.height) / 25000);
      constNodes = Array.from({ length: numNodes }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 0.5,
      }));
    };

    const createShootingStar = (canvas: HTMLCanvasElement): ShootingStar => {
      // Spawn meteors from all 360 degrees outside the visible screen
      const radius = Math.max(canvas.width, canvas.height) + 100;
      const spawnAngle = Math.random() * Math.PI * 2;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      return {
        // Positioned randomly on an outer circle
        x: cx + Math.cos(spawnAngle) * radius, 
        y: cy + Math.sin(spawnAngle) * radius, 
        len: Math.random() * 150 + 50, 
        speed: Math.random() * 25 + 15, // Blistering fast meteors
        // Point them to fly across the screen (inward)
        angle: spawnAngle + Math.PI + (Math.random() - 0.5), 
        active: false,
        delay: Math.random() * 400 + 100, 
      };
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initScene();
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Layer 1: Scattered Background Stars
      bgStars.forEach(s => {
        s.alpha += s.alphaChange;
        if (s.alpha > 1 || s.alpha < 0) s.alphaChange *= -1;
        
        // Random independent movement
        s.x += s.vx;
        s.y += s.vy;
        
        // Wrap gracefully around screen
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;

        ctx.beginPath();
        if (s.r > 1.2) {
          const starGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2);
          starGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0, s.alpha)})`);
          starGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
          ctx.fillStyle = starGrad;
          ctx.arc(s.x, s.y, s.r * 2, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, s.alpha * 0.8)})`;
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      // Layer 2: 100% Procedural 3D Planets (No external images)
      planets.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < -p.r * 2) p.x = canvas.width + p.r * 2;
        if (p.x > canvas.width + p.r * 2) p.x = -p.r * 2;
        if (p.y < -p.r * 2) p.y = canvas.height + p.r * 2;
        if (p.y > canvas.height + p.r * 2) p.y = -p.r * 2;

        ctx.save();
        ctx.globalAlpha = 0.85; // Recede into distance

        // Base glow & geometry
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.shadowBlur = Math.max(10, p.r * 0.8);
        ctx.shadowColor = p.glow;
        ctx.fillStyle = p.baseColor;
        ctx.fill(); // Fills base color so clipping mask has volume
        ctx.shadowBlur = 0;

        ctx.clip();

        // Terrain generation
        if (p.type === 'gas') {
          // Gas Giant: Swirling linear bands of storm clouds
          const stripes = ctx.createLinearGradient(
            p.x - p.r * 0.7, p.y - p.r, 
            p.x + p.r * 0.7, p.y + p.r
          );
          stripes.addColorStop(0, p.baseColor);
          stripes.addColorStop(0.2, p.c1);
          stripes.addColorStop(0.5, p.baseColor);
          stripes.addColorStop(0.7, p.c2);
          stripes.addColorStop(1, p.baseColor);
          
          ctx.fillStyle = stripes;
          ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        } else {
          // Rocky/Terrestrial: Off-center radial bursts to simulate distinct landmasses/oceans
          const terrain = ctx.createRadialGradient(
            p.x - p.r * 0.3, p.y + p.r * 0.2, p.r * 0.1,
            p.x, p.y, p.r * 1.1
          );
          terrain.addColorStop(0, p.c1);
          terrain.addColorStop(0.5, p.baseColor);
          terrain.addColorStop(1, p.c2);
          
          ctx.fillStyle = terrain;
          ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }

        // Realistic 3D Sphere Shading (Terminator shadow & specular highlight)
        const shadowGrad = ctx.createRadialGradient(
          p.x - p.r * 0.4, p.y - p.r * 0.4, p.r * 0.05, // Pinpoint light source hit
          p.x, p.y, p.r // Deep shadow dropoff
        );
        shadowGrad.addColorStop(0, "rgba(255, 255, 255, 0.25)");  // Specular glare
        shadowGrad.addColorStop(0.4, "rgba(0, 0, 0, 0)");         // True color midtone
        shadowGrad.addColorStop(0.75, "rgba(0, 0, 0, 0.4)");      // Approaching darkness
        shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0.95)");        // Black side facing empty space

        ctx.fillStyle = shadowGrad;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);

        ctx.restore();
      });

      // Layer 3: Mystical Constellations 
      ctx.lineWidth = 0.6;
      for (let i = 0; i < constNodes.length; i++) {
        for (let j = i + 1; j < constNodes.length; j++) {
          const dx = constNodes[i].x - constNodes[j].x;
          const dy = constNodes[i].y - constNodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(constNodes[i].x, constNodes[i].y);
            ctx.lineTo(constNodes[j].x, constNodes[j].y);
            const opacity = 1 - dist / 180;
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.2})`; 
            ctx.stroke();
          }
        }
      }
      constNodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        // Node flare
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(139, 92, 246, 0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Layer 4: High-Velocity Meteors (From all directions)
      // Shower logic
      showerTimer--;
      const isShower = showerTimer < 0 && showerTimer > -100; // 100 frames of blast
      if (showerTimer < -100) {
        showerTimer = Math.random() * 2000 + 1000; // Reset timer for next shower
      }

      shootingStars.forEach((s, idx) => {
        if (!s.active) {
          s.delay -= isShower ? 20 : 1; // Count down extremely fast during a blast
          if (s.delay <= 0) {
            shootingStars[idx] = createShootingStar(canvas);
            shootingStars[idx].active = true;
          }
        } else {
          // Pure polar coordinate movement
          s.x += Math.cos(s.angle) * s.speed;
          s.y += Math.sin(s.angle) * s.speed;

          // Tail fading continuously behind the trajectory
          const tailX = s.x - Math.cos(s.angle) * s.len;
          const tailY = s.y - Math.sin(s.angle) * s.len;
          
          const gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
          gradient.addColorStop(0, "rgba(255, 255, 255, 1)");         
          gradient.addColorStop(0.05, "rgba(200, 230, 255, 0.9)");    
          gradient.addColorStop(0.3, "rgba(100, 150, 255, 0.4)");     
          gradient.addColorStop(1, "rgba(100, 150, 255, 0)");         

          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(tailX, tailY);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 15;
          ctx.shadowColor = "rgba(180, 220, 255, 1)";
          ctx.fill();
          ctx.shadowBlur = 0; 

          // Check if completely out of bounds in any 360 direction
          const margin = s.len + 100;
          if (
            s.x < -margin || s.x > canvas.width + margin ||
            s.y < -margin || s.y > canvas.height + margin
          ) {
            s.active = false;
            s.delay = Math.random() * 500 + 100; 
          }
        }
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0, 
        background: 'radial-gradient(ellipse at bottom, #0d111a 0%, #05050A 100%)', 
      }}
    />
  );
}
