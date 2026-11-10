/* =====================================================================
   tw-idle.js — 闲置警报
   页面放着不动一阵子（默认 40 秒），随机一个出没点开始闪红圈，
   右下角弹出「检测到异常活动」。点「前往」飞过去并打开档案。
   依赖：TW.on("draw"|"activity")，TW.flyTo，TW.select，TW.filters。
   ===================================================================== */
(function(){
"use strict";
var TW=window.TW;if(!TW)return;
var IDLE_MS=(window.TW_IDLE_MS||40000),last=performance.now(),alert=null,snooze=0;

var css=document.createElement("style");css.textContent=
".twi{position:fixed;right:16px;bottom:16px;z-index:25;width:300px;background:linear-gradient(180deg,#1a0b0b,#0e0e10);border:1px solid var(--alert);border-radius:0;box-shadow:0 0 0 1px #000,0 10px 40px #000c,0 0 30px #c9382d33;font-size:13px;transform:translateY(140%);transition:transform .45s cubic-bezier(.2,1.3,.4,1)}"+
".twi.on{transform:none}.twi-h{display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--alert);color:#140404;font:700 11px var(--f-mono);letter-spacing:.14em}"+
".twi-h i{width:8px;height:8px;border-radius:50%;background:#140404;animation:twib 1s steps(2) infinite}@keyframes twib{50%{opacity:.15}}"+
".twi-b{padding:10px 12px 4px}.twi-b b{font:700 17px var(--f-display);color:var(--ink)}.twi-b p{margin:2px 0 6px;color:var(--dim);font:11.5px var(--f-mono)}"+
".twi-m{display:grid;grid-template-columns:auto 1fr;gap:1px 10px;font:11px var(--f-mono);color:var(--dim)}.twi-m span:nth-child(even){color:var(--ink)}"+
".twi-a{display:flex;gap:8px;padding:10px 12px}.twi-a button{flex:1;border-radius:0;padding:6px;font:600 12px var(--f-display);letter-spacing:.06em}"+
".twi-go{background:var(--alert);border:0;color:#140404}.twi-no{background:none;border:1px solid var(--seam)}"+
"@media (prefers-reduced-motion:reduce){.twi{transition:none}.twi-h i{animation:none}}";
document.head.appendChild(css);
var box=document.createElement("div");box.className="twi";box.setAttribute("role","alert");document.body.appendChild(box);

function pick(){var c=[];TW.data.titans.forEach(function(t){for(var k in TW.filters)if(!TW.filters[k](t))return;(t.locations||[]).forEach(function(l){c.push({t:t,l:l})})});
  if(!c.length)return null;var cur=TW.current(),o=c.filter(function(x){return x.t.id!==cur});o=o.length?o:c;return o[(Math.random()*o.length)|0]}
function fmt(la,lo){return Math.abs(la).toFixed(2)+"°"+(la>=0?"N":"S")+" "+Math.abs(lo).toFixed(2)+"°"+(lo>=0?"E":"W")}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function ping(){try{var AC=window.AudioContext||window.webkitAudioContext,c=ping.c||(ping.c=new AC());if(c.state!=="running")return;
  [0,.22].forEach(function(dt){var o=c.createOscillator(),g=c.createGain(),t=c.currentTime+dt;o.frequency.setValueAtTime(1480,t);o.frequency.exponentialRampToValueAtTime(980,t+.5);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.9);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+1)})}catch(e){}}
/* audio context may only start after a gesture: warm it on the first one */
addEventListener("pointerdown",function w(){try{var AC=window.AudioContext||window.webkitAudioContext;ping.c=ping.c||new AC();ping.c.resume()}catch(e){}removeEventListener("pointerdown",w)},{once:true});

function raise(){var x=pick();if(!x)return;var conf=60+Math.round(Math.random()*35),mag=(4+Math.random()*4.5).toFixed(1);
  alert={t:x.t,l:x.l,t0:performance.now()};
  box.style.setProperty("--c",x.t.color);
  box.innerHTML="<div class='twi-h'><i></i>ANOMALY DETECTED · 异常活动</div>"+
    "<div class='twi-b'><b>"+esc(x.l.name)+"</b><p>"+fmt(x.l.lat,x.l.lon)+"</p>"+
    "<div class='twi-m'><span>震级</span><span>M "+mag+"</span><span>声纹匹配</span><span style='color:"+x.t.color+"'>"+esc(x.t.name_cn)+" · "+conf+"%</span><span>状态</span><span>"+(conf>85?"确认":"待核实")+"</span></div></div>"+
    "<div class='twi-a'><button class='twi-go'>前往 ▸</button><button class='twi-no'>忽略</button></div>";
  box.querySelector(".twi-go").onclick=function(){var a=alert;clear();if(a){TW.flyTo(a.l.lat,a.l.lon);TW.select(a.t.id,(a.t.locations||[]).indexOf(a.l));TW.emit("idle-go",{id:a.t.id})}};
  box.querySelector(".twi-no").onclick=function(){clear();snooze=performance.now()+IDLE_MS};
  box.classList.add("on");ping();TW.emit("idle-alert",{id:x.t.id,loc:x.l.name})}
function clear(){alert=null;box.classList.remove("on");last=performance.now()}

TW.on("activity",function(){last=performance.now()});
setInterval(function(){var now=performance.now();if(document.hidden||alert||now<snooze)return;
  if(document.querySelector("#vs.on"))return;var gt=document.getElementById("gate");if(gt&&getComputedStyle(gt).display!=="none")return;if(now-last>IDLE_MS)raise()},1000);

TW.on("draw",function(d){if(!alert)return;var p=d.proj(alert.l.lat,alert.l.lon);if(p.z<0)return;var c=d.ctx,k=TW.reduce?.5:((d.ts-alert.t0)/1200)%1;
  c.save();c.strokeStyle="#c9382d";for(var i=0;i<3;i++){var kk=(k+i/3)%1;c.globalAlpha=(1-kk)*.9;c.lineWidth=1.5;c.beginPath();c.arc(p.x,p.y,4+kk*34,0,7);c.stroke()}
  c.globalAlpha=1;c.fillStyle="#c9382d";c.beginPath();c.arc(p.x,p.y,4,0,7);c.fill();
  c.strokeStyle="rgba(201,56,45,.5)";c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.moveTo(p.x-60,p.y);c.lineTo(p.x+60,p.y);c.moveTo(p.x,p.y-60);c.lineTo(p.x,p.y+60);c.stroke();c.restore()});

TW.idle={trigger:raise,clear:clear};
})();
