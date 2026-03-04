export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-4xl mx-auto w-full animate-slide-in-left">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/avatar.png" alt="Steward" className="w-8 h-8 rounded-full shrink-0 transition-transform duration-200 hover:scale-150" />
      <div className="flex space-x-2 pt-2">
        <div className="w-2 h-2 bg-e-indigo-light rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-e-indigo-light rounded-full animate-bounce [animation-delay:0.1s]" />
        <div className="w-2 h-2 bg-e-indigo-light rounded-full animate-bounce [animation-delay:0.2s]" />
      </div>
    </div>
  );
}
