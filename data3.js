/* data3.js — 档案风改版的数据补丁：地点英文名 / 中文名拆分，战绩改成「事件 + 出处」。
   不改 data.js / data2.js 的原字段：l.name 仍保留（3D 场景按它选背景），新增 l.name_en / l.name_cn；
   t.feats 仍保留，新增 t.feats2 = [[事件, 出处], ...]。 */
(function(D){
if(!D)return;
var GVK="Godzilla vs. Kong · 2021",KOTM="Godzilla: King of the Monsters · 2019",GXK="Godzilla x Kong: The New Empire · 2024",G14="Godzilla · 2014",KSI="Kong: Skull Island · 2017",
    GMO="Godzilla Minus One · 2023",SHIN="Shin Godzilla · 2016",G98="Godzilla · 1998",GSP="Godzilla Singular Point · 2021";
var LOC={
"godzilla":[["Honolulu, Hawaii","夏威夷 檀香山"],["San Francisco","旧金山"],["Castle Bravo, Bermuda","百慕大海域"],["Boston","波士顿"],["Hong Kong","香港"],["Rome","罗马"],["Giza, Cairo","开罗 吉萨"],["Hollow Earth · Iwi Realm","地心世界 Iwi 领域"]],
"godzilla-minus-one":[["Odo Island, Japan","大户岛（虚构岛屿）"],["Bikini Atoll","比基尼环礁"],["Ginza, Tokyo","东京 银座"],["Sagami Bay","相模湾"]],
"kong":[["Skull Island","骷髅岛"],["Antarctica Entrance","南极入口"],["Hong Kong","香港"],["Giza, Cairo","开罗 吉萨"],["Rio de Janeiro","里约热内卢"],["Hollow Earth · Throne Room","地心世界 王座厅"]],
"mothra":[["Temple of the Moth, Yunnan","云南"],["Boston","波士顿"],["Giza, Cairo","开罗 吉萨"],["Hollow Earth · Iwi Realm","地心世界 Iwi 领域"]],
"rodan":[["Isla de Mara Volcano","Isla de Mara 火山"],["Boston","波士顿"]],
"king-ghidorah":[["Outpost 32, Antarctica","南极"],["Off Isla de Mara","Isla de Mara 外海"],["Washington D.C.","华盛顿"],["Boston","波士顿"]],
"muto":[["Philippines Mine","菲律宾矿坑"],["Janjira, Japan","日本 雀路罗市"],["Honolulu, Hawaii","夏威夷 檀香山"],["Yucca Mountain / Las Vegas","内华达"],["San Francisco","旧金山"]],
"mechagodzilla":[["Apex HQ, Hong Kong","Apex 香港总部"],["Apex Facility, Pensacola","Apex 彭萨科拉工厂"]],
"skullcrawler":[["Skull Island","骷髅岛"],["Apex HQ, Hong Kong","Apex 香港总部"],["Skull Island Caverns","骷髅岛地下洞穴"]],
"shimo":[["Hollow Earth · Skar King's Realm","地心世界 Skar King 的领域"],["Rio de Janeiro","里约热内卢"]],
"skar-king":[["Hollow Earth · Volcanic Realm","地心世界 火山领域"],["Rio de Janeiro","里约热内卢"]],
"behemoth":[["Outpost 58, near Rio de Janeiro","里约热内卢附近"],["Boston","波士顿"]],
"scylla":[["Outpost 55, Sedona, Arizona","亚利桑那"],["Boston","波士顿"],["Rome","罗马"]],
"methuselah":[["Outpost 67, near Munich","德国 慕尼黑附近"],["Boston","波士顿"]],
"tiamat":[["Arctic Lair","北极海域巢穴"],["Stone Mountain, Georgia","佐治亚"]],
"warbat":[["Hollow Earth · Near the Entrance","地心世界 入口附近"]],
"godzilla-showa":[["Bikini Atoll","比基尼环礁"],["Tokyo","东京"],["Osaka","大阪"],["Nagoya","名古屋"],["Mount Fuji","富士山"],["New York","纽约"],["Okinawa","冲绳"]],
"zilla-1998":[["Moruroa Atoll","穆鲁罗瓦环礁"],["Panama","巴拿马"],["Jamaica","牙买加"],["Flatiron, Manhattan","纽约 熨斗大厦"],["Madison Square Garden","麦迪逊广场花园"],["Brooklyn Bridge","布鲁克林大桥"]],
"shin-godzilla":[["Tokyo Bay Aqua-Line","东京湾跨海公路"],["Kamata, Tokyo","东京 蒲田"],["Shinagawa, Tokyo","东京 品川"],["Kamakura","镰仓"],["Tama River","多摩川防线"],["Central Tokyo","东京都心"]],
"godzilla-earth":[["Los Angeles","洛杉矶"],["Arctic Ocean","北冰洋"],["Tanzawa","丹泽"],["Hamamatsu","滨松"]],
"godzilla-ultima":[["Boso Peninsula","房总半岛"],["Tokyo Bay","东京湾"],["Tokyo Station","东京站"],["India","印度"]],
"mother-longlegs":[["Skull Island","骷髅岛"]]
};
var FEAT={
"godzilla":[["击败 Kong，随后摧毁 Mechagodzilla",GVK],["被 Ghidorah 压制后，借 Burning 形态与 Mothra 之力反杀 King Ghidorah",KOTM],["联手 Kong 击败 Skar King 与 Shimo",GXK]],
"godzilla-minus-one":[["用热线摧毁东京银座，造成大规模伤亡",GMO],["海神作战中几乎被消灭，却凭再生能力延续生命",GMO],["击沉高雄号等日本战后海军舰船",GMO]],
"kong":[["第二回合负于 Godzilla，联手后击毁 Mechagodzilla",GVK],["击杀 Skullcrawler，保卫岛屿",KSI],["击败 Skar King，统一 Hollow Earth 的猿族",GXK]],
"mothra":[["波士顿空战中用毒刺重创 Rodan",KOTM],["牺牲自己，让 Godzilla 进入 Burning 形态反杀 Ghidorah",KOTM],["重生后调停 Godzilla 与 Kong，协助对抗 Skar King",GXK]],
"rodan":[["苏醒后几乎全歼追击的 Monarch 战机中队",KOTM],["海上空战败给 King Ghidorah，转而追随他",KOTM],["波士顿被 Mothra 刺伤，战后第一个向 Godzilla 臣服",KOTM]],
"king-ghidorah":[["南极首战压制 Godzilla",KOTM],["海上击败 Rodan，并以 Alpha 呼号唤醒全球 Titans",KOTM],["波士顿一度把 Godzilla 带上高空摔落，最终被 Burning Godzilla 的核脉冲烧尽，最后一个头被原子吐息抹除",KOTM]],
"muto":[["雄性的 EMP 让檀香山与旧金山全城断电",G14],["二打一一度压制 Godzilla",G14],["雄性被 Godzilla 甩尾砸进大楼；雌性被掰开嘴灌入原子吐息",G14]],
"mechagodzilla":[["充能后正面压制已经苦战过一场的 Godzilla",GVK],["被 Ghidorah 残留意识夺取控制权",GVK],["被 Kong 用 Godzilla 充能的战斧肢解斩首",GVK]],
"skullcrawler":[["杀光了 Kong 的父母与同族",KSI],["最大的 Skull Devil 被 Kong 掏出内脏击杀",KSI],["一只被 Mechagodzilla 一击切开",GVK]],
"shimo":[["Frost Bite 吐息让 Kong 的右臂严重冻伤",GXK],["在里约与 Evolved Godzilla 正面对抗",GXK],["重获自由后把 Skar King 冻成冰雕，由 Kong 击碎",GXK]],
"skar-king":[["单挑中凭借 Shimo 逼退 Kong",GXK],["在 Hollow Earth 与里约两度对抗 Godzilla 与 Kong 的联手",GXK],["失去晶石后被 Shimo 冰封，被 Kong 击碎",GXK]],
"behemoth":[["响应 Ghidorah 的呼号苏醒",KOTM],["波士顿战后向 Godzilla 臣服",KOTM]],
"scylla":[["响应 Ghidorah 的呼号苏醒",KOTM],["在罗马被 Godzilla 击杀",GXK]],
"methuselah":[["响应 Ghidorah 的呼号苏醒",KOTM],["波士顿战后向 Godzilla 臣服",KOTM]],
"tiamat":[["在自己的巢穴里缠住 Godzilla",GXK],["被 Godzilla 的原子吐息击杀",GXK]],
"warbat":[["两只合力缠住 Kong",GVK],["一只被 Kong 当鞭子甩死，另一只被扯掉脑袋",GVK]],
"godzilla-showa":[["杀死初代 Anguirus","Godzilla Raids Again · 1955"],["与 Mothra、Rodan 联手击退 King Ghidorah","Ghidorah, the Three-Headed Monster · 1964"],["击败 Ebirah 与 Hedorah","Ebirah, Horror of the Deep · 1966 / Godzilla vs. Hedorah · 1971"],["以磁力击败 Mechagodzilla","Godzilla vs. Mechagodzilla · 1974"],["参与终结 King Ghidorah","Destroy All Monsters · 1968"]],
"zilla-1998":[["全速撞沉多艘渔船",G98],["在曼哈顿多次摆脱军方围捕",G98],["一次产下两百余枚蛋",G98]],
"shin-godzilla":[["一夜之间以热线焚毁东京数个城区",SHIN],["击落载有首相与内阁要员的直升机",SHIN],["承受 B-2 投下的 MOP II 钻地弹（受伤但存活）",SHIN],["顶住自卫队全部常规火力",SHIN]],
"godzilla-earth":[["2048 年击落人类撤离地球时的登陆舰","Godzilla: Planet of the Monsters · 2017"],["承受 EMP 攻击后把能量转为热，摧毁 Mechagodzilla City","Godzilla: City on the Edge of Battle · 2018"],["在 Haruo Sakaki 切断 Metphies 的控制后，击毁 Ghidorah 的头部与入口","Godzilla: The Planet Eater · 2018"],["以螺旋原子吐息摧毁 Gorath 小行星",""],["支配地球长达两万年","Godzilla: Planet of the Monsters · 2017"]],
"godzilla-ultima":[["Aquatilis 形态杀死并吃掉一只 Manda",GSP],["Terrestris 形态以血触手闷住炸弹",GSP],["Ultima 形态咬住 Jet Jaguar 的手臂，并用尾巴击倒巨大化的机器人",GSP],["排出的红尘 Archetype 改造周围环境、扭曲时空",GSP]],
"mother-longlegs":[["用腿刺穿一名士兵",KSI],["与 Mantleclaw 搏斗，双双坠崖","Monarch: Legacy of Monsters · 2023"],["体型巨大的蛛后（40–46 m）袭击 Iwi 村落","MonsterVerse 漫画"]]
};
var POST={"Outpost 54":["Castle Bravo",""],"Outpost 32":["Antarctica","南极"],"Outpost 33":["Skull Island","骷髅岛"],"Outpost 56":["Isla de Mara",""],"Outpost 61":["Temple of the Moth, Yunnan","云南"],"Outpost 55":["Sedona, Arizona","亚利桑那"],
"Outpost 58":["Rio de Janeiro","里约热内卢"],"Outpost 67":["Munich, Germany","德国 慕尼黑"],"Outpost 49":["Loch Ness, Scotland","苏格兰 尼斯湖"],"Outpost 57":["Machu Picchu, Peru","秘鲁 马丘比丘"],"Outpost 65":["Cairo, Egypt","埃及 开罗"],
"Outpost 68":["Volubilis, Morocco","摩洛哥 瓦卢比利斯"],"Outpost 92":["Angkor Wat, Cambodia","柬埔寨 吴哥窟"],"Outpost 18":["Mobile Outpost Vessel","移动前哨舰"]};
var GATE=[["Antarctica","南极入口"],["Skull Island","骷髅岛"],["Hong Kong Shaft","香港竖井"],["Barbados","巴巴多斯"],["Giza, Cairo","开罗 吉萨"],["Rio de Janeiro","里约热内卢"],["Kazakhstan Rift","哈萨克斯坦裂隙"],["Alaska Rift","阿拉斯加裂隙"]];
D.titans.forEach(function(t){var L=LOC[t.id],ls=t.locations||[];
  ls.forEach(function(l,i){if(L&&L.length===ls.length){l.name_en=L[i][0];l.name_cn=L[i][1]}else{var m=String(l.name).replace(/（.*?）/g,"").match(/^([^A-Za-z]*?)\s*([A-Za-z].*)$/);l.name_en=m&&m[2]?m[2]:l.name;l.name_cn=m&&m[1]?m[1].trim():""}});
  if(FEAT[t.id]&&FEAT[t.id].length===(t.feats||[]).length)t.feats2=FEAT[t.id];
  if(t.id==="godzilla")t.rank="ALPHA"});
(D.outposts||[]).forEach(function(o){var p=POST[o.id];o.name_en=p?p[0]:(o.name||"");o.name_cn=p?p[1]:""});
((D.hollowEarth||{}).entrances||[]).forEach(function(e,i){var g=GATE[i];e.name_en=g?g[0]:e.name;e.name_cn=g?g[1]:""});
})(window.TITAN_DATA);
