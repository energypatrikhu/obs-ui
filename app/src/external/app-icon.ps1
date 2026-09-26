$ErrorActionPreference = "Stop"

$AppId = $env:BUN_APP_ID
$Size = 64

if ($env:BUN_ICON_SIZE) {
    $parsedSize = 0

    if ([int]::TryParse($env:BUN_ICON_SIZE, [ref]$parsedSize)) {
        if ($parsedSize -gt 0) {
            $Size = [Math]::Min($parsedSize, 512)
        }
    }
}

if ([string]::IsNullOrWhiteSpace($AppId)) {
    throw "BUN_APP_ID is missing"
}

Add-Type -AssemblyName System.Drawing

function Convert-ImageToDataUrl {
    param(
        [Parameter(Mandatory = $true)]
        [System.Drawing.Image]$Image,

        [Parameter(Mandatory = $true)]
        [int]$Size
    )

    $bitmap = $null
    $graphics = $null
    $stream = $null

    try {
        $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)

        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

        try {
            $graphics.Clear(
                [System.Drawing.Color]::Transparent
            )

            $graphics.InterpolationMode =
                [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

            $graphics.PixelOffsetMode =
                [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

            $graphics.SmoothingMode =
                [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

            $graphics.CompositingQuality =
                [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

            $graphics.DrawImage(
                $Image,
                0,
                0,
                $Size,
                $Size
            )
        }
        finally {
            $graphics.Dispose()
        }

        $stream = New-Object System.IO.MemoryStream

        $bitmap.Save(
            $stream,
            [System.Drawing.Imaging.ImageFormat]::Png
        )

        return "data:image/png;base64,$(
            [Convert]::ToBase64String($stream.ToArray())
        )"
    }
    finally {
        if ($graphics) {
            $graphics.Dispose()
        }

        if ($stream) {
            $stream.Dispose()
        }

        if ($bitmap) {
            $bitmap.Dispose()
        }
    }
}

function Convert-IconFileToDataUrl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $false)]
        [int]$Size = 64
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }

    $Path = [Environment]::ExpandEnvironmentVariables(
        $Path.Trim('"')
    )

    if (-not [System.IO.File]::Exists($Path)) {
        return $null
    }

    $icon = $null
    $bitmap = $null
    $image = $null

    try {
        $extension = [System.IO.Path]::GetExtension(
            $Path
        ).ToLowerInvariant()

        if ($extension -eq ".ico") {
            $image = [System.Drawing.Image]::FromFile($Path)

            return Convert-ImageToDataUrl `
                -Image $image `
                -Size $Size
        }

        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($Path)

        if (-not $icon) {
            return $null
        }

        $bitmap = $icon.ToBitmap()

        return Convert-ImageToDataUrl `
            -Image $bitmap `
            -Size $Size
    }
    finally {
        if ($image) {
            $image.Dispose()
        }

        if ($bitmap) {
            $bitmap.Dispose()
        }

        if ($icon) {
            $icon.Dispose()
        }
    }
}

function Get-RunningProcessIcon {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ExecutableName,

        [Parameter(Mandatory = $false)]
        [int]$Size = 64
    )

    $name = [System.IO.Path]::GetFileNameWithoutExtension(
        $ExecutableName
    )

    try {
        $processes = Get-Process `
            -Name $name `
            -ErrorAction SilentlyContinue

        foreach ($process in $processes) {
            try {
                $path = $process.MainModule.FileName

                if (
                    $path -and
                    [System.IO.File]::Exists($path)
                ) {
                    $result = Convert-IconFileToDataUrl `
                        -Path $path `
                        -Size $Size

                    if ($result) {
                        return $result
                    }
                }
            }
            catch {
                continue
            }
        }
    }
    catch {
    }

    return $null
}

function Get-ShellAppIcon {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Aumid,

        [Parameter(Mandatory = $false)]
        [int]$Size = 64
    )

    $shell = $null
    $appsFolder = $null

    try {
        $shell = New-Object -ComObject Shell.Application
        $appsFolder = $shell.Namespace("shell:AppsFolder")

        if (-not $appsFolder) {
            return $null
        }

        $app = $null

        #
        # Try direct lookup.
        #
        try {
            $app = $appsFolder.ParseName($Aumid)
        }
        catch {
            $app = $null
        }

        #
        # Fall back to enumeration.
        #
        if (-not $app) {
            foreach ($candidate in $appsFolder.Items()) {
                try {
                    $path = [string]$candidate.Path

                    if (
                        [string]::Equals(
                            $path,
                            $Aumid,
                            [System.StringComparison]::OrdinalIgnoreCase
                        )
                    ) {
                        $app = $candidate
                        break
                    }

                    $candidateAppId = [string]$candidate.ExtendedProperty(
                        "System.AppUserModel.ID"
                    )

                    if (
                        $candidateAppId -and
                        [string]::Equals(
                            $candidateAppId,
                            $Aumid,
                            [System.StringComparison]::OrdinalIgnoreCase
                        )
                    ) {
                        $app = $candidate
                        break
                    }
                }
                catch {
                }
            }
        }

        if (-not $app) {
            return $null
        }

        #
        # Try Shell's icon path.
        #
        try {
            $iconPath = [string]$app.ExtendedProperty(
                "System.Link.TargetIconPath"
            )

            if ($iconPath) {
                $comma = $iconPath.LastIndexOf(",")

                if ($comma -gt 0) {
                    $iconPath = $iconPath.Substring(
                        0,
                        $comma
                    )
                }

                $result = Convert-IconFileToDataUrl `
                    -Path $iconPath `
                    -Size $Size

                if ($result) {
                    return $result
                }
            }
        }
        catch {
        }

        #
        # Try target executable.
        #
        try {
            $targetPath = [string]$app.ExtendedProperty(
                "System.Link.TargetParsingPath"
            )

            if ($targetPath) {
                $result = Convert-IconFileToDataUrl `
                    -Path $targetPath `
                    -Size $Size

                if ($result) {
                    return $result
                }
            }
        }
        catch {
        }
    }
    catch {
    }
    finally {
        if ($appsFolder) {
            try {
                [void][Runtime.InteropServices.Marshal]::ReleaseComObject(
                    $appsFolder
                )
            }
            catch {
            }
        }

        if ($shell) {
            try {
                [void][Runtime.InteropServices.Marshal]::ReleaseComObject(
                    $shell
                )
            }
            catch {
            }
        }
    }

    return $null
}

#
# Resolve the icon.
#

$result = $null

#
# Spotify.exe / chrome.exe / msedge.exe / etc.
#
if ($AppId -match "(?i)^[^\\/]+\.exe$") {
    $result = Get-RunningProcessIcon `
        -ExecutableName $AppId `
        -Size $Size

    if ($result) {
        [Console]::Out.Write($result)
        exit 0
    }
}

#
# Actual AUMID / AppsFolder lookup.
#
$result = Get-ShellAppIcon `
    -Aumid $AppId `
    -Size $Size

if ($result) {
    [Console]::Out.Write($result)
    exit 0
}

exit 1
