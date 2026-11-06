# 受控 AI 网关与引导模式

[#38](https://github.com/juanchaopan/education/issues/38) 实现 REQ-006、REQ-008 的服务端文字提示网关和课堂切换状态。代码可通过隔离测试调用。正式儿童入口由 #39 的限流和费用控制及 #40 的结构化教学反馈接入。

## 接入约定

- 在服务端用 `createAiTutoring(pool, env)` 创建入口。付费开关沿用默认开启的 `PAID_AI_ENABLED`，缺少 `OPENAI_API_KEY` 或资格确认时返回明确的不可用原因。
- `OPENAI_TUTORING_ELIGIBLE=true` 是部署者对目标用户、部署区域、账号项目和数据处理设置的确认。仅在逐项核实后为合格部署设置。当前试点没有收集儿童年龄，因此处理儿童文本需要项目已启用适用的零数据保留。中国大陆目前未列入 API 支持地区，从支持地区运行服务器也不能替代核实目标用户资格。 [支持地区](https://developers.openai.com/api/docs/supported-countries) [未成年人指南](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) [数据保留](https://developers.openai.com/api/docs/guides/your-data)
- 调用方从已发布题目中选取当前一步，并提交孩子本次明确提问。网关限制当前步骤为 1,200 字符、提问为 500 字符，只向固定的 Responses API 发送这两段文本。没有历史、家庭标识、会话信息、画板或录音。绘图与语音分别交 #40、#41 接入和验收。
- 网关复用 #37 的儿童会话、CSRF 和当前政策授权检查。通过后在家庭锁内启动一次请求并立即返回句柄，响应头和流都在事务外等待。撤回提交后阻止新请求，已经启动的请求可能已经外发。
- 按 ADR-0011 使用 `gpt-6-luna`、`reasoning.effort=none`、`max_output_tokens=128`、`store=false`。只接受完整结束且格式有效的简短提示，十秒等待包括授权和传输。HTTP 响应头、增量事件和空内容不会被视为可用提示。取消、失败或超时均不自动重试。成功返回模型、有效响应耗时和 token 数，供应商没有返回用量时为 `null`。供应商错误正文、原始输入和密钥不进入日志或失败结果。 [流式事件](https://developers.openai.com/api/reference/resources/responses/streaming-events)
- 逐题课堂可以用 `createAiHelpRequest(update)` 提供等待、可用、回退和引导状态。作答、画板和当前步骤仍归课堂所有。课堂将回退状态接到本题的既有提示或规则检查，选择引导时调用 `guide()`，切换题目或步骤时调用 `dispose()`。处理后发起新请求时，旧结果无法覆盖当前状态。

## 验证范围

使用合成题目与受控供应商替身验证请求格式、截断流、失败、取消、超时和迟到响应。授权撤回及等待供应商期间释放事务使用隔离 PostgreSQL 验证。没有向外部发送儿童输入，也没有验证实际部署的供应商账号资格、实时延或教学质量。
