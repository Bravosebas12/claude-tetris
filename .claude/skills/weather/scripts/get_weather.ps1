param(
    [string]$Location = ""
)

$Format = "%l:+%C+%t+(feels+%f),+humidity+%h,+wind+%w"

if ([string]::IsNullOrWhiteSpace($Location)) {
    $Url = "https://wttr.in/?format=$Format"
} else {
    $Encoded = $Location -replace ' ', '+'
    $Url = "https://wttr.in/$Encoded`?format=$Format"
}

Invoke-RestMethod -Uri $Url
