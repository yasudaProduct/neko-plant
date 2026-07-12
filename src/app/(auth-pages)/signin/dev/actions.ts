'use server';

import { createClient } from '@/lib/supabase/server';

export async function signInWithEmail(formData: FormData) {
  // Server Actionは画面非表示でも本番でPOST可能なため、ページ側だけでなくここでも環境を強制する
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'この操作は許可されていません。' };
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'メールアドレスまたはパスワードが正しくありません。' };
  }

  return { success: true };
}