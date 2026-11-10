/* =====================================================================
   tw-ux.js — 体验补丁
   1) URL #id 直达某只怪兽（例如 …#king-ghidorah），可分享
   2) 键盘 ← / → 在名录里切换
   3) 全局年份滑条：只显示截至该年已登场的泰坦，▶ 可从 1954 开始播放
   4) 档案里一个「复制链接」按钮
   依赖：TW.select / current / ids / setFilter / stage / panel，TW.on("boot"|"select")。
   ===================================================================== */
(function(){
"use strict";
var TW=window.TW;if(!TW)return;

/* ---------- 1. hash ---------- */
function fromHash(){var id=decodeURIComponent((location.hash||"").slice(1));return TW.byId[id]?id:null}
var silent=false;
TW.on("boot",function(){var id=fromHash();if(id)TW.select(id)});
addEventListener("hashchange",function(){var id=fromHash();if(id&&id!==TW.current()){silent=true;TW.select(id);silent=false}});
TW.on("select",function(d){if(silent)return;if(("#"+d.id)!==location.hash){try{history.replaceState(null,"","#"+d.id)}catch(e){location.hash=d.id}}});

/* ---------- 2. keyboard ---------- */
function list(){var ids=TW.ids();return ids.filter(function(id){var t=TW.byId[id];for(var k in TW.filters)if(!TW.filters[k](t))return false;return true})}
addEventListener("keydown",function(e){if(e.altKey||e.ctrlKey||e.metaKey)return;var tg=e.target;if(tg&&(/INPUT|SELECT|TEXTAREA/.test(tg.tagName)||tg.isContentEditable))return;
  if(document.querySelector("#vs.on, #lb.on"))return;
  if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;var l=list();if(!l.length)return;var i=l.indexOf(TW.current());
  i=e.key==="ArrowRight"?(i+1)%l.length:(i-1+l.length)%l.length;e.preventDefault();TW.select(l[i]);
  var b=TW.roster&&TW.roster.querySelector("button[data-id='"+l[i]+"']");if(b&&b.scrollIntoView)b.scrollIntoView({block:"nearest"})});

/* ---------- 3. year slider ---------- */
function first(t){var y=(t.films||[]).map(function(f){return f.year}).filter(Boolean);return y.length?Math.min.apply(null,y):null}
var YRS=TW.data.titans.map(first).filter(Boolean),Y0=Math.min.apply(null,YRS),Y1=Math.max.apply(null,YRS);
var FILM={};TW.data.titans.forEach(function(t){(t.films||[]).forEach(function(f){(FILM[f.year]=FILM[f.year]||{})[f.title_cn||f.title]=1})});
var css=document.createElement("style");css.textContent=
".twy{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);width:min(560px,86%);display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(6,18,25,.86);border:1px solid var(--seam);border-radius:6px;z-index:4;backdrop-filter:blur(4px)}"+
".twy button{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--amber);background:none;color:var(--amber);font-size:12px}"+
".twy input{flex:1;accent-color:var(--amber)}.twy .yr{font:400 26px VT323,var(--f-mono);color:var(--amber);min-width:52px;text-align:right;line-height:1}"+
".twy .yf{position:absolute;left:12px;right:12px;bottom:100%;margin-bottom:6px;font:11px var(--f-mono);color:var(--dim);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}"+
".twy .all{width:auto;height:auto;border-radius:4px;padding:3px 8px;font:500 11px var(--f-display);border-color:var(--seam);color:var(--ink)}.twy .all[aria-pressed='true']{border-color:var(--amber);color:var(--amber)}"+
".m3 .twy{display:none}"+
".twl{background:none;border:1px solid var(--seam);border-radius:4px;padding:3px 9px;font:11px var(--f-mono);color:var(--dim);margin-left:6px}.twl:hover{color:var(--ink);border-color:var(--sonar)}";
document.head.appendChild(css);
var bar=document.createElement("div");bar.className="twy";
bar.innerHTML="<div class='yf'></div><button class='pl' aria-label='从 "+Y0+" 年开始播放'>▶</button><input type='range' min='"+Y0+"' max='"+Y1+"' value='"+Y1+"' aria-label='年份'><span class='yr'>ALL</span><button class='all' aria-pressed='true'>全部</button>";
(TW.stage||document.body).appendChild(bar);
var inp=bar.querySelector("input"),yr=bar.querySelector(".yr"),yf=bar.querySelector(".yf"),pl=bar.querySelector(".pl"),all=bar.querySelector(".all"),timer=0;
function apply(y){if(y==null){TW.setFilter("year",null);yr.textContent="ALL";all.setAttribute("aria-pressed","true");yf.textContent="";return}
  all.setAttribute("aria-pressed","false");yr.textContent=y;
  TW.setFilter("year",function(t){var f=first(t);return f!=null&&f<=y});
  var n=TW.data.titans.filter(function(t){var f=first(t);return f!=null&&f<=y}).length,films=Object.keys(FILM[y]||{});
  yf.textContent=n+" 只泰坦已登场"+(films.length?" · "+y+"：《"+films.slice(0,3).join("》《")+"》":"");
  TW.emit("year",{year:y})}
inp.oninput=function(){stopPlay();apply(+inp.value)};
all.onclick=function(){stopPlay();inp.value=Y1;apply(null)};
function stopPlay(){clearInterval(timer);timer=0;pl.textContent="▶"}
pl.onclick=function(){if(timer){stopPlay();return}var y=+inp.value>=Y1||all.getAttribute("aria-pressed")==="true"?Y0:+inp.value;pl.textContent="❚❚";inp.value=y;apply(y);
  timer=setInterval(function(){y++;if(y>Y1){stopPlay();return}inp.value=y;apply(y)},TW.reduce?60:260)};

/* ---------- 4. copy link ---------- */
TW.on("select",function(d){if(!d.panel)return;var h=d.panel.querySelector(".pen");if(!h)return;var b=document.createElement("button");b.className="twl";b.textContent="⧉ 复制链接";
  b.onclick=function(){var url=location.href.split("#")[0]+"#"+d.id;var ok=function(){b.textContent="✓ 已复制"};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(ok,function(){b.textContent=url});else b.textContent=url};
  h.appendChild(b)});
/* 模块晚于主页面启动加载时：按 hash 或当前选中项重选一次，让所有模块挂上去 */
var h0=fromHash(),c0=TW.current();if(h0)TW.select(h0);else if(c0)TW.select(c0);
TW.ux={setYear:function(y){inp.value=y;apply(y)}};
})();
