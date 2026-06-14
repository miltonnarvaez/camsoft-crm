/** Menús interactivos WhatsApp (listas / botones Evolution API). */

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
    return text;
}

module.exports = {
    INTRO_LIST,
    SAL_LIST,
    ROW_ID_MAP,
    resolveRowId
};
