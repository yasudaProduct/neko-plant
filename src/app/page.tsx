"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#2d5a27] text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-medium"
          >
            {/* <Leaf className="h-6 w-6" /> */}
            ネコと植物の相性チェッカー
          </Link>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            {/* <LogIn className="mr-2 h-4 w-4" /> */}
            ログイン
          </Button>
        </div>
      </header>

      <main className="flex-1 py-12 px-4 bg-gradient-to-b from-background to-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">
            植物は猫に安全？
          </h1>
          <p className="text-muted-foreground mb-8">
            猫と暮らす飼い主さんの実体験をもとに、植物の安全性を確認できます
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto mb-12">
          {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" /> */}
          <Input
            type="search"
            placeholder="植物名を検索..."
            className="w-full pl-10 py-6 text-lg bg-background border-input"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader className="relative pb-0">
              <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
                危険
              </Badge>
              <Image
                src="/placeholder.svg?height=256&width=384"
                alt="モンステラ"
                width={384}
                height={256}
                className="object-cover w-full h-64 rounded-t-lg"
              />
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="text-xl mb-2 text-card-foreground">
                モンステラ
              </CardTitle>
              <CardDescription className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    {/* <ThumbsUp className="h-4 w-4 text-primary" />2 */}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* <ThumbsDown className="h-4 w-4 text-destructive" /> */}
                    22
                  </span>
                </div>
                <span>レビュー 24件</span>
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="bg-primary text-primary-foreground py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center gap-4 mb-4">
            <Avatar>
              <AvatarImage src="/placeholder.svg" alt="Leaf" />
              {/* <AvatarFallback><Leaf /></AvatarFallback> */}
            </Avatar>
            <Avatar>
              <AvatarImage src="/placeholder.svg" alt="Cat" />
              <AvatarFallback>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 22c-1.5 0-2.9-.3-4.2-.9-1.3-.6-2.4-1.4-3.4-2.4-1-1-1.8-2.1-2.4-3.4C1.3 14 1 12.6 1 11c0-1.5.3-2.9.9-4.2.6-1.3 1.4-2.4 2.4-3.4 1-1 2.1-1.8 3.4-2.4C9 .3 10.4 0 12 0c1.5 0 2.9.3 4.2.9 1.3.6 2.4 1.4 3.4 2.4 1 1 1.8 2.1 2.4 3.4.6 1.3.9 2.7.9 4.2 0 1.5-.3 2.9-.9 4.2-.6 1.3-1.4 2.4-2.4 3.4-1 1-2.1 1.8-3.4 2.4-1.3.6-2.7.9-4.2.9zm0-2c2.2 0 4.1-.8 5.7-2.4C19.2 16 20 14.1 20 12c0-2.2-.8-4.1-2.3-5.7C16 4.8 14.1 4 12 4c-2.2 0-4.1.8-5.7 2.3C4.8 8 4 9.9 4 12c0 2.2.8 4.1 2.3 5.6C8 19.2 9.9 20 12 20z"/>
                </svg>
              </AvatarFallback>
            </Avatar>
          </div>
          {/* <Separator className="my-4 bg-primary-foreground/20" /> */}
          <p className="text-sm text-primary-foreground/60">© 2024 ネコと植物の相性チェッカー</p>
        </div>
      </footer>
    </div>
  );
}
