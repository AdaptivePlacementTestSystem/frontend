"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { getItem } from "@/lib/api/endpoints";
import { OPTION_KEYS } from "@/lib/api/types";
import { parseExplanation } from "@/lib/explanation";

export function AdminItemDetail({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["item", id],
    queryFn: ({ signal }) => getItem(id, signal),
    retry: false,
  });
  if (query.isPending) return <LoadingBlock rows={5} />;
  if (query.isError) return <ErrorBlock error={query.error} onRetry={() => query.refetch()} />;
  const item = query.data;
  const explanation = parseExplanation(item.explanation);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Chi tiết câu hỏi</h1>
      <p>{item.content}</p>
      <ul>
        {OPTION_KEYS.map((key) => (
          <li key={key}>
            {key}. {item.options[key]} {key === item.correctAnswer ? "— Đáp án" : ""}
          </li>
        ))}
      </ul>
      <p>
        {item.skill} · {item.cefrTarget} · b = {item.irtB}
      </p>
      {explanation?.general && <p>{explanation.general}</p>}
      <Link className="text-blue-700 underline" href="/admin/item-bank">
        Quay lại ngân hàng câu hỏi
      </Link>
    </div>
  );
}
