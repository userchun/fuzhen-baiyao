/** 五行结界的确定性像素图形。Cocos 与素材预览共用，不依赖图片或浏览器。 */
export type BarrierElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth';
export const BARRIER_STYLES: Record<BarrierElement, { name: string; color: string; light: string }> = {
    metal: { name: '金', color: '#E9BD59', light: '#FFF0BB' },
    wood: { name: '木', color: '#63B788', light: '#C4EBA8' },
    water: { name: '水', color: '#64B9DE', light: '#CFEEFA' },
    fire: { name: '火', color: '#E7764D', light: '#FFD69A' },
    earth: { name: '土', color: '#BCA16B', light: '#EBD3A2' },
};
export interface BarrierShape { color: string; alpha: number; rect?: number[]; path?: number[]; stroke?: number; }
export interface BarrierState {
    element: BarrierElement; time: number; health: number; level: number;
    hits: { x: number; age: number }[]; breakTime: number;
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pixel = (n: number) => Math.round(n / 2) * 2;

export function barrierArt(s: BarrierState, width = 720): BarrierShape[] {
    const shapes: BarrierShape[] = [], style = BARRIER_STYLES[s.element];
    const half = width / 2, t = Math.floor(s.time * 20) / 20;
    const rect = (x: number, y: number, w: number, h: number, color: string, alpha: number) =>
        shapes.push({ rect: [pixel(x), pixel(y), w, h], color, alpha: clamp(Math.round(alpha), 0, 255) });
    const path = (points: number[], color: string, alpha: number, stroke = 0) =>
        shapes.push({ path: points.map(pixel), color, alpha: clamp(Math.round(alpha), 0, 255), stroke });
    if (s.health <= 0) {
        const k = clamp(s.breakTime / 0.7, 0, 1);
        if (k === 1) return shapes;
        for (let i = 0; i < 24; i++) {
            const x = -half + (i + 0.5) * width / 24;
            rect(x + Math.sin(i * 7) * k * 42, 40 + Math.cos(i * 3) * 22 + k * 65 - k*k*130,
                4 + i%3*2, 6 + i%4*2, i%2 ? style.color : style.light, 180*(1-k));
        }
        return shapes;
    }
    const weak = s.health < 0.3 ? 0.48 : s.health < 0.6 ? 0.74 : 1;
    const strength = weak * (s.health < 0.3 ? 0.86 + 0.14*Math.sin(t*12) : 1);
    const alpha = (n: number) => n * strength;
    const crest = (x: number) => pixel(70 + 36 * (1 - (x/half)**2));
    // 所有元素共用接触线和低矮轮廓；内部薄幕让怪物与地面保持可读。
    const outline: number[] = [-half, 0];
    for (let x = -half; x <= half; x += 24) outline.push(x, crest(x));
    outline.push(half, crest(half), half, 0, -half, 0);
    path(outline, style.color, alpha(42 + Math.min(s.level,5)*2));
    const edge: number[] = [];
    for (let x = -half; x <= half; x += 12) edge.push(x, crest(x));
    edge.push(half, crest(half));
    // 由宽到窄的叠色光晕和贴地辉光，形成有厚度的能量幕。
    for (const [size, opacity] of [[20, 12], [12, 22], [6, 55], [3, 210]])
        path(edge, style.color, alpha(opacity), size);
    path(edge, style.light, alpha(230), 2);
    for(let band=0;band<7;band++) {
        const strip:number[]=[],lower:number[]=[];
        for(let x=-half;x<=half;x+=12) {
            const top=crest(x)*(band+1)/7, bottom=crest(x)*band/7;
            strip.push(x,top);lower.unshift(bottom);lower.unshift(x);
        }
        path([...strip,...lower],style.color,alpha(band===6?48:7+band*2));
    }
    for(let i=0;i<4;i++)rect(-half,-6+i*3,width,3,style.color,alpha(12+i*16));
    const gleam=(t*90)%width-half;
    const gleamPath:number[]=[];
    for(let x=gleam;x<=Math.min(half,gleam+60);x+=6)gleamPath.push(x,crest(x));
    if(gleamPath.length>=4)path(gleamPath,style.light,alpha(235),3);
    rect(-half, 0, width, 3, style.light, alpha(130));
    rect(-half, -4, width, 2, style.color, alpha(45));
    if (s.element === 'metal') {
        // 薄金箔护片，亮暗交替流过；不使用箭头或一排线框符号。
        for (let x = -half+38, i = 0; x < half-36; x += 82, i++) {
            const shine=(1+Math.sin(t*2.8-i*.8))/2;
            const plate=[x-32,12,x-35,48,x-15,crest(x)-9,x+25,crest(x)-12,x+34,30,x+24,12,x-32,12];
            path(plate,style.color,alpha(35+shine*48));
            path([x-32,15,x-35,48,x-15,crest(x)-9,x+25,crest(x)-12],style.color,alpha(110+shine*85),2);
            path([x-28,20,x-30,45,x-12,crest(x)-14],style.light,alpha(25+shine*85),2);
            rect(x+12,24,4,8,style.light,alpha(shine*150));
        }
        for(let i=0;i<6;i++) {
            const x=(t*75+i*width/6)%width-half;
            rect(x,crest(x)+2,10,2,style.light,alpha(170));
        }
    } else if (s.element === 'wood') {
        // 深浅交织的藤脉与实心叶片，叶片随气流翻动。
        for (let j = 0; j < 3; j++) {
            const vine: number[] = [];
            for (let x=-half;x<=half;x+=6)vine.push(x,20+j*16+Math.sin(x/68-t*1.5+j*2)*9);
            path(vine,j===1?style.light:style.color,alpha(j===1?130:105),j===1?3:5);
        }
        for(let i=0;i<15;i++) {
            const x=-half+20+i*(width-40)/14, y=28+(i%2)*18+Math.sin(x/68-t*1.5)*8;
            const sway=Math.sin(t*2+i)*4, flip=i%2?1:-1;
            path([x,y,x+flip*7,y+14+sway,x+flip*23,y+17+sway,x+flip*17,y+3,x,y],
                i%3?style.color:style.light,alpha(120+i%3*30));
            path([x,y,x+flip*16,y+11+sway],style.light,alpha(100),2);
        }
    } else if (s.element === 'water') {
        // 以流动色带形成水体，而不是几条正弦曲线。
        for(let j=0;j<4;j++) {
            const wave:number[]=[],bottom:number[]=[];
            for(let x=-half;x<=half;x+=6) {
                const y=12+j*16+Math.sin(x/54-t*2+j*1.4)*(3+j);
                wave.push(x,y);bottom.unshift(x,y-5);
            }
            path([...wave,...bottom],j===3?style.light:style.color,alpha(65+j*20));
        }
        for(let i=0;i<15;i++) {
            const phase=(t*.32+i*.113)%1,x=-half+16+i*(width-32)/14;
            rect(x,10+phase*51,2,8,style.light,alpha(Math.sin(phase*Math.PI)*90));
        }
        const foam:number[]=[];
        for(let x=-half;x<=half;x+=6)foam.push(x,crest(x)-3+Math.sin(x/33-t*2)*2);
        path(foam,style.light,alpha(130),3);
    } else if (s.element === 'fire') {
        // 每簇火焰有不同高度、弯折和内焰，避免形成尖刺栅栏。
        for(let x=-half+36,i=0;x<half-24;x+=66,i++) {
            const phase=t*3+i*2.37, h=38+18*(1+Math.sin(phase))*.5;
            const bend=Math.sin(phase*.7)*16, base=6;
            path([x-34,base,x-26,20,x-12,38,x-6+bend,h+25,x+5+bend,h+12,
                x+4,35,x+17,44,x+19,24,x+34,base,x-34,base],style.color,alpha(170));
            path([x-17,base,x-11,23,x+bend*.4,h+4,x+7,28,x+18,base,x-17,base],
                style.light,alpha(155+(1+Math.sin(phase))*25));
        }
        rect(-half,3,width,8,style.color,alpha(45));
    } else {
        // 浮动的通透岩片，边缘点亮；不是砖墙或重复的折线图。
        for(let i=0;i<8;i++) {
            const x=-half+42+i*(width-84)/7,y=15+Math.sin(t*.8+i*1.7)*3;
            const rock=[x-31,y,x-34,y+24,x-16,y+45,x+16,y+42,x+32,y+20,x+25,y,x-31,y];
            path(rock,style.color,alpha(45+(1+Math.sin(t*1.6-i)) * 24));
            path([x-31,y+2,x-34,y+24,x-16,y+45,x+16,y+42],style.color,alpha(140),3);
            path([x-28,y+24,x-13,y+39,x+12,y+37],style.light,alpha(85),2);
            rect(x-17,y+32,6,3,style.light,alpha(125));
        }
        const ridge:number[]=[-half,12];
        for(let x=-half+30,i=0;x<half;x+=60,i++)ridge.push(x,23+(i%3)*9,x+30,12);
        ridge.push(half,12);path(ridge,style.light,alpha(65),2);
    }
    // 少量元素碎屑，运动由时间决定，不逐帧随机，保持可复现与稳定。
    for (let i=0;i<9;i++) {
        const phase=(t*0.42+i*.137)%1, x=-half+24+i*(width-48)/8+Math.sin(phase*6+i)*4;
        const y=crest(x)+phase*18, a=alpha(Math.sin(phase*Math.PI)*140);
        rect(x,y,s.element==='water'?2:4,s.element==='earth'?4:2,style.light,a);
    }
    if(s.health < .6) {
        const count=s.health < .3 ? 6 : 3;
        for(let i=0;i<count;i++) {
            const x=-half+50+i*(width-100)/Math.max(1,count-1);
            path([x,crest(x)-3,x-7,47,x+4,30,x-5,12],style.light,alpha(145),2);
        }
    }
    // 命中点局部冲击波，所有五行共用；不靠整屏闪烁表现受击。
    for(const hit of s.hits) {
        const k=clamp(hit.age/.45,0,1), radius=12+k*90;
        const ripple:number[]=[];
        for(let i=0;i<=20;i++) {
            const angle=Math.PI*i/20;
            ripple.push(clamp(hit.x+Math.cos(angle)*radius,-half,half),Math.sin(angle)*radius*.55);
        }
        path(ripple,style.light,210*(1-k),3);
    }
    return shapes;
}
