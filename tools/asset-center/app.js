const $=id=>document.getElementById(id);
let items=[],selected=null,category='全部',playing=true,frame=0,elapsed=0,last=0,clipIndex=0,thumbs=[];
const cache=new Map();
function load(src){if(!cache.has(src)){const image=new Image();image.src=src;cache.set(src,image);}return cache.get(src);}
function fitDraw(canvas,info,zoom='fit'){
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);if(!info?.src)return;
 const image=load(info.src);if(!image.complete||!image.naturalWidth)return;
 const crop=info.crop||[0,0,image.naturalWidth,image.naturalHeight],w=crop[2],h=crop[3];
 const scale=zoom==='fit'?Math.min((canvas.width-36)/w,(canvas.height-36)/h):Number(zoom)*devicePixelRatio;
 ctx.imageSmoothingEnabled=!$('pixel').checked;
 ctx.drawImage(image,...crop,(canvas.width-w*scale)/2,(canvas.height-h*scale)/2,w*scale,h*scale);
}
function currentClip(){return selected?.clips?.[clipIndex];}
function categoryCounts(){const names=['全部','角色','怪物','背景','界面','特效','候选','待制作'];$('categories').replaceChildren();for(const name of names){const n=items.filter(a=>name==='全部'||a.category===name).length;const b=document.createElement('button');b.innerHTML=`${name}<span>${n}</span>`;b.classList.toggle('active',name===category);b.onclick=()=>{category=name;categoryCounts();renderGrid();};$('categories').append(b);}}
function renderGrid(){
 const query=$('search').value.trim().toLowerCase();const only=$('animatedOnly').checked;
 const filtered=items.filter(a=>(category==='全部'||a.category===category)&&(!only||['sequence','gif','embed'].includes(a.kind))&&`${a.name} ${a.id} ${a.src||''}`.toLowerCase().includes(query));
 $('sectionTitle').textContent=category==='全部'?'全部素材':category;$('resultCount').textContent=`${filtered.length} 项`;$('empty').hidden=!!filtered.length;
 $('grid').replaceChildren();thumbs=[];
 for(const a of filtered){
  const b=document.createElement('button');b.className='card';b.classList.toggle('selected',a.id===selected?.id);b.setAttribute('aria-label',a.name);b.setAttribute('aria-pressed',String(a.id===selected?.id));
  const preview=document.createElement('div');preview.className='thumb';
  if(a.kind==='sequence'){const canvas=document.createElement('canvas');canvas.width=330;canvas.height=240;preview.append(canvas);thumbs.push({canvas,asset:a});for(const f of a.clips[0].frames)load(f.src);}
  else if(a.kind==='missing'||a.kind==='embed'){const symbol=document.createElement('span');symbol.className='ghost';symbol.textContent=a.kind==='missing'?'◇':'✦';preview.append(symbol);}
  else {const im=document.createElement('img');im.src=a.src;im.alt=a.name;im.loading='lazy';preview.append(im);}
  const badge=document.createElement('span');badge.className='badge';badge.textContent={sequence:'▶ 序列动画',static:'静态',gif:'▶ 动图录制',embed:'交互特效',missing:'待制作'}[a.kind];preview.append(badge);b.append(preview);
  const info=document.createElement('div');info.className='card-info';const title=document.createElement('strong');title.textContent=a.name;const meta=document.createElement('small');meta.textContent=`${a.category} · ${a.width?a.width+' × '+a.height:'暂无素材'}${a.clips.length?' · '+a.clips[0].frames.length+' 帧':''}`;info.append(title,meta);b.append(info);b.onclick=()=>select(a);$('grid').append(b);
 }
}
const gif=document.createElement('img');gif.alt='动图录制预览';gif.style='width:100%;height:100%;object-fit:contain';gif.hidden=true;$('stage').append(gif);
function select(a){
 selected=a;clipIndex=0;frame=0;elapsed=0;playing=true;
 $('detailName').textContent=a.name;$('detailCategory').textContent=a.category;$('kindLabel').textContent={sequence:'序列帧',static:'静态 PNG',gif:'GIF 录制',embed:'实时交互',missing:'资源缺失'}[a.kind];
 $('status').textContent=a.status;$('dimensions').textContent=a.width?`${a.width} × ${a.height} px`:'—';$('alpha').textContent=a.alpha?'有 · 可检查边缘':a.kind==='embed'||a.kind==='missing'?'—':'无';$('path').textContent=(a.src||'尚无文件').replace(/^\//,'');$('notice').textContent='';
 for(const id of ['original','download']){$(id).hidden=!a.src;$(id).href=a.src||'#';} $('copyPath').disabled=!a.src;
 $('original').textContent=a.kind==='embed'?'打开交互预览 ↗':'查看原图 ↗';$('download').hidden=!a.src||a.kind==='embed';
 $('preview').hidden=a.kind==='embed'||a.kind==='missing'||a.kind==='gif';$('effect').hidden=a.kind!=='embed';$('missing').hidden=a.kind!=='missing';gif.hidden=a.kind!=='gif';
 if(a.kind==='embed')$('effect').src=a.src;else $('effect').removeAttribute('src');
 if(a.kind==='gif')gif.src=a.src;else gif.removeAttribute('src');
 $('clip').replaceChildren();for(const [i,c]of a.clips.entries()){const o=document.createElement('option');o.value=i;o.textContent=c.name;$('clip').append(o);for(const f of c.frames)load(f.src);}
 if(!a.clips.length){const o=document.createElement('option');o.textContent={static:'静态素材',gif:'GIF 循环',embed:'内置控制',missing:'暂无动作'}[a.kind];$('clip').append(o);}
 for(const id of ['clip','play','step','speed','timeline'])$(id).disabled=a.kind!=='sequence';
 for(const id of ['zoom','background','pixel'])$(id).disabled=a.kind==='embed'||a.kind==='missing';
 updatePlayback();renderGrid();history.replaceState(null,'','#'+encodeURIComponent(a.id));
}
function updatePlayback(){const c=currentClip();$('play').textContent=playing?'暂停':'播放';$('timeline').max=c?c.frames.length-1:0;$('timeline').value=frame;$('frameInfo').textContent=c?`${String(frame+1).padStart(2,'0')} / ${c.frames.length} 帧 · ${Number(c.fps.toFixed(2))} FPS`:selected?.kind==='gif'?'GIF 原生循环':selected?.kind==='static'?'静态原图 · 无角色动画':'';$('playHint').textContent=c?'空格播放 / 暂停':selected?.kind==='embed'?'在预览中操作受击、速度与强度':selected?.kind==='gif'?'播放控制仅适用于序列帧':'';}
function animate(now){const dt=Math.min((now-last)/1000,.1);last=now;const c=currentClip();if(c&&playing){elapsed+=dt*Number($('speed').value);if(elapsed>=1/c.fps){frame=(frame+Math.floor(elapsed*c.fps))%c.frames.length;elapsed%=1/c.fps;updatePlayback();}}
 if(selected&&!$('preview').hidden)fitDraw($('preview'),c?c.frames[frame]:selected,$('zoom').value);
 if(!document.hidden)for(const {canvas,asset}of thumbs){const c=asset.clips[0];const i=playing?Math.floor(now/1000*c.fps)%c.frames.length:0;fitDraw(canvas,c.frames[i]);}
 requestAnimationFrame(animate);}
$('search').oninput=renderGrid;$('animatedOnly').onchange=renderGrid;
$('background').onchange=()=>{$('stage').className='stage '+$('background').value;};
$('play').onclick=()=>{playing=!playing;updatePlayback();};$('step').onclick=()=>{const c=currentClip();if(!c)return;playing=false;frame=(frame+1)%c.frames.length;elapsed=0;updatePlayback();};
$('clip').onchange=()=>{clipIndex=Number($('clip').value);frame=0;elapsed=0;updatePlayback();};$('timeline').oninput=()=>{playing=false;frame=Number($('timeline').value);elapsed=0;updatePlayback();};
$('copyPath').onclick=async()=>{try{await navigator.clipboard.writeText(selected.src.slice(1));$('notice').textContent='路径已复制';}catch{$('notice').textContent='请选中文件路径复制';}};
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','A'].includes(document.activeElement.tagName)&&currentClip()){e.preventDefault();playing=!playing;updatePlayback();}});
async function refresh(){try{const r=await fetch('./catalog.json?v='+Date.now());if(!r.ok)throw Error('HTTP '+r.status);items=(await r.json()).items;const animated=items.filter(a=>a.kind==='sequence').length;$('summary').innerHTML=`<div><b>${items.length}</b><small>素材条目</small></div><div><b>${animated}</b><small>序列动画</small></div>`;categoryCounts();const id=decodeURIComponent(location.hash.slice(1));select(items.find(a=>a.id===id)||items.find(a=>a.kind==='sequence')||items[0]);}catch(e){$('empty').hidden=false;$('empty').textContent='索引读取失败：'+e.message;}}
$('reload').onclick=refresh;
new ResizeObserver(entries=>{for(const e of entries){const c=$('preview');c.width=Math.round(e.contentRect.width*devicePixelRatio);c.height=Math.round(e.contentRect.height*devicePixelRatio);}}).observe($('stage'));
await refresh();requestAnimationFrame(animate);
