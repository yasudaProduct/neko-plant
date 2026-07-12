export type UserRole = 'user' | 'admin' | 'moderator';

export type UserProfile = {
    id: number;
    aliasId: string;
    name: string;
    imageSrc?: string;
    bio?: string;
    /** 閲覧者自身のプロフィールか (サーバー側で判定。auth_id はクライアントに返さない) */
    isSelf?: boolean;
};

export type UserData = {
    id: number;
    aliasId: string;
    authId: string;
    name: string;
    image: string | null;
    role: UserRole;
};
