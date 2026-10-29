import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionResult } from "@/lib/api/types";
import { vi } from "@/messages/vi";

const pct = (n: number) => `${Math.round(n)}%`;

/** Nội dung kết quả dùng chung cho sinh viên và giảng viên (tra cứu hồ sơ). */
export function ResultCard({ result }: { result: SessionResult }) {
  const { ability, meta } = result;
  return (
    <div className="space-y-4" data-testid="result-card">
      <Card>
        <CardHeader>
          <CardTitle>{vi.result.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">{vi.result.level}</span>
            <span className="text-3xl font-bold" data-testid="cefr-level">
              {vi.cefrLevel[result.cefrLevel]}
            </span>
            <Badge variant="secondary">
              {vi.result.confidence}: {vi.cefrConfidence[result.cefrConfidence]}
            </Badge>
          </div>
          {result.boundaryEffect && (
            <Alert data-testid="boundary-notice">
              <AlertDescription>{vi.result.boundary}</AlertDescription>
            </Alert>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{vi.result.ability}</dt>
              <dd>{ability.theta.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{vi.result.se}</dt>
              <dd>{ability.standardError.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{vi.result.ci}</dt>
              <dd>
                {ability.ci95[0].toFixed(2)} → {ability.ci95[1].toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{vi.result.items}</dt>
              <dd>{meta.itemsAdministered}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">{vi.stoppingReason[meta.stoppingReason]}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{vi.result.skills}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.skillProfiles.map((s) => (
            <div key={s.skill}>
              <div className="flex justify-between text-sm">
                <span>
                  {vi.skill[s.skill]} · {vi.cefrLevel[s.cefrEstimate]}
                </span>
                <span>
                  {s.correctCount}/{s.itemsAdministered} ({pct(s.scorePercent)})
                </span>
              </div>
              <div
                className="mt-1 h-2 rounded bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(s.scorePercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={vi.skill[s.skill]}
              >
                <div className="h-2 rounded bg-primary" style={{ width: pct(s.scorePercent) }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{vi.result.errors}</CardTitle>
        </CardHeader>
        <CardContent>
          {result.errorPatterns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{vi.result.noErrors}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {result.errorPatterns.map((e) => (
                <li key={e.topicTag} className="flex justify-between gap-2">
                  <span>
                    {e.topicTag}{" "}
                    <span className="text-muted-foreground">({vi.skill[e.skill]})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {pct(e.accuracyRate * 100)}
                    <Badge variant={e.severity === "HIGH" ? "destructive" : "secondary"}>
                      {e.severity}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {result.aiRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{vi.result.recommendations}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.aiRecommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
