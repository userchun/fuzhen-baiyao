import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
import cv2
import numpy as np


parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
source = Image.open(args.source).convert('RGBA')


def extract(name, bounds, outline, clear=()):
    left, top, right, bottom = bounds
    crop = source.crop(bounds)
    painter = ImageDraw.Draw(crop)
    for box, color in clear:
        painter.rectangle(box, fill=color)
    alpha = Image.new('L', crop.size)
    ImageDraw.Draw(alpha).polygon([(x-left, y-top) for x, y in outline], fill=255)
    crop.putalpha(alpha)
    crop.save(args.output / (name + '.png'))
    return crop


entries = []
for name, top in [('upgrade', 600), ('talisman', 904), ('record', 1208)]:
    outline = [(1230,top+6),(1370,top+6),(1370,top+14),(1385,top+14),
               (1400,top+30),(1400,top+199),(1387,top+219),(1387,top+228),
               (1372,top+242),(1228,top+242),(1210,top+226),(1202,top+205),
               (1202,top+30),(1215,top+14),(1230,top+14)]
    entry = extract('ui_ref_'+name, (1194,top,1408,top+250), outline)
    pixels = np.array(entry.convert('RGB'))
    mask = np.zeros(pixels.shape[:2], dtype=np.uint8)
    region = pixels[175:243, 15:198]
    mask[175:243, 15:198] = ((region.min(axis=2) > 105) &
        ((region.max(axis=2).astype(int)-region.min(axis=2)) < 85)).astype('uint8')*255
    mask = cv2.dilate(mask, np.ones((3,3),np.uint8))
    cleaned = Image.fromarray(cv2.inpaint(pixels, mask, 4, cv2.INPAINT_TELEA)).convert('RGBA')
    cleaned.putalpha(entry.getchannel('A'))
    cleaned.save(args.output / ('ui_ref_'+name+'.png'))
    entries.append(cleaned)

fight = extract('ui_ref_fight', (360,2280,1050,2510),
                [(412,2286),(997,2286),(997,2301),(1020,2301),(1020,2321),
                 (1040,2321),(1040,2474),(1020,2474),(1020,2491),(394,2491),
                 (394,2478),(372,2478),(372,2323),(389,2323),(389,2306),(412,2306)])
level = extract('ui_ref_level', (335,2000,1080,2254),
                [(360,2008),(1056,2008),(1056,2022),(1070,2022),(1070,2232),
                 (1055,2232),(1055,2245),(352,2245),(352,2231),(341,2231),
                 (341,2027),(360,2027)],
                [((219,28,580,103),'#1b2543'),((240,188,570,236),'#18233b')])
coin = extract('ui_ref_coin', (76,55,460,166),
               [(101,65),(442,65),(442,77),(451,77),(451,141),(441,141),
                (441,153),(100,153),(100,145),(85,145),(85,80),(101,80)],
               [((128,26,347,85),'#090f1d')])
paper = coin.copy()
ImageDraw.Draw(paper).rectangle((10,12,108,99),fill='#090f1d')
scroll = source.crop((895,56,1000,164))
mask = Image.new('L',scroll.size)
ImageDraw.Draw(mask).polygon([(32,3),(91,4),(75,25),(71,58),(57,92),(7,96),
                              (24,66),(33,24)],fill=255)
scroll.putalpha(mask)
paper.alpha_composite(scroll,(0,1))
paper.save(args.output/'ui_ref_paper.png')
progress = extract('ui_ref_progress', (895,55,1392,166),
                   [(924,64),(1360,64),(1360,74),(1380,74),(1380,144),
                    (1360,144),(1360,154),(924,154),(924,144),(905,144),(905,77),(924,77)],
                   [((105,23,383,88),'#090f1d')])
for name, bounds, outline in [
    ('left',(212,2060,343,2208),[(245,2067),(327,2067),(337,2077),(337,2193),(229,2193),(219,2182),(219,2082)]),
    ('right',(1078,2060,1225,2208),[(1082,2067),(1198,2067),(1212,2082),(1212,2180),(1196,2193),(1082,2193)])]:
    extract('ui_ref_'+name,bounds,outline)

preview = Image.new('RGB',(1000,780),'#65717d')
for index, crop in enumerate(entries+[fight,level,coin,paper,progress]):
    thumb = ImageOps.contain(crop,(300,225))
    preview.paste(thumb,(index%3*330+15,index//3*260+15),thumb)
preview.save(args.output/'alpha-preview.jpg')

donor = args.output.parent/'background-clean.png'
if donor.exists():
    fill = Image.open(donor).convert('RGBA').resize(source.size)
    background = source.copy()
    mask = Image.new('L', source.size)
    painter = ImageDraw.Draw(mask)
    for bounds in [(70,40,1400,175),(1185,590,1415,855),(1185,895,1415,1160),
                   (1170,1190,1415,1475),(198,1994,1240,2265),(355,2274,1055,2520)]:
        painter.rectangle(bounds,fill=255)
    background.paste(fill,(0,0),mask)
    background.convert('RGB').save(args.output/'ui_ref_background.png')
