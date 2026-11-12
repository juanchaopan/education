# #221 孩子只学安排的书，访客看不到题目：样稿

[#221](https://github.com/juanchaopan/education/issues/221) 的样稿，待维护者确认。设计见 [孩子只学安排的书，访客看不到题目](../../design/book-access.md)。

## 怎么做的

样稿是一次性的 HTML，直接用网站的设计令牌（`apps/web/src/styles/tokens.css`）和绘景库里的图（傍晚的画室、小兔、清晨的菜园），登录页照家长账号页面的版式，孩子首页照 #179 孩子「我的练习」的样子，题目页照现在的画框和空状态近似画出，图标照 `shared/ui/icons.tsx` 画。用 Playwright 的 Chromium 截图：桌面 1280 宽，手机竖放 390×844、横放 844×390，减弱动画；截图转成 256 色 PNG 以减小文件。样稿代码不进入仓库。

和正式页面的差别：

- 标题用 Windows 的系统楷体代替霞鹜文楷，字形略有不同。
- 书名、题目、进度和学习时间是样稿用的例子；书的封面都画成默认封面。
- 预览作答那张图的题目、选项和点选的样子是示意，正式页面用每道题自己的作答部件。

## 截图

### 首页：登录页

| 截图                                                                     | 画的是什么                                                                                                                                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [home-login-child-desktop.png](home-login-child-desktop.png)             | 桌面白天，访客打开首页：左边画室和小兔，右边卡片；页签「孩子登录」选中：家庭码、昵称、六位 PIN、记住开关、「进入我的空间」；底部「第一次来？注册」「忘了 PIN？请家长帮忙」 |
| [home-login-child-night-desktop.png](home-login-child-night-desktop.png) | 同上，晚上主题                                                                                                                                                             |
| [home-login-child-phone.png](home-login-child-phone.png)                 | 手机，孩子登录页签：画在上，卡片压在下沿                                                                                                                                   |
| [home-login-parent-desktop.png](home-login-parent-desktop.png)           | 桌面，「家长登录」页签：登录邮箱、登录密码、「登录」；底部「还没有账号？注册」「忘记密码」                                                                                 |
| [home-login-parent-phone.png](home-login-parent-phone.png)               | 手机，家长登录页签                                                                                                                                                         |

### 首页：登录的孩子

| 截图                                                         | 画的是什么                                                                                                                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [child-home-desktop.png](child-home-desktop.png)             | 桌面白天，「我的书」5 本，按顺序：没学完、今天学过的「学而思」5/12；没学完、3 天前学过的「古诗诵读」12/13；从没学过、昨天安排的「拼音乐园」0/10；学完的「思维训练」；暂时不可用、置灰的「儿歌和童谣」 |
| [child-home-night-desktop.png](child-home-night-desktop.png) | 同上，晚上主题                                                                                                                                                                                        |
| [child-home-phone.png](child-home-phone.png)                 | 手机，同样的 5 本，每本列出的题少一些                                                                                                                                                                 |
| [child-home-empty-desktop.png](child-home-empty-desktop.png) | 桌面，还没有安排的书：空状态「家长还没有给你安排书」                                                                                                                                                  |

### 题目页

| 截图                                                                 | 画的是什么                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [problem-guest-desktop.png](problem-guest-desktop.png)               | 桌面，没登录打开题目链接：只有「登录后才能打开这道题」和「去登录」，看不到题目的任何内容                    |
| [problem-guest-phone.png](problem-guest-phone.png)                   | 同上，手机                                                                                                  |
| [problem-unassigned-desktop.png](problem-unassigned-desktop.png)     | 桌面，孩子打开没安排的书里的题：「请家长安排这本书」，「回到我的书」                                        |
| [problem-unavailable-phone.png](problem-unavailable-phone.png)       | 手机，孩子打开暂时不可用的书里的题：「这本书暂时不可用」，「回到我的书」                                    |
| [problem-preview-desktop.png](problem-preview-desktop.png)           | 桌面，家长预览菜园题的片名卡：返回露珠旁边一块烟色玻璃「家长预览 · 不记录」                                 |
| [problem-preview-answer-phone.png](problem-preview-answer-phone.png) | 手机横放，家长预览到作答这一步：点选作答，服务器判对，「答对了 · 预览不记录」；右下角只有提示露珠，没有话筒 |
