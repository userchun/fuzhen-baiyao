// Adapted from PixelFX holy/divine-shield's translucent film, sweeping sheen and cycle sparkles.
// PixelFX MIT: Copyright (c) 2026 Patch; Copyright (c) 2026 Hugo Duprez.
// Fuzhen Baiyao remix: straight horizontal veil, floating paper seals, local impact.
import { fit, sparkle, cycle, clamp, TAU, WHITE, hex } from '../../core/index.js';

export const meta = {
  name: 'Gold talisman ward', desc: 'Straight golden veil held by two floating paper seals.',
  tags: ['holy', 'gold', 'barrier', 'loop'], size: [352, 120], origin: [176, 88],
  duration: 3.2, loop: true, fps: 30, bg: 'dark',
  options: { palette: ['#302032','#73412b','#ad692b','#d69a35','#f1bf58','#ffdfa0','#fff5cd','#ffffff'], seed: 17, health: 1, hitAge: -1, hitX: 0 },
};

export function draw(p, t, o) {
  const C = fit(o.palette, 8), T = meta.duration, phase = t / T, half = 138, top = -41;
  const hp = clamp(o.health), strength = hp < .3 ? .4 : hp < .6 ? .7 : 1;
  const previousFade = p.fade; p.fade *= strength;
  // PixelFX divine-shield film and diagonal sheen, flattened into a taut horizontal membrane.
  const sw = -1.7 + 3.4 * clamp(phase / .7);
  p.each(-half, top, half, 0, (x,y,sx,sy) => {
    const d = Math.abs((y-top/2)/(top/2));
    const q = (x - y*1.3)/half, hot = Math.max(0,1-Math.abs(q-sw)/.18);
    const a = .065 + .22*Math.pow(d,6) + .22*hot;
    p.blendPx(sx,sy,hot>.5?C[6]:C[4],a);
  });
  for (const y of [top, 0]) {
    p.line(-half,y,half,y,C[4]);
    for(let x=-half;x<=half;x++)p.blend(x,y+(y===0?-1:1),C[5],.6);
    for(let x=-half;x<=half;x++) {
      const hot=Math.abs((x-y*1.3)/half-sw)<.12;
      if(hot)p.px(x,y,WHITE);
      if(x%6===0)p.glow(x,y,7,C[4],.2);
    }
  }
  // Quiet fragments of moving filaments; never a repeating fence pattern.
  for(let j=0;j<3;j++) {
    const start=-half+((phase*2+j/3)%1)*200;
    for(let i=0;i<65;i++) {
      const x=start+i, y=top+9+j*11+Math.sin(i/22+phase*TAU)*2;
      if(x<half-5)p.blend(x,y,C[5],Math.sin(i/65*Math.PI)*.45);
    }
  }
  // Two small paper talismans: shaded paper, bright inner edge and abstract cinnabar strokes.
  for(const sign of [-1,1]) {
    const x=sign*146, y=-48+Math.round(Math.sin(phase*TAU)*1);
    p.rect(x-6,y,12,48,C[1]); p.rect(x-5,y,10,46,C[3]);
    p.rect(x-4,y+1,8,43,C[5]);p.line(x-4,y+1,x+3,y+1,C[6]);
    p.line(x-5,y+2,x-5,y+42,C[6]);
    p.line(x+4,y+4,x+4,y+45,C[2]);
    p.rect(x-3,y+44,3,3,C[3]);p.rect(x+1,y+43,3,3,C[4]);
    p.line(x-3,y+4,x+2,y+4,C[2]);p.line(x-3,y+39,x+2,y+39,C[2]);
    const red=hex('#a73829');
    p.line(x,y+8,x,y+33,red);p.line(x-2,y+11,x+2,y+11,red);
    p.polyline([[x-2,y+17],[x+2,y+17],[x-2,y+22],[x+2,y+24],[x-2,y+30]],red);
    p.glow(x,-21,17,C[4],.22);
    sparkle(p,x-sign*8,top,2,C[6],C[4],.25);
  }
  // Tiny diamond seal, subdued so monsters remain legible through the film.
  p.polyline([[0,-28],[6,-21],[0,-14],[-6,-21],[0,-28]],C[5]);
  p.line(-2,-21,2,-21,C[6]);
  cycle(t,T,18,o.seed,g=>g.range(.5,1.1),(age,life,R)=> {
    const u=age/life,x=R.range(-half,half),y=R.range(top,0)-u*9,k=Math.sin(u*Math.PI);
    if(R.next()>.75)sparkle(p,x,y,1+1.5*k,C[6],C[4],.16*k);
    else {p.dot(x,y,C[5],k);p.light(x,y,C[4],.25*k);}
  });
  if(o.hitAge>=0 && o.hitAge<.55) {
    const u=o.hitAge/.55,r=2+u*25,fade=(1-u)**2;
    for(let i=0;i<80;i++) {
      const a=i/80*TAU,x=o.hitX+Math.cos(a)*r,y=-20+Math.sin(a)*r*.8;
      if(x>-half && x<half && y>top && y<0)p.dot(x,y,C[6],fade);
    }
    sparkle(p,o.hitX,-20,7*(1-u),C[6],C[4],.6*fade);
  }
  // Sliding point lights skim the straight rim; integral loop frequencies prevent a wrap pop.
  for(let j=0;j<2;j++) {
    const x=-half+((phase+j*.5)%1)*(half*2),y=j?0:top;
    for(let k=1;k<12;k++)p.blend(x-k,y,C[6],(1-k/12)*.8);
    sparkle(p,x,y,2,C[6],C[4],.2);
  }
  p.fade=previousFade;
}
