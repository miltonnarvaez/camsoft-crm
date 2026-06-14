/** Menús interactivos WhatsApp (listas / botones Evolution API). */

const INTRO_BUTTONS = {
    type: 'buttons',
    title: 'CamSoft',
    description: '¿Para qué necesitas el servicio hoy?',
    footer: 'Toca un botón o escribe *1* / *2*',
    buttons: [
        { type: 'reply', displayText: '🛠 Soporte', id: 'intro_1' },
        { type: 'reply', displayText: '💼 Ventas', id: 'intro_2' },
        { type: 'reply', displayText: '📋 Menú', id: 'menu' }
    ]
};

const INTRO_LIST = {
    type: 'list',
    title: 'CamSoft',
    description: '¿Para qué necesitas el servicio hoy?',
    buttonText: 'Ver opciones',
    footerText: 'CamSoft · Milton Narvaez',
    values: [
        {
            title: 'Elige una opción',
            rows: [
                {
                    title: '🛠 Soporte',
                    description: 'Ayuda con un sistema que ya tienes',
                    rowId: 'intro_1'
                },
                {
                    title: '💼 Ventas',
                    description: 'Proyecto nuevo o cotización',
                    rowId: 'intro_2'
                },
                {
                    title: '📋 Ver menú completo',
                    description: 'Todas las opciones',
                    rowId: 'menu'
                }
            ]
        }
    ]
};

const SAL_LIST = {
    type: 'list',
    title: 'Ventas CamSoft',
    description: '¿En qué sector necesitas apoyo?',
    buttonText: 'Elegir sector',
    footerText: 'Desarrollo de software a medida',
    values: [
        {
            title: 'Sectores',
            rows: [
                {
                    title: '🏛 Sector público',
                    description: 'Concejos, alcaldías, portales',
                    rowId: 'sector_public'
                },
                {
                    title: '🏥 Sector salud',
                    description: 'IPS, clínicas, telemedicina',
                    rowId: 'sector_health'
                },
                {
                    title: '🎓 Sector educación',
                    description: 'LMS, matrículas, colegios',
                    rowId: 'sector_education'
                },
                {
                    title: '👤 Hablar con una persona',
                    description: 'Asesoría directa con Milton',
                    rowId: 'human'
                },
                {
                    title: '📞 Datos de contacto',
                    description: 'Teléfono, correo, web',
                    rowId: 'contact'
                }
            ]
        }
    ]
};

/** IDs que envía WhatsApp al elegir fila de lista o botón. */
const ROW_ID_MAP = {
    intro_1: '1',
    intro_2: '2',
    sector_public: 'public',
    sector_health: 'health',
    sector_education: 'education',
    human: 'hablar con una persona',
    contact: 'contacto',
    menu: 'menu'
};

function resolveRowId(text) {
    const t = (text || '').trim();
    if (ROW_ID_MAP[t]) return ROW_ID_MAP[t];
    const norm = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('soporte') || norm.includes('support')) return '1';
    if (norm.includes('ventas') || norm.includes('comercial')) return '2';
    if (norm.includes('public') || norm.includes('concejo') || norm.includes('municip')) return 'public';
    if (norm.includes('salud') || norm.includes('clinic') || norm.includes('hospital')) return 'health';
    if (norm.includes('educacion') || norm.includes('colegio') || norm.includes('lms')) return 'education';
    if (norm.includes('humano') || norm.includes('persona') || norm.includes('asesor')) return 'hablar con una persona';
    if (norm.includes('contacto') || norm.includes('telefono')) return 'contacto';
    if (norm === 'menu' || norm.includes('menu')) return 'menu';
    return text;
}

module.exports = {
    INTRO_BUTTONS,
    INTRO_LIST,
    SAL_LIST,
    ROW_ID_MAP,
    resolveRowId
};
