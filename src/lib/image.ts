import sharp from "sharp";

export type ProcessedImage = {
    buffer: Buffer;
    contentType: string;
};

/**
 * 画像から Exif 等のメタデータ (GPS位置情報・撮影日時・機種情報など) を除去する。
 *
 * 公開ストレージに保存する前に必ず通すこと (フォトSNSのため、投稿写真に
 * 位置情報が残っていると自宅等が特定されるリスクがある)。
 * Exif の向き (Orientation) は除去前に画素へ適用するため、見た目は変わらない。
 */
export async function stripImageMetadata(image: File): Promise<ProcessedImage> {
    const input = Buffer.from(await image.arrayBuffer());

    // rotate() は Exif Orientation を画素に反映し、出力時にメタデータごと破棄する
    const buffer = await sharp(input).rotate().toBuffer();

    return { buffer, contentType: image.type };
}
