"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBlock, LoadingBlock } from "@/components/layout/states";
import { NativeSelect } from "@/components/layout/native-select";
import { createItem, generateExplanation, getItem, updateItem } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/error-message";
import { OPTION_KEYS, type CefrTarget, type ItemInput, type OptionKey } from "@/lib/api/types";
import { SKILLS } from "@apt/shared-types";
import { parseExplanation } from "@/lib/explanation";
import { vi } from "@/messages/vi";

const required = vi.login.required;
const schema = z.object({
  content: z.string().trim().min(1, required),
  optA: z.string().trim().min(1, required),
  optB: z.string().trim().min(1, required),
  optC: z.string().trim().min(1, required),
  optD: z.string().trim().min(1, required),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  skill: z.enum(SKILLS),
  cefrTarget: z.enum(["A1", "A2", "B1", "B2"]),
  topicTag: z.string().trim().optional(),
  irtB: z.number({ error: "Phải là số" }).min(-3, "Từ -3 đến 3").max(3, "Từ -3 đến 3"),
  expGeneral: z.string().optional(),
  expA: z.string().optional(),
  expB: z.string().optional(),
  expC: z.string().optional(),
  expD: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const CEFR_TARGETS: CefrTarget[] = ["A1", "A2", "B1", "B2"];
const EMPTY: Values = {
  content: "",
  optA: "",
  optB: "",
  optC: "",
  optD: "",
  correctAnswer: "A",
  skill: "GRAMMAR",
  cefrTarget: "A1",
  topicTag: "",
  irtB: 0,
  expGeneral: "",
  expA: "",
  expB: "",
  expC: "",
  expD: "",
};

function toInput(v: Values): ItemInput {
  const options = { A: v.optA, B: v.optB, C: v.optC, D: v.optD };
  const perOption: Partial<Record<OptionKey, string>> = {};
  const exp: Record<OptionKey, string | undefined> = { A: v.expA, B: v.expB, C: v.expC, D: v.expD };
  for (const k of OPTION_KEYS) if (exp[k]?.trim()) perOption[k] = exp[k]!.trim();
  const general = v.expGeneral?.trim() ?? "";
  return {
    content: v.content,
    options,
    correctAnswer: v.correctAnswer,
    skill: v.skill,
    cefrTarget: v.cefrTarget,
    topicTag: v.topicTag?.trim() || undefined,
    irtB: v.irtB,
    explanation:
      general || Object.keys(perOption).length ? { v: 1, general, options: perOption } : null,
  };
}

export function ItemForm({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const existing = useQuery({
    queryKey: ["item", itemId],
    queryFn: ({ signal }) => getItem(itemId!, signal),
    enabled: !!itemId,
  });
  const [aiUsed, setAiUsed] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    const it = existing.data;
    if (!it) return;
    const exp = parseExplanation(it.explanation);
    reset({
      content: it.content,
      optA: it.options.A,
      optB: it.options.B,
      optC: it.options.C,
      optD: it.options.D,
      correctAnswer: it.correctAnswer,
      skill: it.skill,
      cefrTarget: it.cefrTarget,
      topicTag: it.topicTag ?? "",
      irtB: it.irtB,
      expGeneral: exp?.general ?? "",
      expA: exp?.options.A ?? "",
      expB: exp?.options.B ?? "",
      expC: exp?.options.C ?? "",
      expD: exp?.options.D ?? "",
    });
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: ({ values, submit }: { values: Values; submit: "DRAFT" | "FIRST_APPROVED" }) => {
      const body = { ...toInput(values), submit };
      return itemId ? updateItem(itemId, body) : createItem(body);
    },
    onSuccess: (item) => {
      toast.success(vi.items.saved);
      void qc.invalidateQueries({ queryKey: ["items"] });
      void qc.invalidateQueries({ queryKey: ["item", item.id] });
      router.push(`/teacher/items/${item.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const ai = useMutation({
    mutationFn: () => {
      const v = getValues();
      return generateExplanation({
        content: v.content,
        options: { A: v.optA, B: v.optB, C: v.optC, D: v.optD },
        correctAnswer: v.correctAnswer,
      });
    },
    onSuccess: (exp) => {
      setValue("expGeneral", exp.general);
      for (const k of OPTION_KEYS) setValue(`exp${k}`, exp.options[k] ?? "");
      setAiUsed(true);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (itemId && existing.isPending) return <LoadingBlock rows={6} />;
  if (itemId && existing.isError)
    return <ErrorBlock error={existing.error} onRetry={() => existing.refetch()} />;

  const submitAs = (submit: "DRAFT" | "FIRST_APPROVED") =>
    handleSubmit((values) =>
      save.mutateAsync({ values, submit }).then(
        () => undefined,
        () => undefined,
      ),
    );
  const err = (m?: string) => (m ? <p className="text-sm text-destructive">{m}</p> : null);

  return (
    <form
      className="mx-auto max-w-3xl space-y-5"
      noValidate
      data-testid="item-form"
      onSubmit={(e) => e.preventDefault()}
    >
      <h1 className="text-xl font-semibold">{itemId ? vi.items.title : vi.items.create}</h1>

      <div className="space-y-1.5">
        <Label htmlFor="content">{vi.items.content}</Label>
        <Textarea id="content" rows={3} aria-invalid={!!errors.content} {...register("content")} />
        {err(errors.content?.message)}
      </div>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">{vi.items.optionLabel}</legend>
        {OPTION_KEYS.map((k) => (
          <div key={k} className="space-y-1">
            <Label htmlFor={`opt${k}`}>
              {vi.items.optionLabel} {k}
            </Label>
            <Input id={`opt${k}`} aria-invalid={!!errors[`opt${k}`]} {...register(`opt${k}`)} />
            {err(errors[`opt${k}`]?.message)}
          </div>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="correctAnswer">{vi.items.correct}</Label>
          <NativeSelect id="correctAnswer" {...register("correctAnswer")}>
            {OPTION_KEYS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="skill">{vi.items.skill}</Label>
          <NativeSelect id="skill" {...register("skill")}>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {vi.skill[s]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cefrTarget">{vi.items.cefr}</Label>
          <NativeSelect id="cefrTarget" {...register("cefrTarget")}>
            {CEFR_TARGETS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="irtB">{vi.items.irtB}</Label>
          <Input
            id="irtB"
            type="number"
            step="0.1"
            aria-invalid={!!errors.irtB}
            {...register("irtB", { valueAsNumber: true })}
          />
          {err(errors.irtB?.message)}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="topicTag">{vi.items.topic}</Label>
        <Input id="topicTag" {...register("topicTag")} />
      </div>

      <fieldset className="space-y-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{vi.items.explanation}</legend>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => ai.mutate()}
          disabled={ai.isPending}
          data-testid="ai-explain"
        >
          {ai.isPending ? vi.items.aiGenerating : vi.items.aiGenerate}
        </Button>
        {aiUsed && (
          <Alert data-testid="ai-notice">
            <AlertDescription>{vi.items.aiNotice}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1">
          <Label htmlFor="expGeneral">{vi.items.explanationGeneral}</Label>
          <Textarea id="expGeneral" rows={2} {...register("expGeneral")} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTION_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`exp${k}`}>
                {vi.items.explanation} {k}
              </Label>
              <Input id={`exp${k}`} {...register(`exp${k}`)} />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={save.isPending}
          onClick={submitAs("DRAFT")}
          data-testid="save-draft"
        >
          {vi.items.saveDraft}
        </Button>
        <Button
          type="button"
          disabled={save.isPending}
          onClick={submitAs("FIRST_APPROVED")}
          data-testid="submit-review"
        >
          {vi.items.submitReview}
        </Button>
      </div>
    </form>
  );
}
