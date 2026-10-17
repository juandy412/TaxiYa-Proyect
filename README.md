# TaxiYa Ocaña · prototipo universitario

Aplicación móvil demostrativa para pasajeros, conductores y administración. El prototipo integra mapas, estimación local de tarifas, solicitudes de viaje, PIN, historial, accesibilidad y un asistente de lenguaje natural.

> **Límites de uso:** es un prototipo local; no lo uses para organizar viajes reales ni para emergencias. Los pagos, documentos, llamadas, chat y acciones SOS son simulados o locales. No hay asignación de taxis conectada entre teléfonos ni un centro de seguridad.

## Requisitos y ejecución

- Node.js compatible con Vite 8 y pnpm.
- Para compilar y revisar tipos: `pnpm build`.
- Para ejecutar la interfaz: `pnpm dev`.
- Si pnpm no está instalado, usa `npm install`, `npm run typecheck`, `npm run build` y `npm run dev`.

`pnpm build` ejecuta primero TypeScript (`tsc --noEmit`) y luego el build de Vite.

## Asistente Taxi IA

La interfaz envía el último mensaje y el contexto mínimo del viaje (rol, idioma, pantalla, estado y lugares guardados) a `POST /api/assistant`. La función serverless de Vercel usa el SDK oficial `@google/genai` y exige JSON estructurado `{ reply, action }` mediante `responseMimeType: "application/json"` y `responseSchema`. El mensaje se sanea para omitir teléfonos, correos, contraseñas y nombres completos indicados en frases comunes; los datos de cuenta nunca se adjuntan al contexto. La clave solo se lee en el servidor y no se incluye en el bundle del navegador.

1. Copia `.env.example` a `.env` para configurar tu entorno local/de despliegue. No subas `.env` ni compartas la clave.
2. Define `GEMINI_API_KEY` y, si quieres cambiar el modelo rápido, `GEMINI_MODEL` (por defecto `gemini-2.5-flash`) en las variables de entorno del proyecto de Vercel. La clave se obtiene desde Google AI Studio y debe permanecer solo en el entorno de servidor.
3. Despliega en Vercel para habilitar `/api/assistant`. Para desarrollo local con la función disponible, utiliza Vercel CLI (`pnpm dlx vercel dev`) y configura allí las variables.
4. `pnpm dev` inicia Vite sin el runtime de funciones de Vercel. En este modo el asistente muestra un aviso y utiliza las respuestas locales de respaldo. Para desarrollo local con el endpoint, usa `pnpm dlx vercel dev`.

Si Gemini responde con límite de cuota (HTTP 429) o el servicio falla, la aplicación no bloquea el chat: utiliza las reglas locales y muestra un aviso amable. SOS, seguridad y cálculo de tarifa permanecen en la lógica local; el modelo no calcula precios.

Las respuestas del modelo se validan en el servidor y en el cliente: se limita el largo del texto, se permite una lista cerrada de acciones y los viajes solo pueden usar lugares configurados. La tarifa nunca viene del modelo; `fareFor` la calcula localmente. Las preguntas de tarifa y seguridad se resuelven primero con lógica local. Si falta la clave, no hay red o falla el servicio, permanecen las reglas locales.

El micrófono usa Web Speech API en español de Colombia (`es-CO`) y solo se muestra cuando el navegador la ofrece. La lectura en voz alta es opcional. Los navegadores sin estas funciones conservan el chat escrito.

## Recorrido de demostración

1. Desde Bienvenida crea una cuenta de pasajero en dos pasos; la app conduce al permiso de ubicación, que permite continuar sin conceder acceso.
2. Busca uno de los destinos guardados, revisa la tarifa orientativa y publica una oferta.
3. Registra una cuenta de conductor, completa los campos de vehículo y marca como cargados los documentos simulados.
4. Crea/inicia sesión con una cuenta de administrador para aprobar el registro local del conductor.
5. Inicia sesión como conductor, conéctate y acepta la solicitud disponible.
6. Marca la llegada, verifica el PIN de demostración, simula el trayecto, confirma el pago simulado y completa la calificación.
7. Consulta el historial y los recibos con los roles correspondientes. Las cuentas y datos están aislados a este navegador.

## Arquitectura

- `src/App.tsx`: estado local, navegación hash, guardas de ruta, roles y modales.
- `src/screens/`: pantallas de pasajero, conductor y administración.
- `src/components/TaxiAssistant.tsx`: interfaz del asistente, acciones locales y respaldo sin servidor.
- `src/lib/assistant.ts`: validación de respuestas y lista de acciones permitidas.
- `src/lib/password.ts`: hash PBKDF2-HMAC-SHA-256 con sal individual mediante Web Crypto; migra contraseñas antiguas al iniciar.
- `src/lib/fare.ts`: distancia y estimación de tarifa local, sin consultar al modelo.
- `src/data/places.ts`: referencias y coordenadas. Las coordenadas de barrios o referencias generales se marcan como aproximadas. Los puntos añadidos de sitios públicos se contrastaron con OpenStreetMap; sus datos se ofrecen bajo ODbL y se atribuyen a sus colaboradores.
- `api/assistant.ts`: función serverless de Vercel; usa `@google/genai`, aplica esquema JSON estructurado, valida acciones y lugares, mantiene la clave fuera del cliente y activa fallback ante cuota o errores.

## Cuentas, privacidad y seguridad

Las cuentas, preferencias, viajes y mensajes permanecen en `localStorage` de este navegador. Las contraseñas guardadas se derivan con PBKDF2-HMAC-SHA-256 y una sal aleatoria por cuenta, y los registros antiguos se migran antes de mostrar la aplicación. **Esto no convierte la autenticación local en una autenticación segura:** quien controla el navegador puede manipular el almacenamiento. En producción hacen falta cuentas, recuperación, sesiones, autorización por rol y hash de contraseñas en un backend.

El formulario “Olvidé mi contraseña” no envía códigos ni permite recuperar cuentas porque no existe un servidor de autenticación. Los documentos no se suben. No se envía una ubicación a contactos ni a una central. El temporizador del Escudo y sus notificaciones se identifican como simulaciones; no detectan movimiento real.

## Mapas y referencias

Los mapas de calles usan CARTO/OpenStreetMap y requieren conexión. Las nuevas coordenadas de lugares se consultaron en Nominatim/OpenStreetMap; las coordenadas previas de zonas amplias se conservan marcadas como aproximadas. No es un localizador de direcciones ni hay seguimiento GPS en vivo. No calcules recorridos reales con estas estimaciones.
