// ============================================================
// ROYAL CARTOUCHE - PRODUCT PAGE JAVASCRIPT (FIXED)
// ============================================================

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  BACKEND_URL: 'https://royal-cartouche-backend.onrender.com',
  CART_STORAGE_KEY: 'royalCartouche_cart'
};

// ============================================================
// STATE
// ============================================================
let products = [];
let cart = [];
let selectedProduct = null;
let selectedColor = null;
let selectedSize = null;
let selectedVariant = null;

// ============================================================
// DOM REFS
// ============================================================
const grid = document.getElementById('productGrid');
const detailView = document.getElementById('productDetail');
const backBtn = document.getElementById('backToGrid');

// ============================================================
// LOAD CART FROM LOCALSTORAGE
// ============================================================
function loadCart() {
  try {
    const stored = localStorage.getItem(CONFIG.CART_STORAGE_KEY);
    if (stored) {
      cart = JSON.parse(stored);
      console.log('📋 Cart loaded:', cart);
    } else {
      cart = [];
    }
  } catch (e) {
    cart = [];
  }
  updateCartUI();
}

// ============================================================
// SAVE CART TO LOCALSTORAGE
// ============================================================
function saveCart() {
  try {
    localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(cart));
    console.log('💾 Cart saved:', cart);
  } catch (e) {
    console.warn('Could not save cart:', e);
  }
}

// ============================================================
// EXTRACT COLORS
// ============================================================
function extractColors(product) {
  const colors = [];
  const options = product.options || [];
  const colorOption = options.find(opt => opt.type === 'color');

  if (colorOption && colorOption.values) {
    colorOption.values.forEach(val => {
      colors.push(val.title);
    });
  }

  if (colors.length === 0 && product.variants) {
    const colorSet = new Set();
    product.variants.forEach(v => {
      if (v.color) colorSet.add(v.color);
      if (v.title) {
        const parts = v.title.split(' / ');
        if (parts.length > 1) colorSet.add(parts[0]);
      }
    });
    return Array.from(colorSet);
  }

  return colors;
}

// ============================================================
// EXTRACT SIZES
// ============================================================
function extractSizes(product) {
  const sizes = [];
  const options = product.options || [];
  const sizeOption = options.find(opt => opt.type === 'size');

  if (sizeOption && sizeOption.values) {
    sizeOption.values.forEach(val => {
      sizes.push(val.title);
    });
  }

  if (sizes.length === 0 && product.variants) {
    const sizeSet = new Set();
    product.variants.forEach(v => {
      if (v.size) sizeSet.add(v.size);
      if (v.title) {
        const parts = v.title.split(' / ');
        if (parts.length > 1) sizeSet.add(parts[parts.length - 1]);
      }
    });
    return Array.from(sizeSet);
  }

  return sizes;
}

// ============================================================
// FIND VARIANT BY COLOR + SIZE (FIXED)
// ============================================================
function findVariant(product, color, size) {
  if (!product || !product.variants) return null;
  
  // إذا كان اللون null أو undefined، نستخدم 'Default' كقيمة افتراضية
  const searchColor = color || 'Default';
  const searchSize = size || 'One Size';
  
  // البحث المباشر
  let variant = product.variants.find(v => {
    const vColor = v.color || 'Default';
    const vSize = v.size || 'One Size';
    return vColor === searchColor && vSize === searchSize;
  });
  
  if (variant) return variant;
  
  // محاولة البحث عن طريق title
  variant = product.variants.find(v => {
    if (v.title) {
      const parts = v.title.split(' / ');
      if (parts.length === 2) {
        const titleColor = parts[0].trim();
        const titleSize = parts[1].trim();
        return titleColor === searchColor && titleSize === searchSize;
      }
    }
    return false;
  });
  
  if (variant) return variant;
  
  // آخر محاولة: البحث عن أي متغير متاح إذا كان اللون والمقاس غير مهمين
  if (color === null && size === null) {
    return product.variants.find(v => v.available !== false) || product.variants[0];
  }
  
  return null;
}

// ============================================================
// FETCH PRODUCTS
// ============================================================
async function fetchProducts() {
  try {
    console.log('🔍 Fetching products from:', CONFIG.BACKEND_URL + '/api/products');

    const response = await fetch(CONFIG.BACKEND_URL + '/api/products');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📦 Products received:', result);

    if (result.data && result.data.length > 0) {
      products = result.data;
      renderGrid(products);
    } else {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: #b8956a; padding: 40px;">
          <p>No products available yet.</p>
          <p style="font-size: 12px; margin-top: 10px;">Add products in your Printify catalog.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: #ff6b6b; padding: 40px;">
        <p>⚠️ Failed to load products.</p>
        <p style="font-size: 12px; margin-top: 10px;">Error: ${error.message}</p>
      </div>
    `;
  }
}

// ============================================================
// RENDER GRID
// ============================================================
function renderGrid(products) {
  grid.innerHTML = '';

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const firstVariant = product.variants && product.variants[0];
    const price = firstVariant ? (firstVariant.price / 100).toFixed(2) : '0.00';

    const imageUrl = product.images && product.images[0] && product.images[0].src
      ? product.images[0].src
      : 'https://via.placeholder.com/300x300/1a1a1a/d4a843?text=Royal+Cartouche';

    card.innerHTML = `
      <img src="${imageUrl}" alt="${product.title}">
      <h3>${product.title}</h3>
      <div class="price">$${price}</div>
      <button class="btn-detail" data-id="${product.id}">VIEW DETAILS</button>
    `;

    grid.appendChild(card);
  });

  document.querySelectorAll('.btn-detail').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      const product = products.find(p => p.id === id);
      if (product) showDetail(product);
    });
  });

  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', function() {
      const btn = this.querySelector('.btn-detail');
      if (btn) btn.click();
    });
  });
}

// ============================================================
// SHOW PRODUCT DETAIL
// ============================================================
function showDetail(product) {
  selectedProduct = product;
  selectedColor = null;
  selectedSize = null;
  selectedVariant = null;

  grid.style.display = 'none';
  detailView.classList.add('visible');

  document.getElementById('detailTitle').textContent = product.title;
  document.getElementById('detailDescription').textContent = product.description || 'Premium Egyptian cartouche design.';

  const mainImage = document.getElementById('detailMainImage');
  if (product.images && product.images[0] && product.images[0].src) {
    mainImage.src = product.images[0].src;
  } else {
    mainImage.src = 'https://via.placeholder.com/400x400/1a1a1a/d4a843?text=Royal+Cartouche';
  }

  const thumbnails = document.getElementById('detailThumbnails');
  thumbnails.innerHTML = '';
  if (product.images && product.images.length > 0) {
    product.images.forEach((img, index) => {
      if (img.src) {
        const thumb = document.createElement('img');
        thumb.src = img.src;
        thumb.alt = `${product.title} - Image ${index + 1}`;
        thumb.addEventListener('click', () => {
          mainImage.src = img.src;
        });
        thumbnails.appendChild(thumb);
      }
    });
  }

  const colors = extractColors(product);
  const sizes = extractSizes(product);

  console.log('🎨 Colors extracted:', colors);
  console.log('📏 Sizes extracted:', sizes);

  renderColorOptions(colors);
  renderSizeOptions(sizes);

  updatePrice();

  const btn = document.getElementById('addToCartBtn');
  
  // حالة خاصة: منتج ليس له ألوان ولا مقاسات (منتج واحد)
  if (colors.length === 0 && sizes.length === 0) {
    // نختار أول متغير متاح تلقائياً
    const firstVariant = product.variants && product.variants.find(v => v.available !== false);
    if (firstVariant) {
      selectedVariant = firstVariant;
      selectedColor = 'Default';
      selectedSize = 'One Size';
      btn.textContent = `Add to Cart - $${(firstVariant.price / 100).toFixed(2)}`;
      btn.disabled = false;
      updatePrice();
    } else {
      btn.textContent = 'Product Unavailable';
      btn.disabled = true;
    }
    return;
  }
  
  // حالة خاصة: منتج له مقاسات فقط (بدون ألوان)
  if (colors.length === 0 && sizes.length > 0) {
    // نضع لون افتراضي
    selectedColor = 'Default';
    // نعرض رسالة للمستخدم باختيار المقاس
    btn.textContent = 'Select Size';
    btn.disabled = true;
    return;
  }
  
  // حالة خاصة: منتج له ألوان فقط (بدون مقاسات)
  if (colors.length > 0 && sizes.length === 0) {
    btn.textContent = 'Select Color';
    btn.disabled = true;
    return;
  }
  
  // حالة: منتج له ألوان ومقاسات
  btn.textContent = 'Select Size & Color';
  btn.disabled = true;
  btn.classList.remove('added');
}

// ============================================================
// RENDER COLOR OPTIONS
// ============================================================
function renderColorOptions(colors) {
  const container = document.getElementById('colorOptions');
  container.innerHTML = '';

  if (colors.length === 0) {
    container.innerHTML = '<span style="color: #b8956a; font-size: 13px;">No color options available</span>';
    return;
  }

  colors.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'option-btn color-swatch';
    btn.dataset.color = color;
    btn.style.background = getColorBackground(color);
    btn.title = color;
    
    btn.innerHTML = '';
    
    btn.addEventListener('click', function() {
      document.querySelectorAll('#colorOptions .color-swatch').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      selectedColor = color;
      
      updateMainImageByColor(selectedProduct, color);
      
      updateVariantSelection();
    });
    container.appendChild(btn);
  });
}

// ============================================================
// UPDATE MAIN IMAGE BY COLOR
// ============================================================
function updateMainImageByColor(product, color) {
  if (!product || !product.images) return;
  
  const mainImage = document.getElementById('detailMainImage');
  
  if (product.images && product.images.length > 0) {
    mainImage.src = product.images[0].src;
  }
}

// ============================================================
// GET COLOR BACKGROUND
// ============================================================
function getColorBackground(color) {
  const colorMap = {
    'Black': '#000000',
    'White': '#FFFFFF',
    'Red': '#FF0000',
    'Blue': '#0000FF',
    'Green': '#00FF00',
    'Yellow': '#FFFF00',
    'Gold': '#D4A843',
    'Navy': '#000080',
    'Gray': '#808080',
    'Grey': '#808080',
    'Brown': '#8B4513',
    'Pink': '#FFC0CB',
    'Purple': '#800080',
    'Orange': '#FFA500',
    'Ash': '#C0C0C0',
    'Sand': '#DCD2BE',
    'Sport Grey': '#CACACA',
    'Dark Heather': '#454545',
    'Charcoal': '#585559',
    'Royal': '#084f97',
    'Maroon': '#642838',
    'Dark Chocolate': '#31221D',
    'Military Green': '#62664C',
    'Forest Green': '#223b26',
    'Irish Green': '#279436',
    'Light Blue': '#d6e6f7',
    'Carolina Blue': '#7BA4DB',
    'Indigo Blue': '#476579',
    'Antique Sapphire': '#0082AE',
    'Light Pink': '#FEE0EB',
    'Heliconia': '#DF5086',
    'Cardinal Red': '#911a30',
    'Safety Orange': '#F88D20',
    'Safety Green': '#F2FB00',
    'Safety Pink': '#FF8E9D',
    'Orchid': '#D7C5F0'
  };
  return colorMap[color] || '#D4A843';
}

// ============================================================
// RENDER SIZE OPTIONS
// ============================================================
function renderSizeOptions(sizes) {
  const container = document.getElementById('sizeOptions');
  container.innerHTML = '';

  if (sizes.length === 0) {
    container.innerHTML = '<span style="color: #b8956a; font-size: 13px;">No size options available</span>';
    return;
  }

  sizes.forEach(size => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = size;
    btn.dataset.size = size;
    btn.addEventListener('click', function() {
      document.querySelectorAll('#sizeOptions .option-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      selectedSize = size;
      updateVariantSelection();
    });
    container.appendChild(btn);
  });
}

// ============================================================
// UPDATE VARIANT SELECTION (FIXED)
// ============================================================
function updateVariantSelection() {
  const btn = document.getElementById('addToCartBtn');
  const colors = extractColors(selectedProduct);
  const sizes = extractSizes(selectedProduct);

  console.log('🎯 Updating variant - Color:', selectedColor, 'Size:', selectedSize);
  console.log('📊 Product has colors:', colors.length, 'sizes:', sizes.length);

  // ============================================================
  // حالة 1: منتج بدون ألوان وبدون مقاسات (منتج واحد)
  // ============================================================
  if (colors.length === 0 && sizes.length === 0) {
    const variant = selectedProduct.variants && selectedProduct.variants.find(v => v.available !== false);
    if (variant) {
      selectedVariant = variant;
      btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
      btn.disabled = false;
      updatePrice();
    }
    return;
  }

  // ============================================================
  // حالة 2: منتج له مقاسات فقط (بدون ألوان) - FIXED
  // ============================================================
  if (colors.length === 0 && sizes.length > 0) {
    // تأكدنا أن اللون الافتراضي موجود
    if (!selectedColor) {
      selectedColor = 'Default';
    }
    
    if (selectedSize) {
      const variant = findVariant(selectedProduct, selectedColor, selectedSize);
      if (variant) {
        selectedVariant = variant;
        btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
        btn.disabled = false;
        updatePrice();
        console.log('✅ Variant found (size only):', variant);
        return;
      } else {
        console.log('❌ No variant found for size:', selectedSize);
        // محاولة البحث عن أي متغير متاح
        const anyVariant = selectedProduct.variants.find(v => v.available !== false);
        if (anyVariant) {
          selectedVariant = anyVariant;
          btn.textContent = `Add to Cart - $${(anyVariant.price / 100).toFixed(2)}`;
          btn.disabled = false;
          updatePrice();
          return;
        }
      }
    }
    
    btn.textContent = selectedSize ? 'Select Size' : 'Select Size';
    btn.disabled = true;
    return;
  }

  // ============================================================
  // حالة 3: منتج له ألوان فقط (بدون مقاسات)
  // ============================================================
  if (colors.length > 0 && sizes.length === 0) {
    if (selectedColor) {
      const variant = findVariant(selectedProduct, selectedColor, 'One Size');
      if (variant) {
        selectedVariant = variant;
        btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
        btn.disabled = false;
        updatePrice();
        return;
      }
    }
    btn.textContent = selectedColor ? 'Select Color' : 'Select Color';
    btn.disabled = true;
    return;
  }

  // ============================================================
  // حالة 4: منتج له ألوان ومقاسات (الوضع الطبيعي)
  // ============================================================
  if (selectedColor && selectedSize) {
    const variant = findVariant(selectedProduct, selectedColor, selectedSize);
    if (variant) {
      selectedVariant = variant;
      btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
      btn.disabled = false;
      updatePrice();
      console.log('✅ Variant found (both):', variant);
      return;
    } else {
      console.log('❌ No variant found for', selectedColor, selectedSize);
    }
  }

  selectedVariant = null;
  if (!selectedColor && !selectedSize) {
    btn.textContent = 'Select Size & Color';
  } else if (!selectedColor) {
    btn.textContent = 'Select Color';
  } else if (!selectedSize) {
    btn.textContent = 'Select Size';
  }
  btn.disabled = true;
}

// ============================================================
// UPDATE PRICE
// ============================================================
function updatePrice() {
  const priceEl = document.getElementById('detailPrice');
  const originalPriceEl = document.getElementById('detailOriginalPrice');

  if (selectedVariant) {
    const price = (selectedVariant.price / 100).toFixed(2);
    priceEl.textContent = `$${price}`;
    originalPriceEl.textContent = '';
  } else if (selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0) {
    const prices = selectedProduct.variants
      .filter(v => v.available !== false)
      .map(v => v.price / 100)
      .sort((a, b) => a - b);
    if (prices.length > 0) {
      const min = prices[0].toFixed(2);
      const max = prices[prices.length - 1].toFixed(2);
      if (min === max) {
        priceEl.textContent = `$${min}`;
        originalPriceEl.textContent = '';
      } else {
        priceEl.textContent = `$${min}`;
        originalPriceEl.textContent = `$${max}`;
      }
    }
  }
}

// ============================================================
// ADD TO CART (FIXED)
// ============================================================
document.getElementById('addToCartBtn').addEventListener('click', function() {
  // إذا لم يوجد متغير محدد، نحاول إيجاد واحد تلقائياً
  if (!selectedVariant && selectedProduct) {
    const colors = extractColors(selectedProduct);
    const sizes = extractSizes(selectedProduct);
    
    // إذا كان المنتج بدون ألوان ومقاسات
    if (colors.length === 0 && sizes.length === 0) {
      const variant = selectedProduct.variants && selectedProduct.variants.find(v => v.available !== false);
      if (variant) {
        selectedVariant = variant;
        selectedColor = 'Default';
        selectedSize = 'One Size';
      }
    }
    
    // إذا كان المنتج له مقاسات فقط
    if (colors.length === 0 && sizes.length > 0 && !selectedSize) {
      // نختار أول مقاس متاح تلقائياً
      const firstSize = sizes[0];
      if (firstSize) {
        selectedSize = firstSize;
        selectedColor = 'Default';
        const variant = findVariant(selectedProduct, selectedColor, selectedSize);
        if (variant) {
          selectedVariant = variant;
        }
      }
    }
    
    // إذا كان المنتج له ألوان فقط
    if (colors.length > 0 && sizes.length === 0 && !selectedColor) {
      const firstColor = colors[0];
      if (firstColor) {
        selectedColor = firstColor;
        const variant = findVariant(selectedProduct, selectedColor, 'One Size');
        if (variant) {
          selectedVariant = variant;
        }
      }
    }
  }
  
  if (!selectedVariant) {
    console.log('❌ No variant selected');
    showMessage('⚠️ Please select all options before adding to cart.', 'error');
    return;
  }

  console.log('➕ Adding to cart:', selectedVariant);

  const existing = cart.find(item => item.variantId === selectedVariant.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      variantId: selectedVariant.id,
      title: selectedProduct.title,
      color: selectedColor || 'Default',
      size: selectedSize || 'One Size',
      price: selectedVariant.price / 100,
      quantity: 1,
      image: selectedProduct.images && selectedProduct.images[0] ? selectedProduct.images[0].src : ''
    });
  }

  saveCart();

  this.textContent = '✅ ADDED!';
  this.classList.add('added');
  setTimeout(() => {
    if (selectedVariant) {
      this.textContent = `Add to Cart - $${(selectedVariant.price / 100).toFixed(2)}`;
    } else {
      this.textContent = 'Select Size & Color';
    }
    this.classList.remove('added');
  }, 1500);

  updateCartUI();

  // ✅ التوجيه لصفحة العربة
  window.location.assign('https://sites.google.com/view/shenue/cart');
});

// ============================================================
// SHOW MESSAGE FUNCTION
// ============================================================
function showMessage(msg, type = 'info') {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: ${type === 'error' ? 'rgba(255,0,0,0.85)' : 'rgba(46,204,113,0.9)'};
    color: #fff; padding: 15px 30px; border-radius: 10px;
    font-family: 'Cinzel', serif; font-size: 14px; letter-spacing: 1px;
    z-index: 9999; text-align: center; max-width: 90%;
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
    animation: fadeIn 0.3s ease;
  `;
  popup.textContent = msg;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.5s';
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

// ============================================================
// CART FUNCTIONS
// ============================================================
function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const totalPrice = document.getElementById('totalPrice');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (!cartItems) {
    console.log('Cart elements not found on this page');
    return;
  }

  if (cart.length === 0) {
    cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
    if (cartTotal) cartTotal.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  let html = '';
  let total = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    html += `
      <div class="cart-item">
        <div class="item-info">
          ${item.title}
          <div class="variant-detail">${item.color || 'Default'} • ${item.size || 'One Size'} × ${item.quantity}</div>
        </div>
        <span class="item-price">$${itemTotal.toFixed(2)}</span>
        <button class="btn-remove" data-index="${index}">✕</button>
      </div>
    `;
  });

  if (cartItems) cartItems.innerHTML = html;
  if (cartTotal) cartTotal.style.display = 'flex';
  if (totalPrice) totalPrice.textContent = `$${total.toFixed(2)}`;
  if (checkoutBtn) checkoutBtn.disabled = false;

  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', function() {
      removeFromCart(parseInt(this.dataset.index));
    });
  });
}

// ============================================================
// BACK TO GRID
// ============================================================
if (backBtn) {
  backBtn.addEventListener('click', function() {
    detailView.classList.remove('visible');
    grid.style.display = 'grid';
    selectedProduct = null;
    selectedColor = null;
    selectedSize = null;
    selectedVariant = null;
  });
}

// ============================================================
// CHECKOUT
// ============================================================
const checkoutBtn = document.getElementById('checkoutBtn');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', function() {
    if (cart.length === 0) return;

    const orderData = {
      items: cart,
      total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    alert(`🛒 Order total: $${orderData.total.toFixed(2)}\n\nCheckout functionality will be added with 2Checkout.`);
    console.log('Order data:', orderData);
  });
}

// ============================================================
// INIT
// ============================================================
loadCart();
fetchProducts();

console.log('👑 Royal Cartouche - Product Page Loaded (FIXED)');
console.log('🛒 Items in cart:', cart.length);
console.log('✅ Fixed: Products with sizes only can now be added to cart!');
