"""按图集实际透明分隔重建规则网格，去掉邻行碎片。"""
from pathlib import Path
import cv2,numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]/'generated-images/level1-complete-20261102'
for name,edges in [('heishan-base',[0,235,450,665,880,1065,1230]),('heishan-skills',[0,211,396,601,801,1001,1198,1355])]:
 im=Image.open(root/(name+'.png')).convert('RGBA');out=Image.new('RGBA',(6*256,(len(edges)-1)*256))
 for row in range(len(edges)-1):
  for col in range(6):
   cell=im.crop((round(col*im.width/6),edges[row],round((col+1)*im.width/6),edges[row+1]));alpha=np.array(cell.getchannel('A'))
   n,labels,stats,_=cv2.connectedComponentsWithStats((alpha>32).astype('uint8'),8)
   if n<2:continue
   biggest=1+np.argmax(stats[1:,cv2.CC_STAT_AREA]);alpha[labels!=biggest]=0;cell.putalpha(Image.fromarray(alpha));box=cell.getbbox()
   if not box:continue
   cell=cell.crop(box)
   # 同一尺寸保留动作拉伸；待机/移动统一完整身体高度。
   factor=min(210/cell.width,210/cell.height) if name=='heishan-base' and row*6+col>=12 else min(210/(im.width/6),210/max(np.diff(edges)))
   cell=cell.resize((round(cell.width*factor),round(cell.height*factor)),Image.Resampling.NEAREST)
   out.alpha_composite(cell,(col*256+(256-cell.width)//2,row*256+238-cell.height))
 out.save(root/(name+'-grid.png'))
