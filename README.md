# Neo-Vault
A desktop launcher for retro collections, inspired by HyperSpin and developed with Electron, React, and TypeScript. It includes animated selectors, local profiles, favorites, and keyboard and gamepad navigation.

# Neo-Vault

**Tu colección retro, en una experiencia de consola.**

Neo-Vault es un launcher de escritorio para organizar y explorar videojuegos retro desde una interfaz visual inspirada en HyperSpin: selectores animados, estética oscura con neón y navegación mediante teclado o mando.

El objetivo es convertir una biblioteca local en una experiencia cómoda para jugar desde una ventana, una pantalla completa o un equipo dedicado. Neo-Vault se encarga de la presentación y la organización; la ejecución de los juegos se delegará en emuladores externos.

> Proyecto en desarrollo. Actualmente se puede explorar el catálogo y gestionar perfiles y favoritos. Todavía no se pueden iniciar juegos desde Neo-Vault.

## Propósito

- Reunir diferentes sistemas retro en una sola interfaz.
- Permitir explorar bibliotecas sin depender de un escritorio tradicional.
- Ofrecer perfiles locales con favoritos separados por usuario.
- Integrar emulación de forma modular, instalando únicamente los componentes necesarios.
- Incorporar partidas y estados de guardado separados por perfil en una etapa posterior.

## Estado actual

### Implementado

- Selector de sistemas con imágenes remotas y un reemplazo visual cuando fallan.
- Selector de juegos inspirado en HyperSpin, con transiciones y casillas de tamaño uniforme.
- Vistas previas estáticas de juegos cuando existe una imagen coincidente; efectos visuales animados.
- Búsqueda de títulos y filtro de favoritos.
- Creación y selección de perfiles locales.
- Favoritos persistentes por perfil mediante `localStorage`.
- Modos ventana y pantalla completa, con botón y atajo F11.
- Navegación por teclado.
- Lectura de mandos que Gamepad API identifica con mapeo estándar.
- Indicador de mando y última acción recibida en Configuración.
- Catálogo de referencia consultado desde Libretro, con datos de No-Intro y Redump.

La compatibilidad con mandos físicos requiere pruebas en cada dispositivo. Windows gestiona la conexión USB o el emparejamiento Bluetooth; Neo-Vault no empareja dispositivos ni identifica de forma fiable su transporte.

### Sistemas presentes en la interfaz

| Sistema | Catálogo |
| --- | --- |
| Super Nintendo | En línea |
| Nintendo 64 | En línea |
| Nintendo DS | En línea |
| Sega Mega Drive / Genesis | En línea |
| Atari 2600 | En línea |
| PlayStation 1 | En línea |
| Nintendo NES | En línea |
| Game Boy | En línea |
| MAME / Arcade | Selección de muestra |

La presencia de una consola en esta tabla no implica que su emulador esté instalado o integrado. Las listas pueden incluir regiones, revisiones y otras variantes; no se garantiza un catálogo exhaustivo.

### Pendiente

- Selección de rutas y detección de archivos de juegos instalados.
- Integración y lanzamiento de emuladores.
- Separación de partidas, memory cards y estados de guardado por perfil.
- Copias de seguridad y restauración de datos.
- Configuración de mandos con mapeos no estándar.
- Catálogo completo de referencia para arcade.
- Videos y recursos cinematográficos por sistema o juego.
- Empaquetado y validación de una distribución para Windows.
- Pruebas con diferentes resoluciones, equipos y mandos físicos.

## Qué no incluye

- Neo-Vault no es un emulador y no implementa el hardware de las consolas.
- No es HyperSpin ni utiliza actualmente su motor: la inspiración es visual y de navegación.
- No distribuye ROMs, ISOs, BIOS ni bibliotecas comerciales de juegos.
- Consultar un título no significa que esté instalado o disponible para jugar.
- No tiene cuentas en línea, sincronización en la nube ni recuperación automática de partidas.
- La interfaz actual no equivale a una integración terminada con emuladores.

## Propuesta de emulación

La primera integración propuesta es **RetroArch con núcleos Libretro instalados de forma selectiva**. Esta integración todavía no está implementada.

Neo-Vault iniciaría un proceso externo de RetroArch indicando el núcleo y el archivo del juego. Después se incorporaría una configuración por perfil para separar los guardados, así como el retorno al launcher al cerrar la emulación.

La primera prueba se centrará en NES o SNES con un juego homebrew autorizado. El resto de sistemas se añadirá tras validar lanzamiento, controles, salida y persistencia de partidas.

Se busca limitar el tamaño de la distribución y evitar componentes innecesarios. No hay todavía mediciones que permitan afirmar un consumo mínimo de RAM, un tamaño final o requisitos de hardware definitivos. Electron aporta su propio coste de ejecución.

Los emuladores, núcleos y recursos externos conservan sus licencias respectivas. La selección final de componentes redistribuibles se revisará antes de preparar un paquete público.

Referencias: [RetroArch](https://www.retroarch.com/platforms.html), [lanzamiento por línea de comandos](https://docs.libretro.com/guides/cli-intro/), [instalación de núcleos](https://docs.libretro.com/guides/download-cores/) y [licencias](https://docs.libretro.com/development/licenses/).

## Cómo está construido

| Tecnología | Función |
| --- | --- |
| Electron | Aplicación de escritorio y control de ventana |
| React | Interfaz y componentes |
| TypeScript | Tipado y lógica de la aplicación |
| SCSS | Estilos, adaptación de tamaño y animaciones |
| electron-vite / Vite | Desarrollo y compilación |
| Gamepad API | Lectura de mandos compatibles |
| Lucide React | Iconos |
| electron-builder | Herramientas de empaquetado |

El proceso principal de Electron controla la ventana. El preload expone una API limitada para comunicarse con la interfaz. React gestiona selectores, perfiles, favoritos y catálogo.

Los perfiles y favoritos se almacenan en `localStorage` del navegador integrado. No se ha implementado una base de datos de partidas. Los catálogos descargados se conservan en memoria durante la sesión; las imágenes dependen de su proveedor y de la caché del navegador. La disponibilidad sin conexión de esos recursos no está garantizada.

### Organización del código

```text
src/
  main/                         # Proceso principal de Electron
  preload/                      # Puente de comunicación y tipos
  renderer/
    src/
      App.tsx                   # Navegación, perfiles y estado general
      catalog.ts                # Consulta y lectura de listas de títulos
      consoleImages.ts          # Fuentes de imágenes de sistemas
      controls.ts               # Acciones de navegación y mapeo estándar
      hooks/useInputDevices.ts  # Entrada de teclado y lectura de mandos
      components/               # Selectores y vistas previas
      styles/                   # Estilos SCSS
```

## Desarrollo local

Se necesita Node.js compatible con las dependencias del proyecto y npm. La primera instalación requiere conexión a internet.

```bash
npm install
npm run dev
```

Ejecutar los comandos desde la raíz del proyecto. `npm run dev` abre la aplicación Electron con recarga durante el desarrollo.

### Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build
```

Estas comprobaciones no sustituyen las pruebas visuales, de mandos físicos ni de ejecución real de emuladores.

### Empaquetado para Windows

```bash
npm run build:win
```

El proyecto contiene la configuración y el script de empaquetado. La distribución final todavía debe probarse; generar el paquete no instala ni integra emuladores por sí solo.

## Controles

| Acción | Teclado | Mando estándar |
| --- | --- | --- |
| Navegar | Flechas | Cruceta / stick izquierdo |
| Seleccionar | Enter | Botón inferior, A en distribución Xbox |
| Volver | Esc | Botón derecho, B en distribución Xbox |
| Marcar favorito en catálogo | F | Botón superior, Y en distribución Xbox |
| Avanzar o retroceder diez juegos | Page Down / Page Up | RB / LB |
| Alternar pantalla completa | F11 | Botón de la interfaz |

Los nombres de los botones pueden variar según el mando. Para detectar un dispositivo, conéctalo o empareja desde Windows, enfoca Neo-Vault y pulsa un botón. Los mandos sin mapeo estándar se muestran como detectados, pero su navegación automática permanece desactivada.

## Próximos hitos

1. Validar navegación y diseño en ventana y pantalla completa.
2. Integrar RetroArch y un núcleo para una primera prueba jugable.
3. Asociar juegos locales con el catálogo sin confundir variantes.
4. Guardar y recuperar partidas de forma independiente por perfil.
5. Ampliar sistemas y completar recursos visuales.
6. Medir rendimiento y preparar una distribución modular para Windows.

## Fuentes y créditos

- [Libretro Database](https://github.com/libretro/libretro-database): listas de referencia, incluidas fuentes No-Intro y Redump.
- [Libretro Thumbnails](https://github.com/libretro-thumbnails): vistas previas cuando coinciden con el nombre del título.
- Wikimedia Commons: fotografías de consolas; las fuentes individuales aparecen en Configuración y en `consoleImages.ts`.
- Evan-Amos: fotografías de consolas utilizadas como base visual.
- Imagen arcade: Joshua Driggs (ZapWizard), edición de fondo por bayo y transparencia por Shooke, bajo [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/). [Archivo original](https://commons.wikimedia.org/wiki/File:Donkey_Kong_arcade_at_the_QuakeCon_2005.png).

Las marcas, imágenes y demás recursos de terceros pertenecen a sus respectivos titulares. Neo-Vault es un proyecto independiente.

## Licencia del proyecto

Pendiente de definir por su autor. Hasta que se añada una licencia explícita, no debe asumirse que el código tiene licencia MIT u otra licencia de código abierto.

