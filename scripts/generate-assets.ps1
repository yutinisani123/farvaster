Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $root "public"

function New-Brush([string]$hex) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen([string]$hex, [float]$width = 1) {
  return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $width
}

function Save-Png($bitmap, [string]$path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Draw-Card($graphics, $x, $y, $w, $h) {
  $background = New-Brush "#0E1A2D"
  $border = New-Pen "#253A59" 2
  $graphics.FillRectangle($background, $x, $y, $w, $h)
  $graphics.DrawRectangle($border, $x, $y, $w, $h)
  $background.Dispose()
  $border.Dispose()
}

function Initialize-Graphics($bitmap) {
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  return $graphics
}

function Fill-Background($graphics, $width, $height) {
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $width, $height)),
    ([System.Drawing.ColorTranslator]::FromHtml("#06101D")),
    ([System.Drawing.ColorTranslator]::FromHtml("#10233C")),
    45
  )
  $graphics.FillRectangle($bg, 0, 0, $width, $height)
  $bg.Dispose()

  $circleA = New-Brush "#163F87"
  $circleB = New-Brush "#0F766E"
  $graphics.FillEllipse($circleA, -120, -80, 420, 420)
  $graphics.FillEllipse($circleB, $width - 320, $height - 280, 420, 420)
  $circleA.Dispose()
  $circleB.Dispose()
}

function New-Icon() {
  $bitmap = New-Object System.Drawing.Bitmap 1024, 1024
  $graphics = Initialize-Graphics $bitmap
  Fill-Background $graphics 1024 1024

  $panelBrush = New-Brush "#7DD3FC"
  $ringBrush = New-Brush "#14B8A6"
  $innerBrush = New-Brush "#08101D"
  $graphics.FillRectangle($panelBrush, 120, 120, 784, 784)
  $graphics.FillEllipse($ringBrush, 500, 500, 220, 220)
  $graphics.FillRectangle($innerBrush, 300, 260, 410, 92)
  $graphics.FillRectangle($innerBrush, 438, 260, 92, 360)
  $graphics.FillEllipse($innerBrush, 548, 548, 124, 124)
  $panelBrush.Dispose()
  $ringBrush.Dispose()
  $innerBrush.Dispose()
  $graphics.Dispose()
  Save-Png $bitmap (Join-Path $publicDir "icon.png")
}

function New-Splash() {
  $bitmap = New-Object System.Drawing.Bitmap 200, 200
  $graphics = Initialize-Graphics $bitmap
  Fill-Background $graphics 200 200

  $panel = New-Brush "#0B1627"
  $accent = New-Brush "#7DD3FC"
  $muted = New-Brush "#16324E"
  $graphics.FillRectangle($panel, 28, 28, 144, 144)
  $graphics.FillRectangle($accent, 54, 52, 92, 16)
  $graphics.FillRectangle($accent, 91, 52, 16, 76)
  $graphics.FillRectangle($muted, 54, 136, 80, 10)
  $graphics.FillRectangle($muted, 54, 152, 64, 10)
  $panel.Dispose()
  $accent.Dispose()
  $muted.Dispose()
  $graphics.Dispose()
  Save-Png $bitmap (Join-Path $publicDir "splash.png")
}

function New-Hero() {
  $bitmap = New-Object System.Drawing.Bitmap 1200, 630
  $graphics = Initialize-Graphics $bitmap
  Fill-Background $graphics 1200 630

  $titleFont = New-Object System.Drawing.Font "Segoe UI", 38, ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font "Segoe UI", 17
  $titleBrush = New-Brush "#F4F8FF"
  $bodyBrush = New-Brush "#B0C2E8"
  $accent = New-Brush "#7DD3FC"
  $buttonText = New-Brush "#04101B"

  $graphics.DrawString("Farcaster Login Tool", $titleFont, $titleBrush, 86, 122)
  $graphics.DrawString("Quick Auth mini app with protected backend actions.", $bodyFont, $bodyBrush, 90, 190)
  $graphics.FillRectangle($accent, 90, 262, 248, 66)
  $graphics.DrawString("Open Mini App", $bodyFont, $buttonText, 136, 284)

  Draw-Card $graphics 760 120 280 280
  $cardTitleFont = New-Object System.Drawing.Font "Segoe UI", 15, ([System.Drawing.FontStyle]::Bold)
  $cardBodyFont = New-Object System.Drawing.Font "Segoe UI", 14
  $graphics.DrawString("Verified session", $cardTitleFont, $bodyBrush, 790, 156)
  $graphics.DrawString("fid 1111048", (New-Object System.Drawing.Font "Segoe UI", 27, ([System.Drawing.FontStyle]::Bold)), $titleBrush, 790, 206)
  $graphics.DrawString("Bearer token attached", $cardBodyFont, $accent, 790, 266)
  $graphics.FillRectangle((New-Brush "#16324E"), 790, 316, 180, 18)
  $graphics.FillRectangle((New-Brush "#16324E"), 790, 352, 140, 18)

  $titleFont.Dispose()
  $bodyFont.Dispose()
  $cardTitleFont.Dispose()
  $cardBodyFont.Dispose()
  $titleBrush.Dispose()
  $bodyBrush.Dispose()
  $accent.Dispose()
  $buttonText.Dispose()
  $graphics.Dispose()
  Save-Png $bitmap (Join-Path $publicDir "hero.png")
}

function New-Screenshot() {
  $bitmap = New-Object System.Drawing.Bitmap 1284, 2778
  $graphics = Initialize-Graphics $bitmap
  Fill-Background $graphics 1284 2778

  $panel = New-Brush "#0B1627"
  $border = New-Pen "#253A59" 3
  $titleFont = New-Object System.Drawing.Font "Segoe UI", 58, ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font "Segoe UI", 26
  $smallFont = New-Object System.Drawing.Font "Segoe UI", 20
  $titleBrush = New-Brush "#F4F8FF"
  $bodyBrush = New-Brush "#A8BBDD"
  $accent = New-Brush "#7DD3FC"
  $pillBrush = New-Brush "#11263D"
  $mutedBrush = New-Brush "#16324E"

  $graphics.FillRectangle($panel, 78, 86, 1128, 2580)
  $graphics.DrawRectangle($border, 78, 86, 1128, 2580)
  $graphics.DrawString("Farcaster Mini App", $smallFont, $bodyBrush, 136, 166)
  $graphics.DrawString("Login native untuk", $titleFont, $titleBrush, 132, 286)
  $graphics.DrawString("Farcaster Mini App.", $titleFont, $titleBrush, 132, 366)
  $graphics.DrawString("Quick Auth login and protected backend action demo.", $bodyFont, $bodyBrush, 136, 474)

  Draw-Card $graphics 132 620 470 520
  Draw-Card $graphics 678 620 392 520
  $graphics.DrawString("Session", $bodyFont, $titleBrush, 168, 668)
  $graphics.DrawString("Authenticated user", $bodyFont, $titleBrush, 714, 668)
  $graphics.FillRectangle($pillBrush, 168, 748, 210, 54)
  $graphics.DrawString("JWT ready", $smallFont, $accent, 206, 764)
  $graphics.FillRectangle($mutedBrush, 168, 848, 332, 22)
  $graphics.FillRectangle($mutedBrush, 168, 894, 286, 22)
  $graphics.FillRectangle($mutedBrush, 168, 940, 248, 22)
  $graphics.DrawString("fid 1111048", $smallFont, $titleBrush, 714, 756)
  $graphics.DrawString("status: authenticated", $smallFont, $bodyBrush, 714, 804)

  Draw-Card $graphics 132 1208 938 316
  $graphics.DrawString("Protected action demo", $bodyFont, $titleBrush, 168, 1256)
  $graphics.DrawString("Server verifies bearer token before responding.", $smallFont, $bodyBrush, 168, 1312)
  $graphics.FillRectangle($accent, 168, 1386, 314, 70)
  $graphics.DrawString("Run Protected Action", $smallFont, (New-Brush "#04101B"), 218, 1408)

  $titleFont.Dispose()
  $bodyFont.Dispose()
  $smallFont.Dispose()
  $titleBrush.Dispose()
  $bodyBrush.Dispose()
  $accent.Dispose()
  $pillBrush.Dispose()
  $mutedBrush.Dispose()
  $panel.Dispose()
  $border.Dispose()
  $graphics.Dispose()
  Save-Png $bitmap (Join-Path $publicDir "screenshot-1.png")
}

New-Icon
New-Splash
New-Hero
New-Screenshot
