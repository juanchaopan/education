const start = document.querySelector('#start');
const stop = document.querySelector('#stop');
const status = document.querySelector('#status');
const report = document.querySelector('#report');
const copy = document.querySelector('#copy');
const cssReady =
  getComputedStyle(document.documentElement).getPropertyValue('--probe-css').trim() === 'ready';
document.querySelector('#assets').textContent =
  `网页：已打开 · 脚本：正常 · 样式：${cssReady ? '正常' : '未加载'}`;
start.disabled = false;
status.textContent = '点击“开始测试”，检测同源接口的访问情况。';
let running;

async function sample(signal, phase) {
  const begin = performance.now();
  try {
    const response = await fetch(`/api/ping?sample=${Date.now()}`, {
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.ok !== true || data.probe !== 'education-access-v1')
      throw new Error('接口内容不符合预期');
    return { phase, ok: true, ms: Math.round(performance.now() - begin), region: data.region };
  } catch (error) {
    return {
      phase,
      ok: false,
      ms: Math.round(performance.now() - begin),
      error: signal.aborted
        ? '用户停止'
        : error.name === 'TimeoutError'
          ? '超过 10 秒'
          : error.message,
    };
  }
}

function summarize(samples, aborted, failures) {
  const measured = samples.filter((s) => s.phase === '正式');
  const values = measured
    .filter((s) => s.ok)
    .map((s) => s.ms)
    .sort((a, b) => a - b);
  const percentile = (p) => (values.length ? values[Math.ceil(values.length * p) - 1] : null);
  return {
    测试页: location.origin,
    时间: new Date().toISOString(),
    静态资源: { HTML: true, JavaScript: true, CSS: cssReady },
    结束原因: aborted ? '用户停止' : failures >= 3 ? '连续失败三次' : '完成',
    '正式请求成功/已尝试': `${values.length}/${measured.length}`,
    正式请求计划数: 20,
    成功请求延迟毫秒: { P50: percentile(0.5), P95: percentile(0.95), max: values.at(-1) ?? null },
    说明: '失败不计入延迟分位数，须结合失败次数判断。小样本不能证明大陆全网可达；未测数据库、邮件和 AI。',
    逐次结果: samples,
  };
}

start.addEventListener('click', async () => {
  if (!AbortSignal.any || !AbortSignal.timeout) {
    status.textContent = '当前浏览器版本不支持此测试，请使用更新版本的浏览器。';
    return;
  }
  running = new AbortController();
  start.disabled = true;
  stop.disabled = false;
  copy.disabled = true;
  report.value = '';
  const samples = [];
  let failures = 0;
  try {
    for (let i = 0; i < 24 && !running.signal.aborted && failures < 3; i++) {
      const phase = i === 0 ? '首次' : i < 4 ? '预热' : '正式';
      status.textContent = `正在测试：${phase}，已完成 ${samples.length} 次。`;
      const result = await sample(running.signal, phase);
      samples.push(result);
      failures = result.ok ? 0 : failures + 1;
    }
    const summary = summarize(samples, running.signal.aborted, failures);
    report.value = JSON.stringify(summary, null, 2);
    status.textContent = `测试已结束：${summary['结束原因']}。请复制结果，并说明省份、运营商及 Wi-Fi 或手机流量。`;
    copy.disabled = false;
  } finally {
    start.disabled = false;
    stop.disabled = true;
  }
});
stop.addEventListener('click', () => running?.abort());
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(report.value);
    status.textContent = '结果已复制，可以粘贴到聊天。';
  } catch {
    report.focus();
    report.select();
    status.textContent = '请长按或使用键盘复制已选中的结果。';
  }
});
