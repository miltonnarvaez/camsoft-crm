/** FAQs adicionales — fusionadas en BOT_SEED al arrancar */
const BOT_SEED_EXTRA = [
    // --- Proceso comercial ---
    {
        trigger_key: 'kw_demo',
        question: 'Demo / prueba',
        faq_type: 'keyword',
        sector: null,
        keywords: ' demo,prueba,probar,mostrar,ver sistema,referencia',
        sort_order: 9,
        answer: `*Demostración CamSoft*

Podemos agendar una llamada corta para mostrar soluciones similares a tu caso.

Escribe: hablar con una persona y tu sector (público, salud, educación).`
    },
    {
        trigger_key: 'kw_contract',
        question: 'Contrato / propuesta',
        faq_type: 'keyword',
        sector: null,
        keywords: 'contrato,propuesta,orden de compra,licitacion,licitacion publica,pliego,secop',
        sort_order: 9,
        answer: `*Propuesta comercial*

Preparamos documento técnico y económico según alcance.

Para entidades públicas indicamos si aplica SECOP / licitación. Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_payment_terms',
        question: 'Formas de pago',
        faq_type: 'keyword',
        sector: null,
        keywords: 'forma de pago,anticipo,cuotas,financiacion,abono,50%,hitos',
        sort_order: 9,
        answer: `*Condiciones comerciales*

Suele definirse por fases según avance del proyecto.

Detalles en propuesta formal. Escribe: cotización o hablar con una persona`
    },
    {
        trigger_key: 'kw_warranty',
        question: 'Garantía / soporte postventa',
        faq_type: 'keyword',
        sector: null,
        keywords: 'garantia,soporte postventa,mantenimiento,sla,actualizacion,parche',
        sort_order: 9,
        answer: `*Garantía y mantenimiento*

Incluimos periodo de garantía por defectos y planes de soporte continuo opcionales.

Escribe: hablar con una persona para condiciones de tu proyecto.`
    },
    {
        trigger_key: 'kw_stack',
        question: 'Tecnologías',
        faq_type: 'keyword',
        sector: null,
        keywords: 'tecnologia,stack,php,node,react,angular,vue,python,java,postgres,mysql,laravel,django',
        sort_order: 9,
        answer: `*Stack tecnológico CamSoft*

Elegimos la tecnología según tu proyecto, equipo y sistemas existentes:
• Web: Node, PHP/Laravel, React, Vue
• BD: PostgreSQL, MySQL
• Móvil: React Native, Flutter (según caso)

Escribe tu contexto y te orientamos.`
    },
    {
        trigger_key: 'kw_methodology',
        question: 'Metodología',
        faq_type: 'keyword',
        sector: null,
        keywords: 'metodologia,scrum,agile,kanban,sprints,reuniones,avance,seguimiento',
        sort_order: 9,
        answer: `*Metodología de trabajo*

• Levantamiento de requisitos
• Entregas por sprints (2 semanas)
• Demos periódicos
• Documentación y capacitación

Escribe: hablar con una persona`
    },
    // --- Privado / empresa ---
    {
        trigger_key: 'kw_private',
        question: 'Sector privado / empresa',
        faq_type: 'keyword',
        sector: null,
        keywords: 'empresa,privado,negocio,industria,comercio,pyme,startupa mediana',
        sort_order: 10,
        answer: `*Sector privado — CamSoft*

• ERP ligero, inventarios, facturación
• Portales corporativos
• Apps internas y workflows
• Integración contable

Cuéntanos tu operación. Escribe: cotización`
    },
    {
        trigger_key: 'kw_erp',
        question: 'ERP / inventario',
        faq_type: 'keyword',
        sector: null,
        keywords: 'erp,inventario,stock,bodega,almacen,ordenes de compra,proveedores',
        sort_order: 10,
        answer: `*ERP e inventarios a medida*

• Productos, stock, alertas
• Órdenes y facturación básica
• Reportes

Ideal si ya usas Siigo, Alegra u otro. Escribe: integraciones`
    },
    {
        trigger_key: 'kw_ecommerce',
        question: 'Tienda en línea',
        faq_type: 'keyword',
        sector: null,
        keywords: 'ecommerce,e-commerce,tienda online,tienda virtual,carrito,woocommerce,shopify',
        sort_order: 10,
        answer: `*Comercio electrónico*

Catálogo, carrito, pasarela de pago, envíos e integración con inventario.

Escribe: cotización o MVP`
    },
    {
        trigger_key: 'kw_crm',
        question: 'CRM',
        faq_type: 'keyword',
        sector: null,
        keywords: 'crm,clientes,leads,embudo,oportunidadeses,pipeline,ventas internas',
        sort_order: 10,
        answer: `*CRM a medida*

Gestión de contactos, leads, etapas y seguimiento comercial.

Este chat conecta con nuestro CRM interno. Escribe: demo`
    },
    {
        trigger_key: 'kw_rrhh',
        question: 'Recursos humanos',
        faq_type: 'keyword',
        sector: null,
        keywords: 'rrhh,recursos humanos,nomina,asistencia empleados,vacaciones,contratos laborales',
        sort_order: 10,
        answer: `*RRHH / nómina (proyectos específicos)*

Módulos según necesidad: asistencia, vacaciones, documentos.

Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_bi',
        question: 'Reportes / BI',
        faq_type: 'keyword',
        sector: null,
        keywords: 'reportes,bi,business intelligence,dashboard,tablero,graficas,indicadores,kpi',
        sort_order: 10,
        answer: `*Reportes y tableros*

Dashboards en tiempo real conectados a tu operación.

Indica qué indicadores necesitas. Escribe: cotización`
    },
    {
        trigger_key: 'kw_documents',
        question: 'Gestión documental',
        faq_type: 'keyword',
        sector: null,
        keywords: 'documentos,gestion documental,archivo,digitalizacion,expediente,workflow,aprobacion',
        sort_order: 10,
        answer: `*Gestión documental*

Digitalización, flujos de aprobación, búsqueda y trazabilidad.

Muy usado en sector público y salud. Escribe: transparencia o PQRS`
    },
    // --- Público ampliado ---
    {
        trigger_key: 'kw_pub_datos',
        question: 'Datos abiertos',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'datos abiertos,open data,conjunto de datos,csv,publicacion datos',
        sort_order: 34,
        answer: `*Datos abiertos*

Publicación de datasets, APIs y visualizaciones para transparencia activa.

Escribe: transparencia o portal`
    },
    {
        trigger_key: 'kw_pub_presupuesto',
        question: 'Presupuesto público',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'presupuesto,plan de desarrollo,pdm,pgn,recursos publicos',
        sort_order: 34,
        answer: `*Transparencia presupuestal*

Módulos para publicar ejecución presupuestal y contratación.

Escribe: transparencia o SECOP`
    },
    {
        trigger_key: 'kw_pub_secop',
        question: 'SECOP / contratación',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'secop,contratacion publica,proceso,licitacion,invitacion',
        sort_order: 34,
        answer: `*Contratación pública (Colombia)*

Portales pueden integrar publicación SECOP y documentos de contratación.

Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_pub_gestion',
        question: 'Gestión documental pública',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'gestion documental,archivo general,resoluciones,actas,memorandos',
        sort_order: 34,
        answer: `*Archivo y gestión documental*

Control de correspondencia, resoluciones y archivo centralizado.

Escribe: cotización`
    },
    {
        trigger_key: 'kw_pub_catastro',
        question: 'Impuesto predial / catastro',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'predial,catastro,impuesto,avaluo,tributario',
        sort_order: 34,
        answer: `*Trámites tributarios locales*

Consulta de deuda, certificados y pagos en línea (según alcance municipal).

Escribe: tramites o concejo`
    },
    {
        trigger_key: 'kw_pub_participacion',
        question: 'Participación ciudadana',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'participacion,ciudadano,veeduria,consulta publica,foro',
        sort_order: 34,
        answer: `*Participación ciudadana*

Foros, consultas y mecanismos de veeduría en portales.

Escribe: portal o transparencia`
    },
    // --- Educación ampliado ---
    {
        trigger_key: 'kw_edu_moodle',
        question: 'Moodle',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'moodle,plugin moodle,tarea moodle,scorm,h5p',
        sort_order: 23,
        answer: `*Moodle — implementación CamSoft*

Instalación, temas, plugins, cursos y hosting.

¿Nuevo o migración? Escribe: LMS o migración`
    },
    {
        trigger_key: 'kw_edu_exam',
        question: 'Evaluaciones / exámenes',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'examen,examenes,evaluacion,quiz,parcial,final,calificacion',
        sort_order: 23,
        answer: `*Evaluaciones en línea*

Bancos de preguntas, intentos, calificación automática e informes.

Escribe: LMS`
    },
    {
        trigger_key: 'kw_edu_cert',
        question: 'Certificados',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'certificado,certificados,diploma,constancia,graduacion',
        sort_order: 23,
        answer: `*Certificados digitales*

Generación automática tras completar requisitos académicos.

Escribe: colegio o LMS`
    },
    {
        trigger_key: 'kw_edu_biblioteca',
        question: 'Biblioteca digital',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'biblioteca,libros,digital,revistas,prestamo',
        sort_order: 23,
        answer: `*Biblioteca digital*

Catálogo, préstamos y acceso a recursos en línea.

Escribe: LMS`
    },
    {
        trigger_key: 'kw_edu_universidad',
        question: 'Universidad',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'universidad,facultad,programa academico,creditos,plan estudios',
        sort_order: 23,
        answer: `*Soluciones universitarias*

Matrículas, notas, certificados y LMS integrados.

Escribe: matrículas o LMS`
    },
    {
        trigger_key: 'kw_edu_acudientes',
        question: 'Portal padres / acudientes',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'padres,acudientes,portal padres,comunicados,circular',
        sort_order: 23,
        answer: `*Portal de acudientes*

Notas, asistencia, pagos y comunicados en un solo lugar.

Escribe: colegio`
    },
    // --- Salud ampliado ---
    {
        trigger_key: 'kw_health_farmacia',
        question: 'Farmacia',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'farmacia,dispensacion,medicamentos,receta,inventario farmacia',
        sort_order: 44,
        answer: `*Módulo de farmacia*

Dispensación ligada a historia clínica e inventario.

Escribe: historia clínica`
    },
    {
        trigger_key: 'kw_health_laboratorio',
        question: 'Laboratorio clínico',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'laboratorio,resultados lab,examenes lab,patologia',
        sort_order: 44,
        answer: `*Laboratorio clínico*

Órdenes, resultados PDF y trazabilidad en HC.

Escribe: historia clínica`
    },
    {
        trigger_key: 'kw_health_imagenologia',
        question: 'Imagenología',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'imagenologia,radiologia,rx,tac,informe radiologico,pacs',
        sort_order: 44,
        answer: `*Imagenología / PACS (básico)*

Adjuntar informes e imágenes al expediente.

Escribe: hablar con una persona para alcance PACS completo.`
    },
    {
        trigger_key: 'kw_health_eps',
        question: 'EPS / aseguradora',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'eps,aseguradora,autorizacion,rips,facturacion salud',
        sort_order: 44,
        answer: `*EPS y facturación*

Autorizaciones, RIPS y reportes regulatorios (según normativa).

Escribe: IPS o cotización`
    },
    {
        trigger_key: 'kw_health_odontologia',
        question: 'Odontología',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'odontologia,dental,odontologo,ortodoncia',
        sort_order: 44,
        answer: `*Software odontológico*

Agenda, odontograma e historia clínica especializada.

Escribe: citas o historia clínica`
    },
    {
        trigger_key: 'kw_health_urgencias',
        question: 'Urgencias',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'urgencias,triage,triaje,emergencia',
        sort_order: 44,
        answer: `*Urgencias / triage*

Flujo rápido de admisión y priorización.

Escribe: hospital o hablar con una persona`
    },
    // --- Soporte ampliado ---
    {
        trigger_key: 'kw_support_lento',
        question: 'Sistema lento',
        faq_type: 'keyword',
        sector: null,
        keywords: 'lento,demora,tarda mucho,no responde,timeout,cuelga',
        sort_order: 18,
        answer: `*Rendimiento lento*

Indica URL, hora del incidente y navegador usado.

Escribe 1 (soporte) con esos datos.`
    },
    {
        trigger_key: 'kw_support_correo',
        question: 'Correos no llegan',
        faq_type: 'keyword',
        sector: null,
        keywords: 'correo,email,no llega,spam,bandeja entrada,notificacion',
        sort_order: 18,
        answer: `*Problemas de correo*

Revisa spam. Indícanos correo destino y hora del envío.

Escribe: soporte`
    },
    {
        trigger_key: 'kw_support_movil',
        question: 'Problema en celular',
        faq_type: 'keyword',
        sector: null,
        keywords: 'celular,movil,android,iphone,ipad,tablet,responsive',
        sort_order: 18,
        answer: `*Soporte móvil*

Indica modelo, navegador y captura del error.

Escribe: soporte`
    },
    {
        trigger_key: 'kw_support_ssl',
        question: 'Certificado SSL / HTTPS',
        faq_type: 'keyword',
        sector: null,
        keywords: 'ssl,https,certificado,candado,seguro,no seguro,expirado',
        sort_order: 18,
        answer: `*SSL / HTTPS*

Renovación de certificados y revisión de dominio.

Escribe: soporte con la URL afectada.`
    },
    {
        trigger_key: 'kw_support_backup',
        question: 'Respaldo / backup',
        faq_type: 'keyword',
        sector: null,
        keywords: 'backup,respaldo,restaurar,perdi datos,copia seguridad',
        sort_order: 18,
        answer: `*Respaldos*

Política de backups según contrato de hosting/soporte.

Escribe: soporte con fecha del incidente.`
    },
    // --- Pagos / integraciones ---
    {
        trigger_key: 'kw_pse',
        question: 'PSE / pagos en línea',
        faq_type: 'keyword',
        sector: null,
        keywords: 'pse,pagos en linea,tarjeta,credito,debito,wompi,payu,mercadopago',
        sort_order: 11,
        answer: `*Pagos en línea Colombia*

Integración PSE, tarjetas y pasarelas locales.

Escribe: integraciones o cotización`
    },
    {
        trigger_key: 'kw_siigo',
        question: 'Siigo / contabilidad',
        faq_type: 'keyword',
        sector: null,
        keywords: 'siigo,contabilidad,contador,factura electronica,dian',
        sort_order: 11,
        answer: `*Integración contable (Siigo, etc.)*

Sincronización de facturas, clientes y pagos.

Escribe: integraciones`
    },
    {
        trigger_key: 'kw_google',
        question: 'Google / Microsoft login',
        faq_type: 'keyword',
        sector: null,
        keywords: 'google,microsoft,office 365,azure ad,login social,oauth,sso',
        sort_order: 11,
        answer: `*Inicio de sesión corporativo*

Google Workspace, Microsoft 365 o SSO empresarial.

Escribe: integraciones`
    },
    // --- Ubicación / contacto ---
    {
        trigger_key: 'kw_location',
        question: 'Ubicación / oficina',
        faq_type: 'keyword',
        sector: null,
        keywords: 'ubicacion,donde estan,oficina,direccion,ciudad,pais,remoto',
        sort_order: 8,
        answer: `*Ubicación CamSoft*

Atención remota en Colombiaa Colombia de Colombiaas. Contacto:

📱 +57 316 681 2189
📧 nf_alejo@yahoo.com

Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_hours',
        question: 'Horario',
        faq_type: 'keyword',
        sector: null,
        keywords: 'horario,hora,atencion,disponible,cuando abren,fines de semana',
        sort_order: 8,
        answer: `*Horario de atención*

Respuesta habitual por WhatsApp y correo: 24–48 h hábiles.

Escribe: hablar con una persona para urgencias comerciales.`
    },
    {
        trigger_key: 'kw_thanks',
        question: 'Gracias / despedida',
        faq_type: 'keyword',
        sector: null,
        keywords: 'gracias,muchas gracias,ok,perfecto,listo,chao,adios,hasta luego',
        sort_order: 98,
        answer: `¡Con gusto! 😊

Si necesitas algo más, escribe menu o cuéntanos tu proyecto.

CamSoft — Milton Narvaez`
    },
    {
        trigger_key: 'kw_privacy',
        question: 'Privacidad / datos',
        faq_type: 'keyword',
        sector: null,
        keywords: 'privacidad,datos personales,habeas,data,proteccion,ley 1581,rgpd',
        sort_order: 98,
        answer: `*Privacidad de datos*

Tratamos información según buenas prácticas y acuerdos de confidencialidad por proyecto.

Escribe: hablar con una persona para detalle legal.`
    },
    {
        trigger_key: 'kw_logistica',
        question: 'Logística / transporte',
        faq_type: 'keyword',
        sector: null,
        keywords: 'logistica,transporte,rutas,flota,entregas,despacho,tracking',
        sort_order: 12,
        answer: `*Logística y entregas*

Seguimiento de pedidos, rutas y estados en tiempo real.

Escribe: cotización`
    },
    {
        trigger_key: 'kw_turismo',
        question: 'Turismo / reservas',
        faq_type: 'keyword',
        sector: null,
        keywords: 'turismo,hotel,reservas,booking,hospedaje,hostal',
        sort_order: 12,
        answer: `*Reservas y turismo*

Motor de reservas, calendario y pagos en línea.

Escribe: MVP`
    },
    {
        trigger_key: 'kw_agro',
        question: 'Agro / campo',
        faq_type: 'keyword',
        sector: null,
        keywords: 'agro,agricultura,campo,finca,cultivo,cosecha',
        sort_order: 12,
        answer: `*Software agro (proyectos específicos)*

Registro de cultivos, inventario y trazabilidad.

Cuéntanos tu operación. Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_ong',
        question: 'ONG / fundación',
        faq_type: 'keyword',
        sector: null,
        keywords: 'ong,fundacion,sin animo de lucro,donaciones,voluntarios',
        sort_order: 12,
        answer: `*ONG y fundaciones*

Donaciones, membresías y reportes de impacto.

Escribe: cotización`
    },
    {
        trigger_key: 'kw_api',
        question: 'API REST',
        faq_type: 'keyword',
        sector: null,
        keywords: 'api rest,restful,webhook,swagger,openapi,microservicio',
        sort_order: 12,
        answer: `*APIs y microservicios*

Diseño de APIs seguras para integrar sistemas.

Escribe: integraciones`
    },
    {
        trigger_key: 'kw_chatbot',
        question: 'Chatbot / WhatsApp',
        faq_type: 'keyword',
        sector: null,
        keywords: 'chatbot,bot,whatsapp bot,asistente virtual,automatizar respuestas',
        sort_order: 12,
        answer: `*Bots y WhatsApp (como este)*

Automatizamos atención con menús y FAQs.

¡Estás hablando con uno ahora! Escribe: menu, 1 o 2`
    },
    {
        trigger_key: 'kw_legacy',
        question: 'Sistema legado / Excel',
        faq_type: 'keyword',
        sector: null,
        keywords: 'excel,hoja de calculo,access,base de datos vieja,foxpro,visual basic',
        sort_order: 13,
        answer: `*Reemplazo de Excel / Access*

Centralizamos datos en web con validaciones y reportes.

Escribe: migración`
    },
    {
        trigger_key: 'kw_multilang',
        question: 'Multi-idioma',
        faq_type: 'keyword',
        sector: null,
        keywords: 'idioma,ingles,espanol,traduccion,bilingue,multi idioma',
        sort_order: 13,
        answer: `*Sitios multi-idioma*

Español, inglés u otros según proyecto.

Indica mercados objetivo. Escribe: cotización`
    },
    {
        trigger_key: 'kw_accessibility',
        question: 'Accesibilidad web',
        faq_type: 'keyword',
        sector: null,
        keywords: 'accesibilidad,wcag,a11y,discapacidad,lectores pantalla',
        sort_order: 13,
        answer: `*Accesibilidad (WCAG)*

Contrastes, navegación por teclado y etiquetas ARIA.

Recomendado en sector público. Escribe: portal`
    },
    {
        trigger_key: 'kw_pub_nomina',
        question: 'Nómina entidad pública',
        faq_type: 'keyword',
        sector: 'public',
        keywords: 'nomina,empleados publicos,planta,recursos humanos entidad',
        sort_order: 35,
        answer: `*Nómina sector público (módulos)*

Integración con sistemas de RRHH según alcance.

Escribe: hablar con una persona`
    },
    {
        trigger_key: 'kw_health_enfermeria',
        question: 'Enfermería / notas',
        faq_type: 'keyword',
        sector: 'health',
        keywords: 'enfermeria,notas de enfermeria,signos vitales,enfermera',
        sort_order: 45,
        answer: `*Notas de enfermería*

Registro clínico en HC con trazabilidad.

Escribe: historia clínica`
    },
    {
        trigger_key: 'kw_edu_becas',
        question: 'Becas / subsidios',
        faq_type: 'keyword',
        sector: 'education',
        keywords: 'becas,subsidios,ayuda economica,matricula becada',
        sort_order: 24,
        answer: `*Becas y subsidios académicos*

Postulación, evaluación y pagos de beneficios.

Escribe: matrículas`
    },
    {
        trigger_key: 'kw_support_horario',
        question: 'Fuera de horario',
        faq_type: 'keyword',
        sector: null,
        keywords: 'urgente,emergencia,ahora mismo,ya,inmediato,hoy',
        sort_order: 19,
        answer: `*Atención urgente comercial*

Deja tu mensaje; Milton o el equipo responderá en 24–48 h hábiles.

Si es falla de sistema en producción, escribe 1 (soporte) con URL y captura.`
    }
];

module.exports = { BOT_SEED_EXTRA };
