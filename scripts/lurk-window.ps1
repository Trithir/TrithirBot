param(
  [Parameter(Mandatory = $true)]
  [string]$StateFilePath,

  [Parameter(Mandatory = $true)]
  [string]$AudioQueueDirectory
)

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName WindowsBase
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class LurkWindowNative {
  public const int GWL_EXSTYLE = -20;
  public const int WS_EX_NOACTIVATE = 0x8000000;

  [DllImport("user32.dll", SetLastError = true)]
  public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
}
'@

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="TrithirBot Lurk Window"
        Topmost="False"
        WindowStyle="None"
        ResizeMode="NoResize"
        Background="#FF00FF00"
        ShowInTaskbar="True">
  <Canvas x:Name="SceneCanvas"
          Background="#FF00FF00"
          SnapsToDevicePixels="True"
          IsHitTestVisible="False"/>
</Window>
'@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)
$sceneCanvas = $window.FindName('SceneCanvas')
$mediaPlayer = New-Object System.Windows.Media.MediaPlayer

$window.Width = [double][System.Windows.SystemParameters]::PrimaryScreenWidth
$window.Height = [double][System.Windows.SystemParameters]::PrimaryScreenHeight
$window.Left = 0
$window.Top = 0
$window.IsHitTestVisible = $false
$window.Focusable = $false
$window.ShowActivated = $false

$script:screenWidth = [double]$window.Width
$script:screenHeight = [double]$window.Height
$script:entitySize = 360.0
$script:normalPeek = 228.0
$script:extendedPeek = 292.0
$script:offsetMargin = 84.0
$script:labelWidth = 168.0
$script:labelHeight = 24.0
$script:lurkerEntities = @{}
$script:pendingStateSync = $true
$script:currentAudioPath = $null
$script:lastFrameAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$script:logPath = Join-Path (Split-Path -Parent $StateFilePath) 'lurk-window.log'
$script:lastKnownStateExists = $false
$script:lastKnownStateWriteTicks = 0L
$script:lastKnownStateLength = -1L

$window.add_SourceInitialized({
  $helper = New-Object System.Windows.Interop.WindowInteropHelper $window
  $extendedStyle = [LurkWindowNative]::GetWindowLong($helper.Handle, [LurkWindowNative]::GWL_EXSTYLE)
  $extendedStyle = $extendedStyle -bor [LurkWindowNative]::WS_EX_NOACTIVATE
  [LurkWindowNative]::SetWindowLong($helper.Handle, [LurkWindowNative]::GWL_EXSTYLE, $extendedStyle) | Out-Null
  Write-Log "Window source initialized: width=$($window.Width) height=$($window.Height) left=$($window.Left) top=$($window.Top)"
})

$window.Dispatcher.add_UnhandledException({
  param($sender, $args)

  Write-Log "Dispatcher exception: $($args.Exception.Message)"
  Write-Log "$($args.Exception | Out-String)"
  $args.Handled = $true
})

function Get-NowMilliseconds {
  return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}

function Write-Log {
  param(
    [string]$Message
  )

  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff'
  Add-Content -LiteralPath $script:logPath -Value "[$timestamp] $Message"
}

function Get-ColorFromHex {
  param(
    [string]$HexColor,
    [string]$FallbackHex
  )

  try {
    $colorText = if ($HexColor) { $HexColor } else { $FallbackHex }
    $color = [System.Windows.Media.ColorConverter]::ConvertFromString($colorText)
    return [System.Windows.Media.Color]$color
  } catch {
    return [System.Windows.Media.Color]([System.Windows.Media.ColorConverter]::ConvertFromString($FallbackHex))
  }
}

function New-Brush {
  param(
    [System.Windows.Media.Color]$Color
  )

  return New-Object System.Windows.Media.SolidColorBrush -ArgumentList $Color
}

$debugBadge = New-Object System.Windows.Controls.Border
$debugBadge.Width = 220
$debugBadge.Height = 34
$debugBadge.Background = New-Brush ([System.Windows.Media.Color]::FromArgb(180, 20, 20, 20))
$debugBadge.BorderBrush = New-Brush ([System.Windows.Media.Color]::FromArgb(255, 255, 80, 80))
$debugBadge.BorderThickness = '1'
$debugBadge.CornerRadius = '8'
$debugBadge.IsHitTestVisible = $false

$debugText = New-Object System.Windows.Controls.TextBlock
$debugText.Text = 'Lurk overlay running'
$debugText.Foreground = New-Brush ([System.Windows.Media.Color]::FromRgb(255, 255, 255))
$debugText.FontSize = 14
$debugText.Margin = '10,6,10,6'

$debugBadge.Child = $debugText
[System.Windows.Controls.Canvas]::SetLeft($debugBadge, 20)
[System.Windows.Controls.Canvas]::SetTop($debugBadge, 20)
$sceneCanvas.Children.Add($debugBadge) | Out-Null

function Get-HashNumber {
  param(
    [string]$Value
  )

  $hash = 17
  foreach ($character in $Value.ToCharArray()) {
    $hash = (($hash * 31) + [int][char]$character) % 2147483647
  }

  return [Math]::Abs($hash)
}

function Get-RandomNumber {
  param(
    [double]$Minimum,
    [double]$Maximum
  )

  return $Minimum + ((Get-Random -Minimum 0.0 -Maximum 1.0) * ($Maximum - $Minimum))
}

function Get-RandomEdge {
  $edges = @('left', 'top', 'right', 'bottom')
  return $edges[(Get-Random -Minimum 0 -Maximum $edges.Length)]
}

function Get-AngleForEdge {
  param(
    [string]$Edge
  )

  switch ($Edge) {
    'left' { return 0.0 }
    'top' { return 90.0 }
    'right' { return 180.0 }
    default { return 270.0 }
  }
}

function Get-DriftLimit {
  param(
    [string]$Edge
  )

  if ($Edge -eq 'left' -or $Edge -eq 'right') {
    return $script:screenHeight
  }

  return $script:screenWidth
}

function Get-RandomOffset {
  param(
    [string]$Edge
  )

  $limit = Get-DriftLimit $Edge
  $maxOffset = [Math]::Max($script:offsetMargin, $limit - $script:offsetMargin)
  return [double](Get-RandomNumber -Minimum $script:offsetMargin -Maximum $maxOffset)
}

function Get-RandomVelocity {
  $magnitude = Get-RandomNumber -Minimum 28.0 -Maximum 46.0
  $direction = if ((Get-Random -Minimum 0 -Maximum 2) -eq 0) { 1.0 } else { -1.0 }
  return $magnitude * $direction
}

function Get-NextVelocityChangeAt {
  return (Get-NowMilliseconds) + [long](Get-Random -Minimum 2200 -Maximum 4600)
}

function Get-TargetVelocity {
  $magnitude = Get-RandomNumber -Minimum 20.0 -Maximum 48.0
  $direction = if ((Get-Random -Minimum 0 -Maximum 2) -eq 0) { 1.0 } else { -1.0 }
  return $magnitude * $direction
}

function Get-EdgeSpan {
  param(
    [string]$Edge
  )

  $limit = Get-DriftLimit $Edge
  return [Math]::Max(0.0, $limit - ($script:offsetMargin * 2.0))
}

function Get-PerimeterLength {
  return (Get-EdgeSpan 'top') + (Get-EdgeSpan 'right') + (Get-EdgeSpan 'bottom') + (Get-EdgeSpan 'left')
}

function Get-PerimeterPositionForEdgeOffset {
  param(
    [string]$Edge,
    [double]$Offset
  )

  $minOffset = $script:offsetMargin
  $maxOffset = [Math]::Max($minOffset, (Get-DriftLimit $Edge) - $script:offsetMargin)
  $topSpan = Get-EdgeSpan 'top'
  $rightSpan = Get-EdgeSpan 'right'
  $bottomSpan = Get-EdgeSpan 'bottom'

  switch ($Edge) {
    'top' { return $Offset - $minOffset }
    'right' { return $topSpan + ($Offset - $minOffset) }
    'bottom' { return $topSpan + $rightSpan + ($maxOffset - $Offset) }
    default { return $topSpan + $rightSpan + $bottomSpan + ($maxOffset - $Offset) }
  }
}

function Set-EntityPerimeterPosition {
  param(
    $Entity,
    [double]$PerimeterPosition
  )

  $totalLength = Get-PerimeterLength
  if ($totalLength -le 0.0) {
    $Entity.Edge = 'top'
    $Entity.Offset = $script:offsetMargin
    $Entity.PerimeterPosition = 0.0
    return
  }

  $position = $PerimeterPosition % $totalLength
  if ($position -lt 0.0) {
    $position += $totalLength
  }

  $minOffset = $script:offsetMargin
  $topSpan = Get-EdgeSpan 'top'
  $rightSpan = Get-EdgeSpan 'right'
  $bottomSpan = Get-EdgeSpan 'bottom'
  $leftSpan = Get-EdgeSpan 'left'

  if ($position -lt $topSpan) {
    $Entity.Edge = 'top'
    $Entity.Offset = $minOffset + $position
  } elseif ($position -lt ($topSpan + $rightSpan)) {
    $Entity.Edge = 'right'
    $Entity.Offset = $minOffset + ($position - $topSpan)
  } elseif ($position -lt ($topSpan + $rightSpan + $bottomSpan)) {
    $Entity.Edge = 'bottom'
    $Entity.Offset = $minOffset + ($bottomSpan - ($position - $topSpan - $rightSpan))
  } else {
    $Entity.Edge = 'left'
    $Entity.Offset = $minOffset + ($leftSpan - ($position - $topSpan - $rightSpan - $bottomSpan))
  }

  $Entity.PerimeterPosition = $position
}

function New-LabelBrushes {
  param(
    [string]$ColorHex
  )

  $accentColor = Get-ColorFromHex $ColorHex '#A77A47'
  $darkColor = [System.Windows.Media.Color]::FromArgb(190, 16, 11, 8)
  $lightAccent = [System.Windows.Media.Color]::FromArgb(255, $accentColor.R, $accentColor.G, $accentColor.B)
  $fillAccent = [System.Windows.Media.Color]::FromArgb(230, [Math]::Min(255, $accentColor.R + 18), [Math]::Min(255, $accentColor.G + 18), [Math]::Min(255, $accentColor.B + 18))

  return [pscustomobject]@{
    AccentBrush = New-Brush $lightAccent
    FillBrush = New-Brush $fillAccent
    TextBrush = New-Brush ([System.Windows.Media.Color]::FromRgb(252, 247, 237))
    ShadowBrush = New-Brush ([System.Windows.Media.Color]::FromArgb(185, 34, 17, 6))
  }
}

function New-DrumstickVisual {
  param(
    [string]$DisplayName,
    [string]$ColorHex,
    [string]$Edge
  )

  $brushes = New-LabelBrushes $ColorHex

  $root = New-Object System.Windows.Controls.Canvas
  $root.Width = $script:entitySize
  $root.Height = $script:entitySize
  $root.IsHitTestVisible = $false

  $shapeHost = New-Object System.Windows.Controls.Canvas
  $shapeHost.Width = $script:entitySize
  $shapeHost.Height = $script:entitySize
  $shapeHost.IsHitTestVisible = $false

  # Slender, mostly straight drumstick profile with a gentle taper to the visible tip.
  $stickBody = New-Object System.Windows.Shapes.Path
  $stickBody.Data = [System.Windows.Media.Geometry]::Parse(
    'M 18,160
     C 10,163 10,177 18,180
     L 214,180
     C 248,180 274,177 296,172
     C 308,169 316,168 320,170
     C 316,172 308,171 296,168
     C 274,163 248,160 214,160
     L 18,160
     Z'
  )
  $stickBody.Fill = New-Brush ([System.Windows.Media.Color]::FromArgb(255, 191, 145, 92))
  $stickBody.Stroke = New-Brush ([System.Windows.Media.Color]::FromArgb(145, 122, 84, 48))
  $stickBody.StrokeThickness = 1.25
  $shapeHost.Children.Add($stickBody) | Out-Null

  # Small teardrop-like playing tip.
  $tip = New-Object System.Windows.Shapes.Ellipse
  $tip.Width = 22
  $tip.Height = 16
  $tip.Fill = New-Brush ([System.Windows.Media.Color]::FromArgb(255, 236, 214, 184))
  $tip.Stroke = New-Brush ([System.Windows.Media.Color]::FromArgb(135, 138, 106, 74))
  $tip.StrokeThickness = 0.75
  [System.Windows.Controls.Canvas]::SetLeft($tip, 298)
  [System.Windows.Controls.Canvas]::SetTop($tip, 162)
  $shapeHost.Children.Add($tip) | Out-Null

  # Restrained upper-edge highlight only.
  $highlight = New-Object System.Windows.Shapes.Path
  $highlight.Data = [System.Windows.Media.Geometry]::Parse(
    'M 42,165 C 124,162 210,162 292,166'
  )
  $highlight.Stroke = New-Brush ([System.Windows.Media.Color]::FromArgb(70, 255, 239, 220))
  $highlight.StrokeThickness = 2
  $highlight.StrokeStartLineCap = 'Round'
  $highlight.StrokeEndLineCap = 'Round'
  $shapeHost.Children.Add($highlight) | Out-Null

  # === ROTATION ===
  $shapeRotate = New-Object System.Windows.Media.RotateTransform
  $shapeRotate.CenterX = $script:entitySize / 2.0
  $shapeRotate.CenterY = $script:entitySize / 2.0
  $shapeRotate.Angle = Get-AngleForEdge $Edge
  $shapeHost.RenderTransform = $shapeRotate

  $labelHost = New-Object System.Windows.Controls.Border
  $labelHost.Width = 132
  $labelHost.Height = $script:labelHeight
  $labelHost.Background = [System.Windows.Media.Brushes]::Transparent
  $labelHost.IsHitTestVisible = $false
  $labelHost.RenderTransformOrigin = '0.5,0.5'
  $labelRotate = New-Object System.Windows.Media.RotateTransform
  $labelHost.RenderTransform = $labelRotate

  $labelText = New-Object System.Windows.Controls.TextBlock
  $labelText.Text = $DisplayName
  $labelText.Foreground = $brushes.TextBrush
  $labelText.FontSize = 13
  $labelText.FontWeight = 'Bold'
  $labelText.Width = 132
  $labelText.Height = $script:labelHeight
  $labelText.TextAlignment = 'Center'
  $labelText.VerticalAlignment = 'Center'
  $labelText.HorizontalAlignment = 'Center'
  $labelText.TextWrapping = 'NoWrap'
  $labelText.TextTrimming = 'CharacterEllipsis'

  # subtle shadow for readability
  $labelText.Effect = New-Object System.Windows.Media.Effects.DropShadowEffect -Property @{
    Color = [System.Windows.Media.Color]::FromArgb(200, 0, 0, 0)
    BlurRadius = 4
    Direction = 270
    ShadowDepth = 1
    Opacity = 1
  }

  $labelHost.Child = $labelText
  [System.Windows.Controls.Canvas]::SetLeft($labelHost, 130)
  [System.Windows.Controls.Canvas]::SetTop($labelHost, 161)
  $shapeHost.Children.Add($labelHost) | Out-Null
  $root.Children.Add($shapeHost) | Out-Null

  return [pscustomobject]@{
    Root = $root
    ShapeRotate = $shapeRotate
    LabelHost = $labelHost
    LabelRotate = $labelRotate
    LabelText = $labelText
  }
}

function Update-LabelStyle {
  param(
    $Entity,
    [string]$ColorHex
  )

  $brushes = New-LabelBrushes $ColorHex
  $Entity.LabelText.Foreground = $brushes.TextBrush
  if ($Entity.LabelText.Effect) {
    $Entity.LabelText.Effect.Color = $brushes.ShadowBrush.Color
  }
}

function New-LurkerEntity {
  param(
    $Lurker
  )

  $edge = Get-RandomEdge
  $visual = New-DrumstickVisual -DisplayName $Lurker.displayName -ColorHex $Lurker.color -Edge $edge
  $retriggeredAt = if ($null -ne $Lurker.retriggeredAt) { [long]$Lurker.retriggeredAt } else { 0L }
  $initialVelocity = [double](Get-RandomVelocity)
  $initialTargetVelocity = [double](Get-TargetVelocity)
  $signedInitialTargetVelocity = if ($initialVelocity -lt 0) {
    -[Math]::Abs($initialTargetVelocity)
  } else {
    [Math]::Abs($initialTargetVelocity)
  }

  $entity = [pscustomobject]@{
    Id = $Lurker.id
    DisplayName = $Lurker.displayName
    Color = $Lurker.color
    Edge = $edge
    Offset = [double](Get-RandomOffset -Edge $edge)
    PerimeterPosition = 0.0
    Velocity = $initialVelocity
    TargetVelocity = [double]$signedInitialTargetVelocity
    NextVelocityChangeAt = [long](Get-NextVelocityChangeAt)
    ExtensionCurrent = $script:normalPeek
    ExtensionTarget = $script:normalPeek
    LastRetriggeredAt = $retriggeredAt
    PulseUntil = $(if ($retriggeredAt -gt 0) { $retriggeredAt + 5000 } else { 0L })
    WigglePhase = [double]((Get-HashNumber $Lurker.id) % 628) / 100.0
    Visual = $visual.Root
    ShapeRotate = $visual.ShapeRotate
    LabelRotate = $visual.LabelRotate
    LabelText = $visual.LabelText
  }

  $entity.PerimeterPosition = [double](Get-PerimeterPositionForEdgeOffset -Edge $edge -Offset $entity.Offset)
  $script:sceneCanvas.Children.Add($entity.Visual) | Out-Null
  $script:lurkerEntities[$entity.Id] = $entity
  Update-EntityVisual -Entity $entity
}

function Remove-LurkerEntity {
  param(
    [string]$EntityId
  )

  if (-not $script:lurkerEntities.ContainsKey($EntityId)) {
    return
  }

  $entity = $script:lurkerEntities[$EntityId]
  $script:sceneCanvas.Children.Remove($entity.Visual)
  $script:lurkerEntities.Remove($EntityId)
}

function Update-EntityFromState {
  param(
    $Entity,
    $Lurker
  )

  $Entity.DisplayName = $Lurker.displayName
  $Entity.LabelText.Text = $Lurker.displayName

  if ($Entity.Color -ne $Lurker.color) {
    $Entity.Color = $Lurker.color
    Update-LabelStyle -Entity $Entity -ColorHex $Lurker.color
  }

  if ($null -ne $Lurker.retriggeredAt) {
    $retriggeredAt = [long]$Lurker.retriggeredAt
    if ($retriggeredAt -gt $Entity.LastRetriggeredAt) {
      $Entity.LastRetriggeredAt = $retriggeredAt
      $Entity.PulseUntil = $retriggeredAt + 5000
    }
  }
}

function Load-LurkState {
  if (-not (Test-Path -LiteralPath $StateFilePath)) {
    return @()
  }

  try {
    $state = Get-Content -Raw -LiteralPath $StateFilePath | ConvertFrom-Json
  } catch {
    return @()
  }

  return @($state.lurkers)
}

function Test-StateFileChanged {
  try {
    if (-not (Test-Path -LiteralPath $StateFilePath)) {
      $changed = $script:lastKnownStateExists
      $script:lastKnownStateExists = $false
      $script:lastKnownStateWriteTicks = 0L
      $script:lastKnownStateLength = -1L
      return $changed
    }

    $stateFile = Get-Item -LiteralPath $StateFilePath
    $writeTicks = $stateFile.LastWriteTimeUtc.Ticks
    $length = $stateFile.Length
    $changed = (
      (-not $script:lastKnownStateExists) -or
      $script:lastKnownStateWriteTicks -ne $writeTicks -or
      $script:lastKnownStateLength -ne $length
    )

    $script:lastKnownStateExists = $true
    $script:lastKnownStateWriteTicks = $writeTicks
    $script:lastKnownStateLength = $length
    return $changed
  } catch {
    Write-Log "Failed to inspect state file: $($_.Exception.Message)"
    return $false
  }
}

function Sync-LurkerState {
  try {
    $lurkers = Load-LurkState
    $desiredIds = @{}

    foreach ($lurker in $lurkers) {
      if (
        -not $lurker -or
        [string]::IsNullOrWhiteSpace([string]$lurker.id) -or
        [string]::IsNullOrWhiteSpace([string]$lurker.displayName)
      ) {
        continue
      }

      $desiredIds[$lurker.id] = $true

      if ($script:lurkerEntities.ContainsKey($lurker.id)) {
        Update-EntityFromState -Entity $script:lurkerEntities[$lurker.id] -Lurker $lurker
        continue
      }

      New-LurkerEntity -Lurker $lurker
    }

    foreach ($entityId in @($script:lurkerEntities.Keys)) {
      if (-not $desiredIds.ContainsKey($entityId)) {
        Remove-LurkerEntity -EntityId $entityId
      }
    }
  } catch {
    Write-Log "Failed to sync lurker state: $($_.Exception.Message)"
  }
}

function Update-EntityVisual {
  param(
    $Entity
  )

  $now = Get-NowMilliseconds
  $pulseStrength = 0.0

  if ($Entity.PulseUntil -gt $now) {
    $pulseStrength = [Math]::Min(1.0, ($Entity.PulseUntil - $now) / 5000.0)
  }

  $visibleAmount = [double]$Entity.ExtensionCurrent
  $halfSize = $script:entitySize / 2.0

  switch ($Entity.Edge) {
    'left' {
      [System.Windows.Controls.Canvas]::SetLeft($Entity.Visual, -($script:entitySize - $visibleAmount))
      [System.Windows.Controls.Canvas]::SetTop($Entity.Visual, $Entity.Offset - $halfSize)
      [System.Windows.Controls.Canvas]::SetLeft($Entity.LabelHost, 130)
      [System.Windows.Controls.Canvas]::SetTop($Entity.LabelHost, 161)
    }
    'right' {
      [System.Windows.Controls.Canvas]::SetLeft($Entity.Visual, $script:screenWidth - $visibleAmount)
      [System.Windows.Controls.Canvas]::SetTop($Entity.Visual, $Entity.Offset - $halfSize)
      [System.Windows.Controls.Canvas]::SetLeft($Entity.LabelHost, 98)
      [System.Windows.Controls.Canvas]::SetTop($Entity.LabelHost, 175)
    }
    'top' {
      [System.Windows.Controls.Canvas]::SetLeft($Entity.Visual, $Entity.Offset - $halfSize)
      [System.Windows.Controls.Canvas]::SetTop($Entity.Visual, -($script:entitySize - $visibleAmount))
      [System.Windows.Controls.Canvas]::SetLeft($Entity.LabelHost, 130)
      [System.Windows.Controls.Canvas]::SetTop($Entity.LabelHost, 161)
    }
    default {
      [System.Windows.Controls.Canvas]::SetLeft($Entity.Visual, $Entity.Offset - $halfSize)
      [System.Windows.Controls.Canvas]::SetTop($Entity.Visual, $script:screenHeight - $visibleAmount)
      [System.Windows.Controls.Canvas]::SetLeft($Entity.LabelHost, 130)
      [System.Windows.Controls.Canvas]::SetTop($Entity.LabelHost, 161)
    }
  }

  $wiggle = [Math]::Sin(($now / 185.0) + $Entity.WigglePhase) * (4.5 * $pulseStrength)
  $Entity.ShapeRotate.Angle = (Get-AngleForEdge $Entity.Edge) + $wiggle
  $Entity.LabelRotate.Angle = if ($Entity.Edge -eq 'right') { 0.0 } else { 180 }
}

function Update-Entities {
  param(
    [double]$DeltaSeconds
  )

  try {
    $now = Get-NowMilliseconds

    foreach ($entityId in @($script:lurkerEntities.Keys)) {
      $entity = $script:lurkerEntities[$entityId]

      if ($now -ge $entity.NextVelocityChangeAt) {
        $targetVelocity = Get-TargetVelocity
        $flipDirection = (Get-Random -Minimum 0.0 -Maximum 1.0) -lt 0.35
        if ($flipDirection) {
          $entity.TargetVelocity = $targetVelocity
        } else {
          $entity.TargetVelocity = if ($entity.TargetVelocity -lt 0) { -[Math]::Abs($targetVelocity) } else { [Math]::Abs($targetVelocity) }
        }
        $entity.NextVelocityChangeAt = Get-NextVelocityChangeAt
      }

      $entity.Velocity += ($entity.TargetVelocity - $entity.Velocity) * [Math]::Min(1.0, $DeltaSeconds * 0.9)
      $entity.PerimeterPosition += $entity.Velocity * $DeltaSeconds
      Set-EntityPerimeterPosition -Entity $entity -PerimeterPosition $entity.PerimeterPosition

      $pulseActive = $entity.PulseUntil -gt $now
      $entity.ExtensionTarget = if ($pulseActive) { $script:extendedPeek } else { $script:normalPeek }
      $entity.ExtensionCurrent += ($entity.ExtensionTarget - $entity.ExtensionCurrent) * [Math]::Min(1.0, $DeltaSeconds * 3.2)

      Update-EntityVisual -Entity $entity
    }
  } catch {
    Write-Log "Failed to update lurker entities: $($_.Exception.Message)"
  }
}

function Start-NextAudio {
  if ($script:currentAudioPath) {
    return
  }

  if (-not (Test-Path -LiteralPath $AudioQueueDirectory)) {
    return
  }

  $nextAudio = Get-ChildItem -LiteralPath $AudioQueueDirectory -Filter '*.wav' |
    Sort-Object Name |
    Select-Object -First 1

  if (-not $nextAudio) {
    return
  }

  $script:currentAudioPath = $nextAudio.FullName
  $mediaPlayer.Open([Uri]$nextAudio.FullName)
  $mediaPlayer.Play()
}

$mediaPlayer.add_MediaEnded({
  if ($script:currentAudioPath -and (Test-Path -LiteralPath $script:currentAudioPath)) {
    Remove-Item -LiteralPath $script:currentAudioPath -Force
  }

  $script:currentAudioPath = $null
  Start-NextAudio
})

$mediaPlayer.add_MediaFailed({
  if ($script:currentAudioPath -and (Test-Path -LiteralPath $script:currentAudioPath)) {
    Remove-Item -LiteralPath $script:currentAudioPath -Force
  }

  $script:currentAudioPath = $null
  Start-NextAudio
})

$updateTimer = New-Object System.Windows.Threading.DispatcherTimer
$updateTimer.Interval = [TimeSpan]::FromMilliseconds(33)
$updateTimer.add_Tick({
  try {
    $now = Get-NowMilliseconds
    $deltaSeconds = [Math]::Max(0.001, ($now - $script:lastFrameAt) / 1000.0)
    $script:lastFrameAt = $now

    if (Test-StateFileChanged) {
      $script:pendingStateSync = $true
    }

    if ($script:pendingStateSync) {
      $script:pendingStateSync = $false
      Sync-LurkerState
    }

    Update-Entities -DeltaSeconds $deltaSeconds
  } catch {
    Write-Log "Update tick failed: $($_.Exception.Message)"
  }
})
$updateTimer.Start()

$audioTimer = New-Object System.Windows.Threading.DispatcherTimer
$audioTimer.Interval = [TimeSpan]::FromMilliseconds(250)
$audioTimer.add_Tick({
  try {
    Start-NextAudio
  } catch {
    Write-Log "Audio tick failed: $($_.Exception.Message)"
  }
})
$audioTimer.Start()

try {
  Write-Log 'Script starting'
  Sync-LurkerState
  Start-NextAudio
  Write-Log 'About to show window'
  $window.ShowDialog() | Out-Null
  Write-Log 'Window closed normally'
} catch {
  Write-Log "Fatal error: $($_.Exception.Message)"
  Write-Log "$($_ | Out-String)"
  throw
}
