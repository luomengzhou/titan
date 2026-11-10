/* =====================================================================
   tw-gesture.js — 手势链接 GESTURE LINK
   打开摄像头，用 MediaPipe Hands（hand/ 目录，Google 官方包，Apache-2.0）
   识别 21 个手部关键点，把手势映射成泰坦的技能：

   · 哥斯拉系（及其他有技能的泰坦）  ✊ 握拳蓄力 → 🖐 蓄满后张开 = 释放
       -1.0 哥斯拉：握拳时背鳍从尾尖逐节点亮，蓄满张开放出热线
       没蓄满就张开 = 蓄力中断，背鳍熄灭
   · 基多拉  ☝️ 伸一根手指在空中画闪电 = 召唤雷暴
             🖐 手掌朝下平放 = 引力蓄力（周围建筑开始震颤）
             ⤴ 然后猛地向上一挥 = 引力虹吸，把建筑吸上天（致敬《哥斯拉-0.0》）
             ✊→🖐 = 引力光线
   · 金刚（以及没有技能的泰坦） ✊ 握拳朝镜头推 = 出拳 / 冲撞，镜头被打裂
   · 所有泰坦  👍 竖大拇指 = 咆哮

   依赖：TW.g3（index.html 的 3D 接口：hold / cancel / hook …）、TW.roar（可选）
   视频帧只在本地浏览器里处理，不上传任何地方。
   ===================================================================== */
(function(){
"use strict";
var TW=window.TW;if(!TW)return;
var HAND_DIR="hand/";
var FILES={"hands.binarypb":"hands_graph.wasm","hands_solution_packed_assets.data":"hands_assets.wasm","hand_landmark_full.tflite":"hand_landmark_full.wasm",
  "selfie_segmentation.binarypb":"selfie_graph.wasm","selfie_segmentation.tflite":"selfie_model.wasm","selfie_segmentation_landscape.tflite":"selfie_landscape.wasm"};

/* =================== 1. 手势分类（纯函数，可单测） =================== */
function d3(a,b){var x=a.x-b.x,y=a.y-b.y,z=(a.z||0)-(b.z||0);return Math.sqrt(x*x+y*y+z*z)}
var FING=[[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
/* L：世界坐标关键点（米，原点在手心，轴向与图像一致：y 向下）；I：图像归一化坐标 */
function classify(L,I){
  if(!L||L.length<21)return null;I=I||L;
  var W=L[0],ext=0,curl=0,E=[],C=[];
  FING.forEach(function(f){var mcp=L[f[0]],tip=L[f[3]],seg=d3(mcp,L[f[1]])+d3(L[f[1]],L[f[2]])+d3(L[f[2]],tip);
    var reach=d3(W,tip)/Math.max(1e-6,d3(W,mcp)),straight=d3(mcp,tip)/Math.max(1e-6,seg);
    var e=reach>1.5&&straight>.8,c=reach<1.3||straight<.55;E.push(e);C.push(c);if(e)ext++;if(c)curl++});
  /* 拇指：指尖离食指根够远 = 伸出 */
  var thumbOut=d3(L[4],L[5])>d3(L[2],L[5])*1.25;
  var pal=Math.hypot(I[0].x-I[9].x,I[0].y-I[9].y)||.1;
  var thumbUp=thumbOut&&I[4].y<I[3].y&&I[3].y<I[2].y&&(I[2].y-I[4].y)>pal*.45&&I[4].y<I[5].y;
  /* 掌心法向：|n.y| 大 = 手掌水平（朝上或朝下） */
  var a={x:L[5].x-W.x,y:L[5].y-W.y,z:L[5].z-W.z},b={x:L[17].x-W.x,y:L[17].y-W.y,z:L[17].z-W.z};
  var n={x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x},nl=Math.hypot(n.x,n.y,n.z)||1,ny=Math.abs(n.y)/nl;
  var pose="none";
  if(thumbUp&&curl>=3&&!E[0])pose="thumb";
  else if(curl>=4||(curl>=3&&ext===0))pose="fist";
  else if(E[0]&&!E[1]&&!E[2]&&C[1]&&(C[2]||C[3]))pose="point";
  else if(E[0]&&E[1]&&C[2]&&C[3])pose="two";
  else if(ext>=4||(ext>=3&&E[0]&&E[1]&&curl===0))pose="open";
  return{pose:pose,flat:pose==="open"&&ny>.7,ny:ny,ext:ext,curl:curl}}

/* 闪电判定：x 方向至少折返 2 次（3 段之字），整体有明显的上下跨度 */
function zigzag(tr){if(tr.length<6)return false;var P=[tr[0]];
  for(var i=1;i<tr.length;i++){var q=P[P.length-1];if(Math.hypot(tr[i].x-q.x,tr[i].y-q.y)>=.012)P.push(tr[i])}
  if(P.length<6)return false;var h=.035,dir=0,ext=P[0].x,turns=0,len=0,y0=1,y1=0;
  for(i=0;i<P.length;i++){var x=P[i].x;y0=Math.min(y0,P[i].y);y1=Math.max(y1,P[i].y);if(i)len+=Math.hypot(x-P[i-1].x,P[i].y-P[i-1].y);
    if(!dir){if(Math.abs(x-ext)>h){dir=x>ext?1:-1;ext=x}}
    else if(dir>0){if(x>ext)ext=x;else if(ext-x>h){turns++;dir=-1;ext=x}}
    else{if(x<ext)ext=x;else if(x-ext>h){turns++;dir=1;ext=x}}}
  return turns>=2&&(y1-y0)>.14&&Math.abs(P[P.length-1].y-P[0].y)>.1&&len>.3}

/* 波浪判定：一个标量序列里，带迟滞的方向反转次数 */
function reversals(v,h){var dir=0,ext=v[0],n=0;for(var i=1;i<v.length;i++){var x=v[i];
  if(!dir){if(Math.abs(x-ext)>h){dir=x>ext?1:-1;ext=x}}else if(dir>0){if(x>ext)ext=x;else if(ext-x>h){n++;dir=-1;ext=x}}else{if(x<ext)ext=x;else if(x-ext>h){n++;dir=1;ext=x}}}return n}

/* =================== 2. 每只泰坦的手势表 =================== */
var ACTN={heat:"热线",breath:"原子吐息",gravity:"引力光线",storm:"召唤雷暴",lava:"熔岩烈焰",glow:"鳞粉之光",emp:"电磁脉冲",frost:"冰霜吐息",proton:"质子咆哮"};
/* hold：握拳时时间轴最多推进到第几秒（蓄满）；rel：张开后从第几秒开始放；T：蓄满需要几秒 */
/* hold 比 rel 留 0.1s 余量：渲染循环每帧都会把时间轴钉回 hold，一帧的漂移不会提前出光 */
var CH={heat:{hold:3.8,rel:3.9,T:2.8},breath:{hold:1.2,rel:1.3,T:1.4},gravity:{hold:1.1,rel:1.2,T:1.3},lava:{hold:1.3,rel:1.4,T:1.3},
  glow:{hold:1.1,rel:1.2,T:1.2},emp:{hold:.7,rel:.8,T:1},frost:{hold:1.5,rel:1.6,T:1.5},proton:{hold:1.3,rel:1.4,T:1.4}};
function prof(id){var G=TW.g3;if(!G)return null;var acts=G.acts(id),kind=G.kind(id),p={id:id,charge:null,draw:false,siphon:false,punch:null,list:[]};
  var names={};acts.forEach(function(a){names[a[0]]=a[1]});
  if(kind==="ghidorah"){p.draw=!!names.storm;p.siphon=true;if(names.gravity)p.charge="gravity"}
  else if(acts.length)p.charge=acts[0][0];
  if(id==="kong"||!acts.length)p.punch=id==="kong"||/kong|skar|suko/.test(id)?"出拳":"冲撞";
  var L=p.list;
  if(p.draw)L.push(["☝️〰","伸一根手指，在空中画一道闪电","召唤雷暴"]);
  if(p.siphon){L.push(["🖐▁","手掌朝下平放，停住","引力蓄力 · 建筑震颤"]);L.push(["⤴","接着猛地向上一挥","引力虹吸 · 致敬《哥斯拉-0.0》"])}
  if(p.charge){var nm=names[p.charge]||ACTN[p.charge];
    if(p.charge==="heat"){L.push(["✊","握拳不放","背鳍从尾尖逐节点亮"]);L.push(["🖐","蓄满后张开手",nm])}
    else L.push(["✊→🖐","握拳蓄力，蓄满后张开",nm])}
  if(p.punch)L.push(["✊⇢","握拳朝镜头猛推",p.punch]);
  L.push(["👍","竖大拇指","咆哮"]);
  return p}

/* =================== 3. 声音（Web Audio 合成） =================== */
var AC=null,hum=null;
function ac(){if(!AC){var C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C()}if(AC&&AC.state==="suspended")AC.resume();return AC}
function noise(sec){var c=AC,n=c.sampleRate*sec|0,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(var i=0;i<n;i++)d[i]=Math.random()*2-1;return b}
function thud(){if(!ac())return;var t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(32,t+.35);
  g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+.55);
  var s=AC.createBufferSource(),f=AC.createBiquadFilter(),g2=AC.createGain();s.buffer=noise(.4);f.type="lowpass";f.frequency.value=900;g2.gain.setValueAtTime(.6,t);g2.gain.exponentialRampToValueAtTime(.001,t+.35);
  s.connect(f);f.connect(g2);g2.connect(AC.destination);s.start(t);
  /* 玻璃碎裂的高频 */var s2=AC.createBufferSource(),f2=AC.createBiquadFilter(),g3=AC.createGain();s2.buffer=noise(.6);f2.type="highpass";f2.frequency.value=3800;g3.gain.setValueAtTime(.18,t+.02);g3.gain.exponentialRampToValueAtTime(.001,t+.6);s2.connect(f2);f2.connect(g3);g3.connect(AC.destination);s2.start(t+.02)}
function crack(){if(!ac())return;var t=AC.currentTime;for(var k=0;k<3;k++){var s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain(),t0=t+k*.07;s.buffer=noise(.5);f.type="bandpass";f.frequency.value=2200-k*500;f.Q.value=.7;
  g.gain.setValueAtTime(.35,t0);g.gain.exponentialRampToValueAtTime(.001,t0+.45);s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t0)}}
function rumble(sec,up){if(!ac())return;var t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noise(sec);f.type="lowpass";f.frequency.setValueAtTime(up?120:300,t);f.frequency.exponentialRampToValueAtTime(up?520:80,t+sec);
  g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.5,t+.25);g.gain.exponentialRampToValueAtTime(.001,t+sec);s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t)}
function chime(){if(!ac())return;var t=AC.currentTime;[523,659,784,988,1175].forEach(function(f,i){var o=AC.createOscillator(),g=AC.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,t+i*.09);g.gain.exponentialRampToValueAtTime(.12,t+i*.09+.03);g.gain.exponentialRampToValueAtTime(.0001,t+i*.09+.9);o.connect(g);g.connect(AC.destination);o.start(t+i*.09);o.stop(t+i*.09+1)})}
function humSet(c,col){if(!ac())return;if(!hum){var o=AC.createOscillator(),o2=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();o.type="sawtooth";o2.type="sawtooth";o2.detune.value=9;f.type="lowpass";f.frequency.value=600;g.gain.value=0;
    o.connect(f);o2.connect(f);f.connect(g);g.connect(AC.destination);o.start();o2.start();hum={o:o,o2:o2,f:f,g:g}}
  var t=AC.currentTime;hum.o.frequency.setTargetAtTime(48+c*110,t,.05);hum.o2.frequency.setTargetAtTime(48.5+c*111,t,.05);hum.f.frequency.setTargetAtTime(300+c*1600,t,.05);hum.g.gain.setTargetAtTime(c>0?.05+.07*c:0,t,.08)}

/* =================== 4. DOM =================== */
var css=document.createElement("style");css.textContent=
".twg-btn[aria-pressed='true']{border-color:var(--amber)!important;color:var(--amber)!important;box-shadow:0 0 12px #e0a23a44}"+
".twg{position:absolute;right:52px;bottom:14px;width:204px;background:rgba(8,8,10,.92);border:1px solid var(--seam);border-top:2px solid var(--amber);font:11px/1.5 var(--f-mono);color:var(--dim);display:none;backdrop-filter:blur(4px)}"+
".twg.on{display:block}.twg-h{display:flex;align-items:center;gap:6px;padding:5px 8px;letter-spacing:.12em;border-bottom:1px solid var(--seam)}.twg-h b{color:var(--amber);font-weight:500}"+
".twg-h i{width:7px;height:7px;border-radius:50%;background:#555;flex:none}.twg-h i.live{background:#4dff9a;box-shadow:0 0 8px #4dff9a}.twg-h i.err{background:var(--alert)}.twg-h em{margin-left:auto;font-style:normal;cursor:pointer;color:var(--dim)}"+
".twg-v{position:relative;aspect-ratio:4/3;background:#000}.twg-v canvas{width:100%;height:100%;display:block}"+
".twg.big{width:min(460px,calc(100% - 70px))}.twg-h u{text-decoration:none;cursor:pointer;margin-left:auto;color:var(--dim)}.twg-h u+em{margin-left:8px}"+
".twg-k{display:flex;border-bottom:1px solid var(--seam)}.twg-k button{flex:1;background:none;border:0;border-right:1px solid var(--seam);padding:4px 0;font:11px var(--f-mono);color:var(--dim)}.twg-k button:last-child{border:0}"+
".twg-k button[aria-pressed='true']{color:var(--abyss,#08080a);background:var(--amber)}"+
".twg-v .msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;color:var(--ink);font-size:11.5px;line-height:1.6}"+
".twg-s{display:flex;justify-content:space-between;padding:5px 8px 3px}.twg-s b{color:var(--ink);font-weight:500}"+
".twg-m{margin:0 8px 6px;height:5px;background:#ffffff14;border-radius:3px;overflow:hidden}.twg-m i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3fc0ff,#eefcff);box-shadow:0 0 8px #7fe6ff}"+
".twg-l{border-top:1px solid var(--seam);padding:6px 8px 7px;display:grid;grid-template-columns:44px 1fr;gap:3px 6px;align-items:baseline}"+
".twg-l span{font-size:13px;color:var(--ink);white-space:nowrap}.twg-l div{color:var(--dim)}.twg-l div b{display:block;color:var(--amber);font-weight:500}"+
".twg-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}"+
".twg-toast{position:absolute;left:50%;top:18%;transform:translate(-50%,-50%) scale(.9);font:700 22px var(--f-display);letter-spacing:.2em;color:var(--amber);text-shadow:0 0 18px #e0a23a,0 2px 0 #000;opacity:0;transition:all .35s;pointer-events:none;z-index:3;white-space:nowrap}"+
".twg-toast.on{opacity:1;transform:translate(-50%,-50%) scale(1)}"+
"@media (max-width:720px){.twg{right:8px;bottom:8px;width:200px}}";
document.head.appendChild(css);

var stage=TW.stage||document.getElementById("stage"),g3ui=document.getElementById("g3ui"),top=g3ui&&g3ui.querySelector(".g3top");
var btn=document.createElement("button");btn.className="twg-btn";btn.setAttribute("aria-pressed","false");btn.textContent="✋ 手势";btn.title="用摄像头和手势控制泰坦";
if(top)top.insertBefore(btn,document.getElementById("g3rot"));
var panel=document.createElement("div");panel.className="twg";panel.setAttribute("aria-live","polite");
panel.innerHTML="<div class='twg-h'><i></i><b>GESTURE LINK</b> 手势链接<u title='放大 / 缩小画面'>⤢</u><em title='关闭'>✕</em></div>"+
  "<div class='twg-k' role='group' aria-label='画面模式'><button data-k='real'>实景</button><button data-k='nv'>夜视</button><button data-k='sil'>剪影</button><button data-k='skin'>皮套</button></div>"+
  "<div class='twg-v'><canvas width='640' height='480'></canvas><div class='msg'></div></div>"+
  "<div class='twg-s'><span>识别 <b class='pz'>—</b></span><span class='st'></span></div><div class='twg-m'><i></i></div><div class='twg-l'></div>";
if(g3ui)g3ui.appendChild(panel);
var fx=document.createElement("canvas");fx.className="twg-fx";stage.insertBefore(fx,g3ui||null);var fc=fx.getContext("2d");
var toast=document.createElement("div");toast.className="twg-toast";stage.insertBefore(toast,g3ui||null);
var pv=panel.querySelector("canvas"),pc=pv.getContext("2d"),msg=panel.querySelector(".msg"),dot=panel.querySelector(".twg-h i"),pz=panel.querySelector(".pz"),st=panel.querySelector(".st"),meter=panel.querySelector(".twg-m i"),list=panel.querySelector(".twg-l");
var POSE_CN={two:"二指 TWO",fist:"握拳 FIST",open:"张开 OPEN",flat:"平掌 FLAT",point:"一指 POINT",thumb:"点赞 👍",none:"…"};
function say(t){msg.textContent=t||"";msg.style.display=t?"flex":"none"}
var toastT=0;function flashToast(t,col){toast.textContent=t;toast.style.color=col||"";toast.classList.add("on");clearTimeout(toastT);toastT=setTimeout(function(){toast.classList.remove("on")},1300)}

/* =================== 5. 摄像头 + MediaPipe =================== */
var seg=null,segFail=false,frameN=0,MK={c:document.createElement("canvas"),t:0},LY=document.createElement("canvas"),VIEW="real";
MK.c.width=LY.width=320;MK.c.height=LY.height=240;MK.x=MK.c.getContext("2d");var LX=LY.getContext("2d");
try{VIEW=localStorage.getItem("tw-gesture-view")||"real"}catch(e){}
var ON=false,video=null,stream=null,hands=null,busy=false,lastSend=0,lastRes=null,loading=false;
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(new Error("无法载入 "+src))};document.head.appendChild(s)})}
async function enable(){if(ON)return;ON=true;btn.setAttribute("aria-pressed","true");panel.classList.add("on");ac();refreshList();dot.className="";
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){fail("这里不能使用摄像头（浏览器不支持，或当前是嵌入预览页面）");return}
  say("请允许使用摄像头 …\n画面只在本机处理，不会上传");
  try{stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:"user"},audio:false})}
  catch(e){var emb=!/github\.io$/.test(location.hostname)&&!/^(localhost|127\.0\.0\.1)$/.test(location.hostname);fail(emb?"Claude 里的预览页面不允许使用摄像头（没有可以打开的开关）。手势功能需要在独立网页里玩：":e&&e.name==="NotAllowedError"?"摄像头被拒绝了。在地址栏的权限里允许摄像头后再点一次「✋ 手势」":(e&&e.name==="NotFoundError"?"没有找到摄像头":"摄像头打不开（"+(e&&e.message||e)+"）。嵌入预览页面通常不允许用摄像头"));return}
  if(!ON){stopStream();return}
  video=video||document.createElement("video");video.muted=true;video.playsInline=true;video.srcObject=stream;try{await video.play()}catch(e){}
  if(!hands){say("载入手部识别模型 …");loading=true;
    try{if(!window.Hands)await loadScript(HAND_DIR+"hands.js");
      hands=new window.Hands({locateFile:function(f){return HAND_DIR+(FILES[f]||f)}});
      hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.6,minTrackingConfidence:.5,selfieMode:false});
      hands.onResults(onResults);await hands.initialize()}
    catch(e){loading=false;hands=null;fail("手部模型载入失败（"+(e&&e.message||e)+"）");return}loading=false}
  /* 人像分割（抠像）：载入失败不影响手势，只是没有背景替换 */
  if(!seg&&!segFail){try{if(!window.SelfieSegmentation)await loadScript(HAND_DIR+"selfie_segmentation.js");
      var sg=new window.SelfieSegmentation({locateFile:function(f){return HAND_DIR+(FILES[f]||f)}});sg.setOptions({modelSelection:1,selfieMode:false});
      sg.onResults(function(r){if(!r.segmentationMask)return;MK.x.globalCompositeOperation="copy";MK.x.drawImage(r.segmentationMask,0,0,MK.c.width,MK.c.height);MK.t=performance.now()});await sg.initialize();seg=sg}
    catch(e){segFail=true;console.warn("[gesture] 抠像模型载入失败",e)}}
  if(!ON)return;say("");dot.className="live";requestAnimationFrame(pump)}
var PAGES="https://luomengzhou.github.io/titan/";
function fail(t){dot.className="err";say(t);
  /* claude.ai 预览等嵌入环境不给摄像头：给一个独立网页的链接 */
  if(!/github\.io$/.test(location.hostname)&&!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){var a=document.createElement("a");a.href=PAGES+(TW.current&&TW.current()?"#"+TW.current():"");a.target="_blank";a.rel="noopener";
    a.textContent="↗ 在独立网页里打开";a.style.cssText="display:block;margin-top:8px;color:var(--amber)";var w=document.createElement("div");w.textContent=t;w.appendChild(a);msg.textContent="";msg.appendChild(w)}}
function stopStream(){if(stream)stream.getTracks().forEach(function(t){t.stop()});stream=null}
function disable(){ON=false;btn.setAttribute("aria-pressed","false");panel.classList.remove("on");stopStream();reset(true);humSet(0);lastRes=null;pz.textContent="—"}
btn.onclick=function(){ON?disable():enable()};
var kb=panel.querySelectorAll(".twg-k button");function setView(v){VIEW=v;kb.forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.k===v))});try{localStorage.setItem("tw-gesture-view",v)}catch(e){}}
kb.forEach(function(b){b.onclick=function(){setView(b.dataset.k)}});setView(/^(real|nv|sil|skin)$/.test(VIEW)?VIEW:"real");
panel.querySelector(".twg-h u").onclick=function(){panel.classList.toggle("big")};panel.querySelector(".twg-h em").onclick=disable;
async function pump(ts){if(!ON||!stream)return;requestAnimationFrame(pump);
  if(busy||!hands||!video||video.readyState<2||ts-lastSend<30)return;busy=true;lastSend=ts;
  try{await hands.send({image:video});if(seg&&(frameN++%2===0||!MK.t))await seg.send({image:video})}catch(e){console.error("[gesture]",e)}busy=false}
function onResults(r){lastRes=r;var lm=r.multiHandLandmarks&&r.multiHandLandmarks[0],wl=r.multiHandWorldLandmarks&&r.multiHandWorldLandmarks[0];
  drawPreview(r.image,lm);step(performance.now(),lm?{lm:lm,wl:wl||lm}:null)}

/* 预览：镜像画面 + 骨架 */
var BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function tint(hex,k){var n=parseInt((hex||"#e0a23a").replace("#",""),16),r=n>>16&255,g=n>>8&255,b=n&255;if(isNaN(n)){r=224;g=162;b=58}
  return"rgb("+Math.round(r*k)+","+Math.round(g*k)+","+Math.round(b*k)+")"}
function tcol(){var t=TW.byId&&TW.current&&TW.byId[TW.current()];return(t&&t.color)||"#e0a23a"}
/* 观察室背景：暗房 + 透视地格 + 泰坦色的远光 */
function room(w,h,col){var g=pc.createLinearGradient(0,0,0,h);g.addColorStop(0,"#050506");g.addColorStop(.62,"#0d0d10");g.addColorStop(1,"#030304");pc.fillStyle=g;pc.fillRect(0,0,w,h);
  var rg=pc.createRadialGradient(w/2,h*.6,0,w/2,h*.6,w*.6);rg.addColorStop(0,tint(col,.28));rg.addColorStop(1,"rgba(0,0,0,0)");pc.globalAlpha=.55;pc.fillStyle=rg;pc.fillRect(0,0,w,h);pc.globalAlpha=1;
  pc.strokeStyle="rgba(228,223,211,.12)";pc.lineWidth=1;var hz=h*.62;pc.beginPath();for(var i=-8;i<=8;i++){pc.moveTo(w/2+i*w*.03,hz);pc.lineTo(w/2+i*w*.22,h)}
  for(var j=0;j<7;j++){var y=hz+Math.pow(j/6,2)*(h-hz);pc.moveTo(0,y);pc.lineTo(w,y)}pc.stroke();
  pc.fillStyle="rgba(228,223,211,.1)";pc.font="700 "+Math.round(h*.085)+"px sans-serif";pc.textAlign="center";pc.save();pc.translate(w,0);pc.scale(-1,1);pc.fillText("OBSERVATION 07",w/2,h*.2);pc.restore();pc.textAlign="left"}
/* 人形图层：mask ∩（实景 / 夜视 / 纯色剪影） */
function personLayer(img,mode,col){var w=LY.width,h=LY.height;LX.globalCompositeOperation="copy";LX.filter="none";LX.drawImage(MK.c,0,0,w,h);LX.globalCompositeOperation="source-in";
  if(mode==="real"||mode==="nv"){try{LX.filter=mode==="nv"?"grayscale(1) contrast(1.35) brightness(1.25)":"contrast(1.08) saturate(.8)"}catch(e){}
    try{LX.drawImage(img,0,0,w,h)}catch(e){}LX.filter="none";
    if(mode==="nv"){LX.globalCompositeOperation="multiply";LX.fillStyle="#3cff78";LX.fillRect(0,0,w,h);
      LX.globalCompositeOperation="destination-in";LX.drawImage(MK.c,0,0,w,h)}}
  else{var g=LX.createLinearGradient(0,0,0,h);g.addColorStop(0,tint(col,mode==="skin"?.5:.2));g.addColorStop(1,tint(col,mode==="skin"?.16:.06));LX.fillStyle=g;LX.fillRect(0,0,w,h);
    LX.globalCompositeOperation="source-atop";
    if(mode==="skin"){/* 鳞片：错位的小弧线 */LX.strokeStyle="rgba(0,0,0,.35)";LX.lineWidth=1;LX.beginPath();for(var y=0;y<h;y+=7)for(var x=(y/7%2)*5;x<w;x+=10){LX.moveTo(x,y);LX.arc(x+5,y,5,Math.PI,0,true)}LX.stroke()}
    else{LX.fillStyle="rgba(255,255,255,.07)";for(var yy=0;yy<h;yy+=4)LX.fillRect(0,yy,w,1)}}
  LX.globalCompositeOperation="source-over"}
/* 怪兽爪：沿 21 个关键点画粗指节 + 指尖的爪，握拳张开自然跟随 */
function claw(lm,w,h,col,ape){var P=lm.map(function(p){return[p.x*w,p.y*h]}),pal=Math.hypot(P[0][0]-P[9][0],P[0][1]-P[9][1]),dark=tint(col,.3),mid=tint(col,.55),hi=tint(col,.9);
  pc.lineCap=pc.lineJoin="round";pc.fillStyle=dark;pc.strokeStyle=dark;pc.lineWidth=pal*.3;pc.beginPath();[0,1,5,9,13,17].forEach(function(i,k){k?pc.lineTo(P[i][0],P[i][1]):pc.moveTo(P[i][0],P[i][1])});pc.closePath();pc.fill();pc.stroke();
  [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]].forEach(function(f,fi){var wd=pal*(fi===0?.3:fi===4?.22:.26);
    [[dark,1],[mid,.62]].forEach(function(L){for(var s=0;s<3;s++){pc.strokeStyle=L[0];pc.lineWidth=wd*L[1]*(1-s*.14);pc.beginPath();pc.moveTo(P[f[s]][0],P[f[s]][1]);pc.lineTo(P[f[s+1]][0],P[f[s+1]][1]);pc.stroke()}});
    pc.fillStyle=hi;for(var s2=1;s2<3;s2++){pc.beginPath();pc.arc(P[f[s2]][0],P[f[s2]][1],wd*.16,0,7);pc.fill()}
    var t=P[f[3]],d=P[f[2]],dx=t[0]-d[0],dy=t[1]-d[1],n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;var L2=pal*(ape?.14:.42),bw=wd*(ape?.4:.36);
    pc.fillStyle=ape?"#2a2420":"#efe6cf";pc.beginPath();pc.moveTo(t[0]-dy*bw,t[1]+dx*bw);pc.quadraticCurveTo(t[0]+dx*L2*.6-dy*bw*.5,t[1]+dy*L2*.6+dx*bw*.5,t[0]+dx*L2,t[1]+dy*L2);pc.quadraticCurveTo(t[0]+dx*L2*.5+dy*bw*.9,t[1]+dy*L2*.5-dx*bw*.9,t[0]+dy*bw,t[1]-dx*bw);pc.closePath();pc.fill()})}
function drawPreview(img,lm){var w=pv.width,h=pv.height,col=tcol(),mode=VIEW,has=seg&&MK.t&&performance.now()-MK.t<1500;pc.save();pc.translate(w,0);pc.scale(-1,1);
  if(has){room(w,h,col);personLayer(img,mode,col);pc.shadowColor=mode==="nv"?"#3cff78":mode==="real"?"rgba(0,0,0,.8)":col;pc.shadowBlur=mode==="real"?18:14;pc.drawImage(LY,0,0,w,h);pc.shadowBlur=0}
  else if(mode==="real"||mode==="nv"){/* 没有抠像：退回整幅画面压暗 */if(img){pc.globalAlpha=.55;try{pc.drawImage(img,0,0,w,h)}catch(e){}pc.globalAlpha=1}pc.fillStyle=mode==="nv"?"rgba(10,60,25,.55)":"rgba(8,8,10,.4)";pc.fillRect(0,0,w,h)}
  else room(w,h,col);/* 剪影 / 皮套在抠像不可用时不显示人像，保护隐私 */
  if(lm&&mode==="skin")claw(lm,w,h,col,/kong|skar|suko/.test(TW.current&&TW.current()||""));
  else if(lm){var sc=S.mode==="charge"?"#7fe6ff":S.mode==="idle"?"#e4dfd3":"#e0a23a";pc.strokeStyle=sc;pc.lineWidth=3;pc.shadowColor=sc;pc.shadowBlur=8;pc.beginPath();
    BONES.forEach(function(b){pc.moveTo(lm[b[0]].x*w,lm[b[0]].y*h);pc.lineTo(lm[b[1]].x*w,lm[b[1]].y*h)});pc.stroke();pc.shadowBlur=0;pc.fillStyle="#fff";
    lm.forEach(function(p,i){pc.beginPath();pc.arc(p.x*w,p.y*h,i%4===0&&i?5:3.5,0,7);pc.fill()})}
  if(lm&&(S.mode==="charge"||S.mode==="sCharge")){/* 蓄力时手心的光 */var cx=(lm[0].x+lm[9].x)/2*w,cy=(lm[0].y+lm[9].y)/2*h,rr=h*(.05+.12*S.c),gg=pc.createRadialGradient(cx,cy,0,cx,cy,rr);
    gg.addColorStop(0,S.mode==="charge"?"rgba(190,243,255,.9)":"rgba(255,210,122,.9)");gg.addColorStop(1,"rgba(0,0,0,0)");pc.globalCompositeOperation="lighter";pc.fillStyle=gg;pc.fillRect(cx-rr,cy-rr,rr*2,rr*2);pc.globalCompositeOperation="source-over"}
  pc.restore();
  /* 扫描线 + 角标，帝王组织监控画面的感觉 */
  pc.fillStyle=VIEW==="nv"?"rgba(60,255,120,.07)":"rgba(228,223,211,.05)";for(var y=0;y<h;y+=4)pc.fillRect(0,y,w,1);
  pc.strokeStyle="rgba(224,162,58,.7)";pc.lineWidth=3;[[16,16,1,1],[w-16,16,-1,1],[16,h-16,1,-1],[w-16,h-16,-1,-1]].forEach(function(c){pc.beginPath();pc.moveTo(c[0],c[1]+24*c[3]);pc.lineTo(c[0],c[1]);pc.lineTo(c[0]+24*c[2],c[1]);pc.stroke()});
  pc.fillStyle="rgba(224,162,58,.85)";pc.font="20px "+getComputedStyle(document.body).getPropertyValue("--f-mono");pc.fillText("CAM-01 · REC",28,h-24)}

/* =================== 6. 状态机 =================== */
var S={mode:"idle",c:0,act:null,P:null,id:null,raw:[],pose:"none",flat:false,lastFist:0,lastFlat:-1e9,hist:[],trail:[],wave:[],trailOn:false,lastPoint:-1e9,cool:{},thumbT:0,lastT:0,noHandT:0};
function reset(hard){var G=TW.g3;S.hA=null;if(G&&(S.mode==="charge"||S.mode==="fizzle"||S.mode==="sCharge"))G.cancel();if(hard&&G&&S.mode==="sLift")G.cancel();
  DB.abort(true);S.mode="idle";S.c=0;S.act=null;S.trail=[];S.hist=[];humSet(0);meter.style.width="0"}
function refreshList(){var id=TW.current&&TW.current();var p=S.P=TW.g3&&id?prof(id):null;S.id=id;
  list.innerHTML=p?p.list.map(function(r){return"<span>"+r[0]+"</span><div>"+r[1]+"<b>"+r[2]+"</b></div>"}).join(""):"<span></span><div>打开任意泰坦的 3D 视图后可用</div>"}
TW.on("select",function(){if(ON){reset();refreshList()}});TW.on("3d",function(){if(ON){reset();refreshList()}});

/* 钉住技能时间轴：记下来，渲染循环每帧再钉一次（见 waitG3 的 hook） */
function pin(act,p){S.hA=act;S.hP=p;TW.g3.hold(act,p)}function unpin(){S.hA=null}
function stable(now,raw){S.raw.push(raw);if(S.raw.length>5)S.raw.shift();var cnt={};S.raw.forEach(function(p){cnt[p]=(cnt[p]||0)+1});
  var best=S.pose,bc=0;for(var k in cnt)if(cnt[k]>bc){bc=cnt[k];best=k}if(bc>=3)S.pose=best;return S.pose}
function cool(k,ms,now){if((S.cool[k]||0)>now)return false;S.cool[k]=now+ms;return true}

function step(now,hand){var G=TW.g3,dt=Math.max(0,Math.min(.1,(now-(S.lastT||now))/1000));S.lastT=now;
  if(!G||!G.live()){pz.textContent=hand?POSE_CN[(classify(hand.wl,hand.lm)||{}).pose||"none"]:"—";st.textContent="未进入 3D";return}
  var id=TW.current();if(id!==S.id||!S.P){reset();refreshList()}var P=S.P;if(!P)return;
  var f=null,raw="none";
  if(hand){f=classify(hand.wl,hand.lm);raw=f?(f.flat?"flat":f.pose):"none";S.noHandT=0}else{S.noHandT=S.noHandT||now}
  var pose=stable(now,raw),lm=hand&&hand.lm;
  /* 图像特征（镜像后的屏幕坐标） */
  var cx=0,cy=0,size=0;if(lm){[0,5,9,13,17].forEach(function(i){cx+=lm[i].x;cy+=lm[i].y});cx=1-cx/5;cy/=5;
    var asp=4/3;size=(Math.hypot((lm[0].x-lm[9].x)*asp,lm[0].y-lm[9].y)+Math.hypot((lm[5].x-lm[17].x)*asp,lm[5].y-lm[17].y))/2;
    S.hist.push({t:now,cx:cx,cy:cy,size:size,raw:raw})}
  while(S.hist.length&&now-S.hist[0].t>600)S.hist.shift();
  pz.textContent=POSE_CN[pose]||pose;
  if(pose==="fist")S.lastFist=now;if(pose==="flat"||raw==="flat")S.lastFlat=now;

  /* ---- 👍 咆哮（任何时候都可以，除非正在蓄力） ---- */
  if(pose==="thumb"&&S.mode==="idle"){if(!S.thumbT)S.thumbT=now;if(now-S.thumbT>350&&cool("roar",4000,now)){if(TW.roar&&TW.roar.play)TW.roar.play(id);TW.emit("roar",{id:id,via:"gesture"});flashToast("ROAR · 咆哮")}}else S.thumbT=0;

  /* ---- 基多拉：一指画闪电 ---- */
  if(P.draw&&S.mode==="idle"){
    if(pose==="point"&&lm){S.lastPoint=now;S.trailOn=true;var tip=lm[8];S.trail.push({x:1-tip.x,y:tip.y,t:now});
      while(S.trail.length&&now-S.trail[0].t>1600)S.trail.shift();
      if(zigzag(S.trail)&&!G.busy()&&cool("storm",2500,now)){FX.bolt(S.trail.slice());S.trail=[];G.fire("storm");crack();flashToast("⚡ 召唤雷暴","#ffd27a");TW.emit("fire",{id:id,act:"storm",via:"gesture"})}}
    else if(now-S.lastPoint>300){S.trailOn=false}}

  /* ---- 彩蛋：食指中指并拢放平，食指画波浪（只有摩斯拉回应） ---- */
  if(S.mode==="idle"&&lm&&/mothra/.test(id)){if(raw==="two")S.lastTwo=now;
    var hor=Math.abs((lm[8].x-lm[5].x)*4/3)>Math.abs(lm[8].y-lm[5].y)*1.1;
    if(now-(S.lastTwo||-1e9)<350&&(hor||S.wave.length)){S.wave.push({t:now,x:1-lm[8].x,y:lm[8].y,rel:(lm[8].y-lm[12].y)/Math.max(.02,Math.hypot(lm[0].x-lm[9].x,lm[0].y-lm[9].y))})}else S.wave=[];
    while(S.wave.length&&now-S.wave[0].t>1800)S.wave.shift();
    if(S.wave.length>10&&!G.busy()&&(reversals(S.wave.map(function(p){return p.rel}),.22)>=3||reversals(S.wave.map(function(p){return p.y}),.035)>=3)&&cool("neon",3000,now)){
      FX.neon(S.wave.slice());S.wave=[];NEON.until=performance.now()+6000;G.fire("glow");chime();flashToast("NEON · 霓虹鳞粉","#ff7ad9");TW.emit("fire",{id:id,act:"glow",via:"gesture-neon"})}}
  else S.wave=[];

  /* ---- 基多拉：平掌蓄力 → 上挥虹吸 ---- */
  if(P.siphon){
    if(S.mode==="idle"&&pose==="flat"&&!G.busy()){S.mode="sCharge";S.c=0;DB.begin(G.cur())}
    if(S.mode==="sCharge"){
      if(raw==="flat"||raw==="open"){S.c=Math.min(1,S.c+dt/1.6)}
      pin("gravity",S.c*.6);DB.c=S.c;
      var e0=null;for(var i=0;i<S.hist.length;i++)if(now-S.hist[i].t<=240){e0=S.hist[i];break}
      if(e0&&lm&&cy-e0.cy<-.17&&S.c>=.35&&now-S.lastFlat<700){unpin();S.mode="sLift";DB.lift(G.cur());rumble(2.4,true);flashToast("引力虹吸 · GRAVITY SIPHON","#ffd27a");TW.emit("fire",{id:id,act:"gravity",via:"gesture-siphon"})}
      else if(now-S.lastFlat>800){DB.abort();S.mode="fizzle";S.act="gravity";S.max=.6}}
    if(S.mode==="sLift"&&DB.phase==="off")S.mode="idle"}

  /* ---- 握拳蓄力 → 张开释放 ---- */
  if(P.charge&&(S.mode==="idle"||S.mode==="charge"||S.mode==="fizzle"||S.mode==="fire")){var ch=CH[P.charge]||{hold:1.2,rel:1.25,T:1.3};
    if(S.mode==="idle"&&pose==="fist"&&!G.busy()){S.mode="charge";S.c=0;S.act=P.charge;S.max=ch.hold}
    if(S.mode==="charge"){
      if(pose==="fist")S.c=Math.min(1,S.c+dt/ch.T);
      if((pose==="open"||pose==="flat")&&now-S.lastFist<900){
        if(S.c>=.8){unpin();G.hold(S.act,ch.rel);S.mode="fire";humSet(0);rumble(1.2,false);flashToast(ACTN[S.act]&&P.charge==="heat"?"放射 · "+ACTN[S.act]:"RELEASE · "+(ACTN[S.act]||""),"#bff3ff");TW.emit("fire",{id:id,act:S.act,via:"gesture"})}
        else{S.mode="fizzle";flashToast("蓄力中断","#8aa")}}
      else if(pose!=="fist"&&now-S.lastFist>1200)S.mode="fizzle";
      if(S.mode==="charge"){pin(S.act,S.c*S.max);humSet(S.c)}}
    if(S.mode==="fire"&&!G.busy()){S.mode="idle";S.c=0}}
  if(S.mode==="fizzle"){S.c-=dt*1.4;humSet(Math.max(0,S.c)*.5);if(S.c<=0){unpin();G.cancel();S.mode="idle";S.c=0;humSet(0)}else pin(S.act,S.c*S.max)}

  /* ---- 握拳朝镜头推 = 出拳 ---- */
  if(P.punch&&S.mode==="idle"&&raw==="fist"&&lm){var mn=1e9;S.hist.forEach(function(h){if(now-h.t<=340&&h.raw==="fist")mn=Math.min(mn,h.size)});
    if(mn<1e9&&size/mn>1.28&&cool("punch",900,now)){PU.go(G.cur(),cx,cy);S.hist=[]}}

  meter.style.width=Math.round((S.mode==="fire"||S.mode==="sLift"?1:S.c)*100)+"%";
  st.textContent={idle:"待命",charge:"蓄力 "+Math.round(S.c*100)+"%",fizzle:"冷却",fire:"释放中",sCharge:"引力场 "+Math.round(S.c*100)+"%",sLift:"虹吸中"}[S.mode]||"";
  if(!hand&&S.noHandT&&now-S.noHandT>1500&&S.mode==="charge")S.mode="fizzle"}

/* 没有识别结果的时候（手离开画面）也要推进状态机 */
setInterval(function(){if(ON&&lastRes&&performance.now()-S.lastT>120)step(performance.now(),null)},100);

/* =================== 7. 屏幕层特效：闪电轨迹 / 镜头裂纹 / 闪白 =================== */
var FX={bolts:[],cracks:[],neons:[],flash:0,
  neon:function(tr){this.neons.push({pts:tr.map(function(p){return{x:p.x,y:p.y}}),t0:performance.now()})},
  bolt:function(tr){this.bolts.push({pts:tr.map(function(p){return{x:p.x,y:p.y}}),t0:performance.now()})},
  crack:function(x,y){var rays=[],n=11+(Math.random()*5|0);for(var i=0;i<n;i++){var a=i/n*6.283+Math.random()*.4,len=.18+Math.random()*.32,seg=[],px=0,py=0,k=6+(Math.random()*4|0);
      for(var j=0;j<k;j++){var aa=a+(Math.random()-.5)*.5;px+=Math.cos(aa)*len/k;py+=Math.sin(aa)*len/k;seg.push([px,py])}rays.push(seg)}
    var rings=[];for(var r=0;r<3;r++)rings.push(.03+r*.045+Math.random()*.02);
    this.cracks.push({x:x,y:y,rays:rays,rings:rings,t0:performance.now()});this.flash=1}};
function fxLoop(){requestAnimationFrame(fxLoop);var r=stage.getBoundingClientRect(),dp=Math.min(devicePixelRatio||1,2),w=r.width,h=r.height;
  if(fx.width!==(w*dp|0)||fx.height!==(h*dp|0)){fx.width=w*dp;fx.height=h*dp}fc.setTransform(dp,0,0,dp,0,0);fc.clearRect(0,0,w,h);
  if(!ON&&!FX.cracks.length&&!FX.bolts.length&&!FX.neons.length&&FX.flash<.01)return;var now=performance.now(),M=Math.min(w,h);
  /* 实时手指轨迹 */
  if(ON&&S.trail.length>1){var tr=S.trail;fc.lineCap=fc.lineJoin="round";
    [[10,"rgba(255,180,58,.18)"],[4,"rgba(255,210,122,.55)"],[1.6,"#fff6dc"]].forEach(function(L){fc.lineWidth=L[0];fc.strokeStyle=L[1];fc.beginPath();
      tr.forEach(function(p,i){var a=Math.max(0,1-(now-p.t)/1600),x=p.x*w,y=p.y*h;if(i)fc.lineTo(x,y);else fc.moveTo(x,y)});fc.stroke()});
    var hd=tr[tr.length-1];fc.fillStyle="#fff";fc.shadowColor="#ffb43a";fc.shadowBlur=18;fc.beginPath();fc.arc(hd.x*w,hd.y*h,5,0,7);fc.fill();fc.shadowBlur=0}
  /* 画成的闪电：亮一下再散开 */
  FX.bolts=FX.bolts.filter(function(b){var k=(now-b.t0)/700;if(k>=1)return false;fc.globalAlpha=1-k;fc.lineCap="round";
    [[16,"rgba(255,180,58,.35)"],[6,"#ffd27a"],[2.4,"#fff"]].forEach(function(L){fc.lineWidth=L[0]*(1+k);fc.strokeStyle=L[1];fc.beginPath();
      b.pts.forEach(function(p,i){var x=p.x*w+(Math.random()-.5)*8*k,y=p.y*h+(Math.random()-.5)*8*k;if(i)fc.lineTo(x,y);else fc.moveTo(x,y)});fc.stroke()});fc.globalAlpha=1;return true});
  /* 霓虹波浪：粉→紫→青的光轨 */
  FX.neons=FX.neons.filter(function(b){var k=(now-b.t0)/1600;if(k>=1)return false;fc.globalAlpha=1-k*k;fc.lineCap=fc.lineJoin="round";var g=fc.createLinearGradient(0,0,w,0);g.addColorStop(0,"#ff4fd8");g.addColorStop(.5,"#a97bff");g.addColorStop(1,"#4ff3ff");
    [[18,.25],[7,.8],[2.5,1]].forEach(function(L){fc.globalAlpha=(1-k*k)*L[1];fc.lineWidth=L[0];fc.strokeStyle=L[0]<3?"#fff":g;fc.shadowColor="#ff4fd8";fc.shadowBlur=L[0]>10?24:0;fc.beginPath();b.pts.forEach(function(p,i){i?fc.lineTo(p.x*w,p.y*h):fc.moveTo(p.x*w,p.y*h)});fc.stroke()});fc.shadowBlur=0;fc.globalAlpha=1;return true});
  /* 镜头裂纹 */
  FX.cracks=FX.cracks.filter(function(c){var k=(now-c.t0)/2200;if(k>=1)return false;var a=k<.7?1:1-(k-.7)/.3,x0=c.x*w,y0=c.y*h;fc.save();fc.translate(x0,y0);
    fc.strokeStyle="rgba(230,250,255,"+(.85*a)+")";fc.shadowColor="rgba(160,230,255,"+a+")";fc.shadowBlur=6;fc.lineWidth=1.3;
    c.rays.forEach(function(seg){fc.beginPath();fc.moveTo(0,0);seg.forEach(function(p){fc.lineTo(p[0]*M,p[1]*M)});fc.stroke()});
    c.rings.forEach(function(rr){fc.beginPath();c.rays.forEach(function(seg,i){var j=Math.min(seg.length-1,Math.round(rr/.3*seg.length)),p=seg[j];if(i)fc.lineTo(p[0]*M,p[1]*M);else fc.moveTo(p[0]*M,p[1]*M)});fc.closePath();fc.lineWidth=.8;fc.stroke()});
    fc.fillStyle="rgba(255,255,255,"+(.5*a)+")";fc.beginPath();fc.arc(0,0,M*.018,0,7);fc.fill();fc.restore();return true});
  if(FX.flash>.01){fc.fillStyle="rgba(255,255,255,"+FX.flash*.55+")";fc.fillRect(0,0,w,h);FX.flash*=.82}}
requestAnimationFrame(fxLoop);

/* =================== 8. 3D：出拳 / 冲撞 =================== */
var PU={e:null,t0:-1e9,hit:false,ring:null,dir:null,sx:.5,sy:.5,
  go:function(e,sx,sy){if(!e)return;this.e=e;this.t0=performance.now();this.hit=false;this.sx=sx;this.sy=sy;var G=TW.g3;
    var d=G.camera.position.clone().sub(e.grp.position);d.y=0;if(d.lengthSq()<1e-6)d.set(0,0,1);this.dir=d.normalize();
    TW.emit("fire",{id:S.id,act:"punch",via:"gesture"})},
  tick:function(ts,cur){var G=TW.g3,e=this.e;if(!e)return 0;if(e!==cur){this.e=null;return 0}
    var k=(performance.now()-this.t0)/1000,H=e.box.max.y-e.box.min.y,off;
    if(k>=1){e.grp.position.set(0,0,0);e.grp.quaternion.identity();this.e=null;return 0}
    if(k<.14)off=-.07*Math.sin(k/.14*Math.PI/2);else if(k<.28){var q=(k-.14)/.14;off=-.07+.33*q*q}else off=.26*(1-ease((k-.28)/.72));
    var lat=new G.THREE.Vector3().crossVectors(G.UP,this.dir).normalize();
    e.grp.position.copy(this.dir).multiplyScalar(off*H);e.grp.quaternion.setFromAxisAngle(lat,off*.55);
    if(k>=.27&&!this.hit){this.hit=true;FX.crack(this.sx,this.sy);thud();flashToast(S.P&&S.P.punch==="出拳"?"出拳 · PUNCH":"冲撞 · CHARGE","#fff");ringAt(e,this.dir.clone().multiplyScalar(H*.3),H,0xbfefff)}
    return TW.reduce?0:k>.26&&k<.7?.06*(1-(k-.26)/.44):0}};
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
var RINGS=[];
function ringAt(e,pos,H,col){var G=TW.g3,T=G.THREE,m=new T.Mesh(new T.RingGeometry(.92,1,96),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false}));
  m.rotation.x=-Math.PI/2;m.position.set(pos.x,.03,pos.z);G.scene.add(m);RINGS.push({m:m,t0:performance.now(),R:H*1.4})}
function ringTick(){var now=performance.now();RINGS=RINGS.filter(function(r){var k=(now-r.t0)/900;if(k>=1){r.m.parent.remove(r.m);r.m.geometry.dispose();r.m.material.dispose();return false}
  r.m.scale.setScalar(.05+r.R*ease(k));r.m.material.opacity=.9*(1-k);return true})}

/* =================== 9. 3D：引力虹吸的建筑群 =================== */
var DB={grp:null,items:[],phase:"off",t0:0,c:0,e:null,mat:null,geo:null,nextBolt:0,fellHold:false,
  build:function(e){var G=TW.g3,T=G.THREE;if(!this.grp){this.grp=new T.Group();G.scene.add(this.grp);this.geo=new T.BoxGeometry(1,1,1);
      var cv=document.createElement("canvas");cv.width=64;cv.height=128;var x=cv.getContext("2d");x.fillStyle="#11191d";x.fillRect(0,0,64,128);
      for(var r=0;r<16;r++)for(var c=0;c<5;c++){var lit=Math.random()<.35;x.fillStyle=lit?"rgba(255,"+(170+Math.random()*60|0)+",110,"+(.5+Math.random()*.5)+")":"#070c0f";x.fillRect(4+c*12,4+r*7.6,7,4.5)}
      var tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;
      this.mat=new T.MeshStandardMaterial({color:0x8a9aa0,map:tx,emissive:0xffc06a,emissiveMap:tx,emissiveIntensity:.35,roughness:.92,metalness:.05,transparent:true})}
    this.items.forEach(function(it){it.m.parent.remove(it.m)});this.items=[];
    /* 按当前镜头的视锥摆：近景压在画面两侧（不挡怪兽），中景、远景补层次；悬浮高度用投影反算，保证飞起来还在画面里 */
    var b=e.box,H=b.max.y-b.min.y,cam=G.camera,cp=cam.position,fw=G.controls.target.clone().sub(cp);fw.y=0;var D=Math.max(fw.length(),H*.3);fw.normalize();
    var rt=new T.Vector3().crossVectors(fw,G.UP).normalize(),v=new T.Vector3(),hf=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect);
    function ny(x,y,z){v.set(x,y,z).project(cam);return v.y}
    var tries=0;
    while(this.items.length<24&&tries<800){tries++;var n=this.items.length,band=n<10?0:n<18?1:2;
      var dist=D*(band===0?.25+Math.random()*.45:band===1?.7+Math.random()*.45:1.2+Math.random()*1),lat=(Math.random()*2-1)*dist*Math.tan(hf)*1.05;
      var bx=cp.x+fw.x*dist+rt.x*lat,bz=cp.z+fw.z*dist+rt.z*lat;v.set(bx,0,bz).project(cam);var nx=Math.abs(v.x);
      if(nx>.95||(band===0&&nx<.55)||(band===1&&nx<.3)||Math.hypot(bx,bz)<H*.28)continue;
      var sz=band===0?.6:1,w=H*(.035+Math.random()*.05)*sz,h=H*(.08+Math.random()*.2)*sz,dd=H*(.035+Math.random()*.045)*sz;
      var m=new T.Mesh(this.geo,this.mat);m.scale.set(w,h,dd);m.castShadow=true;m.rotation.y=Math.random()*3;m.position.set(bx,-h,bz);this.grp.add(m);
      /* 二分找让楼心落在画面 NDC y∈[.15,.7] 的高度 */
      var goal=band===0?-.05+Math.random()*.45:.15+Math.random()*.55,lo=h/2,hi=H*4;for(var it=0;it<22;it++){var mid=(lo+hi)/2;if(ny(bx,mid,bz)<goal)lo=mid;else hi=mid}
      this.items.push({m:m,bx:bx,bz:bz,h:h,ry:m.rotation.y,delay:band*.12+Math.random()*.35,hover:lo,spin:[(Math.random()-.5)*1.2,(Math.random()-.5)*.8,(Math.random()-.5)*1.2],y:0,vy:0,rot:[0,0,0]})}
    var R=D;
    this.H=H;this.R=R},
  begin:function(e){if(!e)return;this.e=e;this.build(e);this.phase="charge";this.t0=performance.now();this.c=0;this.grp.visible=true;this.mat.opacity=1;this.mat.emissiveIntensity=.35;rumble(1.6,false)},
  lift:function(e){if(this.phase!=="charge")return;this.phase="lift";this.t0=performance.now();this.fellHold=false;var it=this.items;it.forEach(function(q){q.y0=q.m.position.y})},
  abort:function(hard){if(this.phase==="off")return;if(hard||!this.grp){this.phase="off";if(this.grp)this.grp.visible=false;return}this.phase="sink";this.t0=performance.now()},
  tick:function(ts,cur){var G=TW.g3;if(this.phase==="off")return 0;if(cur!==this.e){this.abort(true);return 0}
    var now=performance.now(),el=(now-this.t0)/1000,H=this.H,amp=0,self=this;
    if(this.phase==="charge"){var k=ease(el/.6);this.items.forEach(function(q){var j=self.c*H*.004;q.m.position.set(q.bx+(Math.random()-.5)*j,-q.h/2+q.h*k+self.c*Math.min(q.hover*.22,H*.07)*(.75+.25*Math.sin(el*9+q.bx*40)),q.bz+(Math.random()-.5)*j);
        q.m.rotation.set((Math.random()-.5)*.02*self.c,q.ry,(Math.random()-.5)*.02*self.c)});
      this.mat.emissiveIntensity=.35+.5*this.c;if(Math.random()<.08*this.c&&this.items.length&&ts>this.nextBolt){this.nextBolt=ts+160;var q0=this.items[Math.random()*this.items.length|0];
        var p0=q0.m.position.clone();p0.y=0;G.spawnBolt(p0.clone().add(new G.V3(0,H*.002,0)),p0.clone().add(new G.V3((Math.random()-.5)*H*.15,H*.08,(Math.random()-.5)*H*.15)),H*.02,H*.0012,0xffc24a,ts,90)}
      amp=.004*this.c}
    else if(this.phase==="lift"){G.hold("gravity",.6);
      this.items.forEach(function(q){var s=Math.max(0,el-q.delay),u=Math.min(1,s/1.5),y=q.y0+(q.hover-q.y0)*(1-Math.pow(1-u,3))+Math.sin(el*1.7+q.bx*30)*H*.01*u;
        q.m.position.set(q.bx,y,q.bz);q.rot[0]+=q.spin[0]*.016*u;q.rot[1]+=q.spin[1]*.016*u;q.rot[2]+=q.spin[2]*.016*u;q.m.rotation.set(q.rot[0],q.ry+q.rot[1],q.rot[2])});
      this.mat.emissiveIntensity=.85+.5*Math.sin(el*14)*.3;
      var heads=this.e.heads||[];if(ts>this.nextBolt&&heads.length&&this.items.length&&el<4){this.nextBolt=ts+(TW.reduce?400:110);var hp=this.e.grp.localToWorld(heads[Math.random()*heads.length|0].clone()),q1=this.items[Math.random()*this.items.length|0];
        G.spawnBolt(hp,q1.m.position.clone(),H*.06,H*.0022,Math.random()<.5?0xffb43a:0xffd27a,ts,110)}
      amp=el<1.6?.014:.004;
      if(el>4.2){this.phase="fall";this.t0=now;this.items.forEach(function(q){q.y0=q.m.position.y;q.vy=0;q.landed=false});G.hold("gravity",4.2);rumble(2,false)}}
    else if(this.phase==="fall"){var g=H*3.2,landed=0;
      this.items.forEach(function(q){if(!q.landed){q.vy+=g*.016;var y=q.m.position.y-q.vy*.016;if(y<=q.h*.3){y=q.h*.3;q.landed=true;amp=Math.max(amp,.02)}q.m.position.y=y;q.rot[0]+=q.spin[0]*.03;q.rot[2]+=q.spin[2]*.03;q.m.rotation.set(q.rot[0],q.ry+q.rot[1],q.rot[2])}else landed++});
      this.mat.emissiveIntensity=Math.max(.1,this.mat.emissiveIntensity*.97);if(el>1.1)this.mat.opacity=Math.max(0,1-(el-1.1)/1.2);if(el>2.3){this.phase="off";this.grp.visible=false}}
    else if(this.phase==="sink"){var kk=ease(el/.7);this.items.forEach(function(q){q.m.position.y=(q.h/2)*(1-kk)-q.h*kk*.6});this.mat.opacity=1-kk;if(el>.7){this.phase="off";this.grp.visible=false}}
    return TW.reduce?0:amp}};

/* =================== 9b. 霓虹摩斯拉（彩蛋） =================== */
var NEON={until:0,on:false,e:null,save:null,
  tick:function(ts,cur){var G=TW.g3,sp=G.sparks,now=performance.now(),want=now<this.until&&cur&&/mothra/.test(cur.id||TW.current()||"");
    if(!want){if(this.on){this.on=false;if(this.e&&this.save)this.e.mats.forEach(function(m,i){if(m.emissive)m.emissive.copy(NEON.save[i])});
        if(sp){sp.mat.color.setHex(0x9ff8ff);var c=sp.geo.attributes.color;for(var i=0;i<c.count;i++){var v=.55+.45*Math.random();c.setXYZ(i,v,v,v)}c.needsUpdate=true}}return 0}
    var T=G.THREE,t=ts/1000,col=new T.Color();
    if(!this.on){this.on=true;this.e=cur;this.save=cur.mats.map(function(m){return m.emissive?m.emissive.clone():null});
      if(sp){sp.mat.color.setHex(0xffffff);var cc=sp.geo.attributes.color;for(var j=0;j<cc.count;j++){col.setHSL([.89,.76,.52][j%3]+(Math.random()-.5)*.05,1,.6);cc.setXYZ(j,col.r,col.g,col.b)}cc.needsUpdate=true}}
    /* 色相在 粉(.89)→紫(.76)→青(.52) 之间来回流动 */
    var h=.705+.185*Math.sin(t*1.6);col.setHSL(h,1,.55);cur.mats.forEach(function(m){if(m.emissive)m.emissive.copy(col)});G.fxLight.color.copy(col);
    return 0}};

/* 挂到 3D 渲染循环上（index.html 的 init3D 是异步的，等它准备好） */
(function waitG3(){if(!TW.g3){setTimeout(waitG3,400);return}TW.g3.hook(function(ts,cur){ringTick();if(S.hA&&cur&&(S.mode==="charge"||S.mode==="fizzle"||S.mode==="sCharge"))TW.g3.hold(S.hA,S.hP);NEON.tick(ts,cur);return Math.max(PU.tick(ts,cur),DB.tick(ts,cur))});if(ON)refreshList()})();

/* =================== 10. 对外接口（调试 / 测试用） =================== */
TW.gesture={_neon:NEON,setView:setView,_preview:drawPreview,_mk:MK,enable:enable,disable:disable,classify:classify,zigzag:zigzag,profile:prof,state:S,
  /* 喂一帧假的识别结果：{lm:[21 点],wl:[21 点]}，或 null 表示没看到手 */
  feed:function(hand,now){if(!S.P)refreshList();step(now||performance.now(),hand)},
  _fx:FX,_db:DB,_pu:PU};
})();
