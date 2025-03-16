import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  createPageURL: (page: number) => string;
}

export function Pagination({
  currentPage,
  totalPages,
  createPageURL,
}: PaginationProps) {
  // 表示するページ番号を生成
  const generatePagination = () => {
    // 総ページ数が7以下の場合は全てのページを表示
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // 現在のページが最初の3ページ内の場合
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    // 現在のページが最後の3ページ内の場合
    if (currentPage >= totalPages - 2) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    // 現在のページが中間の場合
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = generatePagination();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center items-center gap-1 mt-8">
      <PaginationArrow
        direction="left"
        href={createPageURL(currentPage - 1)}
        isDisabled={currentPage <= 1}
      />

      <div className="flex gap-1">
        {pages.map((page, index) => {
          if (page === "...") {
            return (
              <Button
                key={`ellipsis-${index}`}
                variant="ghost"
                size="icon"
                className="w-9 h-9"
                disabled
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <Button
              key={pageNumber}
              variant={isActive ? "default" : "outline"}
              size="icon"
              className={cn("w-9 h-9", isActive && "pointer-events-none")}
              asChild={!isActive}
            >
              {isActive ? (
                <span>{pageNumber}</span>
              ) : (
                <Link href={createPageURL(pageNumber)}>{pageNumber}</Link>
              )}
            </Button>
          );
        })}
      </div>

      <PaginationArrow
        direction="right"
        href={createPageURL(currentPage + 1)}
        isDisabled={currentPage >= totalPages}
      />
    </div>
  );
}

interface PaginationArrowProps {
  direction: "left" | "right";
  href: string;
  isDisabled: boolean;
}

function PaginationArrow({
  direction,
  href,
  isDisabled,
}: PaginationArrowProps) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  if (isDisabled) {
    return (
      <Button variant="outline" size="icon" className="w-9 h-9" disabled>
        <Icon className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" className="w-9 h-9" asChild>
      <Link href={href}>
        <Icon className="h-4 w-4" />
      </Link>
    </Button>
  );
}
