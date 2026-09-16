# Descarga emojis Fluent para study-11

$BASE = "$PSScriptRoot\..\assets\raw\study-11"
$FLUENT_BASE = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets"

# Tema y emojis
$TEMAS = @{
    "plantas_interior" = @(
        "plant-pot-28286",
        "leaf-28349",
        "herb-1f33f",
        "frog-1f438",
        "seedling-1f331",
        "flower-1f337",
        "bouquet-1f490"
    )
    "selva_tropical" = @(
        "frog-1f438",
        "parrot-1f99c",
        "butterfly-1f98b",
        "leaf-28349",
        "flower-1f337",
        "tropical-fish-1f420",
        "snake-1f40d",
        "toucan-1f9a4"
    )
    "cozy" = @(
        "mug-with-hot-beverage-2615",
        "candle-1f56f",
        "book-1f4d5",
        "cat-face-1f431",
        "couch-1f6cb",
        "blanket-1f6f3",
        "lamp-1f4a1",
        "teacup-without-handle-2690"
    )
    "cafe_te" = @(
        "mug-with-hot-beverage-2615",
        "teacup-without-handle-2690",
        "cup-with-straw-1f9cb",
        "water-wave-1f30a",
        "spoon-1f944",
        "cup-1f375"
    )
    "cielo_nocturno" = @(
        "crescent-moon-1f319",
        "full-moon-1f315",
        "star-2b50",
        "sparkles-2728",
        "telescope-1f52d",
        "saturn-1fa90",
        "globe-showing-americas-1f30e",
        "cloud-1f32b"
    )
    "acuario" = @(
        "tropical-fish-1f420",
        "fish-1f41f",
        "blowfish-1f421",
        "coral-1fab8",
        "water-wave-1f30a",
        "bubble-1f4ab",
        "squid-1f991",
        "shrimp-1f99e"
    )
    "pasatiempos_geek" = @(
        "video-game-controller-1f3ae",
        "dices-1f3b2",
        "compact-disc-1f4bf",
        "computer-1f4bb",
        "keyboard-2328",
        "robot-1f920",
        "space-invader-1f47e",
        "game-die-1f3af"
    )
}

Write-Host "Descargando emojis Fluent (MIT)...`n"

foreach ($tema in $TEMAS.Keys) {
    Write-Host "  Tema: $tema"
    $tema_dir = "$BASE\fluent\$tema"

    if (-not (Test-Path $tema_dir)) {
        New-Item -ItemType Directory -Force -Path $tema_dir | Out-Null
    }

    $manifest = @{
        license = "MIT"
        source = "microsoft/fluentui-emoji"
        attribution = $false
        files = @{}
    }

    foreach ($emoji_id in $TEMAS[$tema]) {
        $url = "$FLUENT_BASE/$emoji_id/default/Color/SVG/$emoji_id.svg"
        $filepath = "$tema_dir\$emoji_id.svg"

        try {
            Invoke-WebRequest -Uri $url -OutFile $filepath -TimeoutSec 10 -ErrorAction Stop | Out-Null
            $manifest.files[$emoji_id + ".svg"] = @{
                name = $emoji_id
                url = $url
                downloaded = Get-Date -Format O
            }
            Write-Host -NoNewline "."
        } catch {
            Write-Host -NoNewline "F"
        }
    }

    $manifest_path = "$tema_dir\manifest.json"
    $manifest | ConvertTo-Json | Set-Content -Path $manifest_path -Encoding UTF8
    Write-Host " OK`n"
}

Write-Host "OK: Descargas completadas."
Write-Host "Ubicacion: $BASE"
