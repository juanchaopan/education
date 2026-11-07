# 中文朗读与重复播放指令

[#42](https://github.com/juanchaopan/education/issues/42) 让儿童随时重听当前这一步的讲解，可以暂停、继续或从头听，文字始终在屏幕上。对应 REQ-003、REQ-004，按 [ADR-0012](../../adr/0012-browser-voice-touch-spike.md) 的朗读方案实现。

## 声音

维护者试听 [#48 的三道原型](../../adr/assets/0048-interactive-teaching-evidence.md)后，认可其中的旁白音色：本地 [Piper](https://github.com/rhasspy/piper) 中文模型 `zh_CN-huayan-medium`，语速 `length_scale 1.12`，逐句合成、按教学动作断句，生成脚本见归档标签 `archive/spike-48-interactive-lessons` 的 `*-voice.py`。

- 每道题的旁白在出题时预先生成为静态音频文件，随页面一起发布。孩子使用时不调用任何在线服务，不发送孩子的任何信息，也不产生费用，所以不涉及 #37/#39 的授权与用量控制。
- 每段音频仍要在所在的题目里实际试听，确认断句、停顿和音画同步，见[逐题设计互动教学与验收手册](../../design/interactive-lesson-authoring.md)。
- **许可需要维护者确认**：Piper 程序是 MIT 许可，声音模型的训练数据不是。[`zh_CN-huayan-medium` 的模型卡](https://huggingface.co/rhasspy/piper-voices/blob/main/zh/zh_CN/huayan/medium/MODEL_CARD)把中文数据 HuaYan_TTS 的许可证标为 Unknown，模型卡链接的数据集仓库已无法访问；它又是从英文 `lessac` 声音微调而来，[`lessac` 的数据](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)只按研究许可协议提供。正式给儿童发布这个声音之前，需要维护者确认可以使用，否则换用许可明确的声音。播放功能与声音无关，换声音只需重新生成音频文件。

## 播放规则

| 情况                 | 行为                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 播放中点「从头听」   | 同一个音频元素回到开头重新播放，不会同时响两段；场景仍等这段真正播完才进入下一步                                             |
| 播完后点「再听一遍」 | 再播一次这一段。场景的下一段开始时，正在重听的这段立即停止，下一段不会因为「正在播放」被拒绝                                 |
| 连续快速点           | 每次都是从头播同一段，任何时候只有一段在响                                                                                   |
| 暂停、继续           | 暂停后场景停在原处，继续时从暂停的位置接着播；暂停期间场景发来的下一段被拒绝（`busy`），不会排队                             |
| 换到下一步           | 立即停止上一步的声音，并忘掉它：之后点重听不会播出上一步的话                                                                 |
| 页面切到后台         | 暂停，回来后由孩子点「继续」，不会突然自己响起来                                                                             |
| 离开课程             | 停止播放                                                                                                                     |
| 这一步没有音频       | 只显示文字，不显示播放按钮                                                                                                   |
| 声音放不出来         | 浏览器拒绝自动播放或音频加载失败时，文字照常显示，并说明「声音没有放出来，看上面的字也可以」；孩子点「再听一遍」可以再试一次 |

## 组成

- **`interaction/narration.ts`**：`createNarration` 在 #31 的按序播放、暂停续播和停止之外，提供 `replay()` 和播放状态（`silent`、`ready`、`playing`、`paused`、`failed`）。场景照旧用 `play(source, onCue)` 按教学顺序播放，用 `onCue` 同步字幕和高亮。
- **`interaction/useNarration.ts`**：`useNarration(stepId)` 把旁白绑定到当前步骤，负责换步骤、切到后台和离开课程时的处理。
- **`components/NarrationCaption.tsx`**：显示当前这段话的文字（`aria-live="polite"`，读屏软件会读出新的一段），按状态提供「再听一遍」「暂停」「继续」「从头听」。
- 题目页面用 `onCue` 把这一段的文字交给 `NarrationCaption`；孩子点重听时，页面可以按 #31 的 `createLessonHelp` 记录一次 `replay`。

| 可以重听                                | 正在播放                                  | 已暂停                                 |
| --------------------------------------- | ----------------------------------------- | -------------------------------------- |
| ![可以重听](assets/narration-ready.png) | ![正在播放](assets/narration-playing.png) | ![已暂停](assets/narration-paused.png) |

| 没有音频                                   | 声音没有放出来                                       |
| ------------------------------------------ | ---------------------------------------------------- |
| ![没有音频](assets/narration-no-sound.png) | ![声音没有放出来](assets/narration-sound-failed.png) |

截图来自 Storybook 静态构建，Windows 无头 Chromium，宽 390 px、DPR 2。

## 自动化检查

- **旁白**：播放中和暂停时重听都在同一元素上从头播、不新建音频，场景仍等到真正结束；播完后重听用新元素，并让位给场景的下一段；放不出声时报告并可重试；停止后不能重听；没有音频时直接显示文字；原有的按序播放、暂停续播、暂停前迟到的播放失败和停止后不再揭示字幕仍然成立。
- **步骤绑定**：换步骤时上一段被取消且不能重听，切到后台时暂停，离开课程时停止且之后的后台事件不再触发。
- **面板**：每种状态显示的文字和按钮，以及按钮调用的操作。

## 未验证

- 没有真机试听。iPhone、iPad、Android 的实际播放、静音键和后台切换，按 ADR-0012 交 [#51](https://github.com/juanchaopan/education/issues/51) 验收。
- 题库为空，还没有页面挂载这个面板，也没有正式的旁白音频文件。首批真实题目由 [#49](https://github.com/juanchaopan/education/issues/49) 按上面的声音生成旁白并接入。
