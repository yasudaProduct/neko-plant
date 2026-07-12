const STORAGE_PATH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/";

export const STORAGE_PATH = {
    USER_PROFILE: STORAGE_PATH_URL + "user_profiles/",
    USER_PET: STORAGE_PATH_URL + "user_pets/",
    PLANT: STORAGE_PATH_URL + "plants/",
    POST: STORAGE_PATH_URL + "posts/",
};

/** 投稿1件あたりの画像枚数上限 */
export const MAX_POST_IMAGES = 3;

/** 投稿画像で許可するMIMEタイプ */
export const ALLOWED_POST_IMAGE_TYPES = ["image/jpeg", "image/png"];

/** クライアント処理前の入力画像サイズ上限 (canvasデコードのメモリ保護) */
export const MAX_UPLOAD_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;

/**
 * クライアント処理後の画像サイズ上限。
 * 処理済み画像はAI判定でServer Actionにも渡るため、
 * Vercelのリクエストボディ上限4.5MBを下回る4MBに固定する。
 */
export const MAX_PROCESSED_IMAGE_SIZE = 4 * 1024 * 1024;

/** アップロード画像の長辺上限 (px) */
export const IMAGE_MAX_EDGE = 2048;

/** アップロード画像のJPEG品質 */
export const IMAGE_JPEG_QUALITY = 0.85;

/** 投稿コメントの文字数上限 */
export const MAX_POST_COMMENT_LENGTH = 500;

/** 投稿1件あたりの植物タグ数上限 */
export const MAX_POST_PLANTS = 5;

/** 投稿1件あたりの猫タグ数上限 */
export const MAX_POST_PETS = 10;

/** 猫の名前の文字数上限 */
export const MAX_PET_NAME_LENGTH = 50;
