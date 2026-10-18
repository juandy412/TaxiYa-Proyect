import type { Language } from "./types"

const english: Record<string, string> = {
  "MUÉVETE CON CONFIANZA": "MOVE WITH CONFIDENCE",

  "Tu taxi seguro, a un precio justo.": "Your safe taxi, at a fair price.",

  "Estimación orientativa y herramientas de seguridad para tus trayectos por Ocaña.":
    "Fare estimates and safety tools for your rides in Ocaña.",

  "Apariencia inicial": "Initial appearance",

  Claro: "Light",

  Oscuro: "Dark",

  Sistema: "System",

  "Tus datos se guardan en este dispositivo. Para uso real se requiere una cuenta protegida por servidor.":
    "Your data is stored on this device. A secure server account is required for real-world use.",

  "Navegación principal": "Main navigation",

  "Abrir el asistente TaxiYa": "Open the TaxiYa assistant",

  "Iniciar sesión": "Log in",

  Registrarse: "Create account",

  "Ingresa como": "Continue as",

  Ingresa: "Log in",

  "Tipo de cuenta": "Account type",

  "Elige tu tipo de cuenta": "Choose your account type",

  "¿Con qué tipo de cuenta vas a entrar?":
    "Which type of account are you using?",

  "Soy conductor": "I am a driver",

  "Acceso administración": "Administrator access",

  "Entrar como pasajero · pide y consulta tus viajes.":
    "Passenger access · request and review your rides.",

  "Entrar como conductor · gestiona solicitudes y viajes.":
    "Driver access · manage requests and rides.",

  "Acceso de administrador · revisa conductores y reportes.":
    "Administrator access · review drivers and reports.",

  "¿Viajas o conduces? Elige tu perfil en el siguiente paso.":
    "Are you riding or driving? Choose your profile in the next step.",

  "Elegir destino en el mapa": "Choose destination on the map",

  "¿Primera vez en TaxiYa?": "New to TaxiYa?",

  "Crear cuenta de pasajero": "Create passenger account",

  "Crear cuenta de conductor": "Create driver account",

  "Crear acceso de administrador": "Create administrator access",

  "Solo para quien administra la aplicación.":
    "For people who administer the app.",

  "Elige qué cuenta quieres crear. Te guiaremos paso a paso.":
    "Choose the account you want to create. We will guide you step by step.",

  "Pide taxis y consulta tus viajes. El registro tiene 2 pasos.":
    "Request rides and check your trips. Registration has 2 steps.",

  "Registra tus datos y vehículo. El proceso tiene 3 pasos.":
    "Add your details and vehicle. Registration has 3 steps.",

  "Continuar como pasajero": "Continue as passenger",

  "Continuar como conductor": "Continue as driver",

  "Mueve y acerca el mapa. Toca un punto marcado o elige un lugar de la lista.":
    "Pan and zoom the map. Tap a marker or choose a place from the list.",

  "Controles del mapa": "Map controls",

  "Acercar mapa": "Zoom in",

  "Alejar mapa": "Zoom out",

  "Mostrar mi ubicación": "Show my location",

  "Acerca el mapa para elegir entre estos lugares.":
    "Zoom in to choose between these places.",

  "Este navegador no puede compartir tu ubicación.":
    "This browser cannot share your location.",

  "No pudimos obtener tu ubicación. Revisa el permiso del navegador.":
    "We couldn't get your location. Check your browser permission.",

  "Tu ubicación en este dispositivo.": "Your location on this device.",

  "Paso 1 de 2": "Step 1 of 2",

  "Paso 2 de 2": "Step 2 of 2",

  Conductor: "Driver",

  Administrador: "Administrator",

  Admin: "Admin",

  "Correo electrónico": "Email address",

  Contraseña: "Password",

  Continuar: "Continue",

  "Regístrate aquí": "Create an account",

  "Crear cuenta": "Create account",

  Volver: "Back",

  Cerrar: "Close",

  "Ocultar contraseña": "Hide password",

  "Mostrar contraseña": "Show password",

  "Taxi IA": "Taxi AI",

  Inicio: "Home",

  Viajes: "Trips",

  Ayuda: "Help",

  Perfil: "Profile",

  Ganancias: "Earnings",

  "Tarifa sugerida": "Suggested fare",

  Recogida: "Pickup",

  DESTINO: "DESTINATION",

  "Tarifa estimada sin dirección exacta":
    "Estimated fare; exact address unavailable",

  "Tarifa orientativa": "Estimated fare",

  "datos orientativos": "estimate only",

  "Disminuir tarifa": "Decrease fare",

  "Aumentar tarifa": "Increase fare",

  "Puede tardar más en aceptarse": "It may take longer to be accepted",

  "Más alto de lo habitual": "Higher than usual",

  "Precio justo": "Fair price",

  "Precio justo cuando tu oferta está dentro del rango sugerido.":
    "Your offer is fair when it falls within the suggested range.",

  "Elige también un valor intermedio":
    "You can also choose any amount in between",

  "Ajustar oferta entre el mínimo y el máximo":
    "Adjust offer between minimum and maximum",

  Mínimo: "Minimum",

  Recomendado: "Suggested",

  Máximo: "Maximum",

  "Volver al precio sugerido": "Restore suggested fare",

  "Hora pico": "Rush hour",

  Lluvia: "Rain",

  Nocturno: "Night",

  "Método de pago": "Payment method",

  Efectivo: "Cash",

  Nequi: "Nequi",

  Daviplata: "Daviplata",

  "Elige el método; confirmar el pago ocurre al finalizar el viaje.":
    "Choose your method; payment is confirmed at the end of the ride.",

  "¿Por qué este precio?": "Why this price?",

  "Ve el cálculo completo y transparente": "See the full fare breakdown",

  "Buscar taxi por": "Find a taxi for",

  "Estimación no oficial. Tú eliges tu oferta.":
    "Unofficial estimate. You choose your offer.",

  "Pago en efectivo": "Cash payment",

  "Celular asociado al pago": "Mobile number for payment",

  "Referencia de prueba": "Test reference",

  "Ingresa un número de celular de 10 dígitos.":
    "Enter a 10-digit mobile number.",

  "Ingresa una referencia de prueba de al menos 4 caracteres.":
    "Enter a test reference with at least 4 characters.",

  "Confirmar método de pago": "Confirm payment method",

  "Taxi IA está escribiendo…": "Taxi AI is typing…",

  "El asistente remoto alcanzó su límite o no está disponible. Te responderé con opciones locales.":
    "The remote assistant reached its limit or is unavailable. I will use local options.",

  Reintentar: "Try again",

  "Dictar mensaje": "Dictate a message",

  Escuchando: "Listening",

  "Leer respuestas en voz alta": "Read replies aloud",

  "Desactivar lectura en voz alta": "Turn off read aloud",

  "Enviar mensaje": "Send message",

  "Escribe tu pregunta": "Type your question",

  "Escribe tu pregunta para Taxi": "Type your question for Taxi",

  "Elegir en el mapa": "Choose on the map",

  "Selecciona el idioma": "Choose your language",

  Español: "Spanish",

  English: "English",

  Idioma: "Language",

  Ajustes: "Settings",

  "Guardar ajustes": "Save settings",

  Apariencia: "Appearance",

  "Lectura grande": "Large text",

  Sonido: "Sound",

  "Métodos de pago": "Payment methods",

  Todos: "All",

  Completados: "Completed",

  Cancelados: "Cancelled",

  "No hay viajes": "No trips yet",

  "Pedir un taxi": "Request a taxi",

  "Cancelar solicitud": "Cancel request",

  "Conductores cercanos": "Nearby drivers",

  "Esperando conductores conectados": "Waiting for connected drivers",

  "Solicitud publicada": "Request posted",

  "Hay un conductor disponible": "A driver is available",

  "Consultar a Taxi": "Ask Taxi",

  "Confirmar pago": "Confirm payment",

  "Confirmo que recibí el pago": "I confirm that I received the payment",

  "Confirmar y continuar": "Confirm and continue",

  "Finalizar viaje": "Finish ride",

  "Calificar viaje": "Rate the ride",

  "Enviar calificación": "Submit rating",

  "Registrar conductor": "Register as a driver",

  "Registrar pasajero": "Register as a passenger",

  "Qué bueno verte": "Welcome back",

  "Ingresa para continuar en TaxiYa Ocaña.":
    "Log in to continue to TaxiYa Ocaña.",

  "¿Aún no tienes cuenta?": "Don't have an account yet?",

  "¿Olvidaste tu contraseña?": "Forgot your password?",

  "nombre@correo.com": "name@email.com",

  "Tu nombre completo": "Your full name",

  "Nombre completo": "Full name",

  Celular: "Mobile number",

  "Número de celular": "Mobile number",

  "Escribe tu contraseña": "Enter your password",

  "Confirmar contraseña": "Confirm password",

  "¿Cómo prefieres que te llamemos? (opcional)":
    "How would you like us to address you? (optional)",

  Pasajera: "Passenger",

  Pasajero: "Passenger",

  "Prefiero no decirlo": "Prefer not to say",

  "¿Cómo quieres usar TaxiYa?": "How would you like to use TaxiYa?",

  "Elige un tipo de cuenta. Podrás cambiar de rol al iniciar sesión.":
    "Choose an account type. You can switch roles when you log in.",

  "Tipo de cuenta para registrarse": "Account type for registration",

  "Solicita viajes y gestiona tus trayectos.":
    "Request rides and manage your trips.",

  "Registra tu vehículo y recibe solicitudes.":
    "Register your vehicle and receive ride requests.",

  "Revisa registros y configuración local.":
    "Review registrations and local settings.",

  "Tus datos": "Your details",

  "Viaja con más tranquilidad": "Ride with greater peace of mind",

  "Usaremos estos datos para identificarte.":
    "We will use these details to identify you.",

  "Añade un contacto y cuéntanos cómo ayudarte mejor.":
    "Add a contact and tell us how we can best support you.",

  "¿A dónde quieres ir?": "Where would you like to go?",

  "Elige tu destino": "Choose your destination",

  "¿A dónde vamos?": "Where are we going?",

  "Busca tu destino": "Search for your destination",

  "Escoge el punto de recogida": "Choose your pickup point",

  "Lugar de recogida": "Pickup location",

  "Pedir taxi": "Request a taxi",

  "Buscar taxi": "Find a taxi",

  Cancelar: "Cancel",

  "Cancelar viaje": "Cancel ride",

  "Ver opciones": "View options",

  Llamar: "Call",

  Chat: "Chat",

  "Lugares guardados": "Saved places",

  "Guardar lugares": "Save places",

  Casa: "Home",

  Trabajo: "Work",

  "Datos personales": "Personal details",

  "Contacto de confianza": "Trusted contact",

  "Seguridad y privacidad": "Safety and privacy",

  "Cambiar contraseña": "Change password",

  "Ayuda y soporte": "Help and support",

  "Idioma, apariencia y sonido": "Language, appearance and sound",

  "Términos y privacidad": "Terms and privacy",

  "Cerrar sesión": "Log out",

  "Eliminar cuenta": "Delete account",

  "Completa tu perfil": "Complete your profile",

  "Editar perfil": "Edit profile",

  "TU CUENTA": "YOUR ACCOUNT",

  "Pago con": "Pay with",

  "Completaste el viaje de forma segura.": "You completed the ride safely.",

  "No hay solicitudes para comparar.": "There are no ride requests to compare.",

  "Verifica el PIN con la persona pasajera antes de iniciar el trayecto.":
    "Verify the passenger's PIN before starting the trip.",

  "El PIN solo se solicita cuando llegas al punto de recogida. No inicies el viaje sin verificarlo.":
    "Only request the PIN when you reach the pickup point. Do not start the trip before verifying it.",

  "Comparte el PIN con el conductor solo cuando estés dentro del taxi. Nunca lo envíes por chat.":
    "Share the PIN with the driver only after you are inside the taxi. Never send it in chat.",

  "No se realizó ningún cobro.": "No charge was made.",

  Resultados: "Results",

  "Lugares sugeridos": "Suggested places",

  "Marca una zona de Ocaña": "Choose an area in Ocaña",

  "No tenemos una dirección exacta para este lugar.":
    "We do not have an exact address for this place.",

  "Usar como destino": "Use as destination",

  "Sin resultados": "No results",

  "Escribe un lugar o elígelo en el mapa.":
    "Type a place or choose it on the map.",

  "O ELIGE UN PUNTO DE REFERENCIA": "OR CHOOSE A LANDMARK",

  "PUNTO ELEGIDO": "SELECTED LOCATION",

  "Confirmar este punto": "Confirm this location",

  "Puntos de referencia": "Landmarks",

  "El destino debe ser diferente del punto de recogida. Cambia el origen o elige otro destino.":
    "Your destination must be different from your pickup. Change the pickup or choose another destination.",

  "No encontramos una dirección exacta": "We could not find an exact address",

  "Busca un lugar de Ocaña": "Search for a place in Ocaña",

  sugerencias: "suggestions",

  "No hay lugares que coincidan.": "No matching places found.",

  "Mapa de calles de Ocaña": "Ocaña street map",

  "El mapa de calles necesita conexión a Internet.":
    "The street map needs an internet connection.",

  "El proveedor de calles no respondió.":
    "The street map provider did not respond.",

  "Cargando las calles reales de la zona…":
    "Loading real street data for this area…",

  "No encontramos uno de los puntos seleccionados en el mapa.":
    "We could not locate one of the selected places on the map.",

  "No se pudo calcular la ruta por calles. Puedes volver a intentarlo más tarde.":
    "We could not calculate a street route. You can try again later.",

  "Vista de calles no disponible": "Street map unavailable",

  "Preparando mapa de calles": "Loading street map",

  "Asistente Taxi": "Taxi assistant",

  "Asistente local de TaxiYa": "TaxiYa local assistant",

  "Cerrar asistente": "Close assistant",

  "Destino sin dirección exacta": "Destination has no exact address",

  "Sí, usar ese destino": "Yes, use this destination",

  "Preguntas sugeridas": "Suggested questions",

  "Escape cierra · Enter envía": "Escape closes · Enter sends",

  "Llamar al pasajero": "Call passenger",

  "Llamar al conductor": "Call driver",

  "Volver a buscar": "Search again",

  "Subir la oferta": "Increase the offer",

  "Cambiar destino": "Change destination",

  "Ayuda con el viaje": "Help with your ride",

  "¿Cómo cancelo?": "How do I cancel?",

  "Ver mis ganancias": "View my earnings",

  "¿Qué solicitud me conviene?": "Which ride request is best for me?",

  "¿Cuánto llevo hoy?": "How much have I earned today?",

  "Ayuda con el PIN": "PIN help",

  "El taxi no llega": "The taxi is late",

  "Compartir mi viaje": "Share my ride",

  "Tengo un problema con mi viaje": "I have a problem with my ride",

  "Solicitud publicada en este dispositivo": "Request posted on this device",

  "No hay conductores disponibles confirmados en este momento. No asignaremos una persona ficticia ni mostraremos ubicaciones inventadas.":
    "There are no confirmed drivers available right now. We will not assign a fictional driver or show invented locations.",

  "La búsqueda compartida en tiempo real requiere que pasajeros y conductores estén conectados a un servidor.":
    "Live ride matching requires passengers and drivers to be connected to a server.",

  "Conductor registrado en este dispositivo":
    "Driver registered on this device",

  Disponible: "Available",

  Elegir: "Choose",

  "Total a recibir": "Total to receive",

  "Marca esta casilla solo después de recibir el dinero.":
    "Check this box only after receiving the money.",

  "La persona usuaria indicó que pagará con": "The passenger selected",

  "El prototipo registra la confirmación, pero no procesa dinero real.":
    "This prototype records confirmation but does not process real payments.",

  "No encontramos un administrador registrado. Crea una cuenta para continuar.":
    "No administrator account was found. Create an account to continue.",

  "No encontramos una cuenta con ese correo. ¿Quieres crearla?":
    "No account was found with that email. Would you like to create one?",

  "Contraseña incorrecta.": "Incorrect password.",

  "Contraseña incorrecta": "Incorrect password",

  "Ingresa un correo válido.": "Enter a valid email address.",

  "Escribe tu contraseña.": "Enter your password.",

  "Escribe tu nombre completo.": "Enter your full name.",

  "El celular debe tener 10 dígitos.": "The mobile number must have 10 digits.",

  "Usa mínimo 8 caracteres, una letra y un número.":
    "Use at least 8 characters, including one letter and one number.",

  "Las contraseñas no coinciden.": "The passwords do not match.",

  "Este correo ya está registrado en este dispositivo. Inicia sesión.":
    "This email is already registered on this device. Log in instead.",

  "Elige el parentesco.": "Choose the relationship.",

  "Debes autorizar el tratamiento de tus datos.":
    "You must consent to the processing of your data.",

  "Crear cuenta ·": "Create account ·",

  "Crear cuenta · 1 de 2": "Create account · 1 of 2",

  "Crear cuenta · 2 de 2": "Create account · 2 of 2",

  "Crear cuenta de conductor · 1 de 3": "Driver registration · 1 of 3",

  "Crear cuenta de conductor · 2 de 3": "Driver registration · 2 of 3",

  "Crear cuenta de conductor · 3 de 3": "Driver registration · 3 of 3",

  "Recuperar acceso": "Recover account",

  Solicitud: "Ride request",

  "Detalle de solicitud": "Ride request details",

  "Verificar identidad": "Verify identity",

  "Historial de viajes": "Ride history",

  "Perfil de conductor": "Driver profile",

  Administración: "Administration",

  "Detalle del viaje": "Trip details",

  "Mis viajes": "My trips",

  "Conductor asignado": "Driver assigned",

  "Solicitudes cercanas": "Nearby requests",

  Notificaciones: "Notifications",

  "Registrar conductor ·": "Driver registration ·",

  Guardar: "Save",

  Editar: "Edit",

  Eliminar: "Delete",

  "Guardar cambios": "Save changes",

  "Ver trayecto": "View route",

  "Llegué al punto": "I have arrived",

  "Aceptar viaje": "Accept ride",

  Rechazar: "Decline",

  "Verificar y comenzar": "Verify and start",

  "Enviar para aprobación": "Submit for approval",

  Calificar: "Rate",

  "Reportar un problema": "Report a problem",

  "Enviar un reporte": "Submit a report",

  "Volver al inicio": "Back to home",

  "Tu cuenta": "Your account",

  "Viaje completado": "Ride completed",

  Completado: "Completed",

  Cancelado: "Cancelled",

  Pendiente: "Pending",

  Aprobado: "Approved",

  Rechazado: "Rejected",

  "Parque 29 de Mayo": "Parque 29 de Mayo",

  "Guardamos el contacto en este dispositivo. No enviamos alertas externas.":
    "We save this contact on this device. No external alerts are sent.",

  Parentesco: "Relationship",

  Selecciona: "Select",

  Familiar: "Family member",

  Amistad: "Friend",

  Pareja: "Partner",

  "FICHA DE NECESIDADES": "ACCESSIBILITY NEEDS",

  "Movilidad reducida": "Reduced mobility",

  Acompañante: "Companion",

  "Silla para niños": "Child seat",

  "Equipaje grande": "Large luggage",

  Mascota: "Pet",

  "Ayuda con bolsas": "Help with bags",

  "Nota para el conductor (opcional)": "Note for the driver (optional)",

  "Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012. Los usamos solo para tu seguridad y tu viaje.":
    "I consent to the processing of my personal data under Law 1581 of 2012. It is used only for your safety and ride.",

  "Política de privacidad": "Privacy policy",

  "Crear mi cuenta": "Create my account",

  "Nombre del contacto": "Contact name",

  "Celular del contacto": "Contact mobile number",

  "Guardamos los datos localmente": "Your details are stored locally",

  "¿Por qué esta tarifa?": "Why this fare?",

  "Distancia orientativa": "Estimated distance",

  "Tiempo orientativo": "Estimated duration",

  "Condición aplicada manualmente": "Manually selected condition",

  "Ajuste elegido": "Selected adjustment",

  "Horario normal": "Regular hours",

  "Lluvia indicada": "Rain selected",

  Sí: "Yes",

  No: "No",

  "Tarifa sugerida:": "Suggested fare:",

  "Tú decides siempre": "You are always in control",

  "Total del viaje:": "Ride total:",

  "Entrega el valor acordado al conductor al terminar el trayecto.":
    "Pay the agreed amount to the driver at the end of the ride.",

  "Prototipo de demostración: no se realiza un cobro, no se envían estos datos y no debes ingresar claves, códigos de seguridad ni credenciales reales.":
    "Demo prototype: no payment is processed and these details are not sent. Do not enter real passwords, security codes, or credentials.",

  "Método elegido:": "Selected payment method:",
}

export function translate(value: string, language: Language): string {
  if (language === "es") return value

  const exact = english[value]

  if (exact) return exact

  for (const [spanish, translated] of Object.entries(english)) {
    if (!spanish.includes(" ") || !value.includes(spanish)) continue

    return value.replace(spanish, translated)
  }

  return value
}
