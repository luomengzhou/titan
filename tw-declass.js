/* =====================================================================
   tw-declass.js — 档案解密进度
   档案 bio 默认按句打码，完成「查看 / 3D / 技能 / Story / VS / 吼声」
   逐级解密；名录显示每只的解密百分比。进度存 localStorage。
   依赖：TW.on(select|3d|fire|story|vs|roar|roster)，TW.caps(id)，
        档案里 bio 段落带 data-tw="bio"，名录按钮带 data-id。
   ===================================================================== */
(function(){
"use strict";
var TW=window.TW;if(!TW)return;
var KEY="tw_declass_v1",P={};try{P=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){P={}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(P))}catch(e){}}

var STEPS=[["view","建立档案","选中这只泰坦"],["3d","目视确认","在 3D 中观察"],["fire","能量取样","释放一次技能"],["story","事件回溯","播放相关 Story"],["vs","交战记录","在 VS 中对战"],["roar","声纹比对","播放生物声学签名"]];
function avail(id){var c=TW.caps(id);return STEPS.filter(function(s){return s[0]==="3d"?c.model:s[0]==="fire"?c.skill:s[0]==="story"?c.story:true})}
function done(id){return P[id]||(P[id]={})}
function pct(id){var a=avail(id),d=done(id),n=a.filter(function(s){return d[s[0]]}).length;return a.length?n/a.length:0}

var css=document.createElement("style");css.textContent=
".twd{margin:6px 0 2px}.twd-top{display:flex;align-items:center;gap:8px;font:500 10.5px var(--f-mono);letter-spacing:.1em;color:var(--dim)}"+
".twd-bar{flex:1;height:4px;background:var(--seam);border-radius:0;overflow:hidden}.twd-bar i{display:block;height:100%;background:var(--amber);transition:width .8s}"+
".twd-top b{color:var(--amber);font-weight:500}.twd-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}"+
".twd-chips span{font:10.5px var(--f-mono);padding:1px 6px;border:1px solid var(--seam);border-radius:0;color:var(--dim)}"+
".twd-chips span.ok{border-color:var(--amber);color:var(--amber)}.twd-chips span.ok:before{content:'✓ '}"+
".twd-x{background:#000;color:transparent;border-radius:0;padding:0 1px;box-decoration-break:clone;-webkit-box-decoration-break:clone;position:relative;cursor:help;user-select:none}"+
".twd-x:hover{background:#1a0c0c;outline:1px solid var(--alert);color:var(--alert)}"+
".twd-x:hover:after{content:attr(data-need);position:absolute;left:0;top:-20px;white-space:nowrap;font:10px var(--f-mono);background:var(--alert);color:#000;padding:1px 6px;border-radius:0;z-index:3}"+
".twd-dec{color:var(--amber);font-family:var(--f-mono)}"+
".twd-badge{font:10px var(--f-mono)!important;color:var(--dim)!important;min-width:30px;text-align:right}.twd-badge.full{color:var(--amber)!important}"+
".twd-toast{position:fixed;right:16px;top:60px;z-index:30;background:var(--hull);border:1px solid var(--amber);border-left:4px solid var(--amber);border-radius:0;padding:8px 12px;font:12px var(--f-mono);color:var(--amber);box-shadow:0 8px 30px #000a;transform:translateX(120%);transition:transform .35s}"+
".twd-toast.on{transform:none}";
document.head.appendChild(css);

/* ---------- bio redaction ---------- */
var curId=null,bioEl=null,sents=[];
function split(txt){var a=(txt||"").match(/[^。！？]+[。！？]?/g)||[];return a.map(function(s){return s.trim()}).filter(Boolean)}
/* how many sentences are visible: 1 always, rest scale with progress */
function shown(id,n){if(n<=1)return n;return Math.max(1,Math.round(1+(n-1)*pct(id)))}
function needLabel(id){var a=avail(id),d=done(id);var s=a.find(function(x){return!d[x[0]]});return s?"需要："+s[2]:""}
function renderBio(anim){if(!bioEl||!curId)return;var n=sents.length,k=shown(curId,n),need=needLabel(curId),prev=+bioEl.dataset.k||0;
  var h="";sents.forEach(function(s,i){if(i<k)h+="<span data-i='"+i+"'>"+esc(s)+"</span>";else h+="<span class='twd-x' data-need='"+need+"'>"+esc(s)+"</span>"});
  bioEl.innerHTML=h;bioEl.dataset.k=k;
  if(anim&&k>prev)for(var i=prev;i<k;i++)scramble(bioEl.querySelector("[data-i='"+i+"']"));}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var GLY="█▓▒░#%&@$01ABCDEFX";
function scramble(el){if(!el||TW.reduce)return;var fin=el.textContent,n=fin.length,t0=performance.now(),D=900+n*12;el.classList.add("twd-dec");
  (function f(ts){var k=Math.min(1,(ts-t0)/D),r=Math.floor(n*k),o=fin.slice(0,r);for(var i=r;i<n;i++)o+=fin[i]===" "?" ":GLY[(Math.random()*GLY.length)|0];el.textContent=o;
    if(k<1)requestAnimationFrame(f);else{el.textContent=fin;el.classList.remove("twd-dec")}})(t0)}

/* ---------- progress block ---------- */
var block=null;
function renderBlock(){if(!block||!curId)return;var a=avail(curId),d=done(curId),p=pct(curId);
  block.innerHTML="<div class='twd-top'>解密进度<span class='twd-bar'><i style='width:"+Math.round(p*100)+"%'></i></span><b>"+Math.round(p*100)+"%</b></div>"+
    "<div class='twd-chips'>"+a.map(function(s){return"<span class='"+(d[s[0]]?"ok":"")+"' title='"+s[2]+"'>"+s[1]+"</span>"}).join("")+"</div>"}
function badges(){var r=TW.roster;if(!r)return;r.querySelectorAll("button[data-id]").forEach(function(b){var id=b.dataset.id,el=b.querySelector(".twd-badge");
  if(!el){el=document.createElement("em");el.className="twd-badge";b.appendChild(el)}
  var p=Math.round(pct(id)*100);el.textContent=P[id]&&Object.keys(P[id]).length?p+"%":"";el.classList.toggle("full",p===100)})}

var toastEl=null,tt=0;
function toast(msg){if(!toastEl){toastEl=document.createElement("div");toastEl.className="twd-toast";toastEl.setAttribute("role","status");document.body.appendChild(toastEl)}
  toastEl.textContent=msg;toastEl.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){toastEl.classList.remove("on")},2600)}

function mark(id,step){if(!id||!TW.byId[id])return;var d=done(id);if(d[step])return;
  if(!avail(id).some(function(s){return s[0]===step}))return;
  d[step]=Date.now();save();var s=STEPS.find(function(x){return x[0]===step});
  if(step!=="view")toast("▣ 解密 · "+TW.byId[id].name_cn+" · "+s[1]+"（"+Math.round(pct(id)*100)+"%）");
  if(id===curId){renderBlock();renderBio(true)}badges()}

TW.on("select",function(d){curId=d.id;bioEl=d.panel&&d.panel.querySelector("[data-tw='bio']");
  sents=split(d.titan.bio);
  if(bioEl){bioEl.dataset.k=shown(curId,sents.length);block=document.createElement("div");block.className="twd";bioEl.parentNode.insertBefore(block,bioEl)}
  var first=!done(curId).view;mark(curId,"view");renderBlock();renderBio(false);if(first&&bioEl)scramble(bioEl.querySelector("[data-i='0']"))});
TW.on("3d",function(d){mark(d.id,"3d")});
TW.on("fire",function(d){mark(d.id,"fire")});
TW.on("story",function(d){(d.ids||[]).forEach(function(id){mark(id,"story")})});
TW.on("vs",function(d){/* counted when the fight actually resolves, see tw-vs-battle */});
TW.on("battle",function(d){mark(d.a,"vs");mark(d.b,"vs")});
TW.on("roar",function(d){mark(d.id,"roar")});
TW.on("roster",badges);TW.on("boot",badges);

TW.declass={pct:pct,reset:function(){P={};save();badges();if(curId)TW.select(curId)}};
})();
