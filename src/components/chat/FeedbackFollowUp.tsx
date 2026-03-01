import type { UiLabels } from "@/lib/i18n/labels";

interface FeedbackFollowUpProps {
  onYes: () => void;
  onNo: () => void;
  t: (key: keyof UiLabels) => string;
}

export default function FeedbackFollowUp({ onYes, onNo, t }: FeedbackFollowUpProps) {
  return (
    <div className="max-w-4xl mx-auto w-full pl-11 flex flex-wrap gap-2">
      <button
        onClick={onYes}
        className="text-base font-semibold px-4 py-2 rounded-full border border-[#ECECEC] bg-[#F7F7F7] text-[#030213] hover:bg-[#1515F5] hover:text-white hover:border-[#1515F5] transition-colors cursor-pointer"
      >
        {t("feedback.yesPlease")}
      </button>
      <button
        onClick={onNo}
        className="text-base font-semibold px-4 py-2 rounded-full border border-[#ECECEC] bg-[#F7F7F7] text-[#030213] hover:bg-[#1515F5] hover:text-white hover:border-[#1515F5] transition-colors cursor-pointer"
      >
        {t("feedback.noThanks")}
      </button>
    </div>
  );
}
