# #179 家长书架：样稿

[#179](https://github.com/juanchaopan/education/issues/179) 的样稿，等维护者确认。设计见 [家长书架与按书安排练习](../../design/bookshelf.md)。

## 怎么做的

样稿是一次性的 HTML，直接用网站的设计令牌（`apps/web/src/styles/tokens.css`），家长空间的侧栏、标签栏和卡片照现在的页面近似画出，图标照 `shared/ui/icons.tsx` 画。用 Playwright 的 Chromium 截图：桌面 1280 宽，手机 390×844，减弱动画；截图转成 256 色 PNG 以减小文件。样稿代码不进入仓库。

和正式页面的差别：

- **封面是占位**：有图的封面是从绘景库里裁出来的竖版画面，只为看出书卡上有图时的样子；正式的封面按 [风格说明](../../design/lesson-media.md#书的封面) 由维护者在 Codex 里生成，绘景不会拿来当封面。没有图的书卡画的就是设计里的默认封面。
- 书名、题数、进度和孩子都是样稿用的例子，题目清单里现在只有「一年级 / 数学 / 学而思」一本书。
- 标题用 Windows 的系统楷体代替霞鹜文楷，字形略有不同。
- 孩子「我的练习」为了截图不太长，每本书只画了前几道题，下面写「还有 6 道…」；正式页面列出书里的全部题。

## 截图

| 截图                                                                       | 画的是什么                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shelf-desktop.png](shelf-desktop.png)                                     | 桌面白天，练习安排页。两个孩子，选中小米；年级选一年级，科目全部；共 46 本，第一批 24 本。书卡有：已安排（5/12）、已安排且学完（10/10）、未安排（0/30）、未安排但自由复习做过（3/16）、新加题后的 12/13、默认封面（数学、语文、英语、表里没有的科目）、长书名；底部是「再看 24 本」按钮 |
| [shelf-night-desktop.png](shelf-night-desktop.png)                         | 同上，晚上主题                                                                                                                                                                                                                                                                          |
| [shelf-phone-top.png](shelf-phone-top.png)                                 | 手机白天，书架第一屏：选孩子、年级分段和科目筹码可以横向滑动，一排两本                                                                                                                                                                                                                  |
| [shelf-phone-loading-more.png](shelf-phone-loading-more.png)               | 手机，上滑到底，正在自动加载下一批：两张骨架书卡、三颗跳动的圆点，后备按钮暂时不能点                                                                                                                                                                                                    |
| [shelf-phone-more-failed.png](shelf-phone-more-failed.png)                 | 手机，下一批没加载出来：一行提示，「再看 24 本」变成主按钮                                                                                                                                                                                                                              |
| [shelf-one-child-phone.png](shelf-one-child-phone.png)                     | 手机，家里只有一个孩子：直接选中，写「为小米安排」，不能点                                                                                                                                                                                                                              |
| [shelf-subject-filter-desktop.png](shelf-subject-filter-desktop.png)       | 桌面，一年级 · 语文，全部加载完：「一共 7 本，都在这里了」                                                                                                                                                                                                                              |
| [shelf-filter-empty-desktop.png](shelf-filter-empty-desktop.png)           | 桌面，六年级 · 英语下没有书：空状态和「看全部的书」                                                                                                                                                                                                                                     |
| [shelf-catalog-empty-desktop.png](shelf-catalog-empty-desktop.png)         | 桌面，题目清单里一本书也没有：「书在路上」                                                                                                                                                                                                                                              |
| [shelf-no-children-desktop.png](shelf-no-children-desktop.png)             | 桌面，还没有孩子加入家庭：空状态和「邀请孩子」                                                                                                                                                                                                                                          |
| [shelf-loading-desktop.png](shelf-loading-desktop.png)                     | 桌面，书架第一次加载：十张骨架书卡                                                                                                                                                                                                                                                      |
| [shelf-error-phone.png](shelf-error-phone.png)                             | 手机，书架没打开：空状态和「再试一次」                                                                                                                                                                                                                                                  |
| [overview-desktop.png](overview-desktop.png)                               | 桌面白天，总览：「值得再练」不再有安排按钮；「已安排」每行是封面缩略图、书名、孩子和年级科目、n / m 或「学完」                                                                                                                                                                          |
| [overview-night-desktop.png](overview-night-desktop.png)                   | 同上，晚上主题                                                                                                                                                                                                                                                                          |
| [overview-phone.png](overview-phone.png)                                   | 手机白天，总览整页                                                                                                                                                                                                                                                                      |
| [overview-no-assignments-desktop.png](overview-no-assignments-desktop.png) | 桌面，「已安排」为空：空状态和「去书架安排」                                                                                                                                                                                                                                            |
| [child-practice-desktop.png](child-practice-desktop.png)                   | 桌面，孩子空间的「我的练习」最小改动：按书分组，每组封面缩略图、书名、n / m 或「学完」，下面是书里的题，做完的打勾                                                                                                                                                                      |
| [child-practice-phone.png](child-practice-phone.png)                       | 同上，手机                                                                                                                                                                                                                                                                              |
| [bookcard-kit-day.png](bookcard-kit-day.png)                               | 部件样张，白天：书卡的各种状态（未安排、自由复习做过、已安排、已安排时悬停或聚焦显示「取消安排」、学完、新加题、四种默认封面、长书名、加载中），选孩子，年级分段和科目筹码，总览「已安排」的一行（含书已撤下），翻到底的四种状态                                                        |
| [bookcard-kit-night.png](bookcard-kit-night.png)                           | 同上，晚上主题                                                                                                                                                                                                                                                                          |

## 维护者的选择

等维护者看过以后记在这里。
