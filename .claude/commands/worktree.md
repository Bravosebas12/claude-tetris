---
description: Crea un git worktree aislado y ejecuta ahí las instrucciones dadas
argument-hint: <instrucciones a ejecutar en el worktree>
---

El usuario pidió trabajo aislado del código principal. Instrucciones recibidas:

$ARGUMENTS

Pasos a seguir:

1. Deriva un nombre corto en kebab-case para el worktree a partir del requerimiento anterior (ej: "fix-scoring-bug", "add-hold-ui"). Sé descriptivo pero breve (2-4 palabras).
2. Verifica que `.trees/` exista (créala si no) y que el nombre elegido no choque con un worktree existente (`git worktree list`).
3. Crea el worktree con una rama nueva del mismo nombre:
   ```
   git worktree add .trees/<nombre> -b <nombre>
   ```
   Si el usuario referenció una rama base distinta a la actual, ajusta el comando en consecuencia.
4. Cambia tu contexto de trabajo a esa carpeta (`.trees/<nombre>`) y ejecuta ahí, de forma aislada, las instrucciones recibidas — no toques archivos fuera de ese worktree.
5. Al terminar, resume qué se hizo y en qué worktree/rama quedó, y recuerda al usuario que puede revisarlo con `git -C .trees/<nombre> status` o fusionarlo cuando esté listo. No hagas merge ni push por tu cuenta salvo que se pida explícitamente.
