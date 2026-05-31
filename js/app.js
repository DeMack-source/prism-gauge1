const STATE={
  activeTab:'color',
  activeScheme:'complementary',
  activeGrid:'perspective',
  pickerTarget:'base',
  isCameraOn:false,
  isGyroOn:false,
  isFrozen:false,
  baseColor:{r:201,g:64,b:64},
  mixA:{r:201,g:64,b:64},
  mixB:{r:64,g:128,b:201},
  wheelColor:null,
  savedPalettes:[]
};

const $=id=>document.getElementById(id);
const $$=sel=>document.querySelectorAll(sel);

function switchTab(tab){
  STATE.activeTab=tab;
  document.querySelectorAll('.tab-panel').forEach(function(p){
    p.classList.toggle('active',p.id==='tab-'+tab);
  });
  document.querySelectorAll('.tab-btn,.nav-btn').forEach(function(b){
    b.classList.toggle('active',b.dataset.tab===tab);
  });
  if(tab==='mixer')updateMix();
  if(tab==='wheel')initWheel();
}

function showToast(msg,duration){
  if(!duration)duration=1800;
  var t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer=setTimeout(function(){t.classList.remove('show');},duration);
}

function copyToClipboard(text){
  if(navigator.clipboard)navigator.clipboard.writeText(text).catch(function(){});
  showToast('Copied '+text);
}

function openPicker(target){
  STATE.pickerTarget=target;
  var labels={base:'Set Base Color',mixA:'Set Color A',mixB:'Set Color B'};
  document.getElementById('picker-title').textContent=labels[target]||'Pick a Color';
  var cur=target==='base'?STATE.baseColor:target==='mixA'?STATE.mixA:STATE.mixB;
  document.getElementById('native-picker').value=rgb2hex(cur.r,cur.g,cur.b);
  document.getElementById('picker-hex-display').textContent=rgb2hex(cur.r,cur.g,cur.b);
  document.getElementById('color-picker-popup').classList.add('open');
}

function closePicker(){
  document.getElementById('color-picker-popup').classList.remove('open');
}

function onPickerChange(hex){
  document.getElementById('picker-hex-display').textContent=hex.toUpperCase();
  var rgb=hex2rgb(hex);
  if(STATE.pickerTarget==='base'){STATE.baseColor=rgb;renderBaseColor();}
  else if(STATE.pickerTarget==='mixA'){STATE.mixA=rgb;document.getElementById('mix-a-swatch').style.background=hex;updateMix();}
  else if(STATE.pickerTarget==='mixB'){STATE.mixB=rgb;document.getElementById('mix-b-swatch').style.background=hex;updateMix();}
}

function setStatus(mode){
  var dot=document.getElementById('status-dot');
  var ind=document.getElementById('mode-indicator');
  var modes={
    offline:{text:'STUDIO MODE - OFFLINE',cls:[]},
    live:{text:'AR LENS + GYRO ACTIVE',cls:['live']},
    frozen:{text:'GRID LOCKED - SKETCH MODE',cls:['frozen']}
  };
  var m=modes[mode]||modes.offline;
  ind.textContent=m.text;
  dot.className='status-dot '+m.cls.join(' ');
}

function renderBaseColor(){
  var r=STATE.baseColor.r,g=STATE.baseColor.g,b=STATE.baseColor.b;
  var hex=rgb2hex(r,g,b);
  document.getElementById('base-swatch').style.background=hex;
  document.getElementById('base-hex').textContent=hex;
  document.getElementById('base-rgb').textContent='RGB '+r+', '+g+', '+b;
  var temp=colorTemp(r,g,b);
  var pct=Math.max(2,Math.min(98,temp*100));
  var indicator=document.getElementById('temp-indicator');
  var bar=document.getElementById('temp-indicator').parentElement;
  var barWidth=bar.offsetWidth;
  indicator.style.position='absolute';
  indicator.style.top='50%';
  indicator.style.left=pct+'%';
  indicator.style.transform='translate(-50%,-50%)';
  indicator.style.width='16px';
  indicator.style.height='16px';
  indicator.style.borderRadius='50%';
  indicator.style.background='white';
  indicator.style.border='3px solid #08080f';
  indicator.style.boxShadow='0 0 8px rgba(0,0,0,0.6)';
  indicator.style.pointerEvents='none';
  indicator.style.transition='left 0.4s ease';
  renderSchemeGrid();
  renderActivePalette();
  renderTheory();
}

function renderSchemeGrid(){
  var grid=document.getElementById('scheme-grid');
  grid.innerHTML='';
  Object.keys(SCHEMES).forEach(function(key){
    var scheme=SCHEMES[key];
    var colors=getHarmonyColors(STATE.baseColor,key);
    var div=document.createElement('div');
    div.className='scheme-card'+(key===STATE.activeScheme?' active':'');
    div.onclick=function(){STATE.activeScheme=key;renderSchemeGrid();renderActivePalette();renderTheory();};
    var swatches=colors.map(function(c){return '<div class="swatch" style="background:'+rgb2hex(c.r,c.g,c.b)+'"></div>';}).join('');
    div.innerHTML='<div class="scheme-name">'+scheme.name+'</div><div class="scheme-swatches">'+swatches+'</div>';
    grid.appendChild(div);
  });
}

function renderActivePalette(){
  var strip=document.getElementById('palette-strip');
  var colors=getHarmonyColors(STATE.baseColor,STATE.activeScheme);
  strip.innerHTML=colors.map(function(c){
    var hex=rgb2hex(c.r,c.g,c.b);
    return '<div class="palette-chip" style="background:'+hex+'" onclick="copyToClipboard('+JSON.stringify(hex)+')"></div>';
  }).join('');
}

function renderTheory(){
  var scheme=SCHEMES[STATE.activeScheme];
  document.getElementById('theory-text').innerHTML=scheme.desc;
}

function renderValueScale(rgb){
  var scale=document.getElementById('value-scale');
  if(!scale)return;
  var steps=getValueScale(rgb,11);
  scale.innerHTML=steps.map(function(c){
    var hex=rgb2hex(c.r,c.g,c.b);
    return '<div style="flex:1;background:'+hex+';cursor:pointer" onclick="copyToClipboard('+JSON.stringify(hex)+')" title="'+hex+'"></div>';
  }).join('');
}

function updateMix(){
  var t=parseInt(document.getElementById('mix-ratio').value)/100;
  var mix=mixPigments(STATE.mixA,STATE.mixB,t);
  var hex=rgb2hex(mix.r,mix.g,mix.b);
  document.getElementById('mix-result-swatch').style.background=hex;
  document.getElementById('mix-result-hex').textContent=hex;
  document.getElementById('mix-result-rgb').textContent='RGB '+mix.r+', '+mix.g+', '+mix.b;
  document.getElementById('ratio-a-label').textContent='A '+(100-Math.round(t*100))+'%';
  document.getElementById('ratio-b-label').textContent='B '+Math.round(t*100)+'%';
  renderValueScale(mix);
  STATE._mixResult=mix;
}

function savePalette(){
  var colors=getHarmonyColors(STATE.baseColor,STATE.activeScheme);
  var hexes=colors.map(function(c){return rgb2hex(c.r,c.g,c.b);});
  STATE.savedPalettes.unshift({scheme:SCHEMES[STATE.activeScheme].name,colors:hexes,ts:Date.now()});
  if(STATE.savedPalettes.length>10)STATE.savedPalettes.pop();
  try{localStorage.setItem('pg_palettes',JSON.stringify(STATE.savedPalettes));}catch(e){}
  renderSaved();
  showToast('Palette saved!');
}

function renderSaved(){
  var list=document.getElementById('saved-list');
  var card=document.getElementById('saved-palettes-card');
  if(!STATE.savedPalettes.length){card.style.display='none';return;}
  card.style.display='block';
  list.innerHTML=STATE.savedPalettes.map(function(p,i){
    var chips=p.colors.map(function(h){return '<div style="flex:1;border-radius:4px;background:'+h+';cursor:pointer" onclick="copyToClipboard('+JSON.stringify(h)+')"></div>';}).join('');
    return '<div style="display:flex;gap:6px;align-items:center"><div style="flex:1"><div style="font-family:var(--font-mono);font-size:0.58rem;color:var(--muted);margin-bottom:4px">'+p.scheme+'</div><div style="display:flex;gap:3px;height:24px">'+chips+'</div></div><button onclick="deletePalette('+i+')" style="font-size:0.8rem;color:var(--muted);padding:4px">x</button></div>';
  }).join('');
}

function deletePalette(i){
  STATE.savedPalettes.splice(i,1);
  try{localStorage.setItem('pg_palettes',JSON.stringify(STATE.savedPalettes));}catch(e){}
  renderSaved();
}

function wireEvents(){
  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click',function(){switchTab(btn.dataset.tab);});
  });
  document.querySelectorAll('.nav-btn').forEach(function(btn){
    btn.addEventListener('click',function(){switchTab(btn.dataset.tab);});
  });
  document.getElementById('ar-btn').addEventListener('click',function(){showToast('AR loads in Phase 6');});
  document.getElementById('save-btn').addEventListener('click',savePalette);
  document.getElementById('edit-base-btn').addEventListener('click',function(){openPicker('base');});
  document.getElementById('base-swatch').addEventListener('click',function(){openPicker('base');});
  document.getElementById('picker-close-btn').addEventListener('click',closePicker);
  document.getElementById('native-picker').addEventListener('input',function(e){onPickerChange(e.target.value);});
  document.getElementById('mix-a-swatch').addEventListener('click',function(){openPicker('mixA');});
  document.getElementById('mix-b-swatch').addEventListener('click',function(){openPicker('mixB');});
  document.getElementById('set-base-wheel-btn').addEventListener('click',function(){
    if(STATE.wheelColor){STATE.baseColor={r:STATE.wheelColor.r,g:STATE.wheelColor.g,b:STATE.wheelColor.b};renderBaseColor();showToast('Base color updated!');}
  });
  document.getElementById('set-base-mix-btn').addEventListener('click',function(){
    if(STATE._mixResult){STATE.baseColor={r:STATE._mixResult.r,g:STATE._mixResult.g,b:STATE._mixResult.b};renderBaseColor();showToast('Base set from mix!');}
  });
  document.getElementById('ar-toggle-btn').addEventListener('click',function(){showToast('AR loads in Phase 6');});
  document.getElementById('freeze-btn').addEventListener('click',function(){showToast('AR loads in Phase 6');});
  document.getElementById('mix-ratio').addEventListener('input',updateMix);
  document.querySelectorAll('.grid-tool-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      document.querySelectorAll('.grid-tool-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      STATE.activeGrid=btn.dataset.grid;
      showToast(btn.dataset.grid+' grid selected');
    });
  });
  document.getElementById('grid-opacity').addEventListener('input',function(e){
    document.getElementById('opac-val').textContent=e.target.value+'%';
  });
  document.getElementById('grid-scale').addEventListener('input',function(e){
    document.getElementById('scale-val').textContent=(e.target.value/10).toFixed(1)+'x';
  });
}

document.addEventListener('DOMContentLoaded',function(){
  try{STATE.savedPalettes=JSON.parse(localStorage.getItem('pg_palettes')||'[]');}catch(e){STATE.savedPalettes=[];}
  document.getElementById('mix-a-swatch').style.background=rgb2hex(STATE.mixA.r,STATE.mixA.g,STATE.mixA.b);
  document.getElementById('mix-b-swatch').style.background=rgb2hex(STATE.mixB.r,STATE.mixB.g,STATE.mixB.b);
  wireEvents();
  renderBaseColor();
  renderSaved();
  updateMix();
  setStatus('offline');
  showToast('PRISM-GAUGE initialized',2200);
});