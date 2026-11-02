"""统一动作图集切分，配置以 action:count 顺序对应网格。"""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);p.add_argument('--cols',type=int,default=6);p.add_argument('--rows',type=int,default=6);p.add_argument('--size',type=int,default=256);p.add_argument('--actions',default='idle:6,move:12,attack:10,death:6,hurt:1');a=p.parse_args()
image=Image.open(a.source).convert('RGBA');assert image.getchannel('A').getextrema()[0]==0,'缺少透明通道'
actions=[(n,int(c)) for n,c in (x.split(':') for x in a.actions.split(','))];count=sum(c for _,c in actions);assert count<=a.cols*a.rows
cells=[];boxes=[]
cell_actions=[name for name,n in actions for _ in range(n)]
for i in range(count):
 x=i%a.cols;y=i//a.cols
 cell=image.crop((round(x*image.width/a.cols),round(y*image.height/a.rows),round((x+1)*image.width/a.cols),round((y+1)*image.height/a.rows)))
 box=cell.getbbox()
 if box is None and cell_actions[i]!='death':raise ValueError(f'第{i+1}格为空，非死亡消散尾帧')
 cells.append(cell);boxes.append(box)
# 一套动作使用同一缩放比例；死亡缩小不能被逐帧放大。
nonempty=[b for b in boxes if b]
left=min(b[0] for b in nonempty);right=max(b[2] for b in nonempty);top=min(b[1] for b in nonempty);bottom=max(b[3] for b in nonempty)
scale=min(a.size*.86/(right-left),a.size*.84/(bottom-top))
a.output.mkdir(parents=True,exist_ok=True);offset=0
for name,n in actions:
 frames=[]
 for i in range(n):
  cell=cells[offset+i];crop=cell.crop((left,top,right,bottom)).resize((round((right-left)*scale),round((bottom-top)*scale)),Image.Resampling.NEAREST)
  frame=Image.new('RGBA',(a.size,a.size));frame.alpha_composite(crop,((a.size-crop.width)//2,round(a.size*.94)-crop.height));frame.save(a.output/f'{name}_{i:02}.png');frames.append(frame)
 preview=[]
 for frame in frames:
  bg=Image.new('RGB',frame.size,'#1a1c2c');bg.paste(frame,mask=frame.getchannel('A'));preview.append(bg)
 preview[0].save(a.output.parent/f'{a.output.name}-{name}.gif',save_all=True,append_images=preview[1:],duration=100,loop=0)
 offset+=n
print(json.dumps({'frames':count,'actions':dict(actions),'scale':round(scale,3)}))
