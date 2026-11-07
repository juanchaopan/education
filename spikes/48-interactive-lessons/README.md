# #48 互动教学原型

[#48](https://github.com/juanchaopan/education/issues/48) 探针的可运行原型与构建脚本。设计结论见 [ADR-0013](../../docs/adr/0013-per-problem-interactive-teaching.md) 和[样例索引](../../docs/adr/assets/0048-interactive-teaching-evidence.md)，逐题的动作、数学核对和多轮演进记录在 `SPIKE.md`。

这是探针代码，只存在于归档标签，不进入 main，也不是正式实现；正式题目按 #49 重新编写。

## 打开方式

三个单文件原型可以直接用浏览器打开，图片和旁白都已内嵌，无需服务器。

| 文件 | 内容 |
| --- | --- |
| `garden-story.html` | 一年级：菜园天平，在同一秤上逐组替换，让等量关系可见 |
| `pencil-story.html` | 一年级：彩铅配对，连线、收录与逐排清点 |
| `rail-story.html` | 六年级：数轴追及，用同一组轨道和车辆推导距离方程 |
| `numberline-v2.html` | 数轴早期版本，纯 SVG，无位图 |

`preview.html`、`preview-v2.html`、`index.html` 是早期的场景预览。

## 内容

- 页面源码：`*.html`、`*.css`、`*.js`，其中 `story-template.html`、`rail-template.html` 等是构建模板。
- 构建与核对脚本：`build-*.py`、`refine-*.py`、`revise-*.py`、`check-*.cjs`、`audit-*.cjs`，以及录屏辅助 `lesson-review-capture.mjs`。
- 旁白：`*.mp3` 是逐句合成的短句音频，台词在 `*-lines.json`、`narration-v2.json`。
- 图片：`garden-plate.png`、`garden-rabbit.png`、`pencil-plate.png`、`rail-plate.png` 是生成的原图，`*.webp` 是嵌入页面的压缩版本。

## 素材来源

- 背景和角色图由 Codex 内置的图像生成功能生成，提示词原文记录在 `SPIKE.md` 的「图像生成记录」。页面里可点、可拖的数学对象是叠在背景上的 SVG。
- 旁白用本地 Piper 中文模型 `zh_CN-huayan-medium` 合成，由 `*-voice.py` 脚本逐句生成。模型文件本身不在归档里，需要时从 Piper 的官方发布获取。
- 朗读质量和孩子的理解都没有经过真人验收，见 ADR-0013。

## 未归档的内容

以下内容可由脚本再生成或体积过大，只保留在原工作目录：录屏和抽帧、浏览器截图、`*-clips.json` 构建中间文件、语音模型与运行时。
