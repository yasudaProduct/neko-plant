export type UserRole = 'user' | 'admin' | 'moderator';

export type UserProfile = {
    id: number;
    aliasId: string;
    authId: string;
    name: string;
    imageSrc?: string;
    bio?: string;
};

export type UserData = {
    id: number;
    aliasId: string;
    authId: string;
    name: string;
    image: string | null;
    role: UserRole;
};
