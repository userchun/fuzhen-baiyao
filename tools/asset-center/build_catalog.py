"""扫描当前运行素材；新增资源后重跑以更新素材中心。"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
TEX = ROOT/'assets/resources/textures'
NAMES = {'enemy_paperman':'纸扎童子','enemy_jiangshi':'行尸','enemy_foxfire':'鬼火','enemy_shuigui':'落水鬼','enemy_tongqian':'铜钱鼠','enemy_lantern':'引魂灯笼','boss_heishan':'荒坟老妖','ui_ref_background':'首页 · 长屏背景','ui_ref_coin':'铜钱资源栏','ui_ref_paper':'符纸资源栏','ui_ref_gear':'设置按钮','ui_ref_upgrade':'养成入口','ui_ref_talisman':'符咒入口','ui_ref_record':'记录入口','ui_ref_level':'关卡面板','ui_ref_left':'上一关箭头','ui_ref_right':'下一关箭头','ui_ref_fight':'出战按钮','ui_home_bg':'加载页 · 首页背景','ui_home_hero':'首页符师立绘','bg_level1_village':'第一关 · 荒村背景','player_actions':'符师动作原图'}
FPS={'enemy_paperman':10,'enemy_jiangshi':12,'enemy_foxfire':14,'enemy_shuigui':8,'enemy_tongqian':10}
items=[]
def file_info(p):
    with Image.open(p) as im:
        return {'src':'/'+p.relative_to(ROOT).as_posix(),'width':im.width,'height':im.height,'alpha':im.mode=='RGBA' and im.getchannel('A').getextrema()[0]<255}
for p in sorted(TEX.glob('*.png')):
    k=p.stem
    if k.startswith(('enemy_','boss_')):cat='怪物'
    elif k.startswith('bg_') or k.endswith('background') or k=='ui_home_bg':cat='背景'
    elif k in ('player_actions','ui_home_hero'):cat='角色'
    else:cat='界面'
    clips=[]
    ad=TEX/'anim'/k
    if ad.exists():
        groups={}
        for frame in sorted(ad.glob('*.png')):
            action=frame.stem.rsplit('_',1)[0];groups.setdefault(action,[]).append(file_info(frame))
        for action,frames in groups.items():clips.append({'name':{'move':'移动','idle':'待机','attack':'攻击','death':'死亡','hit':'受击','hurt':'受击','appear':'出场','skill1':'召唤行尸','skill2':'蓄力砸地'}.get(action,action),'fps':len(frames)/1.2 if action=='attack' else 8 if action=='hurt' else 12 if action in ('death','appear','skill1') else len(frames)/1.5 if action=='skill2' else FPS.get(k,10),'frames':frames})
    if k=='player_actions':
        feet=[[(206,343),(206,343),(194,344),(194,344)],[(203,346),(204,345),(195,345),(194,345)],[(204,334),(201,334),(191,334),(194,339)]]
        for row,(name,fps) in enumerate([('待机',4),('施法',12),('受击',12)]):
            frames=[]
            for col in range(4):
                f=file_info(p);f['crop']=[col*362+feet[row][col][0]-200,row*362+feet[row][col][1]-343,362,362];frames.append(f)
            clips.append({'name':name,'fps':fps,'frames':frames})
    history=False
    items.append({'id':k,'name':NAMES.get(k,k),'category':cat,'status':'历史版本' if history else '已接入 · 待美术验收','kind':'sequence' if clips else 'static','clips':clips,**file_info(p)})
# 已生成、尚未接入的审图资源单独列出，避免与运行素材混淆。
for p in sorted((ROOT/'docs/art/deliver').rglob('*.png')):
    if 'complete' in p.parts or p.name.startswith('preview_') or any(part.endswith('-frames') for part in p.parts): continue
    items.append({'id':'candidate-'+p.stem,'name':('荒村七怪 · 新阵容造型总览' if p.stem=='haunted-village-roster' else p.stem),'category':'候选','status':'审图候选 / 历史样板 · 非当前运行资源','kind':'static','clips':[],**file_info(p)})
# 再生成动画以候选目录保存；审图不覆盖运行帧。
for folder in sorted((ROOT/'docs/art/deliver/level1').glob('*-frames')):
    if folder.name in ('paperman-frames','jiangshi-frames'): continue  # 旧阵容已退役
    frames=[file_info(p) for p in sorted(folder.glob('move_*.png'))]
    if not frames: continue
    name={'paperman':'槐树精','jiangshi':'泥尸','paperchild':'纸扎童子','walkingcorpse':'行尸','ghostflame':'鬼火'}.get(folder.name.removesuffix('-frames'),folder.stem)
    items.append({'id':folder.name,'name':name+' · 新版移动候选','category':'候选','status':('已接入游戏 · 移动动画待实战确认' if folder.name in ('paperchild-frames','walkingcorpse-frames','ghostflame-frames') else '旧阵容动画候选 · 造型重设后已退役，未接入游戏'),'kind':'sequence','clips':[{'name':'移动','fps':14 if folder.name.startswith('ghostflame') else 12 if folder.name.startswith(('jiangshi','walkingcorpse')) else 10,'frames':frames}],**frames[0]})
for name,title in [('2026-11-01-barrier-pixel-gold.gif','金系结界 · 像素受击与破碎')]:
    p=ROOT/'docs/evidence'/name
    if p.exists():items.append({'id':p.stem,'name':title,'category':'特效','status':'录制预览 · 非实时引擎','kind':'gif','clips':[],**file_info(p)})
for k,n in [('gold','金 · 金光符 · 光柱'),('vine','木 · 青藤符 · 藤网'),('ice','水 · 寒冰符 · 冰锥'),('meteor','火 · 烈焰符 · 火流星'),('stone','土 · 镇山符 · 石柱'),('thunder','雷 · 天雷符 · 连锁落雷'),('soul','怪 · 引魂灯笼 · 加速光环')]:
    items.append({'id':'fx-'+k,'name':n,'category':'特效','status':'PixelFX 改制 · 1–5 级可调 · 尚未接入 Cocos','kind':'embed','src':f'/tools/asset-center/fx-lab.html?fx={k}&embed=1','width':128,'height':192,'clips':[]})
items.append({'id':'fx-all','name':'符咒特效总览 · 6 符 × 1–5 级','category':'特效','status':'全部符咒、全部等级同屏同步播放','kind':'embed','src':'/tools/asset-center/fx-all.html','width':720,'height':900,'clips':[]})
items.append({'id':'fx-levels','name':'符咒特效 · 1–5 级同屏','category':'特效','status':'同一特效五个等级并排同步播放','kind':'embed','src':'/tools/asset-center/fx-lab.html?levels=1','width':720,'height':620,'clips':[]})
items.append({'id':'fx-lab','name':'特效调参台 · 参考对照','category':'特效','status':'全部符咒特效与 PixelFX 原配方对照','kind':'embed','src':'/tools/asset-center/fx-lab.html','width':720,'height':620,'clips':[]})
# 历史结界预览已下线
# items.append({'id':'barrier-live','name':'五行结界 · 交互预览','category':'特效','status':'历史独立预览 · 非当前 Cocos 运行版','kind':'embed','src':'/docs/evidence/2026-11-01-barrier-animation-preview.html','width':720,'height':200,'clips':[]})
for k,name in [('lantern','精英 · 灯笼鬼'),('heishan','Boss · 荒坟老妖')]:
    if (TEX/('enemy_lantern.png' if k=='lantern' else 'boss_heishan.png')).exists(): continue
    items.append({'id':k,'name':name,'category':'待制作','status':'当前 textures 中缺少资源','kind':'missing','width':0,'height':0,'clips':[]})
(ROOT/'tools/asset-center/catalog.json').write_text(json.dumps({'items':items},ensure_ascii=False,indent=2)+'\n')
print(f'素材中心：{len(items)} 项，{sum(bool(x["clips"]) for x in items)} 项序列动画')
