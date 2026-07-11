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
              アカウント情報（メールアドレス、パスワード、Googleアカウント等の外部サービスによる認証情報、ユーザー名など）
            </li>
            <li>プロフィール情報（アイコン画像、ユーザーIDなど）</li>
            <li>
              猫のプロフィール情報（名前、種類、性別、誕生日、写真など）
            </li>
            <li>
              投稿情報（写真、コメント、植物・猫のタグ、いいねなど）
            </li>
            <li>アクセスログ（IPアドレス、ブラウザ情報、アクセス日時など）</li>
            <li>Cookie情報</li>
          </ul>
          <p className="mt-4">
            なお、アップロードされた写真に含まれる位置情報・撮影日時等のメタデータ（Exif）は、公開時に自動的に削除されます。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. 情報の利用目的</h2>
          <p className="mb-4">収集した情報は、以下の目的で利用します：</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>サービスの提供と運営</li>
            <li>ユーザー認証とアカウント管理</li>
            <li>
              投稿写真からの植物名のAI判定（外部AIサービスへの写真の送信を含みます）
            </li>
            <li>
              共存実績など、投稿を集計した統計情報の作成と公開
            </li>
            <li>サービスの改善と新機能の開発</li>
            <li>ユーザーサポートの提供</li>
            <li>不正利用の防止</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">
            4. 情報の共有・外部サービスの利用
          </h2>
          <p className="mb-4">
            当サイトは、以下の場合を除き、収集した個人情報を第三者と共有することはありません：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>当サイトの利用規約に違反する行為に対処する場合</li>
            <li>当サイトの権利、財産、サービスを保護する必要がある場合</li>
            <li>
              下記の外部サービスに、サービス提供に必要な範囲で情報を送信する場合
            </li>
          </ul>
          <p className="mt-4 mb-4">
            当サイトは、サービスの提供にあたり以下の外部サービスを利用しており、それぞれのサービスに必要な情報が送信されます：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Supabase（ユーザー認証、データベース、画像の保存）
            </li>
            <li>
              Google（Googleアカウントによるログイン認証、アクセス解析（Google Analytics））
            </li>
            <li>
              外部AIサービス（Google Gemini等）：投稿フローで選択した写真を、植物名の判定のために送信します
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">5. 情報の公開範囲</h2>
          <p className="mb-4">
            当サイトは写真の共有を目的としたサービスであり、以下の情報は、ログインしていない方を含むすべての利用者に公開されます：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>投稿情報（写真、コメント、植物・猫のタグ、いいねの数）</li>
            <li>プロフィール情報（ユーザー名、ユーザーID、アイコン画像）</li>
            <li>猫のプロフィール情報（名前、種類、写真など）</li>
            <li>投稿から集計された共存実績等の統計情報</li>
          </ul>
          <p className="mt-4">
            公開したくない情報は、投稿やプロフィールに含めないようご注意ください。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">
            6. 退会とデータの削除
          </h2>
          <p className="mb-4">
            設定ページから退会手続きを行うと、アカウント情報、投稿（写真を含みます）、猫のプロフィール、いいね等のデータは削除されます。
            削除されたデータは、共存実績等の集計にも反映されなくなります。
          </p>
          <p className="mb-4">
            なお、不正利用の防止等のため、アクセスログを一定期間保持する場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">7. お問い合わせ</h2>
          <p className="mb-4">
            プライバシーポリシーに関するお問い合わせは、下記よりお願いします
            <br />
            <Link href="/contact" className="text-blue-600 hover:underline">
              お問い合わせ
            </Link>
          </p>
        </section>

        <div className="mt-8 text-sm text-gray-500">
          <p>最終更新日：2026年7月11日</p>
        </div>
      </div>
    </div>
  );
}
