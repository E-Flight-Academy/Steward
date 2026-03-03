"use client";

import React, { useState } from "react";

interface MultiSelectPillsProps {
  options: string[];
  onConfirm: (selected: string[]) => void;
  confirmLabel: string;
  lang?: string;
}

export default function MultiSelectPills({ options, onConfirm, confirmLabel }: MultiSelectPillsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto w-full pl-11 flex flex-wrap gap-2">
      {options.map((option, i) => {
        const isSelected = selected.has(option);
        return (
          <button
            key={option}
            onClick={() => toggle(option)}
            className={`text-sm px-4 py-2 rounded-full border transition-colors cursor-pointer animate-pop-in ${
              isSelected
                ? "border-[#1515F5] bg-[#1515F5] text-white dark:border-[#5050FF] dark:bg-[#5050FF]"
                : "border-[#ECECEC] text-[#828282] bg-white hover:bg-[#F7F7F7] hover:text-[#1515F5] dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800"
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {option}
          </button>
        );
      })}
      {selected.size > 0 && (
        <button
          onClick={() => onConfirm([...selected])}
          className="text-sm px-4 py-2 rounded-full border border-[#1515F5]/20 text-[#1515F5] bg-white hover:bg-[#F0F0FF] transition-colors cursor-pointer dark:bg-gray-900 dark:border-[#1515F5]/40 dark:hover:bg-gray-800 animate-pop-in"
          style={{ animationDelay: `${options.length * 60}ms` }}
        >
          {confirmLabel} →
        </button>
      )}
    </div>
  );
}
