import { expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { hashParentPassword } from '../apps/api/src/identity/services/password.js';

export type PasswordParent = { family: string; email: string; password: string };

// Seeds a family with a verified parent who has a real password, so a test
// signs in through the login page. The caller deletes the family when done.
export async function seedPasswordParent(pool: pg.Pool): Promise<PasswordParent> {
  const family = randomUUID();
  const email = `${family}@example.test`;
  const password = `synthetic parent password ${family}`;
  await pool.query('INSERT INTO families(id) VALUES($1)', [family]);
  await pool.query(
    'INSERT INTO parents(family_id,email,password_hash,email_verified) VALUES($1,$2,$3,true)',
    [family, email, await hashParentPassword(password)],
  );
  return { family, email, password };
}

// Fills the parent login form already on the page and submits it.
export async function submitParentLogin(page: Page, { email, password }: PasswordParent) {
  await page.getByLabel('登录邮箱').fill(email);
  await page.getByLabel('登录密码').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
}

// Opens the parent space signed out, switches to login and signs in, which
// lands on the overview.
export async function signInWithPassword(page: Page, parent: PasswordParent) {
  await page.goto('/family');
  await page.getByRole('button', { name: '已有账号？去登录' }).click();
  await submitParentLogin(page, parent);
  await expect(page.getByRole('heading', { name: '总览', level: 1 })).toBeVisible();
}

// Opens one part of the signed-in parent space from its navigation.
export async function openParentPart(page: Page, part: string) {
  await page
    .getByRole('navigation', { name: '家长空间' })
    .getByRole('link', { name: part, exact: true })
    .click();
  await expect(page.getByRole('heading', { name: part, level: 1 })).toBeVisible();
}
