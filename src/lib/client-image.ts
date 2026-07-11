import { createClient } from "@/lib/supabase/client";
import {
    ALLOWED_POST_IMAGE_TYPES,
    IMAGE_JPEG_QUALITY,
    IMAGE_MAX_EDGE,
    MAX_PROCESSED_IMAGE_SIZE,
    MAX_UPLOAD_SOURCE_IMAGE_SIZE,
} from "@/lib/const";

export type ClientImageErrorCode =
    | "INVALID_TYPE"
    | "TOO_LARGE"
    | "DECODE_FAILED"
    | "ENCODE_FAILED"
    | "PROCESSED_TOO_LARGE";

export class ClientImageError extends Error {
    constructor(public code: ClientImageErrorCode, message: string) {
        super(message);
        this.name = "ClientImageError";
    }
}

/** 長辺が maxEdge に収まる縮小後サイズを返す (拡大はしない・アスペクト比維持) */
export function calculateTargetSize(
    width: number,
    height: number,
    maxEdge: number,
): { width: number; height: number } {
    const longEdge = Math.max(width, height);
    if (longEdge <= maxEdge) {
        return { width, height };
    }
    const scale = maxEdge / longEdge;
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

type DecodedImage = {
    source: CanvasImageSource;
    width: number;
    height: number;
    cleanup: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
    // createImageBitmap はデフォルトで Exif Orientation を画素に適用する
    try {
        const bitmap = await createImageBitmap(file);
        return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            cleanup: () => bitmap.close(),
        };
    } catch {
        // 一部ブラウザでの失敗に備えて <img> でのデコードにフォールバック
    }

    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("image load failed"));
            el.src = url;
        });
        return {
            source: img,
            width: img.naturalWidth,
            height: img.naturalHeight,
            cleanup: () => URL.revokeObjectURL(url),
        };
    } catch {
        URL.revokeObjectURL(url);
        throw new ClientImageError("DECODE_FAILED", "画像を読み込めませんでした。");
    }
}

/**
 * 投稿・プロフィール用に画像をクライアント側で処理する。
 * 長辺 IMAGE_MAX_EDGE への縮小 + JPEG 再エンコードにより、
 * Exif 等のメタデータ (GPS位置情報など) は必ず破棄される。
 * 公開ストレージへアップロードする前に必ず通すこと。
 */
export async function processImageForUpload(file: File): Promise<File> {
    if (typeof window === "undefined") {
        throw new Error("processImageForUpload はブラウザ専用です。");
    }

    if (!ALLOWED_POST_IMAGE_TYPES.includes(file.type)) {
        throw new ClientImageError("INVALID_TYPE", "JPEGまたはPNG形式の画像を選択してください。");
    }
    if (file.size > MAX_UPLOAD_SOURCE_IMAGE_SIZE) {
        throw new ClientImageError(
            "TOO_LARGE",
            `画像サイズは${MAX_UPLOAD_SOURCE_IMAGE_SIZE / 1024 / 1024}MB以下にしてください。`,
        );
    }

    const decoded = await decodeImage(file);
    try {
        const { width, height } = calculateTargetSize(decoded.width, decoded.height, IMAGE_MAX_EDGE);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new ClientImageError("ENCODE_FAILED", "画像を変換できませんでした。");
        }

        // PNGの透過部分がJPEG化で黒くならないよう白で塗ってから描画する
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(decoded.source, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", IMAGE_JPEG_QUALITY),
        );
        if (!blob) {
            throw new ClientImageError("ENCODE_FAILED", "画像を変換できませんでした。別の画像でお試しください。");
        }
        if (blob.size > MAX_PROCESSED_IMAGE_SIZE) {
            throw new ClientImageError("PROCESSED_TOO_LARGE", "画像を圧縮できませんでした。別の画像でお試しください。");
        }

        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } finally {
        decoded.cleanup();
    }
}

/**
 * 処理済み画像を指定バケットへ直列アップロードする。
 * 途中で失敗した場合はアップロード済み分を削除してから throw する。
 */
export async function uploadImagesToBucket(
    bucket: string,
    entries: { path: string; file: File }[],
): Promise<void> {
    const supabase = createClient();
    const uploaded: string[] = [];

    for (const entry of entries) {
        const { error } = await supabase.storage
            .from(bucket)
            .upload(entry.path, entry.file, { contentType: entry.file.type });

        if (error) {
            console.error("Error uploading image:", error);
            await removeUploadedImagesBestEffort(bucket, uploaded);
            throw new Error("画像のアップロードに失敗しました。");
        }
        uploaded.push(entry.path);
    }
}

/** アップロード済みファイルの後始末 (失敗してもログのみ) */
export async function removeUploadedImagesBestEffort(
    bucket: string,
    paths: string[],
): Promise<void> {
    if (paths.length === 0) return;
    try {
        const supabase = createClient();
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (error) {
            console.error("Error removing uploaded images:", error);
        }
    } catch (e) {
        console.error("Error removing uploaded images:", e);
    }
}
