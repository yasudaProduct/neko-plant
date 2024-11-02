"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

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
      <Footer />
    </div>
  );
}
