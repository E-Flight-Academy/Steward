interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSelect: (s: string) => void;
}

export default function FollowUpSuggestions({ suggestions, onSelect }: FollowUpSuggestionsProps) {
  return (
    <div className="max-w-4xl mx-auto w-full pl-11 flex flex-wrap gap-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-sm px-4 py-2 rounded-full border border-[#ECECEC] text-[#828282] bg-white hover:bg-[#F7F7F7] hover:text-[#1515F5] transition-colors dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 cursor-pointer animate-pop-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
