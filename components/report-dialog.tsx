"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface ReportDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onReport: (reason: string, details: string, screenshot: string | null) => Promise<void>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  disabled: boolean
  currentPeerId: string | null
  reporterId: string | null
}

export default function ReportDialog({
  isOpen,
  onOpenChange,
  onReport,
  remoteVideoRef,
  disabled,
  currentPeerId,
  reporterId,
}: ReportDialogProps) {
  const [reason, setReason] = useState<string>("inappropriate")
  const [details, setDetails] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [includeScreenshot, setIncludeScreenshot] = useState<boolean>(false)

  const handleSubmit = async () => {
    if (disabled || !reason) return

    setIsSubmitting(true)

    try {
      // Capture screenshot if enabled
      let screenshot: string | null = null
      if (includeScreenshot && remoteVideoRef.current) {
        const canvas = document.createElement("canvas")
        canvas.width = remoteVideoRef.current.videoWidth
        canvas.height = remoteVideoRef.current.videoHeight
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height)
          screenshot = canvas.toDataURL("image/jpeg")
        }
      }

      // Use the API route directly
      await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          details,
          screenshot,
          reportedUserId: currentPeerId,
          reportedBy: reporterId,
          timestamp: new Date().toISOString(),
        }),
      })

      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community safe.",
      })

      setReason("inappropriate")
      setDetails("")
      setIncludeScreenshot(false)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting report:", error)

      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Inappropriate Behavior</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="inappropriate" id="inappropriate" />
              <Label htmlFor="inappropriate">Inappropriate content</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="harassment" id="harassment" />
              <Label htmlFor="harassment">Harassment or bullying</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="spam" id="spam" />
              <Label htmlFor="spam">Spam or advertising</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other">Other</Label>
            </div>
          </RadioGroup>

          <div className="grid gap-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Please provide any additional information..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="screenshot"
              checked={includeScreenshot}
              onChange={(e) => setIncludeScreenshot(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="screenshot">Include screenshot as evidence</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || disabled}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

