const Sale = require('../models/Sale.model');
const Product = require('../models/Product.model');
const Store = require('../models/Store.model');
const mongoose = require('mongoose');
const { sendReceiptEmail } = require('../services/emailService');

// @desc    Obtener todas las ventas del almacén
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod } = req.query;
    
    // Filtros
    const filters = { storeId: req.store.id };

    // Filtro por fecha
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.createdAt.$lte = new Date(endDate);
      }
    }

    // Filtro por estado
    if (status) {
      filters.status = status;
    }

    // Filtro por método de pago
    if (paymentMethod) {
      filters.paymentMethod = paymentMethod;
    }

    const sales = await Sale.find(filters)
      .sort({ createdAt: -1 })
      .populate('products.productId', 'name category');

    // Filtrar ventas completadas para estadísticas
    const completedSales = sales.filter(s => s.status === 'completada');

    // Cantidad de ventas completadas
    const totalVentas = completedSales.length;

    // Calcular estadísticas
    const totalMonto = completedSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProductos = completedSales.reduce((sum, sale) => 
      sum + sale.products.reduce((pSum, p) => pSum + p.quantity, 0), 0
    );

    // Estadísticas por método de pago
    const statsByPaymentMethod = {
      efectivo: {
        count: completedSales.filter(s => s.paymentMethod === 'efectivo').length,
        total: completedSales.filter(s => s.paymentMethod === 'efectivo')
          .reduce((sum, s) => sum + s.total, 0)
      },
      transferencia: {
        count: completedSales.filter(s => s.paymentMethod === 'transferencia').length,
        total: completedSales.filter(s => s.paymentMethod === 'transferencia')
          .reduce((sum, s) => sum + s.total, 0)
      },
      tarjeta: {
        count: completedSales.filter(s => s.paymentMethod === 'tarjeta').length,
        total: completedSales.filter(s => s.paymentMethod === 'tarjeta')
          .reduce((sum, s) => sum + s.total, 0)
      }
    };

    res.json({
      success: true,
      count: totalVentas,
      stats: {
        totalVentas,
        totalMonto,
        totalProductos,
        promedioVenta: totalVentas > 0 ? (totalMonto / totalVentas).toFixed(2) : 0,
        byPaymentMethod: statsByPaymentMethod
      },
      data: sales
    });

  } catch (error) {
    console.error('Error en getSales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas',
      error: error.message
    });
  }
};

// @desc    Obtener una venta por ID
// @route   GET /api/sales/:id
// @access  Private
const getSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      storeId: req.store.id
    }).populate('products.productId', 'name category image');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    res.json({
      success: true,
      data: sale
    });

  } catch (error) {
    console.error('Error en getSale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener venta',
      error: error.message
    });
  }
};

// @desc    Crear nueva venta
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { products, customer, paymentMethod, receiptSent } = req.body;

    // Validar que vengan productos
    if (!products || products.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un producto'
      });
    }

    // Validar método de pago
    if (!paymentMethod || !['efectivo', 'transferencia', 'tarjeta'].includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Método de pago inválido'
      });
    }

    // Si eligió envío, validar datos del cliente
    if (receiptSent === 'email' && !customer?.email) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Email del cliente requerido para enviar comprobante'
      });
    }

    // Validar stock y preparar productos para la venta
    const saleProducts = [];
    
    for (const item of products) {
      const product = await Product.findOne({
        _id: item.productId,
        storeId: req.store.id,
        isActive: true
      }).session(session);

      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Producto ${item.productId} no encontrado`
        });
      }

      // Verificar stock disponible
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`
        });
      }

      // Reducir stock
      product.stock -= item.quantity;
      await product.save({ session });

      // Agregar a la lista de productos de la venta
      saleProducts.push({
        productId: product._id,
        name: product.name,
        barcode: product.barcode,
        quantity: item.quantity,
        price: product.price,
        subtotal: product.price * item.quantity
      });
    }

    // Calcular total
    const total = saleProducts.reduce((sum, item) => sum + item.subtotal, 0);

    // Generar número de ticket manualmente
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Contar ventas del día para este almacén
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const count = await Sale.countDocuments({
      storeId: req.store.id,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).session(session);
    
    const ticketNumber = `${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;

    // Crear venta con el ticketNumber ya generado
    const sale = new Sale({
      storeId: req.store.id,
      ticketNumber,
      products: saleProducts,
      total,
      customer: customer || {},
      paymentMethod, 
      receiptSent: receiptSent || 'none', 
      status: 'completada'
    });

    await sale.save({ session });

    // ✅ COMMIT de la transacción ANTES de enviar comprobantes
    await session.commitTransaction();

    // 📧 ENVIAR COMPROBANTE POR EMAIL (fuera de la transacción)
    if (receiptSent === 'email' && customer?.email) {
      // Ejecutar en background sin bloquear la respuesta
      setImmediate(async () => {
        try {
          const store = await Store.findById(req.store.id);
          
          if (!store) {
            throw new Error('Almacén no encontrado');
          }
          
          await sendReceiptEmail(sale, store, customer.email);
        } catch (emailError) {
          console.error('❌ ========== ERROR CRÍTICO AL ENVIAR EMAIL ==========');
          console.error('❌ Email destino:', customer?.email);
          console.error('❌ Error completo:', emailError);
          console.error('❌ Mensaje:', emailError.message);
          console.error('❌ Stack:', emailError.stack);
          console.error('❌ ===================================================');
          // No afecta la venta, solo loggear el error
        }
      });
    }

    // Respuesta exitosa (no espera a que se envíen los comprobantes)
    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      data: sale
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error en createSale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear venta',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Cancelar una venta (devolver stock)
// @route   DELETE /api/sales/:id
// @access  Private
const cancelSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      storeId: req.store.id
    }).session(session);

    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    if (sale.status === 'cancelada') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Esta venta ya está cancelada'
      });
    }

    // Devolver stock de cada producto
    for (const item of sale.products) {
      const product = await Product.findById(item.productId).session(session);
      
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }
    }

    // Marcar venta como cancelada
    sale.status = 'cancelada';
    await sale.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Venta cancelada y stock restaurado',
      data: sale
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error en cancelSale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar venta',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// @desc    Obtener estadísticas de ventas
// @route   GET /api/sales/stats/summary
// @access  Private
const getSalesStats = async (req, res) => {
  try {
    const { period } = req.query; // 'today', 'week', 'month'

    let startDate = new Date();
    
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    const sales = await Sale.find({
      storeId: req.store.id,
      status: 'completada',
      createdAt: { $gte: startDate }
    });

    // Calcular estadísticas
    const totalVentas = sales.length;
    const totalMonto = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProductos = sales.reduce((sum, sale) => 
      sum + sale.products.reduce((pSum, p) => pSum + p.quantity, 0), 0
    );

    // Productos más vendidos
    const productStats = {};
    sales.forEach(sale => {
      sale.products.forEach(item => {
        if (!productStats[item.name]) {
          productStats[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productStats[item.name].quantity += item.quantity;
        productStats[item.name].revenue += item.subtotal;
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Ventas por método de pago
    const paymentMethods = sales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      period,
      data: {
        totalVentas,
        totalMonto,
        totalProductos,
        promedioVenta: totalVentas > 0 ? (totalMonto / totalVentas).toFixed(2) : 0,
        topProducts,
        paymentMethods
      }
    });

  } catch (error) {
    console.error('Error en getSalesStats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// @desc    Obtener ventas de hoy
// @route   GET /api/sales/today
// @access  Private
const getTodaySales = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await Sale.find({
      storeId: req.store.id,
      status: 'completada',
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ createdAt: -1 });

    const completedSales = sales.filter(s => s.status === 'completada');
    const totalMonto = completedSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalVentas = completedSales.length;

    res.json({
      success: true,
      count: totalVentas,
      totalMonto,
      data: sales
    });

  } catch (error) {
    console.error('Error en getTodaySales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas de hoy',
      error: error.message
    });
  }
};

// @desc    Enviar comprobante por email de una venta existente
// @route   POST /api/sales/:id/send-email
// @access  Private
const sendSaleEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email del destinatario es requerido'
      });
    }

    // Buscar la venta
    const sale = await Sale.findOne({
      _id: id,
      storeId: req.store.id
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Buscar el almacén
    const store = await Store.findById(req.store.id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Almacén no encontrado'
      });
    }

    // Enviar el email
    await sendReceiptEmail(sale, store, email);

    res.json({
      success: true,
      message: 'Comprobante enviado por email exitosamente'
    });
  } catch (error) {
    console.error('Error al enviar email:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el comprobante por email',
      error: error.message
    });
  }
};

module.exports = {
  getSales,
  getSale,
  createSale,
  cancelSale,
  getSalesStats,
  getTodaySales,
  sendSaleEmail
}