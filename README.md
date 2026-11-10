# 泰坦监测站 · Titan Watch

> 一个粉丝自制的「怪兽地球」：在可拖拽的地球上查看哥斯拉、金刚和 MonsterVerse 各路泰坦的出没点，看 3D 模型、翻神话原画、听生物声纹、让两只怪兽 VS 对打。

## ▶ 直接玩（不需要任何代码）

**👉 https://luomengzhou.github.io/titan/**

手机、电脑浏览器都能打开。建议戴耳机、开声音。

玩法小抄：

| 操作 | 效果 |
|---|---|
| 拖拽 / 滚轮 | 旋转、缩放地球 |
| 点地球上的光点 | 打开这只泰坦的档案 |
| 档案里「进入 3D」 | 看 3D 模型，可以放技能 |
| 顶栏「剧情回放」 | 按电影顺序重走怪兽路线 |
| 顶栏「战力对比」→ FIGHT | 三回合光束对撞，看谁赢 |
| 顶栏「◆ 神话起源」 | 显示每只怪兽名字背后的神话发源地 |
| 档案里的声纹条 ▶ | 播放合成吼声 |
| 地球下方年份滑条 ▶ | 从 1954 年开始，看泰坦一只只登场 |
| 键盘 ← → | 切换怪兽 |
| 3D 视图里「✋ 手势」 | 打开摄像头，用手势放技能（见下方） |
| 点左上角标题 | 重播开场 |
| 网址末尾加 `#kong` 之类 | 直接打开某只怪兽，方便分享 |

档案里的黑条是「机密」，看 3D、放技能、打 VS、听吼声都会逐步解密。

### ✋ 手势链接（需要摄像头）

在 3D 视图右上角点「✋ 手势」，允许摄像头后，对着镜头做手势就能控制泰坦。画面只在你自己的浏览器里识别（MediaPipe），不会上传。

| 泰坦 | 手势 | 效果 |
|---|---|---|
| 哥斯拉 -1.0 | ✊ 握拳不放 | 背鳍从尾尖开始逐节点亮蓄力 |
|  | 🖐 蓄满后张开手 | 释放热线（没蓄满就张开 = 蓄力中断） |
| 其他有技能的泰坦 | ✊ 握拳 → 🖐 张开 | 蓄力后释放各自的技能 |
| 王者基多拉 | ☝️ 伸一根手指，在空中画一道闪电 | 召唤雷暴 |
|  | 🖐 手掌朝下平放 | 引力蓄力，周围的楼开始震颤离地 |
|  | ⤴ 接着猛地向上一挥 | 引力虹吸：把楼吸上天，悬停后砸下（致敬《哥斯拉-0.0》） |
| 金刚（及没有技能的泰坦） | ✊ 握拳朝镜头猛推 | 出拳 / 冲撞，镜头被打裂 |
| 所有泰坦 | 👍 竖大拇指 | 咆哮 |

**摄像头画面**有四种模式（面板上方切换，⤢ 可放大）：`实景`（抠掉你的房间，只留人，站进观察室）、`夜视`、`剪影`（不露脸）、`皮套`（人形变成当前泰坦的鳞片剪影，手变成怪兽爪，握拳张开都跟着动）。

> 摄像头只能在独立网页（GitHub Pages 或 `localhost`）里用；嵌在别的页面里预览时浏览器会拒绝。
> 听说对着摩斯拉，把食指和中指并拢放平，再用食指画一道波浪，会发生点什么。

---

## ✍️ 想一起改？（共创指南）

这个项目就是一个静态网页，没有后端、没有构建步骤。改完文件、刷新浏览器就能看到效果。

### 方式 A：完全在网页上改（零安装）

1. 点右上角 **Fork**，复制一份到你自己的 GitHub
2. 在你 fork 的仓库页面按键盘上的 **`.`**（句号），会打开网页版 VS Code
3. 改文件 → 左侧「源代码管理」→ 提交
4. 在你的仓库 **Settings → Pages**，Source 选 `Deploy from a branch`，分支选 `main` / `/ (root)` → Save
5. 一两分钟后，你的版本就在 `https://你的用户名.github.io/titan/`

### 方式 B：用 AI 改（推荐给会用 Claude / Cursor / ChatGPT 的朋友）

1. Fork 之后，点绿色 **Code → Download ZIP**，解压
2. 把整个文件夹交给你的 AI 工具（Claude、Cursor 等），直接用中文说你想要什么，比如：
   - 「在 `data2.js` 里加一只新怪兽 Anguirus，出没点在大阪，颜色用棕色」
   - 「VS 对战结束后加一个慢动作回放」
   - 「把开场界面的时间码改成我的生日」
3. 本地预览：在文件夹里运行 `python3 -m http.server`，打开 http://localhost:8000
   （直接双击 index.html 打开时，模型和音频会因为浏览器安全限制加载不出来）
4. 改好后上传回你的 fork，或者发 Pull Request 回到这个仓库，好的改动会合并进主版本

### 方式 C：只想提想法

去 **Issues** 开一个帖子：想加的怪兽、发现的 bug、设定错误都欢迎。

---

## 🗂 文件结构

```
index.html        主页面：地球、档案、3D、剧情、VS、开场界面（大部分逻辑都在这里）
data.js           泰坦数据：名字、身高、出没点坐标、六维属性、简介
data2.js          追加的泰坦 + 修正过的尺寸数据
data3.js          档案风改版的数据补丁（地点中英文名、战绩出处）
tw-roar.js        生物声纹：播放吼声 + 频谱图声纹（播放头扫过）
tw-declass.js     档案解密进度
tw-myth.js        神话起源图层
tw-idle.js        闲置时的异常警报
tw-ux.js          URL 直达、键盘切换、年份滑条
tw-vs-battle.js   VS 光束对撞
m/                3D 模型（.wasm 其实是改了后缀的 GLB/FBX）和贴图
art/              神话原画（Wikimedia Commons）
r/                每只泰坦的吼声 <id>.mp3 + 对应频谱图 <id>.png
tw-gesture.js     手势链接：摄像头 + MediaPipe 手势识别 / 抠像 → 技能
hand/             MediaPipe Hands / Selfie Segmentation 官方运行文件（Apache-2.0，模型文件改名为 .wasm 以便托管）
tools/roar_synth.py  生成 r/ 的 Python 脚本（改参数后重跑即可）
bgm.mp3 intro.mp3 背景音乐与开场警报
```

### 加一只新怪兽

在 `data2.js` 的 `add=[ … ]` 数组里照着已有条目加一段，最少需要这些字段：

```js
{"id":"anguirus","name_cn":"安基拉斯","name_en":"Anguirus","universe":"toho",
 "color":"#C8A060","height_m":60,
 "stats":{"power":70,"defense":85,"speed":60,"energy":20,"intelligence":50,"endurance":80},
 "locations":[{"name":"大阪 Osaka","lat":34.69,"lon":135.5,"layer":"surface","note":"……"}],
 "films":[{"title":"Godzilla Raids Again","year":1955}],
 "bio":"……","myth":"……"}
```

### 写一个新模块

`tw-*.js` 这些模块都只通过 `window.TW` 和主页面通信，不碰主页面内部代码，适合独立开发：

```js
TW.on("select", function(d){ /* d.id, d.titan, d.panel：选中了某只怪兽 */ });
TW.on("draw",   function(d){ /* d.ctx, d.proj(lat,lon)：每帧在地球上画东西 */ });
TW.on("battle", function(d){ /* d.a, d.b, d.winner：一场 VS 打完了 */ });
TW.select("kong"); TW.flyTo(35.6, 139.7);
```

其他事件：`roster` `3d` `fire` `story` `vs` `vsclose` `roar` `activity` `boot`。写好后在 `index.html` 末尾加一行 `<script src="tw-你的模块.js"></script>`。

---

## ©️ 来源与声明

- **这是粉丝自制的非官方、非商业项目。** Godzilla、King Kong、MonsterVerse 及相关角色名称归 Toho Co., Ltd. 与 Legendary Pictures 等权利人所有，本项目与他们没有任何关联。
- **3D 模型**来自 Sketchfab 上的各位作者，详见 [CREDITS.md](CREDITS.md)。模型版权归原作者，使用时请遵守各自在 Sketchfab 上标注的授权。
- **神话原画**来自 Wikimedia Commons，均为公有领域或 CC0，逐张出处见 [CREDITS.md](CREDITS.md)。
- **音频**：开场警报与背景音乐为原创合成音频；档案里的吼声是浏览器实时合成的，未使用任何电影原声。
- 身高、体重主要参考 Wikizilla，六维属性与胜率为粉丝主观估算。
- 如果你是某项素材的权利人、希望移除，请开一个 Issue，会尽快处理。

代码部分以 [MIT License](LICENSE) 开源；素材（模型、图片、音频）不在 MIT 范围内，以各自来源的授权为准。
