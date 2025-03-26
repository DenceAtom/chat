"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function GenerateFiltersPage() {
  const [generated, setGenerated] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const generateFilterImages = async () => {
    setDownloading(true)

    const filters = [
      { name: "dog", color: "#8B4513", draw: drawDog },
      { name: "cat", color: "#FFA500", draw: drawCat },
      { name: "bunny", color: "#FFB6C1", draw: drawBunny },
      { name: "glasses", color: "#000000", draw: drawGlasses },
      { name: "hat", color: "#00008B", draw: drawHat },
      { name: "crown", color: "#FFD700", draw: drawCrown },
      { name: "mustache", color: "#000000", draw: drawMustache },
      { name: "alien", color: "#00FF00", draw: drawAlien },
      { name: "zombie", color: "#6B8E23", draw: drawZombie },
      { name: "heart", color: "#FF0000", draw: drawHeart },
      { name: "fire", color: "#FF4500", draw: drawFire },
    ]

    for (const filter of filters) {
      // Create a canvas element
      const canvas = document.createElement("canvas")
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext("2d")

      if (ctx) {
        // Set transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw the filter
        filter.draw(ctx, filter.color)

        // Create a link to download the image
        const link = document.createElement("a")
        link.download = `${filter.name}.png`
        link.href = canvas.toDataURL("image/png")

        // Append to document, click to download, then remove
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Add a small delay between downloads to prevent browser issues
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    setDownloading(false)
    setGenerated(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-8">Filter Image Generator</h1>

      <Button onClick={generateFilterImages} disabled={downloading} className="mb-4">
        {downloading ? "Generating and Downloading..." : "Generate and Download Filter Images"}
      </Button>

      {generated && (
        <div className="mt-8 p-4 bg-green-100 rounded-md max-w-md">
          <h2 className="text-xl font-semibold mb-2">Images Generated!</h2>
          <p>
            All filter images have been downloaded to your downloads folder. Please move them to the{" "}
            <code>/public/filters/</code> directory in your project.
          </p>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded-md max-w-md">
        <h2 className="text-xl font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Click the button above to generate and download all filter images.</li>
          <li>
            Move the downloaded PNG files to the <code>/public/filters/</code> directory in your project.
          </li>
          <li>Make sure the files have the correct names (dog.png, cat.png, etc.).</li>
        </ol>
      </div>
    </div>
  )
}

// Drawing functions for each filter
function drawDog(ctx: CanvasRenderingContext2D, color: string) {
  // Dog ears
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(100, 100, 60, 80, 0, 0, Math.PI * 2)
  ctx.ellipse(300, 100, 60, 80, 0, 0, Math.PI * 2)
  ctx.fill()

  // Dog nose
  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.ellipse(200, 250, 30, 20, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawCat(ctx: CanvasRenderingContext2D, color: string) {
  // Cat ears
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(120, 120)
  ctx.lineTo(180, 20)
  ctx.lineTo(240, 120)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(160, 120)
  ctx.lineTo(220, 20)
  ctx.lineTo(280, 120)
  ctx.fill()

  // Whiskers
  ctx.strokeStyle = "#000000"
  ctx.lineWidth = 2

  // Left whiskers
  ctx.beginPath()
  ctx.moveTo(150, 200)
  ctx.lineTo(50, 180)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(150, 210)
  ctx.lineTo(50, 210)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(150, 220)
  ctx.lineTo(50, 240)
  ctx.stroke()

  // Right whiskers
  ctx.beginPath()
  ctx.moveTo(250, 200)
  ctx.lineTo(350, 180)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(250, 210)
  ctx.lineTo(350, 210)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(250, 220)
  ctx.lineTo(350, 240)
  ctx.stroke()
}

function drawBunny(ctx: CanvasRenderingContext2D, color: string) {
  // Bunny ears
  ctx.fillStyle = color

  // Left ear
  ctx.beginPath()
  ctx.ellipse(150, 80, 30, 100, -Math.PI / 8, 0, Math.PI * 2)
  ctx.fill()

  // Right ear
  ctx.beginPath()
  ctx.ellipse(250, 80, 30, 100, Math.PI / 8, 0, Math.PI * 2)
  ctx.fill()

  // Bunny nose
  ctx.fillStyle = "#FF9999"
  ctx.beginPath()
  ctx.ellipse(200, 220, 15, 10, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawGlasses(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 8

  // Left lens
  ctx.beginPath()
  ctx.ellipse(130, 200, 70, 60, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Right lens
  ctx.beginPath()
  ctx.ellipse(270, 200, 70, 60, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Bridge
  ctx.beginPath()
  ctx.moveTo(200, 200)
  ctx.lineTo(200, 200)
  ctx.stroke()

  // Temple arms
  ctx.beginPath()
  ctx.moveTo(60, 200)
  ctx.lineTo(130, 200)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(270, 200)
  ctx.lineTo(340, 200)
  ctx.stroke()
}

function drawHat(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color

  // Hat brim
  ctx.beginPath()
  ctx.ellipse(200, 150, 120, 30, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hat top
  ctx.beginPath()
  ctx.ellipse(200, 100, 60, 20, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.rect(140, 100, 120, 50)
  ctx.fill()
}

function drawCrown(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color

  // Crown base
  ctx.beginPath()
  ctx.rect(100, 150, 200, 50)
  ctx.fill()

  // Crown points
  ctx.beginPath()
  ctx.moveTo(100, 150)
  ctx.lineTo(120, 100)
  ctx.lineTo(140, 150)
  ctx.lineTo(160, 100)
  ctx.lineTo(180, 150)
  ctx.lineTo(200, 100)
  ctx.lineTo(220, 150)
  ctx.lineTo(240, 100)
  ctx.lineTo(260, 150)
  ctx.lineTo(280, 100)
  ctx.lineTo(300, 150)
  ctx.fill()

  // Crown jewels
  ctx.fillStyle = "#FF0000"
  ctx.beginPath()
  ctx.arc(120, 120, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#00FF00"
  ctx.beginPath()
  ctx.arc(160, 120, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#0000FF"
  ctx.beginPath()
  ctx.arc(200, 120, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#FF00FF"
  ctx.beginPath()
  ctx.arc(240, 120, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#FFFF00"
  ctx.beginPath()
  ctx.arc(280, 120, 10, 0, Math.PI * 2)
  ctx.fill()
}

function drawMustache(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color

  // Mustache
  ctx.beginPath()
  ctx.moveTo(120, 220)
  ctx.bezierCurveTo(160, 180, 240, 180, 280, 220)
  ctx.bezierCurveTo(240, 240, 160, 240, 120, 220)
  ctx.fill()
}

function drawAlien(ctx: CanvasRenderingContext2D, color: string) {
  // Alien head
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(200, 200, 80, 120, 0, 0, Math.PI * 2)
  ctx.fill()

  // Alien eyes
  ctx.fillStyle = "#000000"
  ctx.beginPath()
  ctx.ellipse(170, 180, 25, 15, Math.PI / 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(230, 180, 25, 15, -Math.PI / 4, 0, Math.PI * 2)
  ctx.fill()

  // Alien antennae
  ctx.strokeStyle = color
  ctx.lineWidth = 5

  ctx.beginPath()
  ctx.moveTo(180, 100)
  ctx.lineTo(180, 50)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(220, 100)
  ctx.lineTo(220, 50)
  ctx.stroke()

  // Antenna balls
  ctx.fillStyle = "#FFFFFF"
  ctx.beginPath()
  ctx.arc(180, 50, 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(220, 50, 10, 0, Math.PI * 2)
  ctx.fill()
}

function drawZombie(ctx: CanvasRenderingContext2D, color: string) {
  // Zombie skin patches
  ctx.fillStyle = color

  // Forehead patch
  ctx.beginPath()
  ctx.ellipse(200, 100, 60, 30, 0, 0, Math.PI * 2)
  ctx.fill()

  // Cheek patches
  ctx.beginPath()
  ctx.ellipse(130, 200, 40, 30, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(270, 200, 40, 30, 0, 0, Math.PI * 2)
  ctx.fill()

  // Stitches
  ctx.strokeStyle = "#000000"
  ctx.lineWidth = 3

  // Forehead stitches
  for (let i = 160; i < 240; i += 10) {
    ctx.beginPath()
    ctx.moveTo(i, 100)
    ctx.lineTo(i + 5, 100)
    ctx.stroke()
  }

  // Cheek stitches
  for (let i = 100; i < 160; i += 10) {
    ctx.beginPath()
    ctx.moveTo(i, 200)
    ctx.lineTo(i + 5, 200)
    ctx.stroke()
  }

  for (let i = 240; i < 300; i += 10) {
    ctx.beginPath()
    ctx.moveTo(i, 200)
    ctx.lineTo(i + 5, 200)
    ctx.stroke()
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color

  // Heart shape
  ctx.beginPath()
  ctx.moveTo(200, 300)
  ctx.bezierCurveTo(100, 200, 100, 100, 200, 150)
  ctx.bezierCurveTo(300, 100, 300, 200, 200, 300)
  ctx.fill()
}

function drawFire(ctx: CanvasRenderingContext2D, color: string) {
  // Fire gradient
  const gradient = ctx.createRadialGradient(200, 200, 10, 200, 200, 100)
  gradient.addColorStop(0, "#FFFF00")
  gradient.addColorStop(0.5, "#FFA500")
  gradient.addColorStop(1, color)

  // Fire shape
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(200, 100)
  ctx.bezierCurveTo(250, 150, 300, 120, 280, 200)
  ctx.bezierCurveTo(320, 250, 250, 300, 200, 280)
  ctx.bezierCurveTo(150, 300, 80, 250, 120, 200)
  ctx.bezierCurveTo(100, 120, 150, 150, 200, 100)
  ctx.fill()
}

