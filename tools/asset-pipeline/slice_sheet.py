"""将等网格动作图集切成同尺度、脚底对齐的透明候选帧。"""
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);p.add_argument('--cols',type=int,default=6);p.add_argument('--rows',type=int,default=2);p.add_argument('--size',type=int,default=384);p.add_argument('--fps',type=int,default=10);p.add_argument('--name',default='move');p.add_argument('--preserve-y',action='store_true',help='保留跳跃的纵向位移');a=p.parse_args()
im=Image.open(a.source).convert('RGBA');a.output.mkdir(parents=True,exist_ok=True)
if im.getchannel('A').getextrema()[0]>0:raise SystemExit('原图没有透明背景，停止切帧')
frames=[];bounds=[]
for row in range(a.rows):
 for col in range(a.cols):
  frame=im.crop((round(col*im.width/a.cols),round(row*im.height/a.rows),round((col+1)*im.width/a.cols),round((row+1)*im.height/a.rows)))
  alpha=np.array(frame.getchannel('A'));n,labels,stats,_=cv2.connectedComponentsWithStats((alpha>32).astype('uint8'),8)
  if n<2:raise SystemExit(f'空白格：{row},{col}')
  largest=stats[1:,cv2.CC_STAT_AREA].max();keep=np.zeros(alpha.shape,dtype=bool)
  for j in range(1,n):
   if stats[j,cv2.CC_STAT_AREA]>=max(8,largest*.015):keep|=labels==j
  alpha[~keep]=0;frame.putalpha(Image.fromarray(alpha));bbox=frame.getbbox()
  if bbox is None:raise SystemExit('无有效主体')
  frames.append(frame.crop(bbox));bounds.append(bbox)
scale=min(a.size*.78/max(f.width for f in frames),a.size*.84/max(f.height for f in frames))
output=[]
bottom=max(b[3] for b in bounds)
preview_name=a.output.name.removesuffix("-frames")+"-"+a.name
for i,f in enumerate(frames):
 f=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.NEAREST)
 dst=Image.new('RGBA',(a.size,a.size));dst.alpha_composite(f,((a.size-f.width)//2,round(a.size*.94)-f.height-round((bottom-bounds[i][3])*scale) if a.preserve_y else round(a.size*.94)-f.height));dst.save(a.output/f'{a.name}_{i:02}.png');output.append(dst)
strip=Image.new('RGBA',(a.size*a.cols,a.size*a.rows))
for i,f in enumerate(output):strip.alpha_composite(f,((i%a.cols)*a.size,(i//a.cols)*a.size))
strip.save(a.output.parent/f'{preview_name}-strip.png')
# 仅预览 GIF 使用深靛背景，PNG 始终保留原生透明通道。
gif=[]
for f in output:
 bg=Image.new('RGB',f.size,'#1a1c2c');bg.paste(f,mask=f.getchannel('A'));gif.append(bg)
gif[0].save(a.output.parent/f'{preview_name}-preview.gif',save_all=True,append_images=gif[1:],duration=round(1000/a.fps),loop=0)
print(f'{len(output)} 帧，统一缩放 {scale:.3f}，透明 PNG + strip + GIF')
