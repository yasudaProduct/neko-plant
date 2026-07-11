/**
 * クライアントがストレージへ直接アップロードした画像パスの検証。
 * 自分のフォルダ ({auth_id}/...) 配下のみ許可し、他人のファイル参照を防ぐ
 * (ストレージのRLSと同じ「パス1階層目 = auth.uid()」ルール)。
 */
export function isValidOwnedImagePath(path: string, authId: string): boolean {
    return (
        path.length <= 255 &&
        path.startsWith(`${authId}/`) &&
        !path.includes("..") &&
        /^[0-9a-zA-Z/_.-]+$/.test(path)
    );
}
