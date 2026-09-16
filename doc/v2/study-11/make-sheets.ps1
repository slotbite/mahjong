# Script para generar hojas de contacto PNG
# Genera dos hojas por tema: raw (128px) y pixel (pixelada 64x64 en 256x256)

Add-Type -AssemblyName System.Drawing

$BASE_PATH = "C:\Users\varga\orca\workspaces\mahjong\cowfish\assets\raw\study-11\noto"
$OUTPUT_PATH = "C:\Users\varga\orca\workspaces\mahjong\cowfish\doc\v2\study-11"

function Pixelate([System.Drawing.Bitmap] $src) {
    # Escala a 64x64, luego a 256x256 con nearest neighbor
    $temp64 = New-Object System.Drawing.Bitmap(64, 64)
    $g64 = [System.Drawing.Graphics]::FromImage($temp64)
    $g64.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g64.DrawImage($src, 0, 0, 64, 64)
    $g64.Dispose()

    $result = New-Object System.Drawing.Bitmap(256, 256)
    $g256 = [System.Drawing.Graphics]::FromImage($result)
    $g256.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g256.DrawImage($temp64, 0, 0, 256, 256)
    $g256.Dispose()
    $temp64.Dispose()

    return $result
}

function MakeRawSheet($theme, $imagePaths) {
    Write-Host "  ${theme}-raw.png..." -NoNewline

    $cols = 6
    $thumbSize = 128
    $spacing = 12
    $rows = [Math]::Ceiling($imagePaths.Count / $cols)
    $width = $cols * ($thumbSize + $spacing) + 20
    $height = $rows * ($thumbSize + 28) + 20

    $sheet = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($sheet)

    # Fondo
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(31, 77, 58))
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # Imágenes
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(89, 148, 124), 1)
    $font = New-Object System.Drawing.Font("Courier New", 8)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(184, 217, 106))

    $idx = 0
    foreach ($imgPath in $imagePaths) {
        $col = $idx % $cols
        $row = [Math]::Floor($idx / $cols)
        $x = 10 + $col * ($thumbSize + $spacing)
        $y = 10 + $row * ($thumbSize + 28)

        try {
            $img = [System.Drawing.Image]::FromFile($imgPath)
            $g.DrawImage($img, $x + 2, $y + 2, $thumbSize - 4, $thumbSize - 4)
            $g.DrawRectangle($pen, $x, $y, $thumbSize, $thumbSize)

            $name = [System.IO.Path]::GetFileNameWithoutExtension($imgPath)
            $name = $name.Substring(0, [Math]::Min(10, $name.Length))
            $format = New-Object System.Drawing.StringFormat
            $format.Alignment = [System.Drawing.StringAlignment]::Center
            $g.DrawString($name, $font, $textBrush, ($x + $thumbSize/2), ($y + $thumbSize + 8), $format)

            $img.Dispose()
        } catch {
            Write-Host "F" -NoNewline
        }
        $idx++
    }

    $g.Dispose()
    $outputPath = "$OUTPUT_PATH\${theme}-raw.png"
    $sheet.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sheet.Dispose()

    $size = (Get-Item $outputPath).Length / 1024
    Write-Host " OK (${size:F0}KB)"
}

function MakePixelSheet($theme, $imagePaths) {
    Write-Host "  ${theme}-pixel.png..." -NoNewline

    $cols = 6
    $frameSize = 268
    $rows = [Math]::Ceiling($imagePaths.Count / $cols)
    $width = $cols * $frameSize + 20
    $height = $rows * $frameSize + 20

    $sheet = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($sheet)

    # Fondo
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(31, 77, 58))
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(89, 148, 124), 1)
    $font = New-Object System.Drawing.Font("Courier New", 8)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(184, 217, 106))

    $idx = 0
    foreach ($imgPath in $imagePaths) {
        $col = $idx % $cols
        $row = [Math]::Floor($idx / $cols)
        $x = 10 + $col * $frameSize
        $y = 10 + $row * $frameSize

        try {
            $img = [System.Drawing.Image]::FromFile($imgPath)
            $pixelated = Pixelate([System.Drawing.Bitmap]$img)

            # Frame
            $frameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 31, 77, 58))
            $g.FillRectangle($frameBrush, $x + 4, $y + 4, 256, 256)
            $g.DrawRectangle($pen, $x + 4, $y + 4, 256, 256)

            $g.DrawImage($pixelated, $x + 4, $y + 4, 256, 256)

            $name = [System.IO.Path]::GetFileNameWithoutExtension($imgPath)
            $name = $name.Substring(0, [Math]::Min(10, $name.Length))
            $format = New-Object System.Drawing.StringFormat
            $format.Alignment = [System.Drawing.StringAlignment]::Center
            $g.DrawString($name, $font, $textBrush, ($x + 132), ($y + 276), $format)

            $pixelated.Dispose()
            $img.Dispose()
        } catch {
            Write-Host "F" -NoNewline
        }
        $idx++
    }

    $g.Dispose()
    $outputPath = "$OUTPUT_PATH\${theme}-pixel.png"
    $sheet.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sheet.Dispose()

    $size = (Get-Item $outputPath).Length / 1024
    Write-Host " OK (${size:F0}KB)"
}

# Main
Write-Host "Generando hojas de contacto...`n"

$themes = Get-ChildItem $BASE_PATH -Directory | ForEach-Object { $_.Name }

foreach ($theme in $themes | Sort-Object) {
    Write-Host "$theme`:"

    $imagePaths = @(Get-ChildItem "$BASE_PATH\$theme\*.png" | ForEach-Object { $_.FullName } | Select-Object -First 24)

    if ($imagePaths.Count -eq 0) {
        Write-Host "  (sin imagenes)"
        continue
    }

    MakeRawSheet $theme $imagePaths
    MakePixelSheet $theme $imagePaths
}

Write-Host "`nOK: Hojas generadas en $OUTPUT_PATH"
