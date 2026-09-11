<#
.SYNOPSIS
    Clima actual y pronostico de varios dias, en la terminal.

.DESCRIPTION
    Usa Open-Meteo (sin API key). Si no se indica ciudad, detecta la ubicacion
    por IP. Salida de texto en espanol, o JSON con -Json.

.EXAMPLE
    .\clima.ps1
.EXAMPLE
    .\clima.ps1 Buenos Aires
.EXAMPLE
    .\clima.ps1 Lima -Dias 5 -Json
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]] $Ciudad,

    [ValidateRange(1, 16)]
    [int] $Dias = 3,

    [switch] $Json
)

$ErrorActionPreference = 'Stop'

# --- Entorno -----------------------------------------------------------------
# PS 5.1 puede negociar TLS antiguo y romper contra las APIs.
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }
# Sin esto los acentos y el simbolo de grado salen como basura en la consola.
try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding $false } catch { }
# Fija es-ES para que decimales y fechas salgan en espanol pase lo que pase.
$es = [Globalization.CultureInfo]::GetCultureInfo('es-ES')
[Threading.Thread]::CurrentThread.CurrentCulture = $es

$INV = [Globalization.CultureInfo]::InvariantCulture

# OJO: en PowerShell las variables NO distinguen mayusculas. No declares aqui
# nombres que choquen con los parametros ($Ciudad, $Dias, $Json).

# --- Tablas ------------------------------------------------------------------
# Codigos WMO que Open-Meteo devuelve en weather_code.
$WMO = @{
    0  = 'Despejado'
    1  = 'Mayormente despejado'
    2  = 'Parcialmente nublado'
    3  = 'Nublado'
    45 = 'Niebla'
    48 = 'Niebla con escarcha'
    51 = 'Llovizna ligera'
    53 = 'Llovizna'
    55 = 'Llovizna intensa'
    56 = 'Llovizna helada'
    57 = 'Llovizna helada intensa'
    61 = 'Lluvia ligera'
    63 = 'Lluvia'
    65 = 'Lluvia intensa'
    66 = 'Lluvia helada'
    67 = 'Lluvia helada intensa'
    71 = 'Nevada ligera'
    73 = 'Nevada'
    75 = 'Nevada intensa'
    77 = 'Granos de nieve'
    80 = 'Chubascos ligeros'
    81 = 'Chubascos'
    82 = 'Chubascos torrenciales'
    85 = 'Chubascos de nieve'
    86 = 'Chubascos de nieve intensos'
    95 = 'Tormenta'
    96 = 'Tormenta con granizo'
    99 = 'Tormenta con granizo fuerte'
}

# .NET abrevia los dias en es-ES como "vi." o "sa."; preferimos tres letras.
$ABREV = @{
    Monday = 'lun'; Tuesday = 'mar'; Wednesday = 'mié'; Thursday = 'jue'
    Friday = 'vie'; Saturday = 'sáb'; Sunday = 'dom'
}

# --- Utilidades --------------------------------------------------------------
function Fallar($mensaje) {
    [Console]::Error.WriteLine($mensaje)
    exit 1
}

function Obtener($uri) {
    Invoke-RestMethod -Uri $uri -TimeoutSec 15
}

function Describir($codigo) {
    if ($null -eq $codigo) { return 'Sin datos' }
    $c = [int] $codigo
    if ($WMO.ContainsKey($c)) { return $WMO[$c] }
    return "Código WMO $c"
}

function DiaCorto($fecha) {
    $k = $fecha.DayOfWeek.ToString()
    if ($ABREV.ContainsKey($k)) { return $ABREV[$k] }
    return $fecha.ToString('ddd', $es)
}

function MesCorto($fecha) {
    return $fecha.ToString('MMM', $es).Replace('.', '')
}

function Ubicacion($nombre, $region, $pais, $lat, $lon) {
    [pscustomobject]@{
        Nombre = $nombre
        Region = $region
        Pais   = $pais
        Lat    = [double] $lat
        Lon    = [double] $lon
    }
}

function Geocodificar($nombre) {
    $q = [uri]::EscapeDataString($nombre)
    $r = Obtener "https://geocoding-api.open-meteo.com/v1/search?name=$q&count=1&language=es&format=json"
    if (-not $r.results) { return $null }
    $g = @($r.results)[0]
    return Ubicacion $g.name $g.admin1 $g.country $g.latitude $g.longitude
}

# Los servicios de IP devuelven el pais en ingles ("Spain"). Reconsultamos el
# geocodificador en espanol y adoptamos sus etiquetas solo si apunta al mismo
# sitio; las coordenadas siguen siendo las de la IP, que son mas precisas.
function Traducir($loc) {
    if (-not $loc.Nombre) { return $loc }
    try {
        $g = Geocodificar $loc.Nombre
        if ($g -and [math]::Abs($g.Lat - $loc.Lat) -lt 1.0 -and [math]::Abs($g.Lon - $loc.Lon) -lt 1.0) {
            return Ubicacion $g.Nombre $g.Region $g.Pais $loc.Lat $loc.Lon
        }
    } catch { }
    return $loc
}

# Detecta la ubicacion por IP. ipwho.is primero (HTTPS), ip-api.com de respaldo.
function PorIP {
    try {
        $r = Obtener 'https://ipwho.is/?fields=success,city,region,country,latitude,longitude'
        if ($r.success -and $null -ne $r.latitude) {
            return Traducir (Ubicacion $r.city $r.region $r.country $r.latitude $r.longitude)
        }
    } catch { }

    try {
        $r = Obtener 'http://ip-api.com/json/?lang=es&fields=status,city,regionName,country,lat,lon'
        if ($r.status -eq 'success') {
            return Ubicacion $r.city $r.regionName $r.country $r.lat $r.lon
        }
    } catch { }

    return $null
}

function Titulo($loc) {
    $partes = @()
    if ($loc.Nombre) { $partes += $loc.Nombre }
    if ($loc.Region -and $loc.Region -ne $loc.Nombre) { $partes += $loc.Region }
    $texto = $partes -join ', '
    if ($loc.Pais -and $loc.Pais -ne $loc.Region) { $texto = "$texto ($($loc.Pais))" }
    return $texto
}

# --- Programa ----------------------------------------------------------------
try {
    if ($Ciudad -and ($Ciudad -join '').Trim()) {
        $buscado = ($Ciudad -join ' ').Trim()
        $lugar = Geocodificar $buscado
        if (-not $lugar) {
            Fallar "No encontré la ciudad «$buscado». Prueba con otro nombre o añade el país: «$buscado, España»."
        }
    }
    else {
        $lugar = PorIP
        if (-not $lugar) {
            Fallar 'No pude detectar tu ubicación por IP. Indica la ciudad, por ejemplo: clima.ps1 Lima'
        }
    }

    $url = "https://api.open-meteo.com/v1/forecast?latitude=$($lugar.Lat.ToString($INV))&longitude=$($lugar.Lon.ToString($INV))" +
           '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
           '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
           "&timezone=auto&forecast_days=$Dias"

    $w = Obtener $url
    $ahora = $w.current
    $diario = $w.daily

    $pronostico = @()
    for ($i = 0; $i -lt @($diario.time).Count; $i++) {
        $fecha = [datetime]::ParseExact($diario.time[$i], 'yyyy-MM-dd', $INV)
        $pronostico += [pscustomobject]@{
            fecha  = $diario.time[$i]
            dia    = '{0} {1:00}' -f (DiaCorto $fecha), $fecha.Day
            min    = $diario.temperature_2m_min[$i]
            max    = $diario.temperature_2m_max[$i]
            lluvia = $diario.precipitation_probability_max[$i]
            codigo = $diario.weather_code[$i]
            estado = Describir $diario.weather_code[$i]
        }
    }

    if ($Json) {
        [pscustomobject]@{
            ubicacion = [pscustomobject]@{
                nombre   = $lugar.Nombre
                region   = $lugar.Region
                pais     = $lugar.Pais
                latitud  = $lugar.Lat
                longitud = $lugar.Lon
                zona     = $w.timezone
            }
            actual = [pscustomobject]@{
                hora        = $ahora.time
                temperatura = $ahora.temperature_2m
                sensacion   = $ahora.apparent_temperature
                humedad     = $ahora.relative_humidity_2m
                viento      = $ahora.wind_speed_10m
                codigo      = $ahora.weather_code
                estado      = Describir $ahora.weather_code
            }
            pronostico = $pronostico
        } | ConvertTo-Json -Depth 5
        exit 0
    }

    $sello = [datetime]::ParseExact($ahora.time, 'yyyy-MM-ddTHH:mm', $INV)
    $cuando = '{0} {1} {2}, {3:HH\:mm}' -f (DiaCorto $sello), $sello.Day, (MesCorto $sello), $sello

    ''
    '  {0}  ·  {1}' -f (Titulo $lugar), $cuando
    ''
    '  {0,-9} {1:0.0} °C  (sensación {2:0.0} °C)   {3}' -f 'Ahora', $ahora.temperature_2m, $ahora.apparent_temperature, (Describir $ahora.weather_code)
    '  {0,-9} Humedad {1} %  ·  Viento {2:0.0} km/h' -f '', $ahora.relative_humidity_2m, $ahora.wind_speed_10m
    ''
    foreach ($x in $pronostico) {
        $prob = if ($null -eq $x.lluvia) { '--' } else { '{0}' -f $x.lluvia }
        '  {0,-9} {1,5:0.0} / {2,5:0.0} °C   {3,-26} lluvia {4,3} %' -f $x.dia, $x.min, $x.max, $x.estado, $prob
    }
    ''
}
catch {
    Fallar "No pude consultar el clima: $($_.Exception.Message)"
}
