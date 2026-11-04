const buttons = Array.from(document.querySelectorAll('button'));
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const consent = document.querySelector('#consent');

async function invoke(action) {
  if (action.action === 'send' && !consent.checked) {
    status.textContent = '请先确认收件人同意本次测试。';
    return;
  }
  for (const button of buttons) button.disabled = true;
  status.textContent = '正在测试，请等待；不要重复提交。';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch('/api/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mail-Probe': '1' },
      body: JSON.stringify(action),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json();
    result.textContent = JSON.stringify(data, null, 2);
    status.textContent = response.ok
      ? '已收到服务端结果。发信结果还需要到真实邮箱核对。'
      : '配置未就绪或请求未通过，请检查结果。';
  } catch {
    status.textContent =
      '没有获得确定结果。若刚才发了邮件，请先查收正常与垃圾收件箱，不要直接重复发送。';
  } finally {
    clearTimeout(timer);
    for (const button of buttons) button.disabled = false;
  }
}

document.querySelector('#connect').addEventListener('click', () => {
  void invoke({ action: 'connect' });
});
for (const button of document.querySelectorAll('[data-recipient]')) {
  button.addEventListener('click', () => {
    void invoke({
      action: 'send',
      purpose: button.dataset.purpose,
      recipient: button.dataset.recipient,
      consent: true,
    });
  });
}
