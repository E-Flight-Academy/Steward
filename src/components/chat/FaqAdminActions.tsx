import type { FaqAdminAction } from "@/hooks/useFaqAdmin";

interface FaqAdminActionsProps {
  onChoose: (action: FaqAdminAction) => void;
  lang: string;
}

const labels: Record<string, Record<FaqAdminAction, string>> = {
  en: { add: "Add", edit: "Edit", delete: "Delete" },
  nl: { add: "Toevoegen", edit: "Bewerken", delete: "Verwijderen" },
  de: { add: "Hinzufügen", edit: "Bearbeiten", delete: "Löschen" },
};

export default function FaqAdminActions({ onChoose, lang }: FaqAdminActionsProps) {
  const l = labels[lang] || labels.en;

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => onChoose("add")}
        className="px-4 py-2 rounded-lg bg-[#1515F5] text-white text-sm font-medium hover:bg-[#1010D0] transition-colors cursor-pointer"
      >
        + {l.add}
      </button>
      <button
        onClick={() => onChoose("edit")}
        className="px-4 py-2 rounded-lg bg-[#F7F7F7] text-[#4A4A4A] text-sm font-medium hover:bg-[#ECECEC] transition-colors cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        ✏️ {l.edit}
      </button>
      <button
        onClick={() => onChoose("delete")}
        className="px-4 py-2 rounded-lg bg-[#F7F7F7] text-red-600 text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer dark:bg-gray-800 dark:hover:bg-red-900/20"
      >
        🗑 {l.delete}
      </button>
    </div>
  );
}
