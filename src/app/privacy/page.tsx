import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 猫と植物",
  description: "猫と植物のプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. はじめに</h2>
          <p className="mb-4">
            猫と植物（以下「当サイト」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。
            本プライバシーポリシーでは、当サイトにおける個人情報の収集、利用、保護について説明します。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">2. 収集する情報</h2>
          <p className="mb-4">
            当サイトでは、以下の情報を収集する場合があります：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              アカウント情報（メールアドレス、パスワード、ユーザー名など）
            </li>
            <li>プロフィール情報（アイコン画像、自己紹介など）</li>
            <li>投稿情報（植物の評価、コメントなど）</li>
            <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時など）</li>
            <li>Cookie情報</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. 情報の利用目的</h2>
          <p className="mb-4">収集した情報は、以下の目的で利用します：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>サービスの提供と運営</li>
            <li>ユーザー認証とアカウント管理</li>
            <li>サービスの改善と新機能の開発</li>
            <li>ユーザーサポートの提供</li>
            <li>不正利用の防止</li>
            <li>統計情報の作成</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">4. 情報の共有</h2>
          <p className="mb-4">
            当サイトは、以下の場合を除き、収集した個人情報を第三者と共有することはありません：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>当サイトの利用規約に違反する行為に対処する場合</li>
            <li>当サイトの権利、財産、サービスを保護する必要がある場合</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">5. お問い合わせ</h2>
          <p className="mb-4">
            プライバシーポリシーに関するお問い合わせは、下記よりお願いします
            <br />
            <Link href="/contact" className="text-blue-600 hover:underline">
              お問い合わせ
            </Link>
          </p>
        </section>

        <div className="mt-8 text-sm text-gray-500">
          <p>最終更新日：2024年3月31日</p>
        </div>
      </div>
    </div>
  );
}
