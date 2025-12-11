const nodemailer = require('nodemailer');
const path = require('path');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });

console.log("📥 ========== CONFIGURACIÓN EMAIL SERVICE ==========");
console.log("🔍 BREVO_USER:", process.env.BREVO_USER || "❌ NO CONFIGURADO");
console.log("🔍 BREVO_PASS:", process.env.BREVO_PASS ? `✅ Configurado (${process.env.BREVO_PASS.length} caracteres)` : "❌ NO CONFIGURADO");
console.log("📧 BREVO_FROM_EMAIL:", process.env.BREVO_FROM_EMAIL || "⚠️  No configurado (se usará el email del almacén)");
console.log("🌐 Host SMTP: smtp-relay.brevo.com");
console.log("🔌 Puerto: 587 (TLS)");
if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
  console.log("⚠️  ADVERTENCIA: Las credenciales de Brevo no están configuradas correctamente");
  console.log("📝 Para configurar Brevo:");
  console.log("   1. Ve a: https://app.brevo.com/settings/keys/api");
  console.log("   2. Crea una SMTP Key (NO uses la API Key)");
  console.log("   3. BREVO_USER = tu email de cuenta de Brevo");
  console.log("   4. BREVO_PASS = la SMTP Key generada (NO tu contraseña de cuenta)");
  console.log("   5. BREVO_FROM_EMAIL = email verificado en Brevo para enviar (opcional, se usa el email del almacén)");
}
console.log("📥 =================================================");

// Configuracion del transporter para Brevo
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.BREVO_USER, 
    pass: process.env.BREVO_PASS 
  },
  tls: {
    // No rechazar certificados no autorizados
    rejectUnauthorized: false
  },
  debug: true, // Habilitar debug para ver más detalles
  logger: true // Habilitar logger
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

// Verificar conexión con Brevo
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Conexión con Brevo verificada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al verificar conexión con Brevo:', error.message);
    return false;
  }
};

// Enviar email con comprobante
const sendReceiptEmail = async (sale, store, customerEmail) => {
  console.log('🚀 Iniciando envío de email...');
  console.log('📋 Configuración:', {
    host: transporter.options.host,
    port: transporter.options.port,
    user: process.env.BREVO_USER,
    fromEmail: process.env.BREVO_USER,
    toEmail: customerEmail
  });

  try {
    // Validar que las credenciales estén configuradas
    if (!process.env.BREVO_USER || !process.env.BREVO_PASS) {
      throw new Error('BREVO_USER o BREVO_PASS no están configurados en las variables de entorno');
    }

    const html = generateReceiptHTML(sale, store);

    // Usar el email del almacén como remitente (debe estar verificado en Brevo)
    // Si no hay email del almacén, usar BREVO_FROM_EMAIL o BREVO_USER como fallback
    const fromEmail = store.email || process.env.BREVO_FROM_EMAIL || process.env.BREVO_USER;
    
    // Validar que el email del remitente sea válido
    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error('El email del remitente no es válido. Verifica que el almacén tenga un email configurado o configura BREVO_FROM_EMAIL en las variables de entorno');
    }

    const mailOptions = {
      from: {
        name: store.storeName || 'Almacén',
        address: fromEmail
      },
      to: customerEmail,
      subject: `Comprobante de Venta - Ticket #${sale.ticketNumber}`,
      html: html
    };

    console.log(`📧 Intentando enviar email a: ${customerEmail}`);
    console.log(`📧 Desde: ${fromEmail} (${store.storeName})`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email encolado en Brevo exitosamente!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📬 Response:', info.response);
    console.log('⚠️  NOTA: Si el email no llega, verifica:');
    console.log('   1. Que el remitente (' + fromEmail + ') esté verificado en Brevo');
    console.log('   2. Revisa la carpeta de spam del destinatario');
    console.log('   3. Verifica los logs en tu cuenta de Brevo: https://app.brevo.com/statistics/email');
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ ========== ERROR AL ENVIAR EMAIL ==========');
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Código:', error.code);
    console.error('❌ Comando:', error.command);
    console.error('❌ Respuesta:', error.response);
    
    // Mensaje específico para errores de autenticación
    if (error.code === 'EAUTH' || error.response?.includes('Authentication failed')) {
      console.error('');
      console.error('🔐 ERROR DE AUTENTICACIÓN - Credenciales incorrectas');
      console.error('📝 Verifica en tu cuenta de Brevo:');
      console.error('   1. Ve a: https://app.brevo.com/settings/keys/api');
      console.error('   2. Asegúrate de crear una SMTP Key (NO la API Key)');
      console.error('   3. BREVO_USER debe ser tu email de cuenta de Brevo');
      console.error('   4. BREVO_PASS debe ser la SMTP Key generada (NO tu contraseña)');
      console.error('   5. La SMTP Key debe tener permisos de envío');
      console.error('');
    }
    
    console.error('❌ Stack:', error.stack);
    console.error('❌ ===========================================');
    
    // Lanzar error con más detalles
    let errorMessage = `No se pudo enviar el comprobante por email: ${error.message}`;
    if (error.code === 'EAUTH') {
      errorMessage += '. Verifica que BREVO_USER sea tu email de Brevo y BREVO_PASS sea la SMTP Key (no tu contraseña)';
    }
    throw new Error(errorMessage);
  }
};

// Función de prueba para verificar la configuración
const testConnection = async () => {
  console.log('🧪 Iniciando prueba de conexión con Brevo...');
  console.log('🔍 Credenciales configuradas:', {
    user: process.env.BREVO_USER ? '✅ Configurado' : '❌ No configurado',
    pass: process.env.BREVO_PASS ? '✅ Configurado' : '❌ No configurado'
  });

  try {
    await transporter.verify();
    console.log('✅ Conexión con Brevo verificada exitosamente');
    return { success: true, message: 'Conexión exitosa' };
  } catch (error) {
    console.error('❌ Error al verificar conexión:', error.message);
    console.error('❌ Código:', error.code);
    return { success: false, message: error.message, code: error.code };
  }
};

module.exports = {
  sendReceiptEmail,
  testConnection
};