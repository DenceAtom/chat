"\"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Define the filter types
export type FilterType =
  | "none"
  | "dog"
  | "cat"
  | "bunny"
  | "glasses"
  | "hat"
  | "crown"
  | "mustache"
  | "alien"
  | "zombie"
  | "heart"
  | "fire"
  | "rainbow"
  | "glitter"
  | "neon"
  | "pixelate"
  | "cartoon"
  | "comic"
  | "watercolor"
  | "oil-painting"
  | "cyberpunk"
  | "vaporwave"
  | "retro"
  | "glitch"
  | "3d-glasses"
  | "hologram"
  | "floating-hearts"
  | "floating-stars"
  | "mouth-laser"
  | "eye-laser"
  | "rainbow-tears"
  | "fire-breath"
  | "ice-breath"
  | "lightning-eyes"
  | "golden-crown"
  | "devil-horns"
  | "angel-halo"
  | "butterfly-lashes"
  | "diamond-tears"

// Define available filters with their display names
const AVAILABLE_FILTERS = [
  { id: "none", name: "None" },
  { id: "dog", name: "Dog" },
  { id: "cat", name: "Cat" },
  { id: "bunny", name: "Bunny" },
  { id: "glasses", name: "Glasses" },
  { id: "hat", name: "Hat" },
  { id: "crown", name: "Crown" },
  { id: "mustache", name: "Mustache" },
  { id: "alien", name: "Alien" },
  { id: "zombie", name: "Zombie" },
  { id: "heart", name: "Heart" },
  { id: "fire", name: "Fire" },
]

interface FaceFilterSelectorProps {
  activeFilter: FilterType | null
  onFilterChange: (filter: FilterType) => void
  className?: string
}

export function FaceFilterSelector({ activeFilter, onFilterChange, className }: FaceFilterSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("flex items-center gap-2", className)} aria-label="Select face filter">
          <span>Filter: {activeFilter ? activeFilter : "None"}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {AVAILABLE_FILTERS.map((filter) => (
          <DropdownMenuItem
            key={filter.id}
            onClick={() => {
              onFilterChange(filter.id as FilterType)
              setOpen(false)
            }}
            className="flex items-center justify-between"
          >
            <span>{filter.name}</span>
            {activeFilter === filter.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default FaceFilterSelector

