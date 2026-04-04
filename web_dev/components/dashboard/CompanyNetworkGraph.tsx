"use client";

import { ExternalLink, RotateCcw, Search, Workflow, X } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { clientEnv } from "@/lib/config/env";
import type {
  A16zCompanyGraphEdge,
  A16zCompanyGraphNode,
  A16zCompanyGraphPerson,
} from "@/lib/server/meshed-network/a16z-crypto-dashboard";
import { cn, formatRelativeCount, titleCase } from "@/lib/utils";

type CompanyNetworkGraphProps = {
  nodes: A16zCompanyGraphNode[];
  edges: A16zCompanyGraphEdge[];
};

type VisNetworkInstance = {
  destroy: () => void;
  fit: (options?: unknown) => void;
  focus: (nodeId: string, options?: unknown) => void;
  on: (eventName: string, handler: (payload: { nodes?: unknown[]; edges?: unknown[] }) => void) => void;
  setData: (data: { nodes: unknown[]; edges: unknown[] }) => void;
};

function extractDomainFromWebsite(website: string | null | undefined) {
  if (!website) {
    return null;
  }

  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || null;
  }
}

function buildLogoDevUrl(website: string | null | undefined, size: number) {
  const domain = extractDomainFromWebsite(website);

  if (!domain) {
    return null;
  }

  const url = new URL(`https://img.logo.dev/${domain}`);
  url.searchParams.set("size", String(size));
  url.searchParams.set("format", "png");
  url.searchParams.set("retina", "true");

  if (clientEnv.logoDevToken) {
    url.searchParams.set("token", clientEnv.logoDevToken);
  }

  return url.toString();
}

function normalizeSearchValue(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function matchesNode(node: A16zCompanyGraphNode, searchTerms: string[]) {
  if (!searchTerms.length) {
    return true;
  }

  const haystack = normalizeSearchValue(
    [
      node.companyName,
      node.vertical,
      node.stage,
      node.location,
      node.locationRegion,
      node.peoplePainPointOverview,
      node.peopleConnectionSummary,
      ...node.currentPainPointTags,
      ...node.resolvedPainPointTags,
      ...node.people.map((person) => `${person.name} ${person.currentPainPointLabel ?? ""} ${person.suggestedRole ?? ""}`),
    ]
      .filter(Boolean)
      .join(" "),
  );

  return searchTerms.every((term) => haystack.includes(term));
}

function scheduleGraphUpdate(callback: () => void) {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => callback());
    return;
  }

  setTimeout(callback, 0);
}

function buildGraphData(nodes: A16zCompanyGraphNode[], edges: A16zCompanyGraphEdge[], searchValue: string) {
  const searchTerms = normalizeSearchValue(searchValue).split(/\s+/).filter(Boolean);
  const hasSearchFilter = searchTerms.length > 0;
  const matchedNodeIds = new Set<string>();

  for (const node of nodes) {
    if (matchesNode(node, searchTerms)) {
      matchedNodeIds.add(node.id);
    }
  }

  const visNodes = nodes.map((node) => {
    const isDimmed = hasSearchFilter && !matchedNodeIds.has(node.id);
    const logoUrl = buildLogoDevUrl(node.website, 112);

    return {
      id: node.id,
      label: node.companyName,
      shape: logoUrl ? "circularImage" : "dot",
      image: logoUrl ?? undefined,
      borderWidth: logoUrl ? 4 : 5,
      size: Math.max(34, Math.min(node.size + 16, 68)),
      title: `${node.companyName}\n${node.vertical ?? "Unassigned vertical"}\n${node.locationRegion ?? "Unknown region"}`,
      color: {
        background: isDimmed ? "#e2e8f0" : logoUrl ? "#ffffff" : node.colorHex ?? "#f8fafc",
        border: isDimmed ? "#cbd5e1" : "#334155",
        highlight: {
          background: "#ffffff",
          border: "#0f172a",
        },
        hover: {
          background: "#ffffff",
          border: "#1d4ed8",
        },
      },
      font: {
        color: isDimmed ? "#94a3b8" : "#0f172a",
        size: 14,
        face: "Avenir Next",
        vadjust: 28,
        strokeWidth: 4,
        strokeColor: "#ffffff",
      },
    };
  });

  const visEdges = edges.map((edge) => {
    const isConnectedToMatch = matchedNodeIds.has(edge.sourceId) || matchedNodeIds.has(edge.targetId);
    const isDimmed = hasSearchFilter && !isConnectedToMatch;

    return {
      id: edge.id,
      from: edge.sourceId,
      to: edge.targetId,
      width: Math.max(1, edge.width),
      color: isDimmed ? "rgba(148, 163, 184, 0.16)" : edge.color ?? "rgba(100, 116, 139, 0.72)",
      title: `${edge.sourceName} to ${edge.targetName}\n${edge.explanation}`,
      smooth: {
        enabled: true,
        type: "dynamic" as const,
        roundness: 0.35,
      },
    };
  });

  return {
    matchedNodeIds: [...matchedNodeIds],
    searchTerms,
    visNodes,
    visEdges,
  };
}

function formatTagLabel(tag: string) {
  return tag
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function companyOverview(node: A16zCompanyGraphNode) {
  const location = node.location && node.location !== "Unknown" ? node.location : node.locationRegion;
  const compactSignal = (node.peopleConnectionSummary ?? node.peoplePainPointOverview ?? "")
    .split("|")[0]
    .replace(/\s+Importance.*$/i, "")
    .trim();

  const parts = [
    node.vertical ? `${node.vertical}` : "Portfolio company",
    node.stage,
    location && location !== "Unknown" ? location : null,
  ].filter(Boolean);

  return [
    parts.join(" | "),
    compactSignal || `${formatRelativeCount(node.peopleCount, "person")} mapped with ${formatRelativeCount(node.degree, "bridge")}.`,
  ]
    .filter(Boolean)
    .join(". ");
}

function personAvatarUrl(person: A16zCompanyGraphPerson) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=0f172a&color=ffffff&size=96&bold=true`;
}

function getWebsiteLabel(website: string | null) {
  return extractDomainFromWebsite(website);
}

function dispatchGraphConnectRequest(person: A16zCompanyGraphPerson) {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage(
    {
      type: "meshed:graph-connect-request",
      payload: {
        id: person.id,
        name: person.name,
        company: person.company,
        role: person.suggestedRole,
        linkedinUrl: person.linkedinUrl ?? undefined,
        contact: person.contact ?? undefined,
        why: person.connectionSummary ?? person.relationshipSummary[0] ?? `${person.name} was surfaced from the graph.`,
      },
    },
    window.location.origin,
  );

  document.getElementById("meshed-connections-panel")?.scrollIntoView?.({
    behavior: "smooth",
    block: "start",
  });
}

function PersonDetailModal({
  person,
  onClose,
  onConnect,
}: {
  person: A16zCompanyGraphPerson;
  onClose: () => void;
  onConnect: (person: A16zCompanyGraphPerson) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] px-4 py-8"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${person.name} details`}
        data-testid="company-person-modal"
        className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src={personAvatarUrl(person)}
              alt={person.name}
              className="h-20 w-20 rounded-[1.4rem] border-2 border-slate-200 object-cover"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">People details</p>
              <h3 className="mt-2 font-display text-3xl tracking-tight text-ink">{person.name}</h3>
              <p className="mt-2 text-sm text-slate">
                {person.company ?? "Unassigned company"}
                {person.suggestedRole ? ` | ${titleCase(person.suggestedRole)}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate transition-colors hover:bg-mist"
            aria-label="Close person details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Importance score</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{person.networkImportanceScore}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Engagement</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{person.engagementScore}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-mist/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Reliability</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{person.reliabilityScore}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Current pain point</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {person.currentPainPointLabel ?? "No current pain point mapped."}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Resolved pain points</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {person.resolvedPainPointsLabel ?? "No resolved pain points mapped."}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Contact</p>
            <p className="mt-2 text-sm leading-6 text-ink">{person.contact ?? "No contact info available."}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">LinkedIn</p>
            {person.linkedinUrl ? (
              <a
                href={person.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                Open profile
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <p className="mt-2 text-sm leading-6 text-ink">No LinkedIn profile available.</p>
            )}
          </div>
        </div>

        {person.trustSignals.length ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Trust signals</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {person.trustSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700"
                >
                  {titleCase(signal)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {person.relationshipSummary.length ? (
          <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Relationship summary</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink">
              {person.relationshipSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {person.connectionSummary ? (
          <div className="mt-6 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Connection summary</p>
            <p className="mt-2 text-sm leading-6 text-ink">{person.connectionSummary}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => onConnect(person)}>Connect on Meshed</Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CompanyNetworkGraph({ nodes, edges }: CompanyNetworkGraphProps) {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<VisNetworkInstance | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isReady, setIsReady] = useState(false);

  const deferredSearchValue = useDeferredValue(searchValue);
  const graphData = buildGraphData(nodes, edges, deferredSearchValue);

  const selectedNode = selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null;
  const selectedEdge = selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) ?? null : null;
  const selectedPerson = selectedNode?.people.find((person) => person.id === selectedPersonId) ?? null;
  const matchingNodes = graphData.matchedNodeIds
    .map((nodeId) => nodes.find((node) => node.id === nodeId) ?? null)
    .filter((node): node is A16zCompanyGraphNode => node !== null);

  const selectedNodeBridges = selectedNode
    ? [...edges]
        .filter((edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id)
        .sort((left, right) => right.score - left.score)
        .slice(0, 6)
    : [];

  useEffect(() => {
    if (!selectedNode || !selectedPersonId) {
      return;
    }

    if (!selectedNode.people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(null);
    }
  }, [selectedNode, selectedPersonId]);

  useEffect(() => {
    let cancelled = false;

    async function setupNetwork() {
      if (!graphRef.current) {
        return;
      }

      const { Network } = await import("vis-network/standalone");

      if (cancelled || !graphRef.current) {
        return;
      }

      const network = new Network(
        graphRef.current,
        {
          nodes: graphData.visNodes,
          edges: graphData.visEdges,
        },
        {
          autoResize: true,
          interaction: {
            hover: true,
            dragNodes: true,
            dragView: true,
            zoomView: true,
            navigationButtons: false,
          },
          layout: {
            improvedLayout: true,
            randomSeed: 42,
          },
          physics: {
            enabled: true,
            solver: "barnesHut",
            stabilization: {
              enabled: true,
              iterations: 450,
              updateInterval: 40,
              fit: true,
            },
            adaptiveTimestep: true,
            minVelocity: 0.18,
            timestep: 0.48,
            barnesHut: {
              gravitationalConstant: -7600,
              centralGravity: 0.08,
              springLength: 290,
              springConstant: 0.015,
              damping: 0.42,
              avoidOverlap: 1.2,
            },
          },
          nodes: {
            borderWidth: 5,
            borderWidthSelected: 5.4,
            labelHighlightBold: false,
          },
          edges: {
            color: {
              color: "#94a3b8",
              opacity: 0.72,
            },
            width: 0.85,
          },
        },
      ) as unknown as VisNetworkInstance;

      network.on("click", (payload) => {
        const nextNodeId = payload.nodes?.[0];
        const nextEdgeId = payload.edges?.[0];

        if (typeof nextNodeId === "string") {
          setSelectedNodeId(nextNodeId);
          setSelectedEdgeId(null);
          setSelectedPersonId(null);
          network.focus(nextNodeId, {
            scale: 1.05,
            animation: {
              duration: 350,
            },
          });
          return;
        }

        if (typeof nextEdgeId === "string") {
          setSelectedEdgeId(nextEdgeId);
          setSelectedNodeId(null);
          setSelectedPersonId(null);
          return;
        }

        if (!payload.nodes?.length && !payload.edges?.length) {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setSelectedPersonId(null);
        }
      });

      networkRef.current = network;
      setIsReady(true);

      scheduleGraphUpdate(() => {
        network.fit({
          animation: {
            duration: 450,
          },
        });
      });
    }

    setupNetwork();

    return () => {
      cancelled = true;
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, []);

  useEffect(() => {
    const network = networkRef.current;

    if (!network) {
      return;
    }

    network.setData({
      nodes: graphData.visNodes,
      edges: graphData.visEdges,
    });

    if (graphData.searchTerms.length && selectedNodeId && !graphData.matchedNodeIds.includes(selectedNodeId)) {
      setSelectedNodeId(null);
      setSelectedPersonId(null);
    }

    if (
      graphData.searchTerms.length &&
      selectedEdgeId &&
      !edges.some(
        (edge) =>
          edge.id === selectedEdgeId &&
          (graphData.matchedNodeIds.includes(edge.sourceId) || graphData.matchedNodeIds.includes(edge.targetId)),
      )
    ) {
      setSelectedEdgeId(null);
    }

    scheduleGraphUpdate(() => {
      if (!networkRef.current) {
        return;
      }

      if (!graphData.searchTerms.length) {
        return;
      }

      if (graphData.matchedNodeIds.length === 1) {
        networkRef.current.focus(graphData.matchedNodeIds[0], {
          scale: 1.15,
          animation: {
            duration: 320,
          },
        });
        return;
      }

      if (graphData.matchedNodeIds.length > 1) {
        networkRef.current.fit({
          nodes: graphData.matchedNodeIds,
          animation: {
            duration: 320,
          },
        });
      }
    });
  }, [edges, graphData.matchedNodeIds, graphData.searchTerms, graphData.visEdges, graphData.visNodes, selectedEdgeId, selectedNodeId]);

  function resetView() {
    networkRef.current?.fit({
      animation: {
        duration: 350,
      },
    });
  }

  function clearSearch() {
    setSearchValue("");
    resetView();
  }

  function clearSelection() {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedPersonId(null);
  }

  function connectPerson(person: A16zCompanyGraphPerson) {
    dispatchGraphConnectRequest(person);
  }

  const searchStatus = graphData.searchTerms.length
    ? graphData.matchedNodeIds.length
      ? `${formatRelativeCount(graphData.matchedNodeIds.length, "matching company", "matching companies")} in focus.`
      : `No companies match "${searchValue.trim()}".`
    : "No search filter active.";

  const selectedNodeWebsiteLabel = selectedNode ? getWebsiteLabel(selectedNode.website) : null;
  const selectedNodeLogoUrl = selectedNode ? buildLogoDevUrl(selectedNode.website, 160) : null;

  return (
    <>
      <div className="space-y-5">
        <div className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Browse the company network</p>
              <p className="mt-1 text-sm leading-6 text-slate">
                This is the live `a16z-crypto` company graph generated by the pipeline, rendered directly in the app.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={clearSearch} disabled={!searchValue.trim()}>
                Clear
              </Button>
              <Button variant="ghost" onClick={resetView}>
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset view
                </span>
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-[1.35rem] border border-white/85 bg-white/90 p-3 shadow-sm">
            <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-mist/60 px-4 py-3 text-sm text-slate">
              <Search className="h-4 w-4 flex-none text-slate" />
              <input
                aria-label="Search companies"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.currentTarget.value)}
                placeholder="Company, person, region, vertical, or pain point"
                className="w-full border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-slate/65"
              />
            </label>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate">{searchStatus}</p>
          </div>

          <div
            data-testid="company-network-stage"
            className="relative mt-4 overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white"
          >
            <div
              ref={graphRef}
              data-testid="company-network-graph"
              className={cn(
                "h-[760px] bg-white sm:h-[860px] xl:h-[940px]",
                !isReady && "animate-pulse bg-[linear-gradient(135deg,#f8fafc,#eef2f7)]",
              )}
            />

            <div className="pointer-events-none absolute inset-x-3 bottom-3 top-auto sm:bottom-4 sm:left-auto sm:right-4 sm:top-4">
              <section
                data-testid="company-network-details"
                className="pointer-events-auto flex max-h-[50%] w-full flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/96 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur sm:h-full sm:max-h-none sm:w-[380px] xl:w-[410px]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-200/90 bg-white/96 px-4 py-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                      <Workflow className="h-3.5 w-3.5" />
                      Network details
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink">
                      {selectedNode ? "Selected company" : selectedEdge ? "Selected bridge" : "Select a company or bridge"}
                    </p>
                  </div>

                  {selectedNode || selectedEdge ? (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate transition-colors hover:bg-mist"
                      aria-label="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {!selectedNode && !selectedEdge ? (
                    <div>
                      <h3 className="font-display text-xl tracking-tight text-ink">Select a company or bridge</h3>
                      <p className="mt-2 text-sm leading-6 text-slate">
                        Click a node to inspect the company summary, mapped people, and strongest bridges. Click a bridge to inspect the relationship itself.
                      </p>

                      <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-mist/50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Quick scan</p>
                        <p className="mt-2 text-sm text-ink">
                          {formatRelativeCount(nodes.length, "company", "companies")} and{" "}
                          {formatRelativeCount(edges.length, "bridge")} are currently loaded into this graph.
                        </p>
                        {graphData.searchTerms.length ? (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Search matches</p>
                            {matchingNodes.slice(0, 5).map((node) => (
                              <div key={node.id} className="rounded-xl border border-white/80 bg-white px-3 py-2">
                                <p className="text-sm font-medium text-ink">{node.companyName}</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate">
                                  {node.vertical ?? "Unassigned vertical"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {selectedNode ? (
                    <div className="space-y-4">
                      <div className="rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,247,252,0.94))] p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-[1.15rem] border-[3px] border-emerald-500 bg-white">
                            {selectedNodeLogoUrl ? (
                              <img
                                src={selectedNodeLogoUrl}
                                alt={`${selectedNode.companyName} logo`}
                                className="h-full w-full object-contain p-2.5"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.92),rgba(190,242,100,0.45),rgba(14,116,144,0.36))] text-lg font-semibold tracking-tight text-ink">
                                {selectedNode.companyName
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join("")}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-[1.75rem] leading-none tracking-tight text-ink">
                              {selectedNode.companyName}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate">
                              {selectedNode.vertical ?? "Portfolio company"}
                              {selectedNode.location ? ` in ${selectedNode.location}` : ""}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedNode.vertical ? (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-900">
                                  {selectedNode.vertical}
                                </span>
                              ) : null}
                              {selectedNode.locationRegion ? (
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate">
                                  {selectedNode.locationRegion}
                                </span>
                              ) : null}
                              {selectedNode.stage ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                                  {selectedNode.stage}
                                </span>
                              ) : null}
                              {selectedNodeWebsiteLabel ? (
                                <a
                                  href={selectedNode.website ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800"
                                >
                                  {selectedNodeWebsiteLabel}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-[13px] leading-5 text-slate">{companyOverview(selectedNode)}</p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-[1rem] border border-white/85 bg-white/92 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Mapped people</p>
                            <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{selectedNode.peopleCount}</p>
                          </div>
                          <div className="rounded-[1rem] border border-white/85 bg-white/92 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">Company bridges</p>
                            <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{selectedNode.degree}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Current pain points</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedNode.currentPainPointTags.length ? (
                              selectedNode.currentPainPointTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800"
                                >
                                  {formatTagLabel(tag)}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-slate">No current pain points mapped.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Resolved pain points</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedNode.resolvedPainPointTags.length ? (
                              selectedNode.resolvedPainPointTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800"
                                >
                                  {formatTagLabel(tag)}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm text-slate">No resolved pain points mapped.</p>
                            )}
                          </div>
                        </div>

                        {selectedNode.peopleTrustSignalOverview ? (
                          <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Trust signal overview</p>
                            <p className="mt-2 text-sm leading-6 text-ink">{selectedNode.peopleTrustSignalOverview}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">People in this node</p>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate">
                            Click for details
                          </span>
                        </div>
                            {selectedNode.people.length ? (
                          <div className="mt-4 grid gap-3">
                            {selectedNode.people.map((person) => (
                              <div
                                key={person.id}
                                className="rounded-[1rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.92))] px-3 py-3"
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPersonId(person.id)}
                                    className="flex min-w-0 flex-1 items-start gap-3 text-left transition-colors hover:opacity-90"
                                  >
                                    <img
                                      src={personAvatarUrl(person)}
                                      alt={person.name}
                                      className="h-11 w-11 rounded-2xl border border-slate-200 object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-ink">{person.name}</p>
                                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                                          Score {person.networkImportanceScore}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate">
                                        {person.suggestedRole ? titleCase(person.suggestedRole) : "Operator"}
                                        {person.currentPainPointLabel ? ` | ${person.currentPainPointLabel}` : ""}
                                      </p>
                                      <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate">
                                        {person.connectionSummary ?? "No connection summary available."}
                                      </p>
                                    </div>
                                  </button>
                                  <div className="flex shrink-0 flex-col gap-2">
                                    <Button variant="secondary" onClick={() => setSelectedPersonId(person.id)}>
                                      View
                                    </Button>
                                    <Button onClick={() => connectPerson(person)}>Connect</Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-slate">
                            No people records are currently attached to this company node.
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">Strongest bridges</p>
                        {selectedNodeBridges.map((bridge) => (
                          <details key={bridge.id} className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3">
                            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-ink">
                                    {bridge.sourceName} to {bridge.targetName}
                                  </p>
                                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate">{bridge.reason}</p>
                                </div>
                                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                  {bridge.score.toFixed(2)}
                                </span>
                              </div>
                            </summary>
                            <p className="mt-3 text-sm leading-6 text-slate">{bridge.explanation}</p>
                          </details>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedEdge ? (
                    <div>
                      <h3 className="font-display text-2xl tracking-tight text-ink">
                        {selectedEdge.sourceName} to {selectedEdge.targetName}
                      </h3>
                      <div className="mt-3 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Score {selectedEdge.score.toFixed(2)}
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Reason</p>
                          <p className="mt-2 text-sm leading-6 text-ink">{selectedEdge.reason}</p>
                        </div>
                        <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Explanation</p>
                          <p className="mt-2 text-sm leading-6 text-ink">{selectedEdge.explanation}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate">
            <a href="https://logo.dev" className="font-medium text-slate underline underline-offset-2">
              Logos provided by Logo.dev
            </a>
          </p>
        </div>
      </div>

      {selectedPerson ? (
        <PersonDetailModal
          person={selectedPerson}
          onClose={() => setSelectedPersonId(null)}
          onConnect={(person) => connectPerson(person)}
        />
      ) : null}
    </>
  );
}
