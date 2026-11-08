# Neo-Vault
A desktop launcher for retro collections, inspired by HyperSpin and developed with Electron, React, and TypeScript. It includes animated selectors, local profiles, favorites, and keyboard and gamepad navigation.

El objetivo es convertir una biblioteca local en una experiencia cómoda para jugar desde una ventana, una pantalla completa o un equipo dedicado. Neo-Vault se encarga de la presentación y la organización; la ejecución de los juegos se delegará en emuladores externos.

> Proyecto en desarrollo. Se pueden explorar catálogos y gestionar perfiles y favoritos. NES/SNES utilizan RetroArch y arcade utiliza MAME 0.289. La prueba real de Pong sin ROM externa terminó correctamente sin video ni audio; las pruebas visuales y de mando físico siguen pendientes.

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
- Portadas en la rueda y capturas de referencia, con índices de imágenes para ocho consolas y carga bajo demanda.
- Reutilización de imágenes de otras revisiones del mismo título, identificadas como referencia de otra edición.
- Búsqueda de títulos y filtros de favoritos y archivos locales.
- Importación y asociación de archivos NES (.nes) y SNES (.sfc/.smc).
- Instalación de RetroArch y Snes9x dentro de runtime/retroarch mediante npm run setup:snes, con detección automática.
- Instalación de MAME 0.289 en runtime/mame y catálogo arcade local desde sus metadatos oficiales.
- Importación de carpetas arcade, auditoría individual o de colección y prueba de Pong sin ROM externa.
- Configuración manual opcional de RetroArch y núcleos FCEUmm / Snes9x.
- Lanzamiento externo sin shell, control de errores y retorno a Neo-Vault al terminar.
- Preparación de carpetas de guardado por perfil, sistema y título para la integración NES/SNES.
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
| MAME / Arcade | Catálogo local MAME 0.289 |

La presencia de una consola en esta tabla no implica que su emulador esté instalado o integrado. Las listas pueden incluir regiones, revisiones y otras variantes; no se garantiza un catálogo exhaustivo.

### Pendiente

- Escaneo de carpetas y detección automática de juegos instalados.
- Validar la primera integración con RetroArch real y ampliar las consolas ejecutables.
- Validar partidas y estados con juegos reales; integrar memory cards y guardados del resto de sistemas.
- Copias de seguridad y restauración de datos.
- Configuración de mandos con mapeos no estándar.
- Ampliar filtros y mantener el catálogo arcade por versión de MAME.
- Videos y recursos cinematográficos por sistema o juego.
- Empaquetado y validación de una distribución para Windows.
- Pruebas con diferentes resoluciones, equipos y mandos físicos.

## Qué no incluye

- Neo-Vault no es un emulador y no implementa el hardware de las consolas.
- No es HyperSpin ni utiliza actualmente su motor: la inspiración es visual y de navegación.
- No distribuye ROMs, ISOs, BIOS ni bibliotecas comerciales de juegos.
- Consultar un título no significa que esté instalado o disponible para jugar.
- No tiene cuentas en línea, sincronización en la nube ni recuperación automática de partidas.
- La integración ejecutable inicial incluye NES, SNES y MAME; no equivale a compatibilidad validada con todas las consolas.

## Propuesta de emulación

NES y SNES utilizan **RetroArch con núcleos Libretro instalados de forma selectiva**. Arcade utiliza **MAME 0.289** como proceso independiente. Se implementaron lanzamiento, auditoría arcade y rutas de guardado por perfil. La primera prueba real de Pong terminó correctamente sin video ni audio; falta la validación interactiva.

Neo-Vault inicia un proceso externo de RetroArch indicando el núcleo, el archivo del juego y una configuración por perfil. El launcher se oculta al iniciar el proceso y vuelve a mostrarse cuando termina o falla. Cada perfil, sistema y título recibe directorios propios para partidas y estados. La carga y el guardado automáticos de estados están desactivados; el usuario gestiona sus estados desde RetroArch.

La primera prueba disponible sin archivos externos es Pong en MAME. NES y SNES se validarán después con un juego homebrew autorizado. El resto de sistemas se añadirá tras validar lanzamiento, controles, salida y persistencia de partidas.

Se busca limitar el tamaño de la distribución y evitar componentes innecesarios. No hay todavía mediciones que permitan afirmar un consumo mínimo de RAM, un tamaño final o requisitos de hardware definitivos. Electron aporta su propio coste de ejecución.

Los emuladores, núcleos y recursos externos conservan sus licencias respectivas. La selección final de componentes redistribuibles se revisará antes de preparar un paquete público.

Referencias: [RetroArch](https://www.retroarch.com/platforms.html), [lanzamiento por línea de comandos](https://docs.libretro.com/guides/cli-intro/), [instalación de núcleos](https://docs.libretro.com/guides/download-cores/) y [licencias](https://docs.libretro.com/development/licenses/).

## Primera prueba arcade: MAME

```bash
npm run setup:mame
npm run dev
```

El script descarga MAME 0.289 para Windows x64 y prepara `runtime/mame`. Requiere Windows 10 o posterior y CPU con x86-64-v2. La distribución comprimida pesa unos 84 MiB; los componentes seleccionados ocupan unos 306 MiB instalados. No se descargan ROMs. Los binarios y archivos personales quedan fuera de Git.

1. Abre **MAME / Arcade** y pulsa **Probar Pong · sin ROM**. El driver simula circuitos discretos y no necesita archivos ROM externos.
2. MAME abre su propia ventana; Neo-Vault se oculta y regresa cuando termina. Usa **Esc** para salir. Los controles habituales de crédito e inicio son **5** y **1**, cuando el juego los utiliza; **Tab** permite consultar o ajustar los controles de MAME. Pueden variar por juego.
3. Para una colección existente, pulsa **Añadir carpeta**. Se examina la carpeta elegida y hasta tres niveles de subcarpetas, sin seguir enlaces simbólicos. Se reconocen nombres estándar `.zip` y `.7z`, como `gridlee.zip`, sin extraer ni copiar los archivos.
4. Usa **Verificar set** o **Verificar colección**. La auditoría comprueba archivos faltantes y checksums; no descarga juegos. Antes de iniciar un título con ROM, Neo-Vault vuelve a verificar el set y sus dependencias.
5. Algunos títulos tienen **Abrir fuente oficial**. El botón abre su página de MAMEdev: las condiciones se aceptan allí y el usuario descarga desde ese sitio. Después se añade la carpeta correspondiente. No se automatiza la aceptación de condiciones ni se redistribuyen esos archivos.

El catálogo deriva del XML oficial de MAME 0.289 y contiene **19.224 entradas con entrada de monedas**, incluidas variantes y títulos con limitaciones. Se excluyen dispositivos, BIOS y máquinas mecánicas. No representa 19.224 juegos instalados ni una promesa de compatibilidad. Los drivers preliminares no se ofrecen para iniciar. Los sets y sus dependencias deben ser compatibles con esta versión.

Configuración, NVRAM y estados se dirigen a `data/profiles/<perfil>/arcade/<titulo>/`, con un identificador estable por título. La disponibilidad de estados depende del driver; no se habilita su guardado automático.

Se comprobó el ejecutable real con `-help` y una ejecución de Pong de dos segundos simulados, sin video ni audio, que terminó con código 0. Las pruebas automatizadas cubren identificación, importación de carpetas, auditoría, rutas por perfil y retorno al launcher. La respuesta visual, sonido y mandos físicos requieren pruebas interactivas.

Fuentes: [MAME](https://www.mamedev.org/release.html), [descargas y condiciones](https://www.mamedev.org/roms/) y [driver de Pong](https://github.com/mamedev/mame/blob/mame0289/src/mame/atari/pong.cpp).

## Primera prueba jugable: NES / SNES

1. Ejecuta `npm run setup:snes` en Windows de 64 bits. El script descarga RetroArch 1.22.2 desde Libretro y el núcleo Snes9x, y los deja dentro de `runtime/retroarch`. No cambia instalaciones del sistema ni descarga juegos. La descarga inicial del archivo oficial es de unos 203 MB; los componentes seleccionados ocupan unos 157 MiB, sin las colecciones completas de temas, shaders ni bases de datos.
2. Snes9x queda incluido. Si más adelante necesitas NES, instala FCEUmm desde RetroArch y selecciona su núcleo en Configuración.
3. Reinicia Neo-Vault tras actualizar el código del proceso principal o preload: detén el proceso de desarrollo y vuelve a ejecutar `npm run dev`.
4. En **Configuración → Conecta tu emulación**, comprueba que se detectan el ejecutable y el núcleo de SNES. Usa **Detectar componentes incluidos** si acabas de instalar. Los selectores manuales permiten usar otra instalación.
5. Abre SNES y usa **Importar juego** para añadir un archivo local sin comprimir. También puedes asociar un archivo a un título existente. No se copian ni descargan juegos.
6. Selecciona el perfil correcto y pulsa **Jugar** o Enter/A. Para volver, cierra RetroArch o utiliza Esc desde su ventana. El botón **Mario · referencias** muestra las ediciones de Super Mario World y sus imágenes; no instala el juego. Para jugar a ese título debes importar o asociar tu archivo local.

El mapeo del mando dentro de RetroArch es independiente del launcher. Las pruebas automatizadas simulan el proceso externo y comprueban persistencia de rutas, cancelación de diálogos, separación de perfiles, conservación de una partida existente y recuperación ante errores; no prueban la compatibilidad de un juego ni del hardware físico.

La carpeta `data/` contiene información local y guardados. Está excluida de Git y del paquete distribuible. No la borres al actualizar. Mantén también los perfiles de Neo-Vault; su exportación y restauración siguen pendientes.

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

Los perfiles y favoritos se almacenan en `localStorage` del navegador integrado. Las rutas del ejecutable, núcleos y juegos asociados se almacenan en data/launcher.json. Los guardados de NES/SNES y los archivos de estado de MAME se dirigen a data/profiles dentro de la carpeta del proyecto en desarrollo o junto al ejecutable empaquetado. Esta ubicación debe ser escribible. No se ha implementado una base de datos de partidas ni exportación de perfiles; conservar data por sí sola no restaura los perfiles de localStorage. Los catálogos descargados se conservan en memoria durante la sesión; las imágenes dependen de su proveedor y de la caché del navegador. La disponibilidad sin conexión de esos recursos no está garantizada.

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
npm test
npm run typecheck
npm run lint
npm run build
```

Estas comprobaciones no sustituyen las pruebas visuales, de mandos físicos ni de ejecución real de emuladores.

### Empaquetado para Windows

```bash
npm run setup:snes
npm run build:win
```

El proyecto contiene la configuración y el script de empaquetado. La distribución final todavía debe probarse. El empaquetado copia los emuladores preparados en runtime/ junto al ejecutable mediante extraFiles; ejecuta setup:mame o setup:snes antes de compilar el instalador. Los binarios se mantienen fuera de Git y se obtienen con el script. La licencia de RetroArch y la de Snes9x se conservan en runtime/retroarch/licenses, junto con un manifiesto de fuentes, versión y hashes. La versión de RetroArch está fijada; el núcleo se obtiene del canal nightly y su hash queda registrado. Los hashes locales son un registro de integridad, no una firma independiente del proveedor.

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
2. Validar RetroArch con FCEUmm o Snes9x y un juego homebrew autorizado.
3. Asociar juegos locales con el catálogo sin confundir variantes.
4. Verificar guardados reales y añadir exportación y recuperación de perfiles y partidas.
5. Ampliar sistemas y completar recursos visuales.
6. Medir rendimiento y preparar una distribución modular para Windows.

## Imágenes de referencia y APIs

Neo-Vault utiliza la API pública de árboles Git de GitHub para generar índices de Libretro Thumbnails. Los índices se incluyen como módulos separados y se cargan únicamente al entrar a cada consola; las imágenes PNG se solicitan bajo demanda desde su repositorio. No se descarga toda la colección de imágenes ni se necesita una clave de API para esta implementación.

```bash
npm run media:sync
# Actualizar índices existentes:
npm run media:sync -- --force
# Actualizar solamente SNES:
npm run media:sync -- --snes --force
```

La API de GitHub puede limitar solicitudes. Si una descarga de índice falla, no se reemplaza el archivo existente de ese sistema. Se incluyen índices para SNES, NES, N64, DS, Mega Drive, Atari 2600, PlayStation, Game Boy y MAME. La comprobación inicial arcade encontró referencias para 11.634 de 19.224 entradas; 7.590 muestran un reemplazo visual.

En la comprobación inicial de SNES hubo coincidencias de recursos para 3.393 de 3.726 títulos y variantes; los 333 restantes no tenían coincidencia. No todos los juegos tienen todos los tipos de imágenes. Se prioriza la edición exacta; si se reutiliza una revisión o región del mismo título, se indica en la vista principal. Una ausencia o fallo de red muestra un icono de reemplazo.

[ScreenScraper](https://www.screenscraper.fr/webapi2.php) es otra API posible para una futura integración con identificación de juegos y medios. Requiere las credenciales correspondientes y todavía no está integrada en Neo-Vault.

## Fuentes y créditos

- [Libretro Database](https://github.com/libretro/libretro-database): listas de referencia, incluidas fuentes No-Intro y Redump.
- [Libretro Thumbnails](https://github.com/libretro-thumbnails): vistas previas cuando coinciden con el nombre del título.
- Wikimedia Commons: fotografías de consolas; las fuentes individuales aparecen en Configuración y en `consoleImages.ts`.
- Evan-Amos: fotografías de consolas utilizadas como base visual.
- Imagen arcade: Joshua Driggs (ZapWizard), edición de fondo por bayo y transparencia por Shooke, bajo [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/). [Archivo original](https://commons.wikimedia.org/wiki/File:Donkey_Kong_arcade_at_the_QuakeCon_2005.png).

Las marcas, imágenes y demás recursos de terceros pertenecen a sus respectivos titulares. Neo-Vault es un proyecto independiente.

## Licencia del proyecto

Pendiente de definir por su autor. Hasta que se añada una licencia explícita, no debe asumirse que el código tiene licencia MIT u otra licencia de código abierto.
