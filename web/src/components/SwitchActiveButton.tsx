"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "./ui";

/**
 * "Switch off" / "Switch on" for a record that is never deleted (customers, factories, categories).
 * Switching off asks first; switching back on does not.
 */
export function SwitchActiveButton({
  name,
  isActive,
  confirmText,
  onSwitch,
}: {
  name: string;
  isActive: boolean;
  /** Shown before switching off, e.g. "Switch off Ahmed Raza? …" */
  confirmText: string;
  /** Saves the new state; may throw (the list page shows the problem). */
  onSwitch: (isActive: boolean) => Promise<void>;
}) {
  const t = useTranslations("common");
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      className="min-h-9 px-3"
      disabled={busy}
      aria-label={`${isActive ? t("switchOff") : t("switchOn")}: ${name}`}
      onClick={async () => {
        if (isActive && !window.confirm(confirmText)) return;
        setBusy(true);
        try {
          await onSwitch(!isActive);
        } finally {
          setBusy(false);
        }
      }}
    >
      {isActive ? t("switchOff") : t("switchOn")}
    </Button>
  );
}
