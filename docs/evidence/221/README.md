# #221 孩子只学安排的书，访客看不到题目：样稿

[#221](https://github.com/juanchaopan/education/issues/221) 的样稿，待维护者确认。设计见 [孩子只学安排的书，访客看不到题目](../../design/book-access.md)。

## 怎么做的

样稿是一次性的 HTML，直接用网站的设计令牌（`apps/web/src/styles/tokens.css`），顶栏、问候横幅、题库卡片和题目页的空状态照现在的页面近似画出，图标照 `shared/ui/icons.tsx` 画。用 Playwright 的 Chromium 截图：桌面 1280 宽，手机 390×844，减弱动画；截图转成 256 色 PNG 以减小文件。样稿代码不进入仓库。

和正式页面的差别：

- 标题用 Windows 的系统楷体代替霞鹜文楷，字形略有不同。
- 书名和题目是样稿用的例子：「学而思」「思维训练」可用，「儿歌和童谣」是安排给了孩子、暂时不可用的书。
- 题目页的返回露珠和空状态卡片是近似画法，正式页面用现有的 `FullscreenFrame` 和 `EmptyState`。

## 截图

### 首页

| 截图                                                                               | 画的是什么                                                                                                                          |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [guest-home-desktop.png](guest-home-desktop.png)                                   | 桌面白天，访客：问候横幅，下面「我是小朋友」（孩子登录、用 KEY 注册）和「我是家长」（家长登录、创建家长账号）；导航第一项是「首页」 |
| [guest-home-night-desktop.png](guest-home-night-desktop.png)                       | 同上，晚上主题                                                                                                                      |
| [guest-home-phone.png](guest-home-phone.png)                                       | 手机，访客：两块上下排                                                                                                              |
| [guest-home-parent-signed-in-desktop.png](guest-home-parent-signed-in-desktop.png) | 桌面，只登录了家长账号：家长那一块换成「进入家长空间」                                                                              |
| [child-home-desktop.png](child-home-desktop.png)                                   | 桌面，登录的孩子：「我的题目」，右上角「3 本书」，三个选择只含安排给孩子的书，题目是链接                                            |
| [child-home-unavailable-phone.png](child-home-unavailable-phone.png)               | 手机，孩子选中暂时不可用的「儿歌和童谣」：分类里写「暂时不可用」，一条提示，题目置灰、不是链接                                      |
| [child-home-empty-desktop.png](child-home-empty-desktop.png)                       | 桌面，孩子还没有安排的书：空状态「家长还没有给你安排书」                                                                            |

### 题目页

| 截图                                                             | 画的是什么                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [problem-guest-desktop.png](problem-guest-desktop.png)           | 桌面，访客打开题目链接：「登录后才能打开这道题」，「孩子登录」和用 KEY 注册的链接  |
| [problem-guest-phone.png](problem-guest-phone.png)               | 同上，手机                                                                         |
| [problem-parent-desktop.png](problem-parent-desktop.png)         | 桌面，只登录了家长账号：「请孩子登录后打开这道题」，「孩子登录」和「回到家长空间」 |
| [problem-unassigned-desktop.png](problem-unassigned-desktop.png) | 桌面，孩子打开没安排的书里的题：「这道题不在你的书里」，「回到我的题目」           |
| [problem-unavailable-phone.png](problem-unavailable-phone.png)   | 手机，孩子打开暂时不可用的书里的题：「这本书暂时不可用」，「回到我的题目」         |
