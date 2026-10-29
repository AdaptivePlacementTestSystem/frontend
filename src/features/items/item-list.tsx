"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { NativeSelect } from "@/components/layout/native-select";
import { listItems } from "@/lib/api/endpoints";
import type { CefrTarget, ItemFilters } from "@/lib/api/types";
import {
  ITEM_BATCH_SOURCES,
  ITEM_STATUSES,
  SKILLS,
  type ItemBatchSourceValue as ItemBatchSource,
  type ItemStatusValue as ItemStatus,
  type SkillValue as Skill,
} from "@apt/shared-types";
import { vi } from "@/messages/vi";

const PAGE_SIZE = 10;
const CEFR_TARGETS: CefrTarget[] = ["A1", "A2", "B1", "B2"];

export function ItemList() {
  const [filters, setFilters] = useState<ItemFilters>({ page: 1, limit: PAGE_SIZE });
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["items", filters],
    queryFn: ({ signal }) => listItems(filters, signal),
    placeholderData: keepPreviousData,
  });

  // Đổi bộ lọc ⇒ về trang 1
  const set = (patch: Partial<ItemFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const page = filters.page ?? 1;
  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{vi.items.title}</h1>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: search.trim() || undefined });
        }}
      >
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="f-q">{vi.items.search}</Label>
          <Input
            id="f-q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="filter-q"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-skill">{vi.items.skill}</Label>
          <NativeSelect
            id="f-skill"
            value={filters.skill ?? ""}
            onChange={(e) => set({ skill: (e.target.value || undefined) as Skill | undefined })}
          >
            <option value="">{vi.items.all}</option>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {vi.skill[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-cefr">CEFR</Label>
          <NativeSelect
            id="f-cefr"
            value={filters.cefr ?? ""}
            onChange={(e) => set({ cefr: (e.target.value || undefined) as CefrTarget | undefined })}
          >
            <option value="">{vi.items.all}</option>
            {CEFR_TARGETS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-status">{vi.items.status}</Label>
          <NativeSelect
            id="f-status"
            data-testid="filter-status"
            value={filters.status ?? ""}
            onChange={(e) =>
              set({ status: (e.target.value || undefined) as ItemStatus | undefined })
            }
          >
            <option value="">{vi.items.all}</option>
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {vi.itemStatus[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-source">{vi.items.source}</Label>
          <NativeSelect
            id="f-source"
            value={filters.source ?? ""}
            onChange={(e) =>
              set({ source: (e.target.value || undefined) as ItemBatchSource | undefined })
            }
          >
            <option value="">{vi.items.all}</option>
            {ITEM_BATCH_SOURCES.map((s) => (
              <option key={s} value={s}>
                {vi.itemSource[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="secondary">
            {vi.students.search}
          </Button>
        </div>
      </form>

      {q.isPending ? (
        <LoadingBlock rows={5} />
      ) : q.isError ? (
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyBlock text={vi.items.empty} />
      ) : (
        <div className="overflow-x-auto">
          <Table data-testid="items-table">
            <TableHeader>
              <TableRow>
                <TableHead>{vi.items.content}</TableHead>
                <TableHead>{vi.items.skill}</TableHead>
                <TableHead>CEFR</TableHead>
                <TableHead>{vi.items.status}</TableHead>
                <TableHead>{vi.items.source}</TableHead>
                <TableHead>{vi.items.b}</TableHead>
                <TableHead>
                  <span className="sr-only">{vi.items.view}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.data.map((it) => (
                <TableRow key={it.id} data-testid="item-row">
                  <TableCell className="max-w-xs truncate">{it.content}</TableCell>
                  <TableCell>{vi.skill[it.skill]}</TableCell>
                  <TableCell>{it.cefrTarget}</TableCell>
                  <TableCell>
                    <Badge variant={it.status === "FINAL_APPROVED" ? "default" : "secondary"}>
                      {vi.itemStatus[it.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{vi.itemSource[it.source]}</TableCell>
                  <TableCell>{it.irtB.toFixed(1)}</TableCell>
                  <TableCell>
                    <Link className="underline" href={`/teacher/items/${it.id}`}>
                      {vi.items.view}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setFilters((f) => ({ ...f, page: page - 1 }))}
        >
          {vi.items.prev}
        </Button>
        <span data-testid="page-info">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setFilters((f) => ({ ...f, page: page + 1 }))}
        >
          {vi.items.next}
        </Button>
      </div>
    </div>
  );
}
