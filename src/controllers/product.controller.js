const Product = require('../models/Product.model');

// @desc    Obtener todos los productos del almacén
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const { search, category } = req.query;
    
    // Filtros
    const filters = { 
      storeId: req.store.id,
      isActive: true 
    };

    // Búsqueda por nombre
    if (search) {
      filters.name = { $regex: search, $options: 'i' };
    }

    // Filtro por categoría
    if (category && category !== 'Todos') {
      filters.category = category;
    }

    const products = await Product.find(filters).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error('Error en getProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
};

// @desc    Obtener un producto por ID
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      storeId: req.store.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error en getProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
};

// @desc    Buscar producto por código de barras
// @route   GET /api/products/barcode/:barcode
// @access  Private
const getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({
      barcode: req.params.barcode,
      storeId: req.store.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado con ese código de barras'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error en getProductByBarcode:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar producto',
      error: error.message
    });
  }
};

// @desc    Crear nuevo producto
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const { barcode, name, price, stock, minStock, category, image, expirationDate } = req.body;

    // Verificar si el código de barras ya existe en este almacén
    const existingProduct = await Product.findOne({
      barcode,
      storeId: req.store.id
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con este código de barras'
      });
    }

    // Crear producto
    const product = await Product.create({
      storeId: req.store.id,
      barcode,
      name,
      price,
      stock,
      minStock,
      category,
      image,
      expirationDate: expirationDate || null
    });

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: product
    });

  } catch (error) {
    console.error('Error en createProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: error.message
    });
  }
};

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    let product = await Product.findOne({
      _id: req.params.id,
      storeId: req.store.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Si se está cambiando el código de barras, verificar que no exista
    if (req.body.barcode && req.body.barcode !== product.barcode) {
      const existingProduct = await Product.findOne({
        barcode: req.body.barcode,
        storeId: req.store.id,
        _id: { $ne: req.params.id }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro producto con este código de barras'
        });
      }
    }

    // Actualizar producto
    product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: product
    });

  } catch (error) {
    console.error('Error en updateProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
};

// @desc    Eliminar producto (soft delete)
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      storeId: req.store.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Soft delete - solo marcamos como inactivo
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en deleteProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
};

// @desc    Actualizar stock de producto
// @route   PATCH /api/products/:id/stock
// @access  Private
const updateStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' o 'subtract'

    const product = await Product.findOne({
      _id: req.params.id,
      storeId: req.store.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    if (operation === 'add') {
      product.stock += quantity;
    } else if (operation === 'subtract') {
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Stock insuficiente'
        });
      }
      product.stock -= quantity;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Stock actualizado exitosamente',
      data: product
    });

  } catch (error) {
    console.error('Error en updateStock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar stock',
      error: error.message
    });
  }
};

// @desc    Obtener productos con stock bajo
// @route   GET /api/products/low-stock
// @access  Private
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      storeId: req.store.id,
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    }).sort({ stock: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error('Error en getLowStockProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos con stock bajo',
      error: error.message
    });
  }
};

// @desc    Importar productos desde CSV (bulk create)
// @route   POST /api/products/import
// @access  Private
const importProducts = async (req, res) => {
  try {
    const { products } = req.body; // Array de productos

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de productos'
      });
    }

    // Agregar storeId a cada producto
    const productsWithStore = products.map(p => ({
      ...p,
      storeId: req.store.id
    }));

    // Importar productos
    const result = await Product.insertMany(productsWithStore, {
      ordered: false // Continuar aunque algunos fallen
    });

    res.status(201).json({
      success: true,
      message: `${result.length} productos importados exitosamente`,
      data: result
    });

  } catch (error) {
    console.error('Error en importProducts:', error);
    
    // Si hay errores de duplicados, informar cuántos se insertaron
    if (error.code === 11000) {
      return res.status(207).json({
        success: true,
        message: 'Algunos productos se importaron, otros ya existían',
        inserted: error.result?.nInserted || 0
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al importar productos',
      error: error.message
    });
  }
};

// @desc    Obtener productos próximos a vencer (20 días)
// @route   GET /api/products/near-expiration
// @access  Private
const getNearExpirationProducts = async (req, res) => {
  try {
    const today = new Date();
    const twentyDaysFromNow = new Date();
    twentyDaysFromNow.setDate(today.getDate() + 20);

    const products = await Product.find({
      storeId: req.store.id,
      isActive: true,
      expirationDate: {
        $ne: null,
        $gte: today,
        $lte: twentyDaysFromNow
      }
    }).sort({ expirationDate: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error('Error en getNearExpirationProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos próximos a vencer',
      error: error.message
    });
  }
};

// @desc    Obtener productos vencidos
// @route   GET /api/products/expired
// @access  Private
const getExpiredProducts = async (req, res) => {
  try {
    const today = new Date();

    const products = await Product.find({
      storeId: req.store.id,
      isActive: true,
      expirationDate: {
        $ne: null,
        $lt: today
      }
    }).sort({ expirationDate: -1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error('Error en getExpiredProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos vencidos',
      error: error.message
    });
  }
};

module.exports = {
    getProducts,
    getProduct,
    getProductByBarcode,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getLowStockProducts,
    importProducts,
    getNearExpirationProducts,
    getExpiredProducts
}