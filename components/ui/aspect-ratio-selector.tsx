import { useState } from "react"
import { cn } from "@/lib/utils"

export interface AspectRatio {
  label: string
  value: string
  ratio: number
}

const aspectRatios: AspectRatio[] = [
  { label: "1:1", value: "1:1", ratio: 1 },
  { label: "2:3", value: "2:3", ratio: 2/3 },
  { label: "3:2", value: "3:2", ratio: 3/2 }
]

interface AspectRatioSelectorProps {
  value?: string
  onChange: (value: string) => void
  className?: string
}

export function AspectRatioSelector({ value = "1:1", onChange, className }: AspectRatioSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium text-gray-700">长宽比</h4>
      <div className="flex gap-2">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio.value}
            onClick={() => onChange(ratio.value)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "hover:border-purple-300 hover:bg-purple-50",
              value === ratio.value
                ? "border-purple-500 bg-purple-100 text-purple-700"
                : "border-gray-200 bg-white text-gray-600"
            )}
          >
            {ratio.label}
          </button>
        ))}
      </div>
    </div>
  )
} 