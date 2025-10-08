"use client";

import React, { useActionState, useRef, useState, useMemo } from "react";
import { pullAllTheFacts, transcribeAudio } from "../utils/actions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  UploadCloud,
  FileAudio2,
  Sparkles,
  Loader2,
  Check,
  Clipboard,
  ClipboardCheck,
  Download,
  RefreshCcw,
  FileText,
  Quote,
} from "lucide-react";

const initialTranscribeState = { message: "", transcription: "" };
const initialFactsState = { factData: null, report: "" };

export default function InputAudioPage() {
  const [state, formAction, isPending] = useActionState(
    transcribeAudio,
    initialTranscribeState
  );
  const [state2, formAction2, isPending2] = useActionState(
    pullAllTheFacts,
    initialFactsState
  );
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fileMeta, setFileMeta] = useState({ name: "", size: 0 });
  const [copiedReport, setCopiedReport] = useState(false);

  const hasTranscription = Boolean(state?.transcription);
  const hasReport = Boolean(state2?.report);
  const facts = state2?.factData?.facts ?? [];

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFileMeta({ name: "", size: 0 });
      return;
    }
    setFileMeta({ name: f.name, size: f.size });
  };

  const handleReset = () => {
    // Soft reset
    setFileMeta({ name: "", size: 0 });
    formRef.current?.reset();
    // Full state reset (simple way)
    window.location.reload();
  };

  const copyReport = async () => {
    if (!state2?.report) return;
    try {
      await navigator.clipboard.writeText(state2.report);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 1500);
    } catch {}
  };

  const downloadReport = () => {
    if (!state2?.report) return;
    const blob = new Blob([state2.report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visit-report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const transcriptLines = useMemo(() => {
    if (!state?.transcription) return [];
    return state.transcription
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^\s*(doctor|patient)\s*:\s*(.*)$/i);
        if (m) {
          const role = m[1].toLowerCase();
          const text = m[2].trim();
          return { role, text, raw: line };
        }
        return { role: "unknown", text: line, raw: line };
      });
  }, [state?.transcription]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 text-white grid place-items-center shadow-md">
              <FileAudio2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-800">Clinical Transcriber</div>
              <div className="text-sm text-slate-500">Doctor–Patient conversation to structured insights</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <Step status="active" label="Upload" />
            <Step status={hasTranscription ? "active" : isPending ? "loading" : "idle"} label="Transcribe" />
            <Step status={hasReport ? "active" : isPending2 ? "loading" : "idle"} label="Report & Facts" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Upload + Transcription */}
        <section className="lg:col-span-5 space-y-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <UploadCloud className="h-5 w-5 text-blue-600" />
                Upload MP3
              </h2>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
                title="Reset"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
            </div>

            <form ref={formRef} action={formAction} className="space-y-4">
              <div
                className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center hover:border-blue-300 hover:bg-blue-50/50 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  name="audio"
                  id="audio"
                  accept=".mp3,audio/mpeg"
                  className="sr-only"
                  onChange={onFileChange}
                  required
                />
                <label
                  htmlFor="audio"
                  className="cursor-pointer inline-flex flex-col items-center gap-2"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-600/10 text-blue-700 grid place-items-center">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="font-medium text-slate-800">
                    Click to choose an MP3 file
                  </div>
                  <div className="text-xs text-slate-500">Only .mp3 files are supported</div>
                </label>

                {fileMeta.name ? (
                  <div className="mt-4 inline-flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    <FileAudio2 className="h-4 w-4 text-slate-600" />
                    <span className="truncate max-w-[12rem]" title={fileMeta.name}>
                      {fileMeta.name}
                    </span>
                    <span className="text-slate-400">
                      ({Math.round(fileMeta.size / 1024)} KB)
                    </span>
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={isPending}
              >
                {!isPending ? (
                  <>
                    <FileText className="h-4 w-4" />
                    Transcribe Audio
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing your audio...
                  </>
                )}
              </button>

              {state?.message ? (
                <p
                  className={`text-sm ${state.transcription ? "text-emerald-600" : "text-red-500"}`}
                >
                  {state.message}
                </p>
              ) : null}
            </form>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <FileText className="h-5 w-5 text-blue-600" />
                Transcription
              </h2>
              {hasTranscription ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="h-4 w-4" />
                  Ready
                </span>
              ) : null}
            </div>

            {!hasTranscription && !isPending && (
              <p className="text-sm text-slate-500">
                Upload an MP3 and click “Transcribe Audio” to see the conversation here.
              </p>
            )}

            {isPending && (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 rounded bg-slate-200"></div>
                <div className="h-3 rounded bg-slate-200 w-5/6"></div>
                <div className="h-3 rounded bg-slate-200 w-4/6"></div>
                <div className="h-3 rounded bg-slate-200 w-3/6"></div>
              </div>
            )}

            {hasTranscription && (
              <div className="mt-1 space-y-2 max-h-[380px] overflow-y-auto pr-2">
                {transcriptLines.map((l, idx) => {
                  const isDoctor = l.role === "doctor";
                  const isPatient = l.role === "patient";
                  const roleBadge = isDoctor
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : isPatient
                    ? "bg-sky-50 text-sky-700 ring-sky-200"
                    : "bg-slate-50 text-slate-600 ring-slate-200";
                  const leftBorder = isDoctor
                    ? "border-emerald-300"
                    : isPatient
                    ? "border-sky-300"
                    : "border-slate-200";
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border ${leftBorder} bg-white/70 p-3 ring-1 ring-slate-100`}
                      style={{ borderLeftWidth: 4 }}
                    >
                      <div className="mb-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${roleBadge}`}>
                          {isDoctor ? "Doctor" : isPatient ? "Patient" : "Speaker"}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-800">{l.text}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {hasTranscription && (
              <form action={formAction2} className="mt-4">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-300 disabled:bg-violet-300 disabled:cursor-not-allowed"
                  disabled={isPending2}
                >
                  {!isPending2 ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Report & Pull Facts
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating report and extracting facts...
                    </>
                  )}
                </button>
                <input
                  type="text"
                  value={state.transcription}
                  name="transcript"
                  className="hidden"
                  readOnly
                />
              </form>
            )}
          </Card>
        </section>

        {/* Right column: Report + Facts */}
        <section className="lg:col-span-7 space-y-8">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Sparkles className="h-5 w-5 text-violet-600" />
                Visit Report
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyReport}
                  disabled={!hasReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Copy to clipboard"
                >
                  {copiedReport ? (
                    <>
                      <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={downloadReport}
                  disabled={!hasReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Download .md"
                >
                  <Download className="h-4 w-4" />
                  .md
                </button>
              </div>
            </div>

            {!hasReport && !isPending2 && (
              <div className="mt-3 text-sm text-slate-500">
                Generate your report to view a structured, patient-friendly summary here.
              </div>
            )}

            {isPending2 && (
              <div className="mt-4 space-y-3">
                <SkeletonLines lines={8} />
              </div>
            )}

            {hasReport && (
              <div className="mt-4">
                <MarkdownRenderer content={state2.report} />
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Quote className="h-5 w-5 text-rose-600" />
                Extracted Facts
              </h2>
              {facts?.length > 0 ? (
                <span className="text-xs text-slate-500">{facts.length} fact(s)</span>
              ) : null}
            </div>

            {isPending2 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonFactCard key={i} />
                ))}
              </div>
            )}

            {hasReport && facts?.length === 0 && !isPending2 && (
              <p className="mt-2 text-sm text-slate-500">No concrete facts were extracted.</p>
            )}

            {facts?.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {facts.map((item, idx) => (
                  <FactCard key={idx} index={idx} item={item} />
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

/* UI bits */

function Card({ children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
      {children}
    </div>
  );
}

function Step({ status = "idle", label = "" }) {
  const color =
    status === "active"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
      : status === "loading"
      ? "bg-amber-100 text-amber-700 ring-amber-200"
      : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${color}`}>
      {status === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status === "active" ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      )}
      {label}
    </span>
  );
}

function FactCard({ item, index }) {
  const role = item?.role || "Unknown";
  const fact = item?.fact || "";
  const quote = item?.verbatimSentenceUsed || item?.verabtimSentenceUsed || ""; // handle model typos defensively

  const isDoctor = role === "Doctor";
  const roleBadge = isDoctor
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-sky-50 text-sky-700 ring-sky-200";
  const bar = isDoctor ? "bg-emerald-500" : "bg-sky-500";

  const copyFact = async () => {
    try {
      await navigator.clipboard.writeText(`${role}: ${fact}\n"${quote}"`);
    } catch {}
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm hover:shadow-md transition">
      <div className={`absolute left-0 top-0 h-full w-1.5 ${bar}`}></div>
      <div className="p-4 pl-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${roleBadge}`}>
              {role}
            </span>
            <span className="text-xs text-slate-400">#{index + 1}</span>
          </div>
          <button
            onClick={copyFact}
            className="text-slate-400 hover:text-slate-600"
            title="Copy fact"
          >
            <Clipboard className="h-4 w-4" />
          </button>
        </div>

        <div className="text-sm font-medium text-slate-800">{fact}</div>

        {quote ? (
          <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 border border-slate-200">
            <div className="mb-1 flex items-center gap-1 text-slate-500 text-xs">
              <Quote className="h-3.5 w-3.5" />
              Verbatim
            </div>
            <p className="italic">“{quote}”</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SkeletonLines({ lines = 5 }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 rounded bg-slate-200 ${i % 3 === 0 ? "w-5/6" : i % 4 === 0 ? "w-4/6" : "w-full"}`}
        />
      ))}
    </div>
  );
}

function SkeletonFactCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-24 rounded bg-slate-200"></div>
        <div className="h-3 rounded bg-slate-200 w-5/6"></div>
        <div className="h-3 rounded bg-slate-200 w-4/6"></div>
        <div className="h-3 rounded bg-slate-200 w-3/6"></div>
      </div>
    </div>
  );
}

function MarkdownRenderer({ content }) {
  return (
    <div className="prose-headings:scroll-mt-20">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="mt-2 mb-3 text-2xl font-bold text-slate-900" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mt-6 mb-2 text-xl font-semibold text-slate-900 border-b border-slate-200 pb-1" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mt-5 mb-2 text-lg font-semibold text-slate-900" {...props} />
          ),
          p: ({ node, ...props }) => <p className="my-3 leading-7 text-slate-700" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-3 list-disc list-inside space-y-2 text-slate-700" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-3 list-decimal list-inside space-y-2 text-slate-700" {...props} />,
          li: ({ node, ...props }) => <li className="leading-7" {...props} />,
          a: ({ node, ...props }) => <a className="text-blue-600 underline underline-offset-2 hover:text-blue-700" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
          em: ({ node, ...props }) => <em className="text-slate-800" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="my-4 border-l-4 border-slate-300 bg-slate-50/70 px-4 py-2 italic text-slate-700"
              {...props}
            />
          ),
          code: ({ inline, className, children, ...props }) =>
            inline ? (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[90%] text-slate-800" {...props}>
                {children}
              </code>
            ) : (
              <pre className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-slate-100">
                <code className="text-sm">{children}</code>
              </pre>
            ),
          hr: ({ node, ...props }) => <hr className="my-6 border-slate-200" {...props} />,
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full table-auto text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="bg-slate-50 px-3 py-2 text-left font-semibold text-slate-900 border-b border-slate-200" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 text-slate-700 border-b border-slate-200" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}