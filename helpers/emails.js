import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const emailRegistro = async (datos) => {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const { nombre, email, token } = datos;

  await transport.sendMail({
    from: "BienesRaicesSENA.com",
    to: email,
    subject: "Confirma tu Cuenta de Bienes Raices SENA",
    text: "Confirma tu Cuenta de Bienes Raices SENA",
    html: `
            <h1>Hola ${nombre},</h1>
            <p>Gracias por registrarte en Bienes Raices SENA. Para confirmar tu cuenta, haz clic en el siguiente enlace:</p>
            <a href="${process.env.BACKEND_URL}:${
      process.env.PORT ?? 3000
    }/auth/confirmar/${token}">Confirmar Cuenta</a>
            <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        `,
  });
};

const emailOlvidePassword = async (datos) => {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const { nombre, email, token } = datos;

  await transport.sendMail({
    from: "BienesRaicesSENA.com",
    to: email,
    subject: "Restablece tu Contraseña",
    text: "Restablece tu Contraseña",
    html: `
            <h1>Hola ${nombre},</h1>
            <p>Has solicitado restablecer tu contraseña para Bienes Raices SENA. Haz clic en el siguiente enlace para generar una nueva:</p>
            <a href="${process.env.BACKEND_URL}:${
      process.env.PORT ?? 3000
    }/auth/olvide-password/${token}">Restablecer Contraseña</a>
            <p>Si no solicitaste el cambio, puedes ignorar este mensaje.</p>
        `,
  });
};

export { emailRegistro, emailOlvidePassword };
