'use strict';
const STATE={activeTab:'color',activeScheme:'complementary',activeGrid:'perspective',pickerTarget:'base',isCameraOn:false,isGyroOn:false,isFrozen:false,baseColor:{r:201,g:64,b:64},mixA:{r:201,g:64,b:64},mixB:{r:64,g:128,b:201},wheelColor:null,savedPalettes:[]};
const $=id=>document.getElementById(id);
const $$=sel=>document.querySelectorAll(sel);
function switchTab(tab){STATE.activeTab=tab;$$('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab));$$('.tab-btn,.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));}
function showToast(msg,duration=1800){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),duration);}
function openPicker(target){STATE.pickerTarget=target;const labels={base:'Set Base Color',mixA:'Set Color A',mixB:'Set Color B'};$('picker-title').textContent=labels[target]||'Pick a Color';$('color-picker-popup').classList.add('open');}
function closePicker(){$('color-picker-popup').classList.remove('open');}
function setStatus(mode){const dot=$('status-dot');const ind=$('mode-indicator');const modes={offline:{text:'STUDIO MODE - OFFLINE',cls:[]},live:{text:'AR LENS + GYRO ACTIVE',cls:['live']},frozen:{text:'GRID LOCKED - SKETCH MODE',cls:['frozen']}};const m=modes[mode]||modes.offline;ind.textContent=m.text;dot.className='status-dot '+m.cls.join(' ');}
function wireEvents(){
$$('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
$$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
$('ar-btn').addEventListener('click',()=>showToast('AR loads in Phase 6'));
$('save-btn').addEventListener('click',()=>showToast('Save loads in Phase 3'));
$('edit-base-btn').addEventListener('click',()=>openPicker('base'));
$('base-swatch').addEventListener('click',()=>openPicker('base'));
$('picker-close-btn').addEventListener('click',closePicker);
$('native-picker').addEventListener('input',e=>{$('picker-hex-display').textContent=e.target.value.toUpperCase();showToast(e.target.value.toUpperCase());});
$('mix-a-swatch').addEventListener('click',()=>openPicker('mixA'));
$('mix-b-swatch').addEventListener('click',()=>openPicker('mixB'));
$('set-base-wheel-btn').addEventListener('click',()=>showToast('Wheel loads in Phase 5'));
$('set-base-mix-btn').addEventListener('click',()=>showToast('Mixer loads in Phase 4'));
$('ar-toggle-btn').addEventListener('click',()=>showToast('AR loads in Phase 6'));
$('freeze-btn').addEventListener('click',()=>showToast('AR loads in Phase 6'));
$$('.grid-tool-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.grid-tool-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');STATE.activeGrid=btn.dataset.grid;showToast(btn.dataset.grid+' grid selected');}));
$('grid-opacity').addEventListener('input',e=>{$('opac-val').textContent=e.target.value+'%';});
$('grid-scale').addEventListener('input',e=>{$('scale-val').textContent=(e.target.value/10).toFixed(1)+'x';});
}
document.addEventListener('DOMContentLoaded',()=>{wireEvents();setStatus('offline');showToast('PRISM-GAUGE initialized',2200);});