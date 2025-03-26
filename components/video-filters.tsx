"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sliders } from "lucide-react"

interface VideoFiltersProps {
  videoRef: React.RefObject<HTMLVideoElement>
  activeFilter: string | null
  onFilterChange: (filter: string) => void
}

export default function VideoFilters({ videoRef, activeFilter, onFilterChange }: VideoFiltersProps) {
  const filters = [
    { id: "none", name: "No Filter" },
    { id: "grayscale", name: "Grayscale" },
    { id: "sepia", name: "Sepia" },
    { id: "invert", name: "Invert" },
    { id: "blur", name: "Blur" },
  ]

  return (
    <div className="absolute top-2 right-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-black bg-opacity-50">
            <Sliders className="h-4 w-4 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {filters.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              className={activeFilter === filter.id ? "bg-accent" : ""}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

