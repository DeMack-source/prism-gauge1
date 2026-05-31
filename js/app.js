'use strict';

const STATE={activeTab:'color',activeScheme:'complementary',activeGrid:'perspective',pickerTarget:'base',isCameraOn:false,isGyroOn:false,isFrozen:false,baseColor:{r:201,g:64,b:64},mixA:{r:201,g:64,b:64},mixB:{r:64,g:128,b:201},wheelColor:null,savedPalettes:JSON.parse(localStorage.getItem('pg_palettes')||'[]')};

const $=id=>document.getElementById(id);
const $$=sel=>document.querySelectorAll(sel);

function switchTab(tab){
  STATE.activeTab=tab;
  $$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));
  $$('.tab-btn,.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  if(tab==='mixer')updateMix();
}

function showToast(msg,duration=1800){
  const t=$('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),duration);
}

function copyToClipboard(text){
  navigator.clipboard?.writeText(text).catch(()=>{});
  showToast('Copied '+text);
}

function openPicker(target){
  STATE.pickerTarget=target;
  const labels={base:'Set Base Color',mixA:'Set Color A',mixB:'Set Color B'};
  $('picker-title').textContent=labels[target]||'Pick a Color';
  const cur=target==='base'?STATE.baseColor:target==='mixA'?STATE.mixA:STATE.mixB;
  $('native-picker').value=rgb2hex(cur.r,cur.g,cur.b);
  $('picker-hex-display').textContent=rgb2hex(cur.r,cur.g,cur.b);
  $('color-picker-popup').classList.add('open');
}

function closePicker(){$('color-picker-popup').classList.remove('open');}

function onPickerChange(hex){
  $('picker-hex-display').textContent=hex.toUpperCase();
  const rgb=hex2rgb(hex);
  if(STATE.pickerTarget==='base'){STATE.baseColor=rgb;renderBaseColor();}
  else if(STATE.pickerTarget==='mixA'){STATE.mixA=rgb;$('mix-a-swatch').style.background=hex;updateMix();}
  else if(STATE.pickerTarget==='mixB'){STATE.mixB=rgb;$('mix-b-swatch').style.background=hex;updateMix();}
}

function setStatus(mode){
  const dot=$('status-dot');const ind=$('mode-indicator');
  const modes={offline:{text:'STUDIO MODE - OFFLINE',cls:[]},live:{text:'AR LENS + GYRO ACTIVE',cls:['live']},frozen:{text:'GRID LOCKED - SKETCH MODE',cls:['frozen']}};
  const m=modes[mode]||modes.offline;
  ind.textContent=m.text;dot.className='status-dot '+m.cls.join(' ');
}

function renderBaseColor(){
  const{r,g,b}=STATE.baseColor;
  const hex=rgb2hex(r,g,b);
  $('base-swatch').style.background=hex;
  $('base-hex').textContent=hex;
  $('base-rgb').textContent='RGB '+r+', '+g+', '+b;
  const temp=colorTemp(r,g,b);
  $('temp-indicator').style.left=(temp*100)+'%';
  renderSchemeGrid();
  renderActivePalette();
  renderTheory();
}

function renderSchemeGrid(){
  const grid=$('scheme-grid');
  grid.innerHTML='';
  Object.entries(SCHEMES).forEach(([key,scheme])=>{
    const colors=getHarmonyColors(STATE.baseColor,key);
    const div=document.createElement('div');
    div.className='scheme-card'+(key===STATE.activeScheme?' active':'');
    div.onclick=()=>{STATE.activeScheme=key;renderSchemeGrid();renderActivePalette();renderTheory();};
    div.innerHTML='<div class="scheme-name">'+scheme.name+'</div><div class="scheme-swatches">'+colors.map(c=>'<div class="swatch" style="background:'+rgb2hex(c.r,c.g,c.b)+'"></div>').join('')+'</div>';
    grid.appendChild(div);
  });
}

function renderActivePalette(){
  const strip=$('palette-strip');
  const colors=getHarmonyColors(STATE.baseColor,STATE.activeScheme);
  strip.innerHTML=colors.map(c=>{
    const hex=rgb2hex(c.r,c.g,c.b);
    return '<div class="palette-chip" style="background:'+hex+'" onclick="copyToClipboard(''+hex+'')"></div>';
  }).join('');
}

function renderTheory(){
  const scheme=SCHEMES[STATE.activeScheme];
  $('theory-text').innerHTML=scheme.desc;
}

function renderValueScale(rgb){
  const scale=$('value-scale');
  if(!scale)return;
  const steps=getValueScale(rgb,11);
  scale.innerHTML=steps.map(c=>{
    const hex=rgb2hex(c.r,c.g,c.b);
    return '<div style="flex:1;background:'+hex+';cursor:pointer" onclick="copyToClipboard(''+hex+'')" title="'+hex+'"></div>';
  }).join('');
}

function updateMix(){
  const t=parseInt($('mix-ratio').value)/100;
  const mix=mixPigments(STATE.mixA,STATE.mixB,t);
  const hex=rgb2hex(mix.r,mix.g,mix.b);
  $('mix-result-swatch').style.background=hex;
  $('mix-result-hex').textContent=hex;
  $('mix-result-rgb').textContent='RGB '+mix.r+', '+mix.g+', '+mix.b;
  $('ratio-a-label').textContent='A '+(100-Math.round(t*100))+'%';
  $('ratio-b-label').textContent='B '+Math.round(t*100)+'%';
  renderValueScale(mix);
  STATE._mixResult=mix;
}

function savePalette(){
  const colors=getHarmonyColors(STATE.baseColor,STATE.activeScheme);
  const hexes=colors.map(c=>rgb2hex(c.r,c.g,c.b));
  STATE.savedPalettes.unshift({scheme:SCHEMES[STATE.activeScheme].name,colors:hexes,ts:Date.now()});
  if(STATE.savedPalettes.length>10)STATE.savedPalettes.pop();
  localStorage.setItem('pg_palettes',JSON.stringify(STATE.savedPalettes));
  renderSaved();
  showToast('Palette saved!');
}

function renderSaved(){
  const list=$('saved-list');
  const card=$('saved-palettes-card');
  if(!STATE.savedPalettes.length){card.style.display='none';return;}
  card.style.display='block';
  list.innerHTML=STATE.savedPalettes.map((p,i)=>
    '<div style="display:flex;gap:6px;align-items:center">'+
    '<div style="flex:1"><div style="font-family:var(--font-mono);font-size:0.58rem;color:var(--muted);margin-bottom:4px">'+p.scheme+'</div>'+
    '<div style="display:flex;gap:3px;height:24px">'+p.colors.map(h=>'<div style="flex:1;border-radius:4px;background:'+h+';cursor:pointer" onclick="copyToClipboard(''+h+'')"></div>').join('')+'</div></div>'+
    '<button onclick="deletePalette('+i+')" style="font-size:0.8rem;color:var(--muted);padding:4px">x</button></div>'
  ).join('');
}

function deletePalette(i){
  STATE.savedPalettes.splice(i,1);
  localStorage.setItem('pg_palettes',JSON.stringify(STATE.savedPalettes));
  renderSaved();
}

function wireEvents(){
  $$('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
  $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
  $('ar-btn').addEventListener('click',()=>showToast('AR loads in Phase 6'));
  $('save-btn').addEventListener('click',savePalette);
  $('edit-base-btn').addEventListener('click',()=>openPicker('base'));
  $('base-swatch').addEventListener('click',()=>openPicker('base'));
  $('picker-close-btn').addEventListener('click',closePicker);
  $('native-picker').addEventListener('input',e=>onPickerChange(e.target.value));
  $('mix-a-swatch').addEventListener('click',()=>openPicker('mixA'));
  $('mix-b-swatch').addEventListener('click',()=>openPicker('mixB'));
  $('set-base-wheel-btn').addEventListener('click',()=>{if(STATE.wheelColor){STATE.baseColor={...STATE.wheelColor};renderBaseColor();showToast('Base color updated!');}});
  $('set-base-mix-btn').addEventListener('click',()=>{if(STATE._mixResult){STATE.baseColor={...STATE._mixResult};renderBaseColor();showToast('Base set from mix!');}});
  $('ar-toggle-btn').addEventListener('click',()=>showToast('AR loads in Phase 6'));
  $('freeze-btn').addEventListener('click',()=>showToast('AR loads in Phase 6'));
  $('mix-ratio').addEventListener('input',updateMix);
  $$('.grid-tool-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.grid-tool-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');STATE.activeGrid=btn.dataset.grid;showToast(btn.dataset.grid+' grid selected');}));
  $('grid-opacity').addEventListener('input',e=>{$('opac-val').textContent=e.target.value+'%';});
  $('grid-scale').addEventListener('input',e=>{$('scale-val').textContent=(e.target.value/10).toFixed(1)+'x';});
}

document.addEventListener('DOMContentLoaded',()=>{
  $('mix-a-swatch').style.background=rgb2hex(STATE.mixA.r,STATE.mixA.g,STATE.mixA.b);
  $('mix-b-swatch').style.background=rgb2hex(STATE.mixB.r,STATE.mixB.g,STATE.mixB.b);
  wireEvents();
  renderBaseColor();
  renderSaved();
  updateMix();
  setStatus('offline');
  showToast('PRISM-GAUGE initialized',2200);
});