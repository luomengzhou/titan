/* =====================================================================
   tw-vs-battle.js — VS 里真的打一下
   三回合光束角力：蓄力 → 光束对撞 → 交汇点按能量/力量来回推 →
   被推到底的一方吃伤害。血量归零 KO，否则三回合后判定。
   两种模式：
   · Lab（默认）：自己画剪影、光束、火花、震屏
   · 主页面（TW.vsHas3D = true）：只叠 HUD + 角力条，并调用
     TW.vsFire(side, act) 让 3D 模型自己放技能（见 INTEGRATION.md）
   结束时 TW.emit("battle",{a,b,winner})，解密模块据此记「交战记录」。
   ===================================================================== */
(function(){
"use strict";
var TW=window.TW;if(!TW)return;
var W8={power:.25,defense:.2,energy:.2,endurance:.15,speed:.1,intelligence:.1};
function score(t){var s=0,st=t.stats||{};for(var k in W8)s+=(st[k]||0)*W8[k];return s}
function winP(a,b){return 1/(1+Math.exp(-(score(a)-score(b))/5))}
var BEAM={heat:"#7fd8ff",gravity:"#ffd34d",lava:"#ff7a2e",glow:"#fff1b8",emp:"#ff4d6a",frost:"#c9f4ff",proton:"#ff5cf0"};
var SKN={heat:"原子吐息",gravity:"引力光线",lava:"熔岩烈焰",glow:"鳞粉之光",emp:"电磁脉冲",frost:"冰冻吐息",proton:"质子光束"};
function style(t){var sk=TW.skill&&TW.skill(t.id),en=(t.stats||{}).energy||0;
  if(sk)return{kind:"beam",col:BEAM[sk]||t.color,name:SKN[sk]||"光束",act:sk};
  if(/godzilla|zilla/.test(t.id))return{kind:"beam",col:"#7fd8ff",name:"原子吐息",act:"heat"};
  if(en>=70)return{kind:"beam",col:t.color,name:"能量光束",act:null};
  return{kind:"wave",col:t.color,name:"咆哮冲击",act:null}}
function form(t){var id=t.id;if(/ghidorah/.test(id))return"hydra";if(/rodan|warbat|mothra|ion-dragon/.test(id))return"flyer";if(/kong|suko|skar/.test(id))return"ape";
  if(/muto|skullcrawler|longlegs|scylla|shimo|behemoth|methuselah|tiamat|kraken|abaddon|mokele|leviathan/.test(id))return"quad";return"biped"}
function realH(t){return t.height_m||(t.length_m?t.length_m*.35:null)||50}

/* ---------------- DOM ---------------- */
var css=document.createElement("style");css.textContent=
".twb{position:absolute;inset:0;pointer-events:none;font-family:var(--f-display)}"+
".twb canvas{position:absolute;inset:0;width:100%;height:100%}"+
".twb-hp{position:absolute;top:12px;left:14px;right:14px;display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center}"+
".twb-s{display:flex;flex-direction:column;gap:4px}.twb-s.r{align-items:flex-end}"+
".twb-n{font:700 20px/1 var(--f-display);letter-spacing:.08em;text-transform:uppercase;color:var(--c);text-shadow:0 1px 6px #000}.twb-n small{font:11px var(--f-mono);color:var(--dim);margin:0 6px}"+
".twb-bar{width:100%;height:10px;background:#0009;border:1px solid #fff2;border-radius:0;overflow:hidden;position:relative}"+
".twb-bar i{position:absolute;top:0;bottom:0;background:#fff8;transition:width .9s .25s}.twb-bar b{position:absolute;top:0;bottom:0;background:var(--c);transition:width .2s;box-shadow:0 0 10px var(--c)}"+
".twb-s.r .twb-bar i,.twb-s.r .twb-bar b{right:0}.twb-s:not(.r) .twb-bar i,.twb-s:not(.r) .twb-bar b{left:0}"+
".twb-rd{font:400 26px VT323,var(--f-mono);color:var(--amber);text-align:center;line-height:1}.twb-rd small{display:block;font:10px var(--f-mono);color:var(--dim);letter-spacing:.12em}"+
".twb-clash{position:absolute;left:14%;right:14%;bottom:54px;height:8px;border-radius:0;background:linear-gradient(90deg,var(--ca),#fff 50%,var(--cb));opacity:0;transition:opacity .3s}"+
".twb-clash.on{opacity:.9}.twb-clash i{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;box-shadow:0 0 14px #fff,0 0 30px var(--amber)}"+
".twb-log{position:absolute;left:0;right:0;bottom:16px;text-align:center;font:13px var(--f-mono);color:var(--ink);text-shadow:0 1px 4px #000}"+
".twb-go{pointer-events:auto;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid var(--amber);background:#08080acc;color:var(--amber);border-radius:0;padding:12px 26px;font:700 20px var(--f-display);letter-spacing:.18em;box-shadow:0 0 30px #f3a83a44}"+
".twb-go:hover{background:#f3a83a22}.twb-go small{display:block;font:11px var(--f-mono);letter-spacing:.06em;color:var(--dim);margin-top:4px}"+
".twb-win{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(.8);opacity:0;text-align:center;transition:all .5s cubic-bezier(.2,1.4,.4,1)}"+
".twb-win.on{opacity:1;transform:translate(-50%,-50%) scale(1)}.twb-win b{display:block;font:700 40px var(--f-display);letter-spacing:.1em;color:var(--c);text-shadow:0 0 24px var(--c),0 2px 0 #000}"+
".twb-win span{font:12px var(--f-mono);color:var(--ink);letter-spacing:.14em}";
document.head.appendChild(css);

var root=null,cv,cx,ui={},B=null,raf=0;
function mount(arena){if(root&&root.parentNode===arena)return;root=document.createElement("div");root.className="twb";
  root.innerHTML="<canvas></canvas><div class='twb-hp'><div class='twb-s' data-s='a'><div class='twb-n'></div><div class='twb-bar'><i></i><b></b></div></div><div class='twb-rd'></div><div class='twb-s r' data-s='b'><div class='twb-n'></div><div class='twb-bar'><i></i><b></b></div></div></div>"+
    "<div class='twb-clash'><i></i></div><div class='twb-log' aria-live='polite'></div><button class='twb-go'></button><div class='twb-win'></div>";
  arena.appendChild(root);cv=root.querySelector("canvas");cx=cv.getContext("2d");
  ["a","b"].forEach(function(s){var el=root.querySelector("[data-s='"+s+"']");ui[s]={el:el,n:el.querySelector(".twb-n"),ghost:el.querySelector("i"),hp:el.querySelector("b")}});
  ui.rd=root.querySelector(".twb-rd");ui.clash=root.querySelector(".twb-clash");ui.dot=ui.clash.querySelector("i");ui.log=root.querySelector(".twb-log");ui.go=root.querySelector(".twb-go");ui.win=root.querySelector(".twb-win");
  ui.go.onclick=fight}

function setup(a,b){var A=TW.byId[a],Bt=TW.byId[b];if(!A||!Bt)return;
  B={A:A,B:Bt,sa:style(A),sb:style(Bt),fa:form(A),fb:form(Bt),hp:{a:100,b:100},phase:"idle",t0:0,round:0,c:0,charge:0,shake:0,flash:0,parts:[],hit:null,result:null,seed:Math.random()*1e3};
  root.style.setProperty("--ca",A.color);root.style.setProperty("--cb",Bt.color);
  ui.a.el.style.setProperty("--c",A.color);ui.b.el.style.setProperty("--c",Bt.color);
  ui.a.n.innerHTML=esc(TW.dn(A))+"<small>"+B.sa.name+"</small>";ui.b.n.innerHTML="<small>"+B.sb.name+"</small>"+esc(TW.dn(Bt));
  var p=winP(A,Bt);ui.go.innerHTML="FIGHT ▸<small>预测胜率 "+Math.round(p*100)+" : "+Math.round((1-p)*100)+"</small>";ui.go.style.display="";
  ui.win.classList.remove("on");ui.clash.classList.remove("on");ui.log.textContent="";ui.rd.innerHTML="";hp();
  cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function hp(){["a","b"].forEach(function(s){var v=Math.max(0,B.hp[s]);ui[s].hp.style.width=v+"%";ui[s].ghost.style.width=v+"%"})}
function log(m){ui.log.textContent=m}

/* ---------------- simulation ---------------- */
var CHARGE=1.3,CLASH=2.8,AFTER=1.1;
function fight(){if(!B)return;B.hp={a:100,b:100};B.round=0;B.result=null;hp();ui.go.style.display="none";ui.win.classList.remove("on");nextRound()}
function nextRound(){B.round++;B.phase="charge";B.t0=performance.now();B.c=0;B.charge=0;
  ui.rd.innerHTML="R"+B.round+"<small>ROUND</small>";log("双方蓄力 …");
  if(TW.vsFire){TW.vsFire("a",B.sa.act);TW.vsFire("b",B.sb.act)}}
function push(t){var s=t.stats||{};return(s.energy||0)*.55+(s.power||0)*.35+(s.intelligence||0)*.1}
function step(dt,now){var el=(now-B.t0)/1000;
  if(B.phase==="charge"){B.charge=Math.min(1,el/CHARGE);if(el>=CHARGE){B.phase="clash";B.t0=now;ui.clash.classList.add("on");log(B.A.name_cn+" 的"+B.sa.name+" 与 "+B.B.name_cn+" 的"+B.sb.name+" 正面对撞！")}}
  else if(B.phase==="clash"){
    /* + pushes toward B */
    var f=(push(B.A)-push(B.B))/40,noise=Math.sin(el*5.3+B.seed)*.55+Math.sin(el*11.7+B.seed*2)*.3+(Math.random()-.5)*.9;
    var tired=(B.hp.b-B.hp.a)/260;B.c+=(f+noise*.9+tired)*dt*.85;B.c=Math.max(-1,Math.min(1,B.c));
    ui.dot.style.left=(50+B.c*50)+"%";
    if(Math.random()<.5)spark();
    if(Math.abs(B.c)>=1||el>=CLASH)resolve(now)}
  else if(B.phase==="after"){if(el>=AFTER){if(B.result)finish();else nextRound()}}
}
function resolve(now){var loser=B.c>0?"b":"a",win=loser==="a"?"b":"a",T=loser==="a"?B.A:B.B,W=loser==="a"?B.B:B.A,over=Math.abs(B.c)>=1;
  var def=(T.stats||{}).defense||50,end=(T.stats||{}).endurance||50,dmg=(16+Math.abs(B.c)*26+(over?14:0))*(1-def/260)*(1-end/400);
  if(Math.abs(B.c)<.12){dmg*=.4;B.hp.a-=dmg*.5;B.hp.b-=dmg*.5;log("势均力敌！光束同时炸开，双方各自受创");B.hit="both"}
  else{B.hp[loser]-=dmg;B.hit=loser;log((over?"压制！":"")+W.name_cn+" 把交汇点推到底，"+T.name_cn+" 受到 "+Math.round(dmg)+" 点伤害")}
  B.shake=over?1:.6;B.flash=1;burst(loser);hp();ui.clash.classList.remove("on");
  B.phase="after";B.t0=now;
  if(B.hp.a<=0||B.hp.b<=0)B.result={w:B.hp.a<=0?"b":"a",ko:true};else if(B.round>=3)B.result={w:B.hp.a>=B.hp.b?"a":"b",ko:false}}
function finish(){var w=B.result.w,T=w==="a"?B.A:B.B;B.phase="done";
  ui.win.style.setProperty("--c",T.color);ui.win.innerHTML="<b>"+esc(TW.dn(T))+"</b><span>"+(B.result.ko?"K.O. · 第 "+B.round+" 回合":"三回合判定胜")+"</span>";ui.win.classList.add("on");
  log("剩余血量 "+Math.max(0,Math.round(B.hp.a))+" : "+Math.max(0,Math.round(B.hp.b)));
  ui.go.innerHTML="再战 ↻<small>结果有随机性</small>";ui.go.style.display="";
  TW.emit("battle",{a:B.A.id,b:B.B.id,winner:T.id,ko:B.result.ko})}

/* ---------------- drawing (lab mode) ---------------- */
var G={};
function layout(){var r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(cv.width!==(r.width*d|0)||cv.height!==(r.height*d|0)){cv.width=r.width*d;cv.height=r.height*d}cx.setTransform(d,0,0,d,0,0);
  G.w=r.width;G.h=r.height;G.gy=G.h*.84;var mx=Math.max(realH(B.A),realH(B.B))*1.12;G.k=(G.h*.6)/mx;G.xa=G.w*.24;G.xb=G.w*.76}
function bg(ts){var w=G.w,h=G.h,gy=G.gy;
  var sky=cx.createLinearGradient(0,0,0,gy);sky.addColorStop(0,"#050d12");sky.addColorStop(1,"#0f2a35");cx.fillStyle=sky;cx.fillRect(0,0,w,h);
  /* skyline */
  var r=B.seed;cx.fillStyle="#0a1a22";for(var x=-10;x<w;){r=(r*9301+49297)%233280;var bw=14+r/233280*30,bh=12+((r*7)%233280)/233280*h*.16;cx.fillRect(x,gy-bh,bw-2,bh);x+=bw}
  cx.fillStyle="#04090c";cx.fillRect(0,gy,w,h-gy);
  cx.strokeStyle="rgba(228,223,211,.12)";cx.lineWidth=1;for(var i=1;i<8;i++){var y=gy+Math.pow(i/8,1.6)*(h-gy);cx.beginPath();cx.moveTo(0,y);cx.lineTo(w,y);cx.stroke()}
  for(i=-10;i<=10;i++){cx.beginPath();cx.moveTo(w/2+i*30,gy);cx.lineTo(w/2+i*140,h);cx.stroke()}
  /* height ruler */
  cx.fillStyle="rgba(138,134,124,.6)";cx.font="10px 'IBM Plex Mono',monospace";var step=G.k*50>40?50:100;
  for(var m=step;m*G.k<gy*.95;m+=step){var yy=gy-m*G.k;cx.fillRect(6,yy,8,1);cx.fillText(m+" m",18,yy+3)}}
/* procedural kaiju silhouette; returns mouth point */
function kaiju(t,f,x,H,dir,ts,charge,col,hit){var u=H/100,gy=G.gy,bob=TW.reduce?0:Math.sin(ts/600+x)*u*.8;
  cx.save();cx.translate(x,gy);cx.scale(dir,1);if(hit){cx.translate(-hit*u*8,0)}
  var body="#0c0c0e",rim=t.color;cx.fillStyle=body;cx.strokeStyle=rim;cx.lineWidth=1.4;cx.shadowColor=rim;cx.shadowBlur=10;
  var mouth;cx.beginPath();
  if(f==="quad"){cx.ellipse(0,-34*u+bob,40*u,17*u,0,0,7);cx.moveTo(30*u,-40*u+bob);cx.ellipse(44*u,-44*u+bob,12*u,8*u,-.2,0,7);
    [-28,-12,10,24].forEach(function(lx,i){cx.moveTo(lx*u,-28*u+bob);cx.lineTo((lx+(i%2?6:-6))*u,0);cx.lineTo((lx+(i%2?10:-2))*u,0)});
    cx.moveTo(-36*u,-36*u+bob);cx.quadraticCurveTo(-70*u,-20*u,-90*u,-6*u);mouth=[56*u,-44*u+bob]}
  else if(f==="ape"){cx.ellipse(0,-58*u+bob,22*u,26*u,0,0,7);cx.moveTo(14*u,-84*u+bob);cx.ellipse(10*u,-86*u+bob,10*u,10*u,0,0,7);
    cx.moveTo(-14*u,-36*u);cx.lineTo(-18*u,0);cx.lineTo(-6*u,0);cx.lineTo(-2*u,-34*u);cx.moveTo(6*u,-36*u);cx.lineTo(10*u,0);cx.lineTo(22*u,0);cx.lineTo(16*u,-36*u);
    cx.moveTo(18*u,-70*u+bob);cx.lineTo(34*u,-30*u);cx.lineTo(30*u,-4*u);cx.lineTo(24*u,-30*u);cx.lineTo(12*u,-60*u);mouth=[20*u,-84*u+bob]}
  else{/* biped / flyer / hydra */
    var fly=f==="flyer";cx.ellipse(0,-46*u+bob,fly?14*u:18*u,fly?20*u:27*u,-.25,0,7);
    cx.moveTo(-12*u,-28*u);cx.lineTo(-16*u,0);cx.lineTo(-4*u,0);cx.lineTo(-2*u,-26*u);cx.moveTo(4*u,-26*u);cx.lineTo(8*u,0);cx.lineTo(20*u,0);cx.lineTo(14*u,-30*u);
    if(!fly){cx.moveTo(-14*u,-34*u);cx.quadraticCurveTo(-50*u,-20*u,-78*u,-4*u);cx.quadraticCurveTo(-48*u,-14*u,-8*u,-26*u)}
    var heads=f==="hydra"?[[-8,-98],[10,-92],[26,-84]]:[[16,-80]];
    heads.forEach(function(hh,i){var hx=hh[0]*u,hy=hh[1]*u+bob+(f==="hydra"&&!TW.reduce?Math.sin(ts/400+i*2)*u*2:0);cx.moveTo(6*u,-64*u+bob);cx.quadraticCurveTo(hx-4*u,hy+14*u,hx,hy);cx.lineTo(hx+12*u,hy+2*u);cx.lineTo(hx+2*u,hy+6*u);cx.moveTo(hx,hy);cx.ellipse(hx+3*u,hy+2*u,7*u,5*u,-.2,0,7)});
    var hd=heads[f==="hydra"?1:0];mouth=[hd[0]*u+14*u,hd[1]*u+bob+3*u];
    if(fly||f==="hydra"){var fl=TW.reduce?0:Math.sin(ts/(fly?220:500))*u*10;cx.moveTo(0,-60*u+bob);cx.lineTo(-60*u,-110*u+fl);cx.lineTo(-40*u,-70*u+fl*.5);cx.lineTo(-70*u,-62*u+fl*.3);cx.lineTo(-6*u,-46*u+bob)}}
  cx.fill();cx.stroke();cx.shadowBlur=0;
  /* dorsal plates light up tail → head while charging (godzilla family) */
  if(/godzilla|zilla/.test(t.id)&&f==="biped"){var N=9;for(var i=0;i<N;i++){var k=i/(N-1),px=-60*u+k*58*u,py=(-10-k*58)*u+bob*k,sz=(4+Math.sin(k*Math.PI)*6)*u,lit=charge>0&&charge*1.15>k;
      cx.fillStyle=lit?col:"#0c0c0e";cx.strokeStyle=lit?"#fff":rim;cx.shadowColor=col;cx.shadowBlur=lit?14:0;cx.beginPath();cx.moveTo(px-sz*.5,py);cx.lineTo(px-sz*.1,py-sz*1.4);cx.lineTo(px+sz*.5,py);cx.closePath();cx.fill();cx.stroke()}cx.shadowBlur=0}
  else if(charge>0){cx.fillStyle=col;cx.globalAlpha=charge*.8;cx.shadowColor=col;cx.shadowBlur=20*charge;cx.beginPath();cx.arc(mouth[0],mouth[1],u*3*charge+1,0,7);cx.fill();cx.globalAlpha=1;cx.shadowBlur=0}
  cx.restore();return[x+mouth[0]*dir,G.gy+mouth[1]]}
function beam(p0,p1,col,kind,ts,wid){cx.save();cx.globalCompositeOperation="lighter";
  if(kind==="wave"){var n=6,dx=p1[0]-p0[0],dy=p1[1]-p0[1];for(var i=0;i<n;i++){var k=((ts/500)+i/n)%1,x=p0[0]+dx*k,y=p0[1]+dy*k;cx.strokeStyle=col;cx.globalAlpha=.7*(1-k*.5);cx.lineWidth=2;cx.beginPath();cx.arc(x,y,6+k*18,-.9+(dx<0?Math.PI:0),.9+(dx<0?Math.PI:0));cx.stroke()}cx.restore();return}
  var j=TW.reduce?0:1;[[wid*3.2,.18],[wid*1.6,.45],[wid*.55,1]].forEach(function(l,i){cx.strokeStyle=i===2?"#fff":col;cx.globalAlpha=l[1];cx.lineWidth=l[0]*(1+j*.15*Math.sin(ts/30+i));cx.lineCap="round";cx.beginPath();cx.moveTo(p0[0],p0[1]);
    var segs=10;for(var s=1;s<=segs;s++){var k=s/segs;cx.lineTo(p0[0]+(p1[0]-p0[0])*k,p0[1]+(p1[1]-p0[1])*k+(s<segs?j*Math.sin(ts/40+s*1.7)*wid*.25:0))}cx.stroke()});cx.restore()}
function spark(){if(!G.cp)return;for(var i=0;i<3;i++)B.parts.push({x:G.cp[0],y:G.cp[1],vx:(Math.random()-.5)*7,vy:(Math.random()-.8)*6,l:1,c:Math.random()<.5?B.sa.col:B.sb.col})}
function burst(s){var p=s==="both"?G.cp:(s==="a"?G.ma:G.mb);if(!p)return;for(var i=0;i<46;i++){var a=Math.random()*6.28,v=2+Math.random()*9;B.parts.push({x:p[0],y:p[1],vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,l:1.3,c:i%3?"#fff":(s==="a"?B.sb.col:B.sa.col)})}}
var lastT=0;
function loop(ts){raf=requestAnimationFrame(loop);if(!B||!root||!root.isConnected||!root.offsetParent){return}
  var dt=Math.min(.05,(ts-(lastT||ts))/1000);lastT=ts;if(B.phase!=="idle"&&B.phase!=="done")step(dt,performance.now());
  layout();var lab=!TW.vsHas3D;cx.clearRect(0,0,G.w,G.h);
  var sh=B.shake*(TW.reduce?0:6);B.shake*=.9;cx.save();cx.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
  if(lab){bg(ts);
    var ch=B.phase==="charge"?B.charge:B.phase==="clash"?1:0,ha=B.phase==="after"&&(B.hit==="a"||B.hit==="both")?Math.max(0,1-(performance.now()-B.t0)/500):0,hb=B.phase==="after"&&(B.hit==="b"||B.hit==="both")?Math.max(0,1-(performance.now()-B.t0)/500):0;
    var dA=B.phase==="done"&&B.result.w==="b",dB=B.phase==="done"&&B.result.w==="a";
    cx.globalAlpha=dA?.35:1;G.ma=kaiju(B.A,B.fa,G.xa,realH(B.A)*G.k,1,ts,ch,B.sa.col,ha);
    cx.globalAlpha=dB?.35:1;G.mb=kaiju(B.B,B.fb,G.xb,realH(B.B)*G.k,-1,ts,ch,B.sb.col,hb);cx.globalAlpha=1;
    if(B.phase==="clash"){var k=(B.c+1)/2,cp=[G.ma[0]+(G.mb[0]-G.ma[0])*k,G.ma[1]+(G.mb[1]-G.ma[1])*k];G.cp=cp;
      beam(G.ma,cp,B.sa.col,B.sa.kind,ts,Math.max(5,G.h*.014));beam(G.mb,cp,B.sb.col,B.sb.kind,ts,Math.max(5,G.h*.014));
      cx.save();cx.globalCompositeOperation="lighter";var fr=G.h*(.05+.015*Math.sin(ts/50)),gr=cx.createRadialGradient(cp[0],cp[1],0,cp[0],cp[1],fr*2.2);gr.addColorStop(0,"#fff");gr.addColorStop(.3,"rgba(255,240,200,.8)");gr.addColorStop(1,"rgba(255,200,120,0)");cx.fillStyle=gr;cx.beginPath();cx.arc(cp[0],cp[1],fr*2.2,0,7);cx.fill();cx.restore()}}
  /* particles */
  cx.save();cx.globalCompositeOperation="lighter";B.parts=B.parts.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=.18;p.l-=.025;if(p.l<=0)return false;cx.globalAlpha=Math.min(1,p.l);cx.fillStyle=p.c;cx.fillRect(p.x,p.y,2.2,2.2);return true});cx.restore();
  cx.restore();
  if(B.flash>0){cx.fillStyle="rgba(255,255,255,"+(B.flash*.5)+")";cx.fillRect(0,0,G.w,G.h);B.flash*=.82;if(B.flash<.02)B.flash=0}}

TW.on("vs",function(d){var ar=d.arena||TW.vsArena;if(!ar)return;mount(ar);setup(d.a,d.b)});
TW.on("vsclose",function(){if(B)B.phase="idle"});
TW.battle={score:score,winP:winP};
})();
