# #138 全站视觉风格样稿

[#138](https://github.com/juanchaopan/education/issues/138) 探针的样稿代码和截图。结论见 [ADR-0016](../../docs/adr/0016-visual-language.md)、[网站视觉语言](../../docs/design/visual-language.md) 和 [#138 记录](../../docs/evidence/138/README.md)。

这是探针代码，只存在于归档标签，不进入 main，也不是正式实现；正式界面按 #139–#143 重新编写。

## 打开方式

用浏览器直接打开，不需要服务器：

- `gallery.html`：三个方向、五个页面的截图对比，每张图下有「打开」链接。
- `index.html?theme=a&screen=home`：单个页面。`theme` 是 `a`（手作工作台）、`b`（暮光剧场）、`c`（晨光绘本）；`screen` 是 `home`、`login`、`parent`、`lesson`、`kit`。

维护者选定 A 和 B，按设备本地时间切换（白天 A、晚上 B）；C 不采用。

## 内容

| 文件 | 内容 |
| --- | --- |
| `index.html`、`screens.js` | 五个页面的结构，按地址参数选主题和页面 |
| `styles.css` | 三套主题的颜色、底纹、阴影和全部部件、版式、动效、手机布局 |
| `icons.js` | 样稿用的 SVG 图标 |
| `shoot.mjs` | 用 Playwright 截全部页面（桌面 1280 宽、手机 390 宽两倍像素）：在仓库根目录运行 `node spikes/138-visual-language/shoot.mjs spikes/138-visual-language` |
| `shots/` | 截图 |
| `assets/` | #48 的三张绘景和小兔 |

## 素材来源

绘景和小兔来自 #48，由 Codex 内置的图像生成功能生成。图标、横幅里的矢量风景和所有界面都是代码画的。
