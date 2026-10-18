# TaxiYa Ocaña · prototipo universitario

Aplicación móvil demostrativa para pasajeros, conductores y administración. El prototipo integra mapas, estimación local de tarifas, solicitudes de viaje, PIN, historial, accesibilidad y un asistente de lenguaje natural.

> **Límites de uso:** prototipo universitario, no usar para viajes reales ni emergencias. Si Supabase no está configurado, los viajes se quedan en el dispositivo. El SOS muestra enlaces para llamar y compartir; el Escudo y el movimiento del taxi son demostraciones, no monitoreo real.

## Requisitos y ejecución

- Node.js compatible con Vite 8 y pnpm.
- Para compilar y revisar tipos: `pnpm build`.
- Para ejecutar la interfaz: `pnpm dev`.
- Abre la app local en `http://localhost:5173`. Para probar `/api/assistant` usa `pnpm dlx vercel dev`.
- Si pnpm no está instalado, usa `npm install`, `npm run typecheck`, `npm run build` y `npm run dev`.

`pnpm build` ejecuta primero TypeScript (`tsc --noEmit`) y luego el build de Vite.

## Capturas y demo

Las capturas se regeneran con `pnpm capture:demo` mientras Vite está activo. El script usa Playwright y crea la carpeta `docs/capturas/`.

![Bienvenida de TaxiYa](./docs/capturas/bienvenida.png)

![Inicio de sesión](./docs/capturas/inicio-sesion.png)

![Mapa y selección de destino](./docs/capturas/mapa-y-destino.png)

No hay una URL de demo pública desplegada configurada en este repositorio; no se publica una URL ficticia. El enlace local para la presentación es `http://localhost:5173`.

## Auditoría de interfaz

Instala las dependencias con `pnpm install` y ejecuta `pnpm exec playwright install chromium` una vez. Luego corre `pnpm audit:ui`. El script recorre las pantallas públicas y las rutas de los tres roles en 360×640, 375×667, 393×852, 412×915 y 430×932; verifica modo claro, oscuro y texto grande, solapamientos, elementos tapados, botones menores de 44×44, texto desbordado y desbordamiento horizontal. Si prefieres usar una instancia ya iniciada, define `AUDIT_BASE_URL` antes de ejecutarlo.

## Asistente Taxi IA

La interfaz envía el último mensaje y el contexto mínimo del viaje (rol, idioma, pantalla, estado y lugares guardados) a `POST /api/assistant`. La función serverless de Vercel usa el SDK oficial `@google/genai` y exige JSON estructurado `{ reply, action }` mediante `responseMimeType: "application/json"` y `responseSchema`. El mensaje se sanea para omitir teléfonos, correos, contraseñas y nombres completos indicados en frases comunes; los datos de cuenta nunca se adjuntan al contexto. La clave solo se lee en el servidor y no se incluye en el bundle del navegador.

1. Copia `.env.example` a `.env` para configurar tu entorno local/de despliegue. No subas `.env` ni compartas claves.
2. Define `GEMINI_API_KEY` y, si quieres cambiar el modelo rápido, `GEMINI_MODEL` (por defecto `gemini-2.5-flash`) en las variables de entorno del proyecto de Vercel. La clave se obtiene desde Google AI Studio y debe permanecer solo en el entorno de servidor. El endpoint registra en los logs del servidor el estado y cuerpo devueltos por Gemini; no registra mensajes ni datos de cuenta.
3. Despliega en Vercel para habilitar `/api/assistant`. Para desarrollo local con la función disponible, utiliza Vercel CLI (`pnpm dlx vercel dev`) y configura allí las variables.
4. `pnpm dev` inicia Vite sin el runtime de funciones de Vercel. En este modo el asistente muestra un aviso y utiliza las respuestas locales de respaldo. Para desarrollo local con el endpoint, usa `pnpm dlx vercel dev`.

Si Gemini devuelve HTTP 429 por cuota, la aplicación utiliza las reglas locales y muestra un aviso amable. Para errores de clave/permisos, modelo, red o tiempo de espera, usa el respaldo local sin presentarlos como un límite de cuota. El endpoint reintenta una vez los errores transitorios con una espera breve y un timeout. SOS, seguridad y cálculo de tarifa permanecen en la lógica local; el modelo no calcula precios.

Las respuestas del modelo se validan en el servidor y en el cliente: se limita el largo del texto, se permite una lista cerrada de acciones y los viajes solo pueden usar lugares configurados. La tarifa nunca viene del modelo; `fareFor` la calcula localmente. Las preguntas de tarifa y seguridad se resuelven primero con lógica local. Si falta la clave, no hay red o falla el servicio, permanecen las reglas locales.

El micrófono usa Web Speech API en español de Colombia (`es-CO`) y solo se muestra cuando el navegador la ofrece. La lectura en voz alta es opcional. Los navegadores sin estas funciones conservan el chat escrito.

El endpoint solo acepta POST con `Content-Type: application/json`, limita el texto a 500 caracteres y responde errores con `{ error: { code, message } }`. Si defines `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`, aplica un máximo compartido de 20 solicitudes por minuto e IP usando Upstash Redis. No usa un contador en memoria local, ya que no es fiable entre instancias serverless. Si Upstash no está configurado, no se aplica el límite por IP; configúralo para producción.

## Viajes entre teléfonos (Supabase)

La sincronización en tiempo real usa el plan gratuito de Supabase. Sin estas variables, el prototipo conserva las solicitudes solo localmente y lo avisa:

1. Crea un proyecto Supabase.
2. En SQL Editor ejecuta [`supabase/schema.sql`](./supabase/schema.sql). Crea la tabla `rides`, habilita Realtime y define políticas públicas de demostración.
3. Copia Project URL y la clave **anon/public** a `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON_PUBLIC
   ```

4. Reinicia Vite. En dos navegadores/dispositivos, registra un pasajero y un conductor aprobado; conecta al conductor y publica una solicitud.

La tabla sincroniza únicamente identificador aleatorio, origen, destino, oferta calculada localmente, estado, nombre del conductor y placa. No envía teléfono, correo, contraseña ni coordenadas GPS. Las políticas del SQL permiten lectura/escritura anónima para facilitar la demostración: **no son aptas para producción**. Producción requiere autenticación Supabase, RLS por usuario/rol, autorización de conductor y protección del endpoint público. El estado admitido es `requested`, `accepted`, `enroute`, `arrived`, `in_trip`, `finished` o `cancelled`; el conductor acepta de forma condicional para evitar que se acepten dos veces.

Compartir abre Web Share cuando está disponible o un enlace a WhatsApp. El enlace `#/shared-trip?id=…` muestra el estado sincronizado; no expone ubicación GPS ni funciona si no se configuró Supabase.

## Recorrido de demostración

1. Desde Bienvenida crea una cuenta de pasajero en dos pasos; la app solicita ubicación para fijar el origen. Si se deniega el permiso, puedes continuar y elegir un punto manualmente.
2. Busca uno de los destinos guardados, revisa la tarifa orientativa y publica una oferta.
3. Registra una cuenta de conductor, completa los campos de vehículo y elige imágenes o PDF para vista previa local. Los archivos no se cargan a un servidor.
4. Crea/inicia sesión con una cuenta de administrador para aprobar el registro local del conductor.
5. Inicia sesión como conductor, conéctate y acepta la solicitud disponible. Para recibirla en otro teléfono, configura Supabase antes.
6. Marca la llegada, verifica el PIN de demostración, simula el trayecto, confirma el pago simulado y completa la calificación.
7. Consulta el historial y los recibos con los roles correspondientes. Las cuentas y datos están aislados a este navegador.

## Arquitectura

- `src/App.tsx`: estado local, navegación hash, guardas de ruta, roles y modales.
- `src/screens/`: pantallas de pasajero, conductor y administración.
- `src/components/TaxiAssistant.tsx`: interfaz del asistente, acciones locales y respaldo sin servidor.
- `src/lib/assistant.ts`: validación de respuestas y lista de acciones permitidas.
- `src/lib/password.ts`: hash PBKDF2-HMAC-SHA-256 con sal individual mediante Web Crypto; migra contraseñas antiguas al iniciar.
- `src/lib/fare.ts`: distancia y estimación de tarifa local, sin consultar al modelo.
- `src/lib/liveRides.ts` y `supabase/schema.sql`: sincronización Realtime opcional de solicitudes sin cuentas o teléfonos.
- `src/components/SharedTrip.tsx`: vista pública de seguimiento por enlace.
- `public/manifest.webmanifest` y `public/sw.js`: instalación PWA y caché del shell; el mapa de OpenStreetMap necesita conexión.
- `src/data/places.ts`: referencias y coordenadas. Las coordenadas de barrios o referencias generales se marcan como aproximadas. Los puntos añadidos de sitios públicos se contrastaron con OpenStreetMap; sus datos se ofrecen bajo ODbL y se atribuyen a sus colaboradores.
- `api/assistant.ts`: función serverless de Vercel; usa `@google/genai`, aplica esquema JSON estructurado, valida acciones y lugares, mantiene la clave fuera del cliente y activa fallback ante cuota o errores.

## Cuentas, privacidad y seguridad

Las cuentas, preferencias, viajes e historial permanecen en `localStorage` de este navegador. Las contraseñas guardadas se derivan con PBKDF2-HMAC-SHA-256 y una sal aleatoria por cuenta. **Esto no convierte la autenticación local en una autenticación segura:** quien controla el navegador puede manipular el almacenamiento. El flujo “Olvidé mi contraseña” usa un código de seis dígitos mostrado en la pantalla como demostración; no verifica la identidad por correo. En producción hacen falta cuentas, recuperación, sesiones, autorización por rol y hash de contraseñas en un backend.

Los documentos de conductor se previsualizan con URL local; no se suben. SOS no contacta automáticamente a una central: inicia la cuenta atrás y deja disponibles enlaces `tel:123` y WhatsApp por la restricción de ventanas emergentes del navegador. El Escudo y las notificaciones son simulaciones y no detectan movimiento real.

## Mapas y referencias

Los mapas de calles usan teselas de OpenStreetMap y requieren conexión. Al aceptar GPS, la ubicación exacta se conserva localmente para ubicar el origen y calcular la distancia; solo se sincroniza el nombre del lugar de referencia. El marcador de taxi y su ETA son una animación ilustrativa basada en la ruta disponible, no una ubicación real del conductor. No calcules recorridos reales con estas estimaciones.
