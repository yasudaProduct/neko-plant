"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import Image from "next/image";
export default function ProfileForm() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">プロフィール</h1>
          <Link
            href="/profile/edit"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
          >
            <Pencil className="w-4 h-4" />
            <span>編集</span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Image
              src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
              alt="プロフィール画像"
              className="w-24 h-24 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold">ねこ好き太郎</h2>
              <p className="text-gray-500">@neko_taro</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">飼い猫情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <Image
                    src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=150"
                    alt="モモ"
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-medium">モモ</h3>
                    <p className="text-sm text-gray-600">
                      アメリカンショートヘア
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    /* {editMode && (
            <button className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center">
              <span className="text-gray-500">+ 新しい猫を追加</span>
            </button>
          )} */
  );
}
