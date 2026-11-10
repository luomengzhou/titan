/* =====================================================================
   tw-roar.js — 生物声学签名：原创合成吼声 + 声纹（频谱图）
   r/<id>.mp3 是按每只怪兽的标志性叫声特征离线合成的原创音频（没有使用任何电影原声），
   r/<id>.png 是同一段音频的真实频谱图（log 频率轴），所以看到的声纹就是听到的声音。
   没有预渲染文件的怪兽会退回下面的 Web Audio 实时合成。
   依赖：TW.on("select")；可选 TW.emit("roar") 给解密模块计分。
   ===================================================================== */
(function(){
"use strict";
var TW=window.TW;if(!TW)return;

var css=document.createElement("style");css.textContent=
".twr{margin:14px 0 4px;border:1px solid var(--seam);border-radius:0;background:#0b0b0d99;overflow:hidden}"+
".twr-h{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--seam);font:500 10.5px var(--f-mono);letter-spacing:.12em;color:var(--dim)}"+
".twr-h b{color:var(--c);font-weight:500}.twr-h em{margin-left:auto;font-style:normal}"+
".twr-b{display:flex;align-items:stretch}"+
".twr-play{flex:none;width:54px;border:0;border-right:1px solid var(--seam);background:none;color:var(--c);font:700 18px var(--f-display);display:flex;align-items:center;justify-content:center}"+
".twr-play:hover{background:var(--plate)}.twr-play[aria-pressed='true']{background:color-mix(in srgb,var(--c) 18%,transparent)}"+
".twr canvas{display:block;width:100%;height:70px;flex:1;min-width:0}"+
".twr-f{display:flex;gap:14px;padding:5px 10px;font:10.5px var(--f-mono);color:var(--dim);border-top:1px solid var(--seam)}.twr-f span b{color:var(--ink);font-weight:500}";
document.head.appendChild(css);

/* ---------- voice profile per titan ---------- */
function kind(t){var id=t.id;
  if(/ghidorah/.test(id))return"tri";
  if(/mothra/.test(id))return"chime";
  if(/rodan|warbat|ion-dragon/.test(id))return"shriek";
  if(/mecha/.test(id))return"metal";
  if(/muto|longlegs|abaddon|skullcrawler/.test(id))return"click";
  if(/kong|suko|skar/.test(id))return"ape";
  if(/kraken|leviathan|scylla|tiamat/.test(id))return"deep";
  return"reptile"}
/* 实测自 r/<id>.mp3：[类型, 主频下限 Hz, 主频上限 Hz, 时长 s] */
var META={"abaddon":["回声定位脉冲",75,140,5.1],"amhuluk":["巨兽咆哮",81,194,4.2],"baphomet":["巨兽咆哮",124,172,4.2],"behemoth":["长鼻号鸣",54,447,5.7],"bunyip":["巨兽咆哮",140,194,4.2],"frost-vark":["冰晶咆哮",75,172,4.2],"godzilla-earth":["弦振摩擦咆哮",96,237,8.2],"godzilla-heisei":["弦振摩擦咆哮",226,441,6.4],"godzilla-millennium":["弦振摩擦咆哮",258,506,6.2],"godzilla-minus-one":["弦振摩擦咆哮",261,480,6.6],"godzilla-showa":["弦振摩擦咆哮",296,549,5.8],"godzilla-ultima":["弦振摩擦咆哮",225,443,6.6],"godzilla":["弦振摩擦咆哮",210,420,7.2],"ion-dragon":["高频尖啸",1057,1400,3.7],"king-ghidorah":["多头啸叫",619,759,5.3],"kong":["胸腔低吼",86,113,5.6],"kraken":["深海次声",73,126,7.5],"lauroth":["巨兽咆哮",97,252,4.2],"leviathan":["深海次声",54,113,8.0],"mechagodzilla":["金属共振",188,415,6.2],"methuselah":["山体低鸣",38,70,8.0],"mokele-mbembe":["长鼻号鸣",48,355,5.7],"mother-longlegs":["回声定位脉冲",161,368,3.9],"mothra":["谐波鸣唱",1518,2132,5.2],"muto":["回声定位脉冲",79,113,4.9],"quetzalcoatl":["高频尖啸",1620,2113,3.3],"rodan":["高频尖啸",1314,1669,3.5],"scylla":["深海次声",73,108,7.1],"sekhmet":["猫科咆哮",145,194,3.7],"shimo":["冰晶咆哮",70,178,4.2],"shin-godzilla":["弦振摩擦咆哮",200,425,6.8],"skar-king":["胸腔低吼",102,129,4.6],"skullcrawler":["高频尖啸",764,1007,3.1],"suko":["胸腔低吼",163,225,5.3],"tiamat":["深海次声",54,108,7.7],"titan-x":["巨兽咆哮",113,151,4.2],"typhon":["多头啸叫",285,373,5.5],"warbat":["高频尖啸",2288,2915,2.7],"yamata-no-orochi":["多头啸叫",404,554,6.3],"zilla-1998":["高频尖啸",926,1319,3.7]};
var KIND_CN={tri:"三重和声",chime:"谐波鸣唱",shriek:"高频尖啸",metal:"金属共振",click:"脉冲咔嗒",ape:"胸腔低吼",deep:"深海次声",reptile:"爬行类咆哮"};
function profile(t){var h=t.height_m||(t.length_m?t.length_m*.4:60),k=kind(t);
  var f0=Math.max(32,Math.min(150,180-h*1.05));
  if(k==="shriek")f0=420+Math.max(0,60-h)*3;if(k==="chime")f0=330;if(k==="click")f0=Math.max(70,140-h*.6);if(k==="deep")f0=Math.max(26,f0*.6);
  var seed=0;for(var i=0;i<t.id.length;i++)seed=(seed*31+t.id.charCodeAt(i))>>>0;
  return{k:k,f0:f0,dur:k==="click"?2.4:k==="chime"?3.2:2.8+Math.min(1.2,h/200),seed:seed,h:h}}

/* ---------- synth ---------- */
var ctx=null,an=null,data=null,cur=null;
function ensure(){if(ctx)return ctx;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ctx=new AC();an=ctx.createAnalyser();an.fftSize=1024;data=new Float32Array(an.fftSize);
  var comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=6;an.connect(comp);comp.connect(ctx.destination);return ctx}
function noiseBuf(sec){var n=ctx.sampleRate*sec|0,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0),l=0;for(var i=0;i<n;i++){l=l*.6+(Math.random()*2-1)*.4;d[i]=l}return b}
function shaper(amt){var n=1024,c=new Float32Array(n);for(var i=0;i<n;i++){var x=i/n*2-1;c[i]=(1+amt)*x/(1+amt*Math.abs(x))}var w=ctx.createWaveShaper();w.curve=c;w.oversample="2x";return w}
function env(g,t0,a,hold,rel,peak){g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(peak,t0+a);g.gain.setValueAtTime(peak,t0+a+hold);g.gain.exponentialRampToValueAtTime(0.0001,t0+a+hold+rel)}

function voice(p,t0,out,detune,pan){
  var dur=p.dur,f=p.f0*(detune||1),k=p.k;
  var o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),vib=ctx.createOscillator(),vg=ctx.createGain();
  o.type=k==="chime"?"sine":k==="metal"?"square":"sawtooth";o2.type=k==="chime"?"triangle":"sawtooth";
  var up=k==="shriek"?1.35:k==="chime"?1.12:1.18;
  o.frequency.setValueAtTime(f*.7,t0);o.frequency.exponentialRampToValueAtTime(f*up,t0+dur*.22);o.frequency.exponentialRampToValueAtTime(f*.62,t0+dur);
  o2.frequency.setValueAtTime(f*(k==="chime"?2.01:1.006)*.7,t0);o2.frequency.exponentialRampToValueAtTime(f*(k==="chime"?2.01:1.006)*up,t0+dur*.22);o2.frequency.exponentialRampToValueAtTime(f*.6,t0+dur);
  vib.frequency.value=k==="chime"?5.5:k==="shriek"?13:7+p.seed%5;vg.gain.value=f*(k==="chime"?.012:.035);vib.connect(vg);vg.connect(o.frequency);vg.connect(o2.frequency);
  var mix=ctx.createGain();mix.gain.value=.5;o.connect(mix);o2.connect(mix);
  var last=mix;
  if(k==="metal"){var rm=ctx.createGain(),car=ctx.createOscillator();car.frequency.value=f*3.3;car.connect(rm.gain);rm.gain.value=0;mix.connect(rm);last=rm;car.start(t0);car.stop(t0+dur+.1)}
  /* formants: three band-pass = vocal tract of a very large animal */
  var fm=[[f*2.1,4],[f*4.6,6],[f*9.5,9]],sum=ctx.createGain();sum.gain.value=k==="chime"?.7:1.4;
  if(k==="chime"){last.connect(sum)}else fm.forEach(function(x,i){var bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=x[0];bp.Q.value=x[1];var gg=ctx.createGain();gg.gain.value=[1,.6,.3][i];last.connect(bp);bp.connect(gg);gg.connect(sum)});
  var dist=shaper(k==="chime"?0:k==="metal"?12:k==="shriek"?6:4),lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=k==="shriek"?5200:k==="chime"?3800:2400;
  sum.connect(dist);dist.connect(lp);lp.connect(g);
  /* breath / rasp noise */
  var nb=ctx.createBufferSource();nb.buffer=noiseBuf(dur+.2);var nf=ctx.createBiquadFilter();nf.type="bandpass";nf.frequency.value=k==="deep"?220:k==="shriek"?2600:900;nf.Q.value=.9;var ng=ctx.createGain();
  env(ng,t0,.06,dur*.3,dur*.6,k==="chime"?.02:k==="ape"?.5:.22);nb.connect(nf);nf.connect(ng);ng.connect(g);nb.start(t0);nb.stop(t0+dur+.2);
  env(g,t0,k==="click"?.02:.18,dur*.45,dur*.5,k==="chime"?.35:.55);
  if(k==="click"){/* stutter gate */var lfo=ctx.createOscillator(),lg=ctx.createGain(),gate=ctx.createGain();lfo.type="square";lfo.frequency.value=9+p.seed%6;lg.gain.value=.5;gate.gain.value=.5;lfo.connect(lg);lg.connect(gate.gain);g.connect(gate);last=gate;lfo.start(t0);lfo.stop(t0+dur+.1)}else last=g;
  var pn=ctx.createStereoPanner?ctx.createStereoPanner():null;if(pn){pn.pan.value=pan||0;last.connect(pn);pn.connect(out)}else last.connect(out);
  [o,o2,vib].forEach(function(x){x.start(t0);x.stop(t0+dur+.15)});
}
function ape(p,t0,out){/* chest beats before the growl */for(var i=0;i<4;i++){var o=ctx.createOscillator(),g=ctx.createGain(),t=t0+i*.17;o.type="sine";o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(38,t+.14);env(g,t,.005,.02,.14,.9);o.connect(g);g.connect(out);o.start(t);o.stop(t+.2)}}
var BUF={};
function loadBuf(id){if(BUF[id])return BUF[id];
  BUF[id]=fetch("r/"+id+".mp3").then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()})
    .then(function(a){return new Promise(function(res,rej){ctx.decodeAudioData(a,res,rej)})}).catch(function(){return null});
  return BUF[id]}
function synthPlay(t,done){var p=profile(t),t0=ctx.currentTime+.04,out=ctx.createGain();out.gain.value=.8;out.connect(an);
  var lag=0;if(p.k==="ape"){ape(p,t0,out);lag=.7}
  if(p.k==="tri"){voice(p,t0,out,1,0);voice(p,t0+.12,out,1.26,-.6);voice(p,t0+.22,out,.84,.6)}
  else voice(p,t0+lag,out,1,0);
  var end=p.dur+lag+.3;cur={out:out,t0:t0,dur:end};
  setTimeout(function(){if(done)done()},end*1000);return end}
function play(t,done,onStart){if(!ensure())return 0;if(ctx.state==="suspended")ctx.resume();stop();
  var token={};cur=token;
  loadBuf(t.id).then(function(b){if(cur!==token)return;
    if(!b){synthPlay(t,done);if(onStart)onStart(cur);return}
    var s=ctx.createBufferSource(),out=ctx.createGain();s.buffer=b;out.gain.value=.9;s.connect(out);out.connect(an);
    var t0=ctx.currentTime+.03;s.start(t0);cur={out:out,src:s,t0:t0,dur:b.duration};if(onStart)onStart(cur);
    s.onended=function(){if(done)done()}});
  return 1}
function stop(){if(cur&&cur.out){try{cur.out.gain.setTargetAtTime(0,ctx.currentTime,.05);if(cur.src)cur.src.stop(ctx.currentTime+.3)}catch(e){}}cur=null}

/* ---------- UI ---------- */
var raf=0,box=null;
function sig(p,n){/* fallback static signature when no voiceprint image */var a=[],s=p.seed;for(var i=0;i<n;i++){s=(s*16807)%2147483647;var f=i/n,envl=Math.sin(Math.PI*Math.min(1,f*1.15))*(1-f*.4);a.push(envl*((s/2147483647)*2-1)*(.4+.6*Math.abs(Math.sin(f*p.f0*.4))))}return a}
function tint(img,color){/* grayscale spectrogram -> colour with brightness as alpha */
  var c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;var x=c.getContext("2d");x.drawImage(img,0,0);
  var d=x.getImageData(0,0,c.width,c.height),px=d.data,m=/^#?([0-9a-f]{6})$/i.exec(color||"")||[0,"e4dfd3"],v=parseInt(m[1],16),r=v>>16&255,g=v>>8&255,b=v&255;
  for(var i=0;i<px.length;i+=4){var a=px[i];px[i]=r+(255-r)*Math.pow(a/255,3)*.6;px[i+1]=g+(255-g)*Math.pow(a/255,3)*.6;px[i+2]=b+(255-b)*Math.pow(a/255,3)*.6;px[i+3]=a}
  x.putImageData(d,0,0);return c}
function mount(d){var t=d.titan,panel=d.panel;if(!t||!panel)return;stop();
  var host=panel.querySelector("[data-tw='bio']");var p=profile(t);
  box=document.createElement("div");box.className="twr";box.style.setProperty("--c",t.color);
  box.innerHTML="<div class='twr-h'>BIO-ACOUSTIC · <b>"+t.id.toUpperCase().replace(/-/g,"_")+"</b><em>MONARCH 声学阵列 · SPECTROGRAM</em></div>"+
    "<div class='twr-b'><button class='twr-play' aria-label='播放吼声' aria-pressed='false'>▶</button><canvas></canvas></div>"+
    (function(){var M=META[t.id];return "<div class='twr-f'><span>主频 <b>"+(M?(M[1]===M[2]?M[1]:M[1]+"–"+M[2]):Math.round(p.f0))+" Hz</b></span><span>类型 <b>"+(M?M[0]:KIND_CN[p.k])+"</b></span><span>时长 <b class='twr-dur'>"+(M?M[3]:p.dur).toFixed(1)+" s</b></span>"})()+"<span style='margin-left:auto'>70 Hz – 8 kHz</span></div>";
  if(host&&host.parentNode)host.parentNode.insertBefore(box,host);else panel.appendChild(box);
  var cv=box.querySelector("canvas"),btn=box.querySelector(".twr-play"),stat=sig(p,220),playing=false,live=null,print=null;
  var im=new Image();im.onload=function(){print=tint(im,t.color)};im.src="r/"+t.id+".png";
  if(ensure())loadBuf(t.id).then(function(b){if(b&&box.isConnected){var e=box.querySelector(".twr-dur");if(e)e.textContent=b.duration.toFixed(1)+" s"}});
  function reset(){playing=false;live=null;btn.setAttribute("aria-pressed","false");btn.textContent="▶"}
  btn.onclick=function(){if(playing){stop();reset();return}
    playing=true;btn.setAttribute("aria-pressed","true");btn.textContent="■";
    play(t,reset,function(c){live=c});TW.emit("roar",{id:t.id})};
  cancelAnimationFrame(raf);var me=box;
  (function frame(ts){if(!me.isConnected)return;raf=requestAnimationFrame(frame);
    var r=cv.getBoundingClientRect(),dp=Math.min(devicePixelRatio||1,2),w=r.width,h=r.height;if(!w)return;
    if(cv.width!==(w*dp|0)){cv.width=w*dp;cv.height=h*dp}var c=cv.getContext("2d");c.setTransform(dp,0,0,dp,0,0);c.clearRect(0,0,w,h);
    c.strokeStyle="rgba(228,223,211,.06)";c.lineWidth=1;for(var x=0;x<w;x+=16){c.beginPath();c.moveTo(x+.5,0);c.lineTo(x+.5,h);c.stroke()}
    var prog=-1;if(playing&&live&&ctx){prog=Math.max(0,Math.min(1,(ctx.currentTime-live.t0)/live.dur))}
    if(print){
      c.imageSmoothingEnabled=true;
      if(prog<0){c.globalAlpha=TW.reduce?.85:.72+.13*Math.sin(ts/700);c.drawImage(print,0,0,w,h)}
      else{c.globalAlpha=.25;c.drawImage(print,0,0,w,h);c.globalAlpha=1;
        var pw=prog*w;if(pw>1)c.drawImage(print,0,0,print.width*prog,print.height,0,0,pw,h);
        c.fillStyle="#fff";c.globalAlpha=.9;c.fillRect(pw,0,1.5,h);c.shadowColor=t.color;c.shadowBlur=10;c.fillRect(pw,0,1.5,h);c.shadowBlur=0}
      c.globalAlpha=1}
    else{c.strokeStyle=t.color;c.globalAlpha=.55;c.lineWidth=1;c.beginPath();var n=stat.length,ph=TW.reduce?0:ts/900;
      for(var i=0;i<n;i++){var X=i/(n-1)*w,Y=h/2+stat[i]*h*.38*(.85+.15*Math.sin(ph+i*.3));if(i)c.lineTo(X,Y);else c.moveTo(X,Y)}c.stroke();c.globalAlpha=1}
    if(playing&&an){an.getFloatTimeDomainData(data);c.strokeStyle=t.color;c.globalAlpha=print?.55:1;c.lineWidth=1.2;c.beginPath();
      for(var j=0;j<data.length;j+=2){var xx=j/data.length*w,yy=h/2+data[j]*h*.8;if(j)c.lineTo(xx,yy);else c.moveTo(xx,yy)}c.stroke();c.globalAlpha=1}
  })(0);
}
TW.on("select",mount);
TW.roar={play:function(id){var t=TW.byId[id];if(t)play(t)},profile:profile};
})();
