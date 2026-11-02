/** 人物外观与已确认专精方向；当前不附加伤害/抽卡加成。 */
export const HEROES = [
    { id: 'taoist', name: '符箓道士', weapon: '镇妖符箓', affinity: '五行均衡', color: '#E7B766', portrait: 'hero_home_taoist', battle: 'player_taoist', prefix: 'anim/player_taoist' },
    { id: 'sword', name: '镇邪剑客', weapon: '桃木剑', affinity: '主金 · 副土', color: '#F4D896', portrait: 'hero_home_sword', battle: 'hero_sword', prefix: 'anim/hero_sword' },
    { id: 'medium', name: '引魂巫女', weapon: '引魂铃', affinity: '主水 · 副木', color: '#74D6D7', portrait: 'hero_home_medium', battle: 'hero_medium', prefix: 'anim/hero_medium' },
    { id: 'flame', name: '赤焰道人', weapon: '朱砂葫芦', affinity: '主火 · 副土', color: '#F59453', portrait: 'hero_home_flame', battle: 'hero_flame', prefix: 'anim/hero_flame' },
] as const;
export type HeroId = typeof HEROES[number]['id'];
export const HERO_SELECTION_KEY = 'fuzhen.hero';
export function heroId(value: unknown): HeroId { return HEROES.some(h => h.id === value) ? value as HeroId : 'taoist'; }
export function heroDef(id: HeroId) { return HEROES.find(h => h.id === id) ?? HEROES[0]; }
