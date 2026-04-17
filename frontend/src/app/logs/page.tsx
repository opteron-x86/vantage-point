"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { logsApi } from "@/lib/api/logs";
import { useRequireAuth } from "@/lib/hooks/useAuth";
import { formatDateTime } from "@/lib/utils/dates";
import { formatVolume } from "@/lib/utils/format";

export default function LogsPage() {
  const { isReady, isAuthenticated } = useRequireAuth();

  const costQuery = useQuery({
    queryKey: ["logs", "cost"],
    queryFn: () => logsApi.cost(),
    enabled: isAuthenticated,
  });

  const interactionsQuery = useQuery({
    queryKey: ["logs", "interactions"],
    queryFn: () => logsApi.list({ limit: 50 }),
    enabled: isAuthenticated,
  });

  if (!isReady || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs text-fg-subtle">Loading…</div>
      </main>
    );
  }

  const totalCost =
    costQuery.data?.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0) ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-fg-muted"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to dashboard
            </Link>
            <h1 className="font-mono text-xl font-normal text-fg">AI usage</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Total spent:{" "}
              <span className="font-mono text-accent">
                ${totalCost.toFixed(4)}
              </span>
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost by day / purpose / model</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {costQuery.isLoading ? (
                <div className="p-4 text-xs text-fg-subtle">Loading…</div>
              ) : !costQuery.data || costQuery.data.length === 0 ? (
                <div className="p-4 text-xs text-fg-subtle">No data yet.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-surface-muted text-fg-subtle">
                    <tr>
                      <Th>Day</Th>
                      <Th>Purpose</Th>
                      <Th>Model</Th>
                      <Th align="right">Calls</Th>
                      <Th align="right">Input</Th>
                      <Th align="right">Output</Th>
                      <Th align="right">Cost</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {costQuery.data.map((r, idx) => (
                      <tr key={idx} className="border-t border-border-subtle">
                        <Td mono>{r.day}</Td>
                        <Td>
                          <Badge tone="neutral">{r.purpose}</Badge>
                        </Td>
                        <Td mono>{r.model}</Td>
                        <Td align="right" mono>{r.calls}</Td>
                        <Td align="right" mono>{formatVolume(r.input_tokens)}</Td>
                        <Td align="right" mono>{formatVolume(r.output_tokens)}</Td>
                        <Td align="right" mono>${r.cost_usd.toFixed(4)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent interactions</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {interactionsQuery.isLoading ? (
                <div className="p-4 text-xs text-fg-subtle">Loading…</div>
              ) : !interactionsQuery.data || interactionsQuery.data.length === 0 ? (
                <div className="p-4 text-xs text-fg-subtle">No interactions yet.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-surface-muted text-fg-subtle">
                    <tr>
                      <Th>Time</Th>
                      <Th>Purpose</Th>
                      <Th>Model</Th>
                      <Th align="right">Tokens</Th>
                      <Th align="right">Cost</Th>
                      <Th align="right">Duration</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {interactionsQuery.data.map((r) => (
                      <tr key={r.id} className="border-t border-border-subtle">
                        <Td mono>{formatDateTime(r.timestamp)}</Td>
                        <Td>
                          <Badge tone={r.error ? "down" : "neutral"}>{r.purpose}</Badge>
                        </Td>
                        <Td mono>{r.model}</Td>
                        <Td align="right" mono>
                          {r.input_tokens ?? "—"} / {r.output_tokens ?? "—"}
                        </Td>
                        <Td align="right" mono>
                          {r.cost_usd != null ? `$${r.cost_usd.toFixed(4)}` : "—"}
                        </Td>
                        <Td align="right" mono>
                          {r.duration_ms != null ? `${r.duration_ms} ms` : "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-2 text-[10px] font-medium uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-4 py-2 text-fg-muted ${align === "right" ? "text-right" : "text-left"} ${
        mono ? "font-mono" : ""
      }`}
    >
      {children}
    </td>
  );
}
