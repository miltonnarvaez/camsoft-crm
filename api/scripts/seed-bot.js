require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { seedBotContent } = require('../src/bot');

seedBotContent(true)
    .then(() => {
        console.log('Contenido del bot actualizado.');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
