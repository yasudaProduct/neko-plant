import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
// jsdom の File は arrayBuffer() 未実装のため、Node 本来の File を使う
// (本番の Server Action は Node ランタイムで実行される)
import { File as NodeFile } from 'node:buffer';
import { stripImageMetadata } from '@/lib/image';

function toFile(data: Uint8Array, name: string, type: string): File {
    return new NodeFile([data], name, { type }) as unknown as File;
}

/**
 * 実画像を使ったExif除去の回帰テスト。
 * フォトSNSでは投稿写真に位置情報等が残ると自宅特定リスクになるため、
 * 「Exifが消えること」と「Orientationが画素に適用されること」を保証する。
 */
describe('stripImageMetadata', () => {
    async function createJpegWithExif(): Promise<Buffer> {
        // 8x4 のJPEGに Exif(著作権表記=秘匿情報の代役) と Orientation=6(90度回転) を付与
        return sharp({
            create: { width: 8, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
        })
            .jpeg()
            .withExif({ IFD0: { Copyright: 'secret-metadata', Artist: 'tester' } })
            .withMetadata({ orientation: 6 })
            .toBuffer();
    }

    it('Exifメタデータを除去する', async () => {
        const src = await createJpegWithExif();

        // 前提確認: 入力にはExifが含まれている
        const before = await sharp(src).metadata();
        expect(before.exif).toBeDefined();
        expect(before.orientation).toBe(6);

        const file = toFile(new Uint8Array(src), 'photo.jpg', 'image/jpeg');
        const result = await stripImageMetadata(file);

        const after = await sharp(result.buffer).metadata();
        expect(after.exif).toBeUndefined();
        expect(after.orientation).toBeUndefined();
        expect(result.contentType).toBe('image/jpeg');
    });

    it('Orientationを画素に適用してから除去する (見た目が変わらない)', async () => {
        const src = await createJpegWithExif();

        const file = toFile(new Uint8Array(src), 'photo.jpg', 'image/jpeg');
        const result = await stripImageMetadata(file);

        // Orientation=6 (90度回転) が適用され、8x4 → 4x8 になる
        const after = await sharp(result.buffer).metadata();
        expect(after.width).toBe(4);
        expect(after.height).toBe(8);
    });

    it('壊れた画像はエラーになる (不正ファイルを公開させない)', async () => {
        const file = toFile(new Uint8Array(Buffer.from('not-an-image')), 'fake.png', 'image/png');

        await expect(stripImageMetadata(file)).rejects.toThrow();
    });
});
