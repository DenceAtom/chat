"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CountrySelectorProps {
  value: string | null
  onChange: (value: string) => void
}

export default function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const countries = [
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "JP", name: "Japan" },
    { code: "BR", name: "Brazil" },
    { code: "IN", name: "India" },
    { code: "RU", name: "Russia" },
    { code: "CN", name: "China" },
    { code: "MX", name: "Mexico" },
    { code: "KR", name: "South Korea" },
  ]

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a country" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any">Any country</SelectItem>
        {countries.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

