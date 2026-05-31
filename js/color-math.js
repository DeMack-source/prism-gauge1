// ── sRGB <-> LINEAR LIGHT ─────────────────────
function toLinear(c){
  c=c/255;
  return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
}
function toSRGB(c){
  c=Math.max(0,Math.min(1,c));
  return Math.round((c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055)*255);
}

// ── KUBELKA-MUNK ENGINE ───────────────────────
function rgbToKS(r,g,b){
  const rl=toLinear(r),gl=toLinear(g),bl=toLinear(b);
  const ks=c=>{const v=Math.max(c,0.0001);return Math.pow(1-v,2)/(2*v);};
  return{k:ks(rl),kg:ks(gl),kb:ks(bl)};
}
function ksToRGB(kr,kg,kb){
  const ksToR=k=>{const v=1+k-Math.sqrt(k*k+2*k);return Math.max(0,Math.min(1,v));};
  return{
    r:toSRGB(ksToR(kr)),
    g:toSRGB(ksToR(kg)),
    b:toSRGB(ksToR(kb))
  };
}
function mixPigments(c1,c2,t){
  const a=rgbToKS(c1.r,c1.g,c1.b);
  const b=rgbToKS(c2.r,c2.g,c2.b);
  const kr=(1-t)*a.k +t*b.k;
  const kg=(1-t)*a.kg+t*b.kg;
  const kb=(1-t)*a.kb+t*b.kb;
  return ksToRGB(kr,kg,kb);
}

// ── HEX <-> RGB ───────────────────────────────
function rgb2hex(r,g,b){
  return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
}
function hex2rgb(hex){
  hex=hex.replace('#','');
  if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');
  return{r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)};
}

// ── RGB <-> HSL ───────────────────────────────
function rgb2hsl(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
  let h,s,l=(mx+mn)/2;
  if(mx===mn){h=s=0;}
  else{
    const d=mx-mn;
    s=l>0.5?d/(2-mx-mn):d/(mx+mn);
    switch(mx){
      case r:h=((g-b)/d+(g<b?6:0))/6;break;
      case g:h=((b-r)/d+2)/6;break;
      case b:h=((r-g)/d+4)/6;break;
    }
  }
  return{h:h*360,s:s*100,l:l*100};
}
function hsl2rgb(h,s,l){
  s/=100;l/=100;h/=360;
  if(s===0){const v=Math.round(l*255);return{r:v,g:v,b:v};}
  const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;
  const hue2rgb=(p,q,t)=>{
    if(t<0)t+=1;if(t>1)t-=1;
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  };
  return{
    r:Math.round(hue2rgb(p,q,h+1/3)*255),
    g:Math.round(hue2rgb(p,q,h)*255),
    b:Math.round(hue2rgb(p,q,h-1/3)*255)
  };
}

// ── COLOR TEMPERATURE ─────────────────────────
function colorTemp(r,g,b){
  return Math.max(0,Math.min(1,(r-b+255)/510));
}

// ── VALUE SCALE ───────────────────────────────
function getValueScale(rgb,steps=11){
  const hsl=rgb2hsl(rgb.r,rgb.g,rgb.b);
  return Array.from({length:steps},(_,i)=>{
    const l=5+(i*(90/(steps-1)));
    const s=Math.max(10,hsl.s-(i*3));
    return hsl2rgb(hsl.h,s,l);
  });
}

// ── HARMONY SCHEMES ───────────────────────────
const SCHEMES={
  complementary:{
    name:'Complementary',
    offsets:[0,180],
    desc:'Opposite colors create <strong>maximum contrast</strong>. Use one to dominate (80%) and the other as a small accent. Never mix them 50/50 on your palette — they neutralize each other into mud.'
  },
  analogous:{
    name:'Analogous',
    offsets:[0,30,60],
    desc:'Neighbors on the wheel create <strong>natural harmony</strong>. Think of a sunset. Great for backgrounds and skin tones. Add a complementary accent to stop it feeling flat.'
  },
  triadic:{
    name:'Triadic',
    offsets:[0,120,240],
    desc:'Three colors 120 degrees apart. <strong>Vibrant and balanced</strong>. Let one color dominate 60%, support with 30%, accent with 10%. This is the rule of three made visual.'
  },
  splitComp:{
    name:'Split-Comp',
    offsets:[0,150,210],
    desc:'The two colors adjacent to your complement. <strong>High contrast without harsh tension</strong>. More sophisticated than straight complementary. A favorite for portrait painters.'
  },
  tetradic:{
    name:'Tetradic',
    offsets:[0,90,180,270],
    desc:'Four colors, two complementary pairs. <strong>Rich and complex</strong> but hard to balance. Keep one color dominant. Works best with muted saturation across all four.'
  },
  monochromatic:{
    name:'Monochromatic',
    offsets:[0],
    desc:'One hue varied in <strong>value and saturation</strong>. This is where masters live. When you master value you have more control than any color scheme gives you.'
  }
};

function getHarmonyColors(baseRgb,schemeKey){
  const hsl=rgb2hsl(baseRgb.r,baseRgb.g,baseRgb.b);
  const scheme=SCHEMES[schemeKey];
  if(schemeKey==='monochromatic'){
    return[15,28,42,58,72,86].map(l=>hsl2rgb(hsl.h,Math.max(15,hsl.s-10),l));
  }
  return scheme.offsets.map(off=>{
    const h=(hsl.h+off)%360;
    return hsl2rgb(h,hsl.s,hsl.l);
  });
}