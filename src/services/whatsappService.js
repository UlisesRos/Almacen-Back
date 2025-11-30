const twilio = require('twilio');

// IMPORTANTE: Instalar primero con: npm install twilio

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Generar mensaje de texto del comprobante
const generateReceiptMessage = (sale, store) => {
  const productsText = sale.products.map(p => 
    `• ${p.name}\n  ${p.quantity} x $${p.price} = $${p.subtotal}`
  ).join('\n\n');

  return `
🏪 *${store.storeName}*
━━━━━━━━━━━━━━━━━━━━

📋 *COMPROBANTE DE VENTA*

🎫 Ticket: #${sale.ticketNumber}
📅 Fecha: ${new Date(sale.createdAt).toLocaleDateString('es-AR')}
🕐 Hora: ${new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
💳 Pago: ${sale.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}

━━━━━━━━━━━━━━━━━━━━
*PRODUCTOS*

${productsText}

━━━━━━━━━━━━━━━━━━━━

💰 *TOTAL: $${sale.total}*

━━━━━━━━━━━━━━━━━━━━

${store.address ? `📍 ${store.address}` : ''}
${store.phone ? `📞 ${store.phone}` : ''}

¡Gracias por tu compra! 😊
  `.trim();
};

// Enviar WhatsApp con comprobante
const sendReceiptWhatsApp = async (sale, store, customerPhone) => {
  try {
    // Asegurarse de que el número tenga el formato correcto
    // Twilio requiere formato internacional: +54 9 341 1234567
    let formattedPhone = customerPhone.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Si no tiene +, asumir que es Argentina (+54)
      formattedPhone = `+54${formattedPhone}`;
    }

    const message = generateReceiptMessage(sale, store);

    const response = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`, // Tu número de Twilio
      to: `whatsapp:${formattedPhone}`
    });

    console.log('WhatsApp enviado:', response.sid);
    return { success: true, messageId: response.sid };
  } catch (error) {
    console.error('Error al enviar WhatsApp:', error);
    throw new Error('No se pudo enviar el comprobante por WhatsApp');
  }
};

module.exports = {
  sendReceiptWhatsApp
};