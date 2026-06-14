/** Contenido inicial del bot CamSoft — se inserta/actualiza al arrancar la API */
const { BOT_SEED_EXTRA } = require('./bot-content-extra');

const BOT_SEED_BASE = [
    {
        trigger_key: 'greeting',
        question: 'Saludo principal',
        faq_type: 'menu',
        sector: null,
        keywords: null,
        sort_order: 1,
        answer: `Hola 👋 Soy el asistente de *CamSoft* (Milton Narvaez).

Escribe *1* o *2*:

1 = 🛠 Soporte
2 = 💼 Ventas

¿Dudas? Escribe: ayuda`
    },
    {
        trigger_key: 'soporte',
        question: 'Opción soporte',
        faq_type: 'menu',
        sector: null,
        keywords: '1,soporte,support,tecnico,asistencia,falla,error,problema,no funciona,ayuda tecnica',
        sort_order: 2,
        answer: `*Soporte CamSoft*

Te ayudamos con:
• Fallas o errores en sistemas CamSoft
• Accesos, usuarios y permisos
• Dudas de uso de plataformas (LMS, portales, etc.)
• Ajustes menores y acompañamiento

Para atenderte mejor, cuéntanos:
• ¿Qué sistema o módulo presenta el problema?
• ¿Qué error ves o qué dejó de funcionar?

Escribe: hablar con una persona
Horario de respuesta: 24–48 h hábiles.`
    },
    {
        trigger_key: 'ventas',
        question: 'Opción ventas',
        faq_type: 'menu',
        sector: null,
        keywords: '2,ventas,comercial,cotizar,cotizacion,proyecto,nuevo,informacion,comprar,contratar',
        sort_order: 3,
        answer: `__SALES_MENU__`
    },
    {
        trigger_key: 'public',
        question: 'Sector público',
        faq_type: 'menu',
        sector: 'public',
        keywords: 'publico,gobierno,estatal,municipio,alcaldia,gobernacion,concejo,camara,pagina web,sitio web,portal web,web institucional,landing',
        sort_order: 4,
        answer: `*Sector público — CamSoft*

Desarrollamos soluciones como:
• Portales de transparencia y datos abiertos
• PQRSD / PQRS en línea
• Gestión documental y archivo
• Trámites y ventanilla única digital
• Integración con sistemas existentes

¿Qué necesitas? Escribe una palabra, por ejemplo:
PQRSD, transparencia, portal, cotización
O escribe: hablar con una persona`
    },
    {
        trigger_key: 'health',
        question: 'Sector salud',
        faq_type: 'menu',
        sector: 'health',
        keywords: 'salud,sector salud,hospital,clinica,ips,eps,medic,medicina',
        sort_order: 5,
        answer: `*Sector salud — CamSoft*

Trabajamos en:
• Historias clínicas electrónicas
• Agendamiento de citas y recordatorios
• Telemedicina y videoconsulta
• Farmacia e inventario
• Reportes para auditoría y calidad

Cuéntame tu necesidad. Escribe, por ejemplo:
historia clínica, citas, telemedicina, cotización
O escribe: hablar con una persona`
    },
    {
        trigger_key: 'education',
        question: 'Sector educación',
        faq_type: 'menu',
        sector: 'education',
        keywords: 'educacion,sector educacion,sector educación,colegio,universidad,institucion,academ',
        sort_order: 6,
        answer: `*Sector educación — CamSoft*

Desarrollamos:
• Plataformas LMS (Moodle o a medida)
• Matrículas, pagos y cartera
• Evaluaciones, notas y certificados
• Bibliotecas digitales
• Reportes académicos e integraciones

¿Qué buscas? Escribe, por ejemplo:
LMS, matrículas, MVP, migración, cotización
O escribe: hablar con una persona`
    },
    {
        trigger_key: 'human',
        question: 'Hablar con humano',
        faq_type: 'menu',
        sector: null,
        keywords: 'humano,persona,asesor,milton,agente,llamar',
        sort_order: 7,
        answer: `Perfecto. *Milton Narvaez* o un asesor de CamSoft revisará tu mensaje pronto.

Mientras tanto, si quieres adelantar:
• Describe brevemente tu proyecto
• Indica plazo aproximado si lo tienes
• Deja un correo o teléfono de contacto

Respuesta habitual: 24–48 h hábiles.`
    },
    {
        trigger_key: 'contact',
        question: 'Datos de contacto',
        faq_type: 'menu',
        sector: null,
        keywords: 'contacto,correo,email,telefono,whatsapp,direccion',
        sort_order: 8,
        answer: `*Contacto CamSoft*
📧 nf_alejo@yahoo.com
📱 +57 316 681 2189
🌐 camsoft.com.co

Horario de respuesta: 24–48 h hábiles.
Escribe menu para volver al inicio.`
    },
    {
        trigger_key: 'fallback',
        question: 'Respuesta cuando no entiende',
        faq_type: 'fallback',
        sector: null,
        keywords: null,
        sort_order: 99,
        answer: `No entendí tu mensaje.

• menu → volver al inicio
• 1 → Soporte
• 2 → Ventas
• ayuda → cómo usar el chat

O escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_support_access',
        question: 'Acceso / contraseña',
        faq_type: 'keyword',
        sector: null,
        keywords: 'acceso,contraseña,password,clave,login,ingresar,no puedo entrar,usuario bloqueado',
        sort_order: 15,
        answer: `*Problemas de acceso*

Indícanos:
• Usuario o correo registrado
• Sistema (LMS, portal, etc.)
• Captura del error si es posible

Un técnico revisará y te contactará. Escribe *hablar con una persona* para priorizar.`
    },
    // --- Palabras clave globales ---
    {
        trigger_key: 'kw_quote',
        question: 'Cotización / precio',
        faq_type: 'keyword',
        sector: null,
        keywords: 'cotizacion,cotizar,precio,costo,presupuesto,cuanto cuesta,valor,tarifa',
        sort_order: 10,
        answer: `*Cotización CamSoft*

El valor depende del alcance: módulos, integraciones, plazos y si es MVP o sistema completo.

Proceso típico:
1. Entendemos tu necesidad (15–30 min)
2. Propuesta técnica y económica
3. Desarrollo por fases

Escribe *hablar con una persona* y Milton te prepara una cotización orientativa sin compromiso.`
    },
    {
        trigger_key: 'kw_timeline',
        question: 'Plazos de entrega',
        faq_type: 'keyword',
        sector: null,
        keywords: 'plazo,tiempo,cuanto tarda,duracion,semanas,meses,entrega,rapido',
        sort_order: 11,
        answer: `*Plazos orientativos CamSoft*

• MVP / piloto: 4–8 semanas
• Sistema mediano: 2–4 meses
• Proyecto grande o migración: 4–12 meses

Depende de requisitos, integraciones y disponibilidad de información del cliente.

¿Tienes fecha límite? Escribe *hablar con una persona* para revisar tu caso.`
    },
    {
        trigger_key: 'kw_mvp',
        question: 'MVP',
        faq_type: 'keyword',
        sector: null,
        keywords: 'mvp,piloto,prototipo,minimo viable,primera version',
        sort_order: 12,
        answer: `*MVP con CamSoft*

Un MVP incluye las funciones esenciales para validar tu idea con usuarios reales, sin construir todo de una vez.

Ventajas:
• Menor inversión inicial
• Salida al mercado más rápida
• Ajustes según feedback real

Cuéntanos qué funcionalidad es imprescindible y te orientamos. Escribe *hablar con una persona*.`
    },
    {
        trigger_key: 'kw_migration',
        question: 'Migración de sistemas',
        faq_type: 'keyword',
        sector: null,
        keywords: 'migracion,migrar,trasladar,cambiar sistema,legacy,sistema actual,sistema viejo',
        sort_order: 13,
        answer: `*Migración de sistemas*

CamSoft migra datos y procesos desde Excel, sistemas legados o plataformas antiguas hacia soluciones modernas.

Consideramos:
• Inventario de datos existentes
• Mapeo y limpieza
• Período de convivencia (opcional)
• Capacitación al equipo

Describe tu sistema actual y escribe *hablar con una persona* para una evaluación.`
    },
    // --- Educación ---
    {
        trigger_key: 'kw_edu_lms',
        question: 'LMS / plataforma educativa',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'lms,moodle,plataforma,aula virtual,aula,curso,cursos,elearning,e-learning,capacitacion',
        sort_order: 20,
        answer: `*Plataforma LMS — CamSoft*

Incluye típicamente:
• Cursos, módulos y contenidos (video, PDF, SCORM)
• Usuarios: estudiantes, docentes, administradores
• Evaluaciones, quizzes y certificados
• Reportes de avance y asistencia
• Integración con pagos o matrículas (opcional)

Implementación: 6–12 semanas según alcance.

¿Es LMS nuevo o migración? Escribe *MVP*, *migración* o *hablar con una persona*.`
    },
    {
        trigger_key: 'kw_edu_enrollment',
        question: 'Matrículas',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'matricula,matriculas,inscripcion,inscripciones,admisiones,pagos estudiantes,cartera',
        sort_order: 21,
        answer: `*Matrículas y pagos — CamSoft*

Módulos habituales:
• Formulario de inscripción en línea
• Pagos en línea (Pasarela PSE/tarjeta)
• Estados: pendiente, pagado, mora
• Reportes para contabilidad y secretaría

Se integra con LMS o funciona de forma independiente.

Escribe *cotización* o *hablar con una persona*.`
    },
    // --- Público ---
    {
        trigger_key: 'kw_pub_pqrsd',
        question: 'PQRSD',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'pqrsd,pqrs,pqr,peticion,queja,reclamo,solicitud,denuncia',
        sort_order: 30,
        answer: `*PQRSD en línea — CamSoft*

Sistema para radicar y gestionar peticiones, quejas, reclamos y solicitudes:
• Radicación web con seguimiento por número
• Asignación a dependencias
• Términos legales y alertas
• Reportes de gestión y transparencia

¿Entidad pública o privada con obligación PQRSD? Escribe *hablar con una persona*.`
    },
    {
        trigger_key: 'kw_pub_transparency',
        question: 'Transparencia',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'transparencia,datos abiertos,portal gobierno,portal institucional,secop',
        sort_order: 31,
        answer: `*Portales de transparencia*

Publicación de información contractual, presupuesto, noticias y trámites según normativa vigente.

CamSoft diseña portales accesibles, responsivos y fáciles de administrar.

Escribe *cotización* o *hablar con una persona*.`
    },
    // --- Salud ---
    {
        trigger_key: 'kw_health_ehr',
        question: 'Historia clínica',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'historia clinica,historia medica,hc,ehr,expediente,clinical',
        sort_order: 40,
        answer: `*Historia clínica electrónica*

Módulos: admisión, consulta, diagnósticos, órdenes, epicrisis, firma y trazabilidad.

Cumplimiento de buenas prácticas y respaldo de información.

¿IPS, clínica u hospital? Escribe *hablar con una persona* para evaluar alcance.`
    },
    {
        trigger_key: 'kw_health_appointments',
        question: 'Citas médicas',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'cita,citas,agenda,agendamiento,turno,turnos,recordatorio',
        sort_order: 41,
        answer: `*Agendamiento de citas*

• Reserva en línea por especialidad/médico
• Recordatorios SMS o WhatsApp
• Confirmación y cancelación
• Integración con historia clínica

Plazo típico MVP: 4–8 semanas. Escribe *cotización* o *hablar con una persona*.`
    },
    {
        trigger_key: 'kw_health_tele',
        question: 'Telemedicina',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'telemedicina,videoconsulta,video consulta,consulta virtual,teleconsulta',
        sort_order: 42,
        answer: `*Telemedicina*

Videoconsulta integrada con agenda e historia clínica, consentimiento informado y registro de la atención.

Ideal para ampliar cobertura sin ampliar infraestructura física.

Escribe *hablar con una persona* para conocer opciones.`
    },
    {
        trigger_key: 'kw_about',
        question: 'Qué es CamSoft',
        faq_type: 'keyword',
        sector: null,
        keywords: 'camsoft,quienes son,que hacen,que hace,empresa,software a medida,desarrollo,desarrolladores',
        sort_order: 5,
        answer: `*CamSoft* — Milton Narvaez

Desarrollamos software a medida para entidadeses públicas, salud y educación:
• Portales web y trámites en línea
• LMS y plataformas académicas
• Historia clínica, citas y telemedicina
• Integraciones y migraciones

Escribe 2 para ventas o: hablar con una persona`
    },
    {
        trigger_key: 'kw_web',
        question: 'Página web / sitio web',
        faq_type: 'keyword',
        sector: null,
        keywords: 'pagina web,sitio web,landing,web institucional,portal web,diseño web,website,concejo,alcaldia,municipio',
        sort_order: 6,
        answer: `*Páginas y portales web — CamSoft*

• Sitios institucionales (concejos, IPS, colegios)
• Portales de transparencia y trámites
• Diseño responsive y accesible
• CMS para que tu equipo actualice contenido

Plazo orientativo: 4–10 semanas según alcance.
Escribe: cotización, concejo, portal o hablar con una persona`
    },
    {
        trigger_key: 'kw_app',
        question: 'App móvil',
        faq_type: 'keyword',
        sector: null,
        keywords: 'app,aplicacion,movil,android,ios,celular,smartphone',
        sort_order: 7,
        answer: `*Apps móviles — CamSoft*

Desarrollamos apps Android/iOS conectadas a tu backend:
• Ciudadanosos, trámites, consultas
• Notificaciones push
• Sincronización con sistemas existentes

Cuéntanos el caso de uso. Escribe: MVP, cotización o hablar con una persona`
    },
    {
        trigger_key: 'kw_integrations',
        question: 'Integraciones',
        faq_type: 'keyword',
        sector: null,
        keywords: 'integracion,integraciones,api,conectar,sincronizar,erp,sap,siigo,alegra,pse,pasarela,pago,pagos',
        sort_order: 8,
        answer: `*Integraciones — CamSoft*

Conectamos tu software con:
• Pasarelas de pago (PSE, tarjetas)
• ERP / contabilidad
• Active Directory, Google, Microsoft
• APIs de terceros y bases de datos legadas

Indica qué sistemas usas hoy. Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_support_bug',
        question: 'Error / bug en sistema',
        faq_type: 'keyword',
        sector: null,
        keywords: 'bug,error,falla,fallo,no carga,lento,crash,pantalla blanca,500,503',
        sort_order: 16,
        answer: `*Reporte de falla*

Para ayudarte rápido indica:
• Sistema afectado (LMS, portal, etc.)
• Qué estabas haciendo
• Captura del error si puedes

Escribe 1 para soporte o: hablar con una persona`
    },
    {
        trigger_key: 'kw_support_password',
        question: 'Contraseña / acceso',
        faq_type: 'keyword',
        sector: null,
        keywords: 'olvide contraseña,resetear,recuperar clave,bloqueado,sin acceso',
        sort_order: 17,
        answer: `*Recuperación de acceso*

• Usuario o correo registrado
• Sistema (LMS, portal, etc.)

Un técnico validará identidad y te ayudará. Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_pub_concejo',
        question: 'Concejo municipal',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'concejo,camara,concejal,alcaldia,municipio,gobernacion departamental',
        sort_order: 32,
        answer: `*Soluciones para concejos y entidadeses territoriales*

• Portal institucional y transparencia
• Página web del concejo
• PQRS / PQRS en línea
• Trámites y ventanilla digital

Escribe: pagina web, PQRS, transparencia o cotización`
    },
    {
        trigger_key: 'kw_pub_tramites',
        question: 'Trámites en línea',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'tramite,tramites,ventanilla,ventanilla unica,radicacion,certificado,licencia',
        sort_order: 33,
        answer: `*Trámites y ventanilla única*

Radicación en línea, seguimiento, pagos y notificaciones al ciudadano.

Escribe: cotización o hablar con una persona`
    },
    {
        trigger_key: 'kw_edu_colegio',
        question: 'Software para colegio',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'colegio,escuela,instituto,notas,boletines,certificados,asistencia',
        sort_order: 22,
        answer: `*Software para colegios*

• Matrículas y pagos
• Notas, boletines y certificados
• Comunicación con acudientes
• LMS integrado (opcional)

Escribe: LMS, matrículas, cotización`
    },
    {
        trigger_key: 'kw_health_ips',
        question: 'Software IPS / clínica',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'ips,clinica,consultorio,ambulatorio,hospital,odontologia,laboratorio',
        sort_order: 43,
        answer: `*Software para IPS y clínicas*

• Agenda de citas
• Historia clínica
• Facturación básica
• Reportes regulatorios

Escribe: citas, historia clínica, telemedicina o cotización`
    },
    {
        trigger_key: 'kw_hosting',
        question: 'Hosting / nube',
        faq_type: 'keyword',
        sector: null,
        keywords: 'hosting,servidor,nube,cloud,aws,azure,digital ocean,despliegue',
        sort_order: 14,
        answer: `*Hosting y despliegue*

Podemos alojar tu solución o desplegarla en tu infraestructura.

Escribe: hablar con una persona para definir arquitectura.`
    },
    {
        trigger_key: 'kw_training',
        question: 'Capacitación',
        faq_type: 'keyword',
        sector: null,
        keywords: 'capacitacion,training,manual,manuales,tutorial,video,formacion',
        sort_order: 15,
        answer: `*Capacitación y documentación*

Incluimos manuales, videos cortos y sesiones de capacitación según el proyecto.

Escribe: hablar con una persona`
    },
    ...BOT_SEED_EXTRA
];

const BOT_SEED = BOT_SEED_BASE;

const BOT_CONTENT_VERSION = 'v6-fix-menu-2025';

const INTRO_ITEMS = [
    { key: 'soporte', label: 'Soporte', keywords: '1,soporte,support,tecnico,asistencia,falla,error,problema' },
    { key: 'ventas', label: 'Ventas', keywords: '2,ventas,comercial,cotizar,cotizacion,proyecto,nuevo' }
];

const MENU_ITEMS = [
    { key: 'public', label: 'Sector público' },
    { key: 'health', label: 'Sector salud' },
    { key: 'education', label: 'Sector educación' },
    { key: 'human', label: 'Hablar con una persona' },
    { key: 'contact', label: 'Datos de contacto' }
];

module.exports = { BOT_SEED, INTRO_ITEMS, MENU_ITEMS, BOT_CONTENT_VERSION };
