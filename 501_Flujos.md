# Flujos de trabajo 

### Comandos iniciales
https://github.com/Klerith/mas-talento/tree/main/claude-code
/ = comandos
@ = archivos
& = tarea en segundi plano
'#' = comentario rapido

* Iniciales
/init
/login
/config - configuraciones de claude
/permissions
/theme - cambiar tema

/doctor - para ver issues - reparar
/mcp...
/hooks...

### Comando flujo diario
/memory
- memoria de usuario - global

/plan
- habilita modo plan

/resume
- para anclar a una conversacion con un id
- claude --resume {id}

/copy
- tal cual para copiar y pega en otro lugar
- mantiene estilos

/export
- pega, pero sin estilo

/recap
- muestra un resumen de lo ultimo

/voice
- con el espacio, se activa
- pueden mandar voz
- solo en ingles

/fast, /effort
- cambiar config de claude

### comandos utiles
/loop
- ejecuta accion cada cierto tiempo durante la sesion
- si sales de claude, se acaba este cron
- tareas sencillas, cron

/schedule
- mas para agentes, un poco mas rudo
- conecta mas cosas

**OJO**
Ppodemos crear skill diciendole a claude
se crea la skill con el nombre
ejecutas skill /clima y listo

### github integraciones
/install-github-app
- abre pagina web, configira para el repo que vayas a utilizar
- regresas a terminal
-- @claude code => para ejecutar comandos git
-- automatico

- crear token con claude
-- abre caude, autorizas y listo
-- abre github, creando un pull request
    - esto lanza un tarea antes de cada merge

- Listop, crea github workflows folder
- LO INTERESANTE...
    - desde gituhb, habilitatmos issues
    - creamos issue y lanzaos @claude revisa este requerimiento

### revisar cambios

- Cambiate de rama, checa los cambios y si todo ok, adelante
- Lanzar pull request
- Entra code review (automatico por claude)
- merge y listo
- en rama main - pull y listo

### format Github action

CLAUDE_CODE_OAUTH_TOKEN
Buenisimo...

Le decimos a claude que genere un **github action**
esta accion define: asinga labels a los issues, que claude los analice y asigen los labels apropiados
- Genero yml
- hacemos push
- se crea la accion

Ahora si, al cambiar issues, claude genera lables
IMPRESOINNANTE

OJO
claude_args: "--allowedTools Bash(gh issue *)"
claude_args: '--allowed-tools "Bash(gh issue edit:*)" "Bash(gh issue comment:*)" "Bash(gh label list:*)"'        

Aplico este cambio porque no generaba nada, tema de bash

### Cambios desde github Claude code
- OJO
settiongs, pages, deploy para publicar pagina

@ Menciones con claude
En la parte de issues, hacemos
@claude arregla este issue, lo que hace es ejecutar action claude para corregir issue
lanzamos PR, checamos cambios y listo

Receurda, VE A LA RAMA, revisa cambios, y si todo ok, merge a main y borra rama

- OJO
cuando tienes activado el pages, ciandp deployas a main, se actualiza en autom.

### thinking mode
https://code.claude.com/docs/en/common-workflows#use-extended-thinking-thinking-mode

Decirle a claude "usa thinking mode" 

= sugerencias
https://gist.github.com/Klerith/6c8d499ee157a6b5844466d73daa47d7


