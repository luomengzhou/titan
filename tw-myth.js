/* =====================================================================
   tw-myth.js — 神话起源图层
   地球上第三种标记：怪兽名字 / 原型所出自的神话发源地（金色菱形）。
   选中怪兽时，从它的第一个出没点拉一条大圆弧到神话原点。
   依赖：TW.on("draw") 拿到 ctx + proj；TW.toolbar 放开关；TW.flyTo。
   坐标是神话文本 / 文化的大致中心，示意用。
   ===================================================================== */
(function(){
"use strict";
var TW=window.TW;if(!TW)return;
/* id → [地点, 纬度, 经度, 文化 / 出处] */
var ORIGIN={
  "king-ghidorah":[["出云 · 斐伊川",35.37,132.75,"日本《古事记》八岐大蛇"],["勒拿沼泽",37.55,22.72,"希腊 · 九头蛇 Hydra"]],
  "yamata-no-orochi":[["出云 · 斐伊川",35.37,132.75,"日本《古事记》"]],
  "scylla":[["墨西拿海峡",38.25,15.63,"《奥德赛》· 斯库拉"]],
  "typhon":[["科律喀昂洞穴",36.45,34.1,"希腊 · 赫西俄德《神谱》"],["埃特纳火山",37.75,15.0,"宙斯将提丰压在山下"]],
  "behemoth":[["黎凡特",31.78,35.22,"希伯来圣经《约伯记》"]],
  "leviathan":[["乌加里特",35.6,35.78,"迦南神话 Lotan → 利维坦"]],
  "tiamat":[["巴比伦",32.54,44.42,"《埃努玛·埃利什》"]],
  "methuselah":[["美索不达米亚",33.3,44.4,"《创世记》玛土撒拉"]],
  "abaddon":[["拔摩岛",37.31,26.55,"《启示录》无底坑天使"]],
  "baphomet":[["巴黎 · 圣殿塔",48.86,2.36,"1307 年圣殿骑士审判"]],
  "sekhmet":[["孟菲斯",29.85,31.25,"古埃及 · 狮首女神"]],
  "mokele-mbembe":[["利夸拉沼泽",1.5,17.5,"刚果河流域传说"]],
  "quetzalcoatl":[["特奥蒂瓦坎",19.69,-98.84,"中美洲 · 羽蛇神庙"]],
  "kraken":[["罗弗敦群岛",68.2,13.6,"斯堪的纳维亚海怪传说"]],
  "bunyip":[["墨累河",-35.4,144.6,"澳洲原住民传说"]],
  "amhuluk":[["威拉米特河谷",44.6,-123.1,"Kalapuya 人传说"]],
  "rodan":[["阿苏山",32.88,131.1,"《空之大怪兽 Rodan》九州"]],
  "kong":[["西非海岸",5,-2,"汉诺航海记 · 「Gorillai」"]],
  "godzilla":[["比基尼环礁",11.6,165.38,"1954 · 核试验之子"]],
  "godzilla-showa":[["比基尼环礁",11.6,165.38,"1954 · 第五福龙丸事件"]],
  "godzilla-minus-one":[["大户岛 Odo Island（虚构）",33.5,139.5,"岛上传说中的海神 呉爾羅"]],
  "shin-godzilla":[["东京湾",35.4,139.8,"「神的化身」呉爾羅"]]
};
var on=true;try{on=localStorage.getItem("tw_myth")!=="0"}catch(e){}
var GOLD="#e6c36a";
var btn=document.createElement("button");btn.className="tog";btn.textContent="◆ 神话起源";btn.setAttribute("aria-pressed",on);
btn.onclick=function(){on=!on;btn.setAttribute("aria-pressed",on);try{localStorage.setItem("tw_myth",on?"1":"0")}catch(e){}};
if(TW.toolbar)TW.toolbar.insertBefore(btn,TW.toolbar.firstChild);

function slerp(a,b,t){var d=Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])));if(d<1e-4)return a;var s=Math.sin(d),k1=Math.sin((1-t)*d)/s,k2=Math.sin(t*d)/s;return[a[0]*k1+b[0]*k2,a[1]*k1+b[1]*k2,a[2]*k1+b[2]*k2]}
function lift(v,h){return[v[0]*h,v[1]*h,v[2]*h]}
var hover=null;
TW.on("draw",function(d){if(!on)return;var c=d.ctx,sel=TW.current(),seen={};
  for(var id in ORIGIN){if(!TW.byId[id])continue;ORIGIN[id].forEach(function(o){var key=o[0];var p=d.proj(o[1],o[2]);if(p.z<0)return;
    var isSel=id===sel,s=isSel?6:4;if(seen[key]&&!isSel)return;seen[key]=1;
    c.save();c.translate(p.x,p.y);c.rotate(Math.PI/4);c.fillStyle=isSel?GOLD:"rgba(230,195,106,.55)";c.strokeStyle="#061219";c.lineWidth=1;c.fillRect(-s/2,-s/2,s,s);c.strokeRect(-s/2,-s/2,s,s);c.restore();
    if(isSel){c.font="500 11px 'IBM Plex Mono',monospace";c.fillStyle=GOLD;c.fillText("◆ "+o[0],p.x+9,p.y+4)}})}
  /* arc: first sighting → origin(s) */
  var t=TW.byId[sel],O=ORIGIN[sel];if(!t||!O||!t.locations||!t.locations.length)return;var L=t.locations[0],A=TW.vec(L.lat,L.lon);
  O.forEach(function(o,oi){var B=TW.vec(o[1],o[2]),dot=A[0]*B[0]+A[1]*B[1]+A[2]*B[2],ang=Math.acos(Math.max(-1,Math.min(1,dot)));if(ang<.002)return;
    var N=48,hgt=.025+ang*.035,pts=[];
    for(var i=0;i<=N;i++){var k=i/N,v=lift(slerp(A,B,k),1+Math.sin(Math.PI*k)*hgt);pts.push(projV(d,v))}
    c.save();c.strokeStyle=GOLD;c.lineWidth=1.4;c.setLineDash([5,5]);c.lineDashOffset=TW.reduce?0:-d.ts/40;c.globalAlpha=.85;c.beginPath();var pen=false;
    pts.forEach(function(p){if(!p.vis){pen=false;return}if(pen)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);pen=true});c.stroke();c.restore();
    /* travelling spark */
    if(!TW.reduce){var k=((d.ts/2600)+oi*.37)%1,sp=pts[Math.round(k*N)];if(sp&&sp.vis){c.fillStyle=GOLD;c.shadowColor=GOLD;c.shadowBlur=10;c.beginPath();c.arc(sp.x,sp.y,2.4,0,7);c.fill();c.shadowBlur=0}}})});
/* project a point that may be lifted above the surface; hidden if behind the limb */
function projV(d,v){var r=Math.hypot(v[0],v[1],v[2]),u=[v[0]/r,v[1]/r,v[2]/r],lat=Math.asin(u[1])*180/Math.PI,lon=Math.atan2(u[0],u[2])*180/Math.PI,p=d.proj(lat,lon);
  var ox=d.cx!=null?d.cx:d.w/2,oy=d.cy!=null?d.cy:d.h/2,x=ox+(p.x-ox)*r,y=oy+(p.y-oy)*r,dist=Math.hypot(x-ox,y-oy);return{x:x,y:y,vis:p.z>0||dist>d.R}}

/* dossier line */
var css=document.createElement("style");css.textContent=".twm{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.twm button{background:none;border:1px solid #e6c36a55;color:#e6c36a;border-radius:4px;padding:3px 9px;font:12px var(--f-body)}.twm button:hover{background:#e6c36a1a}.twm button small{color:var(--dim);margin-left:6px;font-size:11px}";document.head.appendChild(css);
TW.on("select",function(d){var O=ORIGIN[d.id];if(!O||!d.panel)return;var bio=d.panel.querySelector("[data-tw='bio']");
  var el=document.createElement("div");el.className="twm";el.innerHTML=O.map(function(o,i){return"<button data-i='"+i+"'>◆ 神话原点 · "+o[0]+"<small>"+o[3]+"</small></button>"}).join("");
  el.onclick=function(e){var b=e.target.closest("button");if(!b)return;var o=O[+b.dataset.i];if(!on){on=true;btn.setAttribute("aria-pressed","true")}TW.flyTo(o[1],o[2]);TW.emit("myth",{id:d.id,origin:o[0]})};
  if(bio&&bio.parentNode)bio.parentNode.insertBefore(el,bio.nextSibling);else d.panel.appendChild(el)});
TW.myth={ORIGIN:ORIGIN};
})();
