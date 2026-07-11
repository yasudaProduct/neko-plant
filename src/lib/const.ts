const STORAGE_PATH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/";

export const STORAGE_PATH = {
    USER_PROFILE: STORAGE_PATH_URL + "user_profiles/",
    USER_PET: STORAGE_PATH_URL + "user_pets/",
    PLANT: STORAGE_PATH_URL + "plants/",
    POST: STORAGE_PATH_URL + "posts/",
};

/** 投稿1件あたりの画像枚数上限 */
export const MAX_POST_IMAGES = 3;

/** 投稿画像1枚あたりのサイズ上限 */
export const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;

/** 投稿画像で許可するMIMEタイプ */
export const ALLOWED_POST_IMAGE_TYPES = ["image/jpeg", "image/png"];

/** 投稿コメントの文字数上限 */
export const MAX_POST_COMMENT_LENGTH = 500;

/** 投稿1件あたりの植物タグ数上限 */
export const MAX_POST_PLANTS = 5;
