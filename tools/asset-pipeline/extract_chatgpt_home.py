"""按已确认首页的像素轮廓切 UI；输出保留真实 alpha，坐标供 HomeUI 使用。"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import cv2
import numpy as np

root = Path(__file__).resolve().parents[2]
out = root/'generated-images/home-chatgpt-20261102/cuts'
out.mkdir(parents=True, exist_ok=True)
src = Image.open(out.parent/'source.png').convert('RGBA')
# bounds, local stepped silhouette; fixed text remains on illustrated buttons.
items = {
 'coin': ((197,32,452,106), [(18,0),(235,0),(235,7),(251,7),(251,64),(235,64),(235,72),(18,72),(18,62),(0,62),(0,13),(18,13)]),
 'paper': ((490,27,750,110), [(30,0),(80,0),(80,7),(240,7),(240,15),(258,15),(258,69),(240,69),(240,76),(35,76),(35,82),(10,82),(10,60),(0,60),(0,15),(30,15)]),
 'gear': ((811,28,905,116), [(15,0),(77,0),(77,8),(88,8),(88,20),(93,20),(93,68),(81,68),(81,82),(14,82),(14,74),(3,74),(3,11),(15,11)]),
 'upgrade': ((762,381,901,560), [(22,0),(115,0),(115,8),(130,8),(130,20),(138,20),(138,158),(125,158),(125,173),(13,173),(13,165),(0,165),(0,20),(10,20),(10,8),(22,8)]),
 'talisman': ((762,580,901,760), [(22,0),(115,0),(115,8),(130,8),(130,20),(138,20),(138,158),(125,158),(125,173),(13,173),(13,165),(0,165),(0,20),(10,20),(10,8),(22,8)]),
 'record': ((762,780,901,960), [(22,0),(115,0),(115,8),(130,8),(130,20),(138,20),(138,158),(125,158),(125,173),(13,173),(13,165),(0,165),(0,20),(10,20),(10,8),(22,8)]),
 'level': ((215,1278,721,1447), [(17,0),(485,0),(485,8),(500,8),(500,158),(485,158),(485,168),(17,168),(17,160),(0,160),(0,12),(17,12)]),
 'left': ((135,1310,219,1431), [(18,0),(83,0),(83,120),(18,120),(18,111),(0,111),(0,15),(18,15)]),
 'right': ((715,1310,801,1431), [(0,0),(64,0),(64,10),(85,10),(85,110),(65,110),(65,120),(0,120)]),
 'fight': ((227,1452,673,1603), [(30,0),(415,0),(415,9),(432,9),(432,22),(445,22),(445,129),(429,129),(429,142),(414,142),(414,150),(26,150),(26,140),(12,140),(12,128),(0,128),(0,25),(12,25),(12,12),(30,12)]),
}
for name,(bounds,points) in items.items():
    im=src.crop(bounds)
    alpha=Image.new('L',im.size); ImageDraw.Draw(alpha).polygon(points,fill=255)
    # Erase only dynamic numbers and level title / pagination using surrounding texture.
    regions={'coin':[(83,16,224,59)],'paper':[(104,19,236,66)],'level':[(100,18,421,68),(160,126,362,161)]}.get(name,[])
    if regions:
        rgb=np.array(im.convert('RGB')); mask=np.zeros(rgb.shape[:2],np.uint8)
        for x0,y0,x1,y1 in regions: mask[y0:y1,x0:x1]=255
        im=Image.fromarray(cv2.inpaint(rgb,mask,5,cv2.INPAINT_TELEA)).convert('RGBA')
    im.putalpha(alpha); im.save(out/f'ui_ref_{name}.png')
    im.save(root/f'assets/resources/textures/ui_ref_{name}.png')
# Sheet for inspecting transparent contour edges.
sheet=Image.new('RGB',(1100,850),'#707b87')
for i,name in enumerate(items):
    im=Image.open(out/f'ui_ref_{name}.png'); im=ImageOps.contain(im,(340,230))
    xy=(i%3*365+10,i//3*210+20); sheet.paste(im,xy,im)
sheet.save(out.parent/'alpha-preview.jpg')
(out.parent/'bounds.json').write_text(json.dumps({k:list(v[0]) for k,v in items.items()},indent=2))
