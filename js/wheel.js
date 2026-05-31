function drawColorWheel(){
  var canvas=document.getElementById('color-wheel-canvas');
  if(!canvas)return;
  var ctx=canvas.getContext('2d');
  var size=canvas.width;
  var cx=size/2,cy=size/2,r=size/2-4;
  for(var angle=0;angle<360;angle+=0.5){
    var startAngle=(angle-0.25)*Math.PI/180;
    var endAngle=(angle+0.25)*Math.PI/180;
    var grad=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    grad.addColorStop(0,'white');
    grad.addColorStop(0.5,'hsl('+angle+',100%,50%)');
    grad.addColorStop(1,'hsl('+angle+',100%,20%)');
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,endAngle);
    ctx.closePath();
    ctx.fillStyle=grad;
    ctx.fill();
  }
}

function pickWheelColor(e){
  var canvas=document.getElementById('color-wheel-canvas');
  var rect=canvas.getBoundingClientRect();
  var scaleX=canvas.width/rect.width;
  var scaleY=canvas.height/rect.height;
  var touch=e.touches?e.touches[0]:e;
  var x=(touch.clientX-rect.left)*scaleX;
  var y=(touch.clientY-rect.top)*scaleY;
  var ctx=canvas.getContext('2d');
  var px=ctx.getImageData(Math.round(x),Math.round(y),1,1).data;
  if(px[3]===0)return;
  var c={r:px[0],g:px[1],b:px[2]};
  STATE.wheelColor=c;
  var hex=rgb2hex(c.r,c.g,c.b);
  document.getElementById('wheel-swatch').style.background=hex;
  document.getElementById('wheel-hex').textContent=hex;
  document.getElementById('wheel-rgb').textContent='RGB '+c.r+', '+c.g+', '+c.b;
}

function initWheel(){
  var canvas=document.getElementById('color-wheel-canvas');
  if(!canvas)return;
  drawColorWheel();
  canvas.addEventListener('click',pickWheelColor);
  canvas.addEventListener('touchstart',function(e){
    e.preventDefault();
    pickWheelColor(e);
  },{passive:false});
}