"use client";

import { useState } from "react";
import { Button } from "./ui/button";

export default function ProfileForm() {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="pace-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setEditMode(!editMode)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
        >
          <span>{editMode ? "保存" : "編集"}</span>
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          {/* <Image
            src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
            alt="プロフィール画像"
            className="w-24 h-24 rounded-full object-cover"
          /> */}
          {editMode && (
            <button className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition">
              {/* <Camera className="w-4 h-4" /> */}
            </button>
          )}
        </div>
        <div>
          <input
            type="text"
            defaultValue="ねこ好き太郎"
            disabled={!editMode}
            className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-green-500 focus:outline-none"
          />
          <p className="text-gray-500">@neko_taro_123</p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">飼い猫情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {/* <img
                src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=150"
                alt="モモ"
                className="w-20 h-20 rounded-lg object-cover"
              /> */}
              <div>
                <h3 className="font-medium">モモ</h3>
                <p className="text-sm text-gray-600">アメリカンショートヘア</p>
                {editMode && (
                  <button className="text-red-500 text-sm mt-2">削除</button>
                )}
              </div>
            </div>
          </div>

          {editMode && (
            <button className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center">
              <span className="text-gray-500">+ 新しい猫を追加</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
