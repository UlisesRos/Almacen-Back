const path = require('path');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });

// URL base de la API REST de Brevo
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Verificar configuración al cargar el módulo
if (!process.env.BREVO_API_KEY) {
  console.warn("⚠️  BREVO_API_KEY no está configurada. El servicio de email no funcionará correctamente.");
  console.warn("📝 Configura BREVO_API_KEY en las variables de entorno para habilitar el envío de emails.");
}

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
            <p style="margin: 16px 0 0 0; font-size: 12px; opacity: 0.7;">¡Gracias por su compra!</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Verificar conexión con Brevo usando la API REST
const verifyConnection = async () => {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY no está configurada');
    }

    // Hacer una petición simple a la API para verificar la conexión
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error de API: ${response.status} - ${errorData.message || response.statusText}`);
    }

    // Conexión verificada correctamente
    return true;
  } catch (error) {
    console.error('❌ Error al verificar conexión con Brevo:', error.message);
    return false;
  }
};

// Enviar email con comprobante usando API REST de Brevo
const sendReceiptEmail = async (sale, store, customerEmail) => {

  try {
    // Validar que la API Key esté configurada
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');
    }

    const html = generateReceiptHTML(sale, store);

    // Usar el email del almacén como remitente (debe estar verificado en Brevo)
    // Si no hay email del almacén, usar BREVO_FROM_EMAIL como fallback
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    
    // Validar que el email del remitente sea válido
    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error('El email del remitente no es válido. Verifica que el almacén tenga un email configurado o configura BREVO_FROM_EMAIL en las variables de entorno');
    }

    // Preparar el payload para la API REST de Brevo
    const emailPayload = {
      sender: {
        name: store.storeName || 'Almacén',
        email: fromEmail
      },
      to: [
        {
          email: customerEmail
        }
      ],
      subject: `Comprobante de Venta - Ticket #${sale.ticketNumber}`,
      htmlContent: html
    };

    // Enviar email usando la API REST de Brevo
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Manejar errores de la API
      const errorMessage = responseData.message || responseData.error || `Error HTTP ${response.status}`;
      throw new Error(`Error de API Brevo: ${errorMessage}`);
    }

    return { 
      success: true, 
      messageId: responseData.messageId || response.headers.get('x-message-id') || 'N/A' 
    };
  } catch (error) {
    console.error('❌ ========== ERROR AL ENVIAR EMAIL ==========');
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    
    // Mensaje específico para errores de autenticación
    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('Invalid API key')) {
      console.error('');
      console.error('🔐 ERROR DE AUTENTICACIÓN - API Key incorrecta');
      console.error('📝 Verifica en tu cuenta de Brevo:');
      console.error('   1. Ve a: https://app.brevo.com/settings/keys/api');
      console.error('   2. Asegúrate de crear una API Key (v3)');
      console.error('   3. BREVO_API_KEY debe ser la API Key generada');
      console.error('   4. La API Key debe tener permisos de envío de emails');
      console.error('');
    }
    
    console.error('❌ ===========================================');
    
    // Lanzar error con más detalles
    let errorMessage = `No se pudo enviar el comprobante por email: ${error.message}`;
    if (error.message?.includes('401') || error.message?.includes('Invalid API key')) {
      errorMessage += '. Verifica que BREVO_API_KEY sea correcta y tenga permisos de envío';
    }
    throw new Error(errorMessage);
  }
};

// Función de prueba para verificar la configuración
const testConnection = async () => {

  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY no está configurada');
    }

    // Verificar la conexión haciendo una petición a la API de cuenta
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error de API: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const accountData = await response.json();
    return { success: true, message: 'Conexión exitosa', account: accountData };
  } catch (error) {
    console.error('❌ Error al verificar conexión:', error.message);
    return { success: false, message: error.message };
  }
};

// Generar HTML del email de recuperación de contraseña
const generatePasswordResetHTML = (storeName, resetUrl) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperar Contraseña</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🔐 Recuperar Contraseña</h1>
        </div>

        <!-- Contenido -->
        <div style="padding: 30px;">
          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hola <strong>${storeName}</strong>,
          </p>
          
          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no realizaste esta solicitud, puedes ignorar este correo.
          </p>

          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Para restablecer tu contraseña, haz clic en el siguiente botón:
          </p>

          <!-- Botón de acción -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Restablecer Contraseña
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px; margin-bottom: 10px;">
            O copia y pega este enlace en tu navegador:
          </p>
          <p style="color: #667eea; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
            ${resetUrl}
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad.
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Enviar email de recuperación de contraseña
const sendPasswordResetEmail = async (email, storeName, resetUrl) => {
  try {
    
    // Validar que la API Key esté configurada
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY no está configurada');
      throw new Error('BREVO_API_KEY no está configurada en las variables de entorno');
    }

    const html = generatePasswordResetHTML(storeName, resetUrl);

    // Usar el email del remitente configurado
    const fromEmail = process.env.BREVO_FROM_EMAIL;
    
    // Validar que el email del remitente sea válido
    if (!fromEmail || !fromEmail.includes('@')) {
      console.error('❌ Email del remitente inválido:', fromEmail);
      throw new Error('El email del remitente no es válido. Configura BREVO_FROM_EMAIL en las variables de entorno');
    }

    // Preparar el payload para la API REST de Brevo
    const emailPayload = {
      sender: {
        name: 'Almacén App',
        email: fromEmail
      },
      to: [
        {
          email: email
        }
      ],
      subject: 'Recuperar Contraseña - Almacén App',
      htmlContent: html
    };

    // Enviar email usando la API REST de Brevo
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Manejar errores de la API
      const errorMessage = responseData.message || responseData.error || `Error HTTP ${response.status}`;
      console.error('❌ Error en respuesta de Brevo:', errorMessage);
      throw new Error(`Error de API Brevo: ${errorMessage}`);
    }

    const messageId = responseData.messageId || response.headers.get('x-message-id') || 'N/A';

    return { 
      success: true, 
      messageId: messageId
    };
  } catch (error) {
    console.error('❌ ========== ERROR AL ENVIAR EMAIL DE RECUPERACIÓN ==========');
    console.error('❌ Mensaje:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Variables de entorno:');
    console.error('   BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'Configurada' : 'NO CONFIGURADA');
    console.error('   BREVO_FROM_EMAIL:', process.env.BREVO_FROM_EMAIL || 'NO CONFIGURADA');
    console.error('❌ ===========================================================');
    
    throw new Error(`No se pudo enviar el email de recuperación: ${error.message}`);
  }
};

module.exports = {
  sendReceiptEmail,
  testConnection,
  sendPasswordResetEmail
};