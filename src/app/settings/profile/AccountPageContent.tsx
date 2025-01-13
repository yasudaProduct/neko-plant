"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { updateUser } from "./actions";

interface UserProfiles {
  id: string;
  name: string;
  image?: string;
  alias_id: string;
  bio?: string;
}
export default function AccountPageContent({
  userProfiles,
}: {
  userProfiles: UserProfiles;
}) {
  const [username, setUsername] = useState(userProfiles.name || "");
  const [displayName, setDisplayName] = useState(userProfiles.alias_id || "");
  const [bio, setBio] = useState(userProfiles.bio || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setErrorMessage("");
    setSuccessMessage("");

    // const name = formData.get("username") as string;
    // const aliasId = formData.get("displayName") as string;
    // const bio = formData.get("bio") as string;

    if (!username || !displayName) {
      setErrorMessage("ユーザー名と表示名は必須項目です。");
      return;
    }

    const result = await updateUser(
      userProfiles.id,
      username,
      displayName,
      bio
    );
    if (result.message) {
      setErrorMessage(result.message);
    } else {
      setSuccessMessage("更新が成功しました！");
    }
  };
  return (
    <Card className="p-6 space-y-8">
      <form action={handleSubmit}>
        <div className="flex flex-col items-center gap-2">
          <Avatar className="w-24 h-24">
            <AvatarImage src="" />
            <AvatarFallback className="bg-muted">
              <img
                src={
                  userProfiles.image ||
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150"
                }
                alt="プロフィール画像"
                className="w-24 h-24 rounded-full object-cover"
              />
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" className="text-blue-500 hover:text-blue-600">
            変更する
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-1">
              ユーザー名
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              defaultValue={userProfiles.name}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="max-w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">表示名</Label>
            <Input
              id="displayName"
              defaultValue={userProfiles.alias_id}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="max-w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">自己紹介</Label>
            <Textarea
              id="bio"
              defaultValue={userProfiles.bio}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[150px] max-w-full"
            />
          </div>
        </div>

        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        {successMessage && <p className="text-green-500">{successMessage}</p>}

        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-8"
          >
            保存
          </Button>
        </div>
      </form>
    </Card>
  );
}
