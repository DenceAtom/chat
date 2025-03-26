"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

export default function Settings() {
  // General settings
  const [siteName, setSiteName] = useState("Random Video Chat")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  // Moderation settings
  const [autoModeration, setAutoModeration] = useState(true)
  const [reportThreshold, setReportThreshold] = useState("3")
  const [quarantineDuration, setQuarantineDuration] = useState("24")

  // Server settings
  const [maxConnections, setMaxConnections] = useState("1000")
  const [connectionTimeout, setConnectionTimeout] = useState("30")
  const [turnServerUrl, setTurnServerUrl] = useState("turn:openrelay.metered.ca:80")

  // Save settings
  const saveSettings = async (settingsType: string) => {
    try {
      // In a real app, you would call your API to save the settings
      // await fetch('/api/admin/settings', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     type: settingsType,
      //     settings: settingsType === 'general'
      //       ? { siteName, maintenanceMode, debugMode }
      //       : settingsType === 'moderation'
      //         ? { autoModeration, reportThreshold, quarantineDuration }
      //         : { maxConnections, connectionTimeout, turnServerUrl }
      //   }),
      //   headers: { 'Content-Type': 'application/json' }
      // });

      toast({
        title: "Settings saved",
        description: `${settingsType.charAt(0).toUpperCase() + settingsType.slice(1)} settings have been updated.`,
      })
    } catch (error) {
      console.error(`Error saving ${settingsType} settings:`, error)
      toast({
        title: "Error",
        description: `Failed to save ${settingsType} settings. Please try again.`,
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="server">Server</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage general application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="site-name">Site Name</Label>
                <Input id="site-name" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the site will be inaccessible to regular users
                  </p>
                </div>
                <Switch id="maintenance-mode" checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="debug-mode">Debug Mode</Label>
                  <p className="text-sm text-muted-foreground">Enable detailed logging and debugging information</p>
                </div>
                <Switch id="debug-mode" checked={debugMode} onCheckedChange={setDebugMode} />
              </div>

              <Button onClick={() => saveSettings("general")}>Save General Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Settings</CardTitle>
              <CardDescription>Configure user moderation and reporting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-moderation">Automatic Moderation</Label>
                  <p className="text-sm text-muted-foreground">Automatically quarantine users after multiple reports</p>
                </div>
                <Switch id="auto-moderation" checked={autoModeration} onCheckedChange={setAutoModeration} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-threshold">Report Threshold</Label>
                <p className="text-sm text-muted-foreground">Number of reports before automatic action is taken</p>
                <Input
                  id="report-threshold"
                  type="number"
                  min="1"
                  max="10"
                  value={reportThreshold}
                  onChange={(e) => setReportThreshold(e.target.value)}
                  disabled={!autoModeration}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quarantine-duration">Quarantine Duration (hours)</Label>
                <p className="text-sm text-muted-foreground">
                  How long users remain in quarantine before being allowed back
                </p>
                <Input
                  id="quarantine-duration"
                  type="number"
                  min="1"
                  max="72"
                  value={quarantineDuration}
                  onChange={(e) => setQuarantineDuration(e.target.value)}
                />
              </div>

              <Button onClick={() => saveSettings("moderation")}>Save Moderation Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server">
          <Card>
            <CardHeader>
              <CardTitle>Server Settings</CardTitle>
              <CardDescription>Configure server and connection parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="max-connections">Maximum Concurrent Connections</Label>
                <Input
                  id="max-connections"
                  type="number"
                  min="100"
                  max="10000"
                  value={maxConnections}
                  onChange={(e) => setMaxConnections(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="connection-timeout">Connection Timeout (seconds)</Label>
                <p className="text-sm text-muted-foreground">How long to wait for a connection before timing out</p>
                <Input
                  id="connection-timeout"
                  type="number"
                  min="10"
                  max="120"
                  value={connectionTimeout}
                  onChange={(e) => setConnectionTimeout(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="turn-server">TURN Server URL</Label>
                <Input id="turn-server" value={turnServerUrl} onChange={(e) => setTurnServerUrl(e.target.value)} />
              </div>

              <Button onClick={() => saveSettings("server")}>Save Server Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

