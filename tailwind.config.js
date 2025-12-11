/** @type {import('tailwindcss').Config} */
module.exports = {
  // 🚨 ESTO ES LO MÁS IMPORTANTE PARA QUE LOS ESTILOS SE GENEREN 🚨
  content: [
    "./views/**/*.{pug,js}", // Incluye todas las vistas Pug dentro de views
    "./src/**/*.{js,ts}", // Si tienes archivos de código fuente JS/TS
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
