import { useState } from "react";
import Image from "next/image";
import { getImageData } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";

export default function ImageUpload({
  onImageChange,
}: {
  onImageChange: (file: File) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files, displayUrl } = getImageData(e);
    if (files && files[0]) {
      setSelectedFile(files[0]);
      setPreview(displayUrl);
      onImageChange(files[0]);
    }
  };

  return (
    <>
      <div>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-center hover:cursor-pointer"
          onClick={() => {
            document.getElementById("image")?.click();
          }}
        >
          <ImageIcon className="w-4 h-4" />
          写真を追加する +
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
      </div>

      {preview && selectedFile && (
        <div className="mt-4">
          <p>画像プレビュー：{selectedFile?.name}</p>
          <Image
            src={preview}
            alt="画像プレビュー"
            width={200}
            height={200}
            className="mx-auto"
          />
        </div>
      )}
    </>
  );
}
