"""安装已审查的荒村动作，前三只保留先前确认的移动帧。"""
from pathlib import Path
import shutil,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
TEX=ROOT/'assets/resources/textures'
SRC=ROOT/'docs/art/deliver/level1/complete'
DATA={'paperman':('纸扎童子',10),'jiangshi':('行尸',12),'foxfire':('鬼火',14),'shuigui':('落水鬼',8),'tongqian':('铜钱鼠',10),'lantern':('引魂灯笼',10),'heishan':('荒坟老妖',10)}
p=ROOT/'docs/art/asset-manifest.json';manifest=json.loads(p.read_text());manifest['assets']=[a for a in manifest['assets'] if not a['id'].startswith('level1_full_')]
for id,(name,fps) in DATA.items():
 folder='boss_heishan' if id=='heishan' else 'enemy_'+id
 out=TEX/'anim'/folder;out.mkdir(parents=True,exist_ok=True)
 paths=sorted((SRC/id).glob('*.png'));assert paths,f'{id}未生成'
 for frame in paths:
  if id in ('paperman','jiangshi','foxfire') and frame.name.startswith('move_'):continue
  shutil.copy2(frame,out/frame.name)
 if id=='foxfire':
  for i,n in enumerate([0,2,4,6,8,10]):shutil.copy2(out/f'move_{n:02}.png',out/f'idle_{i:02}.png')
 static='idle_00.png' if id=='heishan' else 'move_00.png'
 shutil.copy2(out/static,TEX/f'{folder}.png')
 if id=='heishan':counts={'appear':12,'idle':12,'move':12,'skill1':12,'skill2':16,'death':12}
 else:counts={'idle':6,'move':12,'attack':10,'death':6,'hurt':1}
 for action,n in counts.items():
  files=sorted(out.glob(action+'_*.png'));assert len(files)==n,(id,action,len(files),n)
  for f in files:
   im=Image.open(f);assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
   if action!='death':assert im.getbbox(),(id,action,f.name)
 manifest['assets'].append({'id':'level1_full_'+id,'path':str(out.relative_to(ROOT))+'/','width':512 if id=='heishan' else 256,'height':512 if id=='heishan' else 256,'frames':sum(counts.values()),'actions':counts,'fps':fps,'alpha':True,'source':'ChatGPT Image，已确认荒村七怪为参考；切帧、动作顺序整理及必要姿势保持，前三只保留已确认移动帧','license':'AI 生成','status':'帧素材已接入；自动验证通过，完整实战与用户美术验收待完成'})
 print(name,counts)
p.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
