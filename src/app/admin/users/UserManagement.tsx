"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserRole } from "../actions";

interface UserManagementProps {
  user: {
    id: number;
    name: string;
    aliasId: string;
    image: string | null;
    role: string;
    createdAt: Date;
    evaluationCount: number;
    imageCount: number;
    petCount: number;
  };
}

export default function UserManagement({ user }: UserManagementProps) {
  const [currentRole, setCurrentRole] = useState(user.role);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    setIsLoading(true);
    try {
      await updateUserRole(user.id, newRole);
      setCurrentRole(newRole);
    } catch (error) {
      console.error("Failed to update user role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "default";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "管理者";
      case "moderator":
        return "モデレーター";
      default:
        return "一般ユーザー";
    }
  };

  return (
    <li className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12">
            {user.image ? (
              <Image
                className="h-12 w-12 rounded-full object-cover"
                src={user.image}
                alt={user.name}
                width={48}
                height={48}
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="flex items-center space-x-2">
              <p className="text-lg font-medium text-gray-900">{user.name}</p>
              <Badge variant={getRoleBadgeVariant(currentRole)}>
                {getRoleLabel(currentRole)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">@{user.aliasId}</p>
            <div className="text-xs text-gray-400 mt-1">
              評価: {user.evaluationCount}件 | 画像: {user.imageCount}件 | ペット: {user.petCount}匹
            </div>
            <p className="text-xs text-gray-400">
              登録日: {new Date(user.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select
            value={currentRole}
            onValueChange={handleRoleChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">一般ユーザー</SelectItem>
              <SelectItem value="moderator">モデレーター</SelectItem>
              <SelectItem value="admin">管理者</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </li>
  );
}