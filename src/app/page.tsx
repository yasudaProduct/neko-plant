import { getFeedPosts } from "@/actions/post-action";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const { posts } = await getFeedPosts(1, 24);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12 px-4 bg-gradient-to-b from-background to-secondary/30">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <Image
            src="/images/logo.png"
            alt="logo"
            width={100}
            height={100}
            className="mb-4 rounded-md"
          />
          <p className="text-4xl font-bold text-primary mb-4">
            植物は猫に安全？
          </p>
          <p className="text-muted-foreground mb-8">
            猫と植物の暮らしを、写真で共有しましょう
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {posts.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              まだ投稿がありません。最初の投稿をしてみましょう。
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="rounded-lg border bg-white p-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <Link href={`/${post.user.aliasId}`} className="underline">
                    {post.user.name}
                  </Link>
                  {" ・ "}
                  <Link href={`/plants/${post.plant?.id ?? ""}`} className="underline">
                    {post.plant?.name}
                  </Link>
                </div>
                {post.imageUrls[0] && (
                  <div className="relative w-full h-72 rounded-md overflow-hidden">
                    <Image
                      src={post.imageUrls[0]}
                      alt={post.plant?.name ?? "投稿画像"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="text-sm">
                  {post.comment || "コメントなし"}
                </div>
                <div className="text-xs text-muted-foreground">
                  いいね {post.likeCount}件
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
