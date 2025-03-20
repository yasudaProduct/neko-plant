import { Heart, Skull } from "lucide-react";

export default function RatingBar({
  likes,
  dislikes,
}: {
  likes: number;
  dislikes: number;
}) {
  const total = likes + dislikes;
  const likePercent = (likes / total) * 100;
  const dislikePercent = (dislikes / total) * 100;
  return (
    <div className="flex items-center gap-2 mb-6">
      <div className="flex items-center gap-1">
        <Heart className="w-8 h-8 text-red-500" />
        <span className="text-md">{likes}</span>
      </div>
      {total > 0 ? (
        <div className="flex-1 h-2 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-red-500"
            style={{
              width: `${likePercent}%`,
            }}
          />
          <div
            className="h-full bg-indigo-500"
            style={{
              width: `${dislikePercent}%`,
            }}
          />
        </div>
      ) : (
        <div className="flex-1 h-5 overflow-hidden flex items-center justify-center">
          <div className="text-sm text-gray-500">評価がまだありません</div>
        </div>
      )}
      <div className="flex items-center gap-1">
        <Skull className="w-8 h-8 text-indigo-500" />
        <span className="text-md">{dislikes}</span>
      </div>
    </div>
  );
}
