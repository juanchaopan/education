# #141 孩子注册和找不到页面：截图

[#141](https://github.com/juanchaopan/education/issues/141) 的截图，供维护者确认。孩子注册 `/join` 按维护者 2026-11-14 的决定照已确认的登录页的版式和部件做，设计见 [网站视觉语言](../../design/visual-language.md)；每个页面的地址见 [孩子只学安排的书，访客看不到题目](../../design/book-access.md#地址和谁看到什么)。

## 怎么截的

用构建好的网站（`vite preview`）和 Playwright 的 Chromium 截图，接口由固定的回答代替：桌面 1280×800，手机竖放 390×844，减弱动画，整页截图；截图转成 256 色 PNG 以减小文件。字体用本机的，和视觉回归测试容器里的略有不同。KEY、昵称、家庭码都是截图用的例子。

## 截图

| 截图                                                 | 画的是什么                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [join-desktop.png](join-desktop.png)                 | 桌面，打开 `/join`：左边画室和小兔，右边卡片；标题「加入家庭」；KEY 输入框的占位、昵称下「不用真名 · 0 / 12」、PIN 下「只告诉家长」；底部「已有账号？去登录」 |
| [join-phone.png](join-phone.png)                     | 手机，同上：画在上，卡片压在下沿                                                                                                                              |
| [join-error-desktop.png](join-error-desktop.png)     | 桌面，填好以后服务端说 PIN 太简单：KEY 粘贴成小写带空格，自动变成「ABCD-EFGH-JKMN-PQRS」；昵称计数「2 / 12」；错误提示在按钮上方                              |
| [join-error-phone.png](join-error-phone.png)         | 手机，同上                                                                                                                                                    |
| [join-success-desktop.png](join-success-desktop.png) | 桌面，加入成功：标题「你已加入家庭！」，家庭码、「记住自己刚才设置的六位 PIN，不要发给别人。」和一个主按钮「去登录」                                          |
| [join-success-phone.png](join-success-phone.png)     | 手机，同上                                                                                                                                                    |
| [not-found-desktop.png](not-found-desktop.png)       | 桌面，没有的地址：网站顶上的品牌，空状态的嫩芽、页面标题「这条小路还没找到」和「回到首页」按钮                                                                |
| [not-found-phone.png](not-found-phone.png)           | 手机，同上                                                                                                                                                    |
