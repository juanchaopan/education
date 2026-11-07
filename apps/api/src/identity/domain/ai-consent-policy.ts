import type { AiConsentPolicy } from '@education/contracts';

// Advance the version whenever the disclosed inputs, purpose or retention changes.
export const aiConsentPolicies = {
  'openai-tutoring': {
    scope: 'openai-tutoring',
    policyVersion: 20261106,
    title: 'AI 解题提示',
    provider: 'OpenAI Responses API',
    inputs: '孩子提交的文字、必要的题目步骤，以及需要时当前步骤的一张绘图。',
    purpose: '理解孩子在当前步骤的疑问并给出解题提示。',
    appRetention:
      '应用不保存发给 AI 的原始请求。练习草稿可能包含笔迹，最后编辑后 7 天过期，提交或放弃时清除。',
    providerRetention:
      '拟关闭 Responses API 的响应存储。OpenAI 默认的安全监测日志可能保留内容最多 30 天，特定情况下可延长。即使启用零数据保留，若图像被标记为疑似儿童性虐待材料，供应商仍可能保留图像供人工复核。',
  },
  'openai-transcription': {
    scope: 'openai-transcription',
    policyVersion: 20261107,
    title: '语音转写',
    provider: 'OpenAI Audio Transcriptions API',
    inputs:
      '孩子主动录下的一段不超过 30 秒的短录音，以及当前题目步骤里的几个关键词（只来自题目，不含孩子的信息）。',
    purpose: '把普通话录音转成文字，供孩子检查、修改并确认后再提交。',
    appRetention: '应用不保存原始录音，转写结束即丢弃；识别出的文字在孩子确认前不会提交。',
    providerRetention:
      'OpenAI 将此转写端点列为无应用状态存储、无安全监测日志保留。实际启用仍取决于服务账号的数据设置和儿童数据处理资格。',
  },
} satisfies Record<AiConsentPolicy['scope'], AiConsentPolicy>;
