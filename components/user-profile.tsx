"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import CountrySelector from "./country-selector"

interface UserProfileProps {
  selectedCountry: string | null
  setSelectedCountry: (country: string) => void
  userGender: string | null
  setUserGender: (gender: string) => void
  preferredGender: string | null
  setPreferredGender: (gender: string) => void
}

export default function UserProfile({
  selectedCountry,
  setSelectedCountry,
  userGender,
  setUserGender,
  preferredGender,
  setPreferredGender,
}: UserProfileProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="country">Your Country</Label>
          <CountrySelector value={selectedCountry} onChange={setSelectedCountry} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Your Gender</Label>
          <Select value={userGender || ""} onValueChange={setUserGender}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select your gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred-gender">Preferred Match</Label>
          <Select value={preferredGender || ""} onValueChange={setPreferredGender}>
            <SelectTrigger id="preferred-gender">
              <SelectValue placeholder="Select preferred gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

