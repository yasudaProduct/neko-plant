import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約 | 猫と植物",
  description: "猫と植物の利用規約です。",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">利用規約</h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. はじめに</h2>
          <p className="mb-4">
            本利用規約（以下「本規約」）は、猫と植物（以下「当サイト」）の利用条件を定めるものです。
            当サイトを利用する際は、本規約に同意していただく必要があります。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">2. 定義</h2>
          <p className="mb-4">
            本規約において、以下の用語は以下の意味で使用します：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>「ユーザー」：当サイトを利用するすべての方を指します</li>
            <li>
              「コンテンツ」：当サイト上で提供されるすべての情報を指します
            </li>
            <li>「投稿」：ユーザーが当サイトに投稿する情報を指します</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. 利用規約の変更</h2>
          <p className="mb-4">
            当サイトは、必要と判断した場合には、ユーザーに通知することなく本規約を変更することができるものとします。
            変更後の利用規約は、当サイトに掲載された時点で効力を生じるものとします。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">4. 禁止事項</h2>
          <p className="mb-4">
            ユーザーは、当サイトの利用にあたり、以下の行為をしてはなりません：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>
              当サイトのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為
            </li>
            <li>当サイトの運営を妨害するおそれのある行為</li>
            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            <li>他のユーザーに成りすます行為</li>
            <li>
              当サイトに関連して、反社会的勢力に対して直接または間接に利益を供与する行為
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">5. 免責事項</h2>
          <p className="mb-4">
            当サイトは、以下の事項について一切の責任を負いません：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              当サイトに掲載されている情報の正確性、完全性、有用性について
            </li>
            <li>当サイトの利用により生じた損害について</li>
            <li>他のユーザーが投稿した情報について</li>
            <li>当サイトの利用に関連して生じた紛争について</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">6. 著作権</h2>
          <p className="mb-4">
            当サイトに掲載されているコンテンツの著作権は、当サイトまたはその提供者に帰属します。
            ユーザーは、当サイトの利用にあたり、著作権法に従って適切に利用するものとします。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">
            7. 投稿コンテンツの取り扱い
          </h2>
          <p className="mb-4">
            当サイトにおける投稿コンテンツ（評価、コメント、画像等）の取り扱いについて、以下の通り定めます：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>投稿コンテンツの著作権は、投稿者に帰属します</li>
            <li>
              投稿者は、当サイトに対し、投稿コンテンツの利用許諾を与えたものとみなします
            </li>
            <li>
              投稿コンテンツは、当サイトのサービス提供、改善、宣伝等の目的で利用される場合があります
            </li>
            <li>
              投稿コンテンツは、他のユーザーに公開されることを前提としています
            </li>
            <li>
              投稿コンテンツの削除は、投稿者本人または当サイトの判断で行うことができます
            </li>
            <li>
              投稿コンテンツに第三者の権利が含まれる場合は、投稿者が適切な権利処理を行うものとします
            </li>
            <li>
              投稿コンテンツの内容について、当サイトは一切の責任を負いません
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">
            8 . アカウントの利用条件
          </h2>
          <p className="mb-4">
            当サイトのアカウント利用について、以下の通り定めます：
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              アカウントは、当サイトの利用規約に同意した上で、当サイトが定める方法により登録するものとします
            </li>
            <li>
              アカウントは、登録者本人のみが利用できるものとし、第三者への譲渡、貸与、利用許諾は禁止します
            </li>
            <li>
              アカウントの利用により生じた損害について、当サイトは一切の責任を負いません
            </li>
            <li>
              当サイトは、アカウントの利用状況を監視し、不正利用と判断した場合は、利用を停止することができます
            </li>
            <li>
              アカウントの利用を終了する場合は、当サイトが定める方法により手続きを行うものとします
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">9. お問い合わせ</h2>
          <p className="mb-4">
            本規約に関するお問い合わせは、下記よりお願いします
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
