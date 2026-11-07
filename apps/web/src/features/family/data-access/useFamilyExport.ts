import { useMutation } from '@tanstack/react-query';
import { Value } from '@sinclair/typebox/value';
import { FamilyExport } from '@education/contracts';
import { saveFile } from './save-file';
import { sessionRequest } from './session-request';

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// The file is named after the parent's own calendar day, not the UTC day.
function localDay(iso: string) {
  const time = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`;
}

// Downloads the family's export and returns the saved file name. A response
// that is not a complete export is never saved.
async function exportFamily(csrf: string) {
  const fallback = '暂时无法导出家庭数据，请稍后重试。';
  const response = await sessionRequest('parents/family-export', {}, csrf, 30_000).catch(() => {
    throw new Error('连接中断，没有得到导出文件，请重新确认家长密码后再试。');
  });
  if (response.status === 401) throw new Error('登录状态已失效，请重新登录家长账号。');
  if (response.status === 403) throw new Error('请重新确认家长密码后再导出。');
  if (!response.ok) throw new Error(fallback);
  const text = await response.text().catch(() => '');
  const file = parse(text);
  if (!Value.Check(FamilyExport, file)) throw new Error(fallback);
  const name = `family-data-${localDay(file.format.generatedAt)}.json`;
  saveFile(text, name);
  return name;
}

export function useFamilyExport() {
  return useMutation({ retry: false, gcTime: 0, mutationFn: exportFamily });
}
