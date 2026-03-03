interface FaqAdminConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  isApplying: boolean;
  lang: string;
}

const confirmLabels: Record<string, { confirm: string; cancel: string }> = {
  en: { confirm: "APPLY NOW", cancel: "Cancel" },
  nl: { confirm: "NU DOORVOEREN", cancel: "Annuleren" },
  de: { confirm: "JETZT ANWENDEN", cancel: "Abbrechen" },
};

export default function FaqAdminConfirm({ onConfirm, onCancel, isApplying, lang }: FaqAdminConfirmProps) {
  const l = confirmLabels[lang] || confirmLabels.en;

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={onConfirm}
        disabled={isApplying}
        className="px-5 py-2.5 rounded-lg bg-[#1515F5] text-white text-sm font-bold hover:bg-[#1010D0] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isApplying ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {lang === "nl" ? "Bezig..." : lang === "de" ? "Läuft..." : "Applying..."}
          </span>
        ) : (
          l.confirm
        )}
      </button>
      <button
        onClick={onCancel}
        disabled={isApplying}
        className="px-4 py-2 rounded-lg bg-[#F7F7F7] text-[#828282] text-sm font-medium hover:bg-[#ECECEC] transition-colors cursor-pointer disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        {l.cancel}
      </button>
    </div>
  );
}
