# ADR-0011 试点使用 GPT-6 Luna 提供中文解题提示

- 状态：已接受试点模型，待正式接入与验收
- 日期：2026-11-05
- 相关需求：REQ-003、REQ-006、REQ-008
- 任务：[#27](https://github.com/juanchaopan/education/issues/27)

## 背景

应用需要根据当前题目的文字或绘图给儿童一句可操作的中文提示。模型须把最后一步留给儿童，能区分可见的绘图细节与需要澄清的输入。健康态目标是 5 秒开始有效响应，10 秒未开始时提供引导模式。

## 候选方案

| 方案                        | 结果                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| GPT-6 Luna，关闭推理        | 收紧提示词后 18/18 合成样本通过，P95 2.46 秒，估算 US$0.038/千次    |
| GPT-6 Luna，低推理          | 18 次有 5 次未返回完整响应，其中 4 次用满 128 输出 token            |
| GPT-5.4 Mini，关闭推理      | P95 2.18 秒，三次位值题仍直接给出答案，估算 US$0.386/千次           |
| GPT-5.4 nano / GPT-4.1 mini | 首轮作为成本与时延对照；位值提示不符合要求，GPT-4.1 mini 已标记弃用 |

## 决策

维护者确认试点采用 `gpt-6-luna`。后端以流式 Responses API、标准服务、`reasoning.effort: none`、`max_output_tokens: 128` 和 `store: false` 作为接入起点。采用第二轮的单句提示，直接对孩子说话，明确保留最后一步。绘图反馈只在需要时发送当前步骤相关的一张图；语音识别与朗读由各自的适配器处理。

正式接入由 [#37 家长授权](https://github.com/juanchaopan/education/issues/37)、[#38 AI 网关](https://github.com/juanchaopan/education/issues/38)、[#39 用量与费用控制](https://github.com/juanchaopan/education/issues/39) 和 [#40 结构化教学反馈](https://github.com/juanchaopan/education/issues/40) 落地。超时、配额拒绝或无法可靠理解时保留当前作答，切换到题目专属引导。超时或取消后不自动重试；缺少最终用量按待核对处理。服务商保留与家长披露沿用 REQ-008，目标地区与部署验收沿用 [ADR-0002](0002-deployment-access.md) 和 [#51](https://github.com/juanchaopan/education/issues/51)。

## 证据

[两轮测量、用量与限制](assets/0027-openai-model-evidence.md)。测试通过 GitHub Actions 的 Node.js 后端脚本调用 OpenAI，只发送合成数据。第二轮 18 次 Luna 无推理调用全部在 5 秒内给出可用提示。实际费用按 API 用量和公开单价估算；两次流取消未收到最终用量。探针源码与夹具归档在 [archive/spike-27-openai-models](https://github.com/juanchaopan/education/tree/archive/spike-27-openai-models)。

## 后果

[#51](https://github.com/juanchaopan/education/issues/51) 从大陆真实设备经目标部署复测端到端时延和三儿童并发。首批真实题目接入时重新检查提示准确性、是否泄题、遮挡时的澄清和实际图像 token；若达不到教学、性能或费用要求，重做对比。
