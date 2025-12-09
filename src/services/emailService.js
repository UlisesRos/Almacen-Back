const nodemailer = require('nodemailer');
const path = require('path');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });

console.log("🔍 BREVO_USER:", process.env.BREVO_USER);
console.log("🔍 BREVO_PASS:", process.env.BREVO_PASS ? "***" : "No configurado");

console.log("📥 Email service cargado (Brevo)");

// Configuracion del transporter para Brevo
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.BREVO_USER, 
    pass: process.env.BREVO_PASS 
  }
});

// Generar HTML del comprobante
const generateReceiptHTML = (sale, store) => {
  const productsHTML = sale.products.map(p => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px;">${p.name}</td>
      <td style="padding: 12px 8px; text-align: center;">${p.quantity}</td>
      <td style="padding: 12px 8px; text-align: right;">$${p.price}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: 600;">$${p.subtotal}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Comprobante de Venta</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🏪 ${store.storeName}</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Comprobante de Venta</p>
        </div>

        <!-- Info de la venta -->
        <div style="padding: 30px;">
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280;">Ticket:</span>
              <span style="font-weight: 600;">#${sale.ticketNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280;">Fecha:</span>
              <span>${new Date(sale.createdAt).toLocaleDateString('es-AR')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6b7280;">Hora:</span>
              <span>${new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Método de Pago:</span>
              <span style="font-weight: 600; text-transform: capitalize;">${sale.paymentMethod}</span>
            </div>
          </div>

          <!-- Productos -->
          <h2 style="font-size: 18px; margin-bottom: 16px; color: #1f2937;">Productos</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb; background-color: #f9fafb;">
                <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-weight: 600;">Producto</th>
                <th style="padding: 12px 8px; text-align: center; color: #6b7280; font-weight: 600;">Cant.</th>
                <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-weight: 600;">Precio</th>
                <th style="padding: 12px 8px; text-align: right; color: #6b7280; font-weight: 600;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productsHTML}
            </tbody>
          </table>

          <!-- Total -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px; color: white; text-align: center;">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 4px;">Total</div>
            <div style="font-size: 36px; font-weight: bold;">$${sale.total}</div>
          </div>

          <!-- Info del almacén -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>${store.storeName}</strong></p>
            ${store.address ? `<p style="margin: 4px 0;">${store.address}</p>` : ''}
            ${store.phone ? `<p style="margin: 4px 0;">Tel: ${store.phone}</p>` : ''}
            ${store.email ? `<p style="margin: 4px 0;">${store.email}</p>` : ''}
            <p style="margin: 16px 0 0 0; font-size: 12px; opacity: 0.7;">¡Gracias por su compra!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Enviar email con comprobante
const sendReceiptEmail = async (sale, store, customerEmail) => {
  try {
    const html = generateReceiptHTML(sale, store);

    const mailOptions = {
      from: {
        name: store.storeName,
        address: process.env.BREVO_USER
      },
      to: customerEmail,
      subject: `Comprobante de Venta - Ticket #${sale.ticketNumber}`,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw new Error('No se pudo enviar el comprobante por email');
  }
};

module.exports = {
  sendReceiptEmail
};