"use client";

import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { downloadDataset, type DatasetId } from "@/lib/export";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface DatasetExportProps {
  dataset: DatasetId;
  language: Language;
  label?: string;
}

/**
 * One-click CSV export for the dataset behind a section's table. Numbers
 * shown on screen are now verifiable and reusable without re-keying.
 */
export function DatasetExport({ dataset, language, label }: DatasetExportProps) {
  const [done, setDone] = useState(false);

  const onClick = useCallback(() => {
    if (!downloadDataset(dataset, language)) return;
    setDone(true);
    window.setTimeout(() => setDone(false), 2200);
  }, [dataset, language]);

  return (
    <button type="button" className="export-button" onClick={onClick} data-dataset={dataset}>
      <Download size={13} aria-hidden="true" />
      <span>{label ?? t("exportCsv", language)}</span>
      <span className="visually-hidden" role="status" aria-live="polite">
        {done ? t("exportedToast", language) : ""}
      </span>
    </button>
  );
}
