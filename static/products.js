// ============================================================
// ROYAL CARTOUCHE - PRODUCT PAGE JAVASCRIPT (EXTERNAL)
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
let shippingCost = 0;
let shippingCalculated = false;

// ============================================================
// DOM REFS
// ============================================================
const grid = document.getElementById('productGrid');
const detailView = document.getElementById('productDetail');
const backBtn = document.getElementById('backToGrid');
const cartOverlay = document.getElementById('cartOverlay');
const openCartBtn = document.getElementById('openCartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const continueShoppingBtn = document.getElementById('continueShoppingBtn');
const popupCartItems = document.getElementById('popupCartItems');
const popupSubtotal = document.getElementById('popupSubtotal');
const popupShipping = document.getElementById('popupShipping');
const popupTotal = document.getElementById('popupTotal');
const popupCheckoutBtn = document.getElementById('popupCheckoutBtn');
const cartBadge = document.getElementById('cartBadge');
const shippingRow = document.getElementById('shippingRow');
const shippingResult = document.getElementById('shippingResult');
const shippingCostDisplay = document.getElementById('shippingCostDisplay');
const shippingEstimate = document.getElementById('shippingEstimate');
const countrySelect = document.getElementById('countrySelect');
const cityInput = document.getElementById('cityInput');
const zipInput = document.getElementById('zipInput');
const calculateShippingBtn = document.getElementById('calculateShippingBtn');
const checkoutOverlay = document.getElementById('checkoutOverlay');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
const closeCheckoutBtn2 = document.getElementById('closeCheckoutBtn2');
const fullName = document.getElementById('fullName');
const emailAddress = document.getElementById('emailAddress');
const phoneNumber = document.getElementById('phoneNumber');
const checkoutCountry = document.getElementById('checkoutCountry');
const checkoutState = document.getElementById('checkoutState');
const checkoutCity = document.getElementById('checkoutCity');
const checkoutZip = document.getElementById('checkoutZip');
const checkoutStreet = document.getElementById('checkoutStreet');
const checkoutSubtotal = document.getElementById('checkoutSubtotal');
const checkoutShipping = document.getElementById('checkoutShipping');
const checkoutTotal = document.getElementById('checkoutTotal');
const checkoutShippingRow = document.getElementById('checkoutShippingRow');
const placeOrderBtn = document.getElementById('placeOrderBtn');

// ============================================================
// CART FUNCTIONS
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

function saveCart() {
  try {
    localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(cart));
    console.log('💾 Cart saved:', cart);
  } catch (e) {
    console.warn('Could not save cart:', e);
  }
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.textContent = totalItems;

  shippingCalculated = false;
  shippingResult.classList.remove('visible');
  shippingRow.style.display = 'none';
  shippingCost = 0;

  if (cart.length === 0) {
    popupCartItems.innerHTML = `
      <div class="empty-cart-popup">
        <div class="icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added any royal pieces yet.</p>
      </div>
    `;
    updateSummary();
    popupCheckoutBtn.disabled = true;
    return;
  }

  let html = '';
  let subtotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    const imageUrl = item.image || 'https://via.placeholder.com/60x60/1a1a1a/d4a843?text=RC';
    html += `
      <div class="cart-item">
        <img src="${imageUrl}" alt="${item.title}">
        <div class="info">
          <div class="title">${item.title}</div>
          <div class="variant">${item.color || 'Default'} • ${item.size || 'One Size'}</div>
          <div class="qty">
            <button onclick="updateQuantity(${index}, -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="updateQuantity(${index}, 1)">+</button>
          </div>
        </div>
        <div class="item-price">
          $${itemTotal.toFixed(2)}
          <button class="btn-remove" onclick="removeItem(${index})">✕</button>
        </div>
      </div>
    `;
  });

  popupCartItems.innerHTML = html;
  updateSummary();
  popupCheckoutBtn.disabled = false;
}

function updateSummary() {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  popupSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  let total = subtotal;
  if (shippingCalculated && shippingCost > 0) {
    total += shippingCost;
    popupShipping.textContent = `$${shippingCost.toFixed(2)}`;
    shippingRow.style.display = 'flex';
  } else {
    shippingRow.style.display = 'none';
  }
  popupTotal.textContent = `$${total.toFixed(2)}`;
}

function updateQuantity(index, change) {
  if (!cart[index]) return;
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
  updateCartUI();
}

function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

// ============================================================
// SHIPPING CALCULATION
// ============================================================
calculateShippingBtn.addEventListener('click', function() {
  const country = countrySelect.value;
  const city = cityInput.value.trim();
  const zip = zipInput.value.trim();

  if (!country) {
    showMessage('⚠️ Please select a country.', 'error');
    return;
  }
  if (!city || !zip) {
    showMessage('⚠️ Please enter city and ZIP code.', 'error');
    return;
  }
  if (cart.length === 0) {
    showMessage('⚠️ Your cart is empty.', 'error');
    return;
  }

  this.disabled = true;
  this.innerHTML = '<span class="spinner"></span> Calculating...';

  setTimeout(() => {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    let baseRate = 4.99;
    let perItem = 2.50;

    if (country === 'US') { baseRate = 4.99; perItem = 2.50; }
    else if (country === 'CA') { baseRate = 7.99; perItem = 3.50; }
    else if (country === 'GB' || country === 'DE' || country === 'FR') { baseRate = 9.99; perItem = 4.50; }
    else if (country === 'AU') { baseRate = 12.99; perItem = 5.50; }
    else { baseRate = 14.99; perItem = 6.50; }

    shippingCost = baseRate + (perItem * totalItems);
    shippingCalculated = true;

    let days = '3-5';
    if (country === 'US') days = '3-5';
    else if (country === 'CA') days = '5-7';
    else days = '7-10';

    shippingCostDisplay.textContent = `$${shippingCost.toFixed(2)}`;
    shippingEstimate.textContent = `Estimated delivery: ${days} business days`;
    shippingResult.classList.add('visible');

    updateSummary();
    this.disabled = false;
    this.innerHTML = 'CALCULATE SHIPPING';
  }, 500);
});

// ============================================================
// MESSAGE SYSTEM (بديل alert)
// ============================================================
function showMessage(msg, type = 'info') {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: ${type === 'error' ? 'rgba(255,0,0,0.8)' : 'rgba(46,204,113,0.9)'};
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
// POPUP CONTROLS
// ============================================================
openCartBtn.addEventListener('click', function() {
  updateCartUI();
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
});

closeCartBtn.addEventListener('click', function() {
  cartOverlay.classList.remove('active');
  document.body.style.overflow = 'auto';
});

continueShoppingBtn.addEventListener('click', function() {
  cartOverlay.classList.remove('active');
  document.body.style.overflow = 'auto';
});

cartOverlay.addEventListener('click', function(e) {
  if (e.target === this) {
    cartOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
});

// ============================================================
// CHECKOUT POPUP CONTROLS
// ============================================================
popupCheckoutBtn.addEventListener('click', function() {
  if (cart.length === 0) return;
  if (!shippingCalculated || shippingCost <= 0) {
    showMessage('⚠️ Please calculate shipping first.', 'error');
    return;
  }
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  checkoutSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  if (shippingCalculated && shippingCost > 0) {
    checkoutShipping.textContent = `$${shippingCost.toFixed(2)}`;
    checkoutShippingRow.style.display = 'flex';
    checkoutTotal.textContent = `$${(subtotal + shippingCost).toFixed(2)}`;
  } else {
    checkoutShippingRow.style.display = 'none';
    checkoutTotal.textContent = `$${subtotal.toFixed(2)}`;
  }
  cartOverlay.classList.remove('active');
  checkoutOverlay.classList.add('active');
});

closeCheckoutBtn.addEventListener('click', function() {
  checkoutOverlay.classList.remove('active');
  cartOverlay.classList.add('active');
});

closeCheckoutBtn2.addEventListener('click', function() {
  checkoutOverlay.classList.remove('active');
  cartOverlay.classList.add('active');
});

checkoutOverlay.addEventListener('click', function(e) {
  if (e.target === this) {
    checkoutOverlay.classList.remove('active');
    cartOverlay.classList.add('active');
  }
});

// ============================================================
// PLACE ORDER
// ============================================================
placeOrderBtn.addEventListener('click', function() {
  if (!fullName.value.trim()) {
    showMessage('⚠️ Please enter your full name.', 'error');
    return;
  }
  if (!emailAddress.value.trim() || !emailAddress.value.includes('@')) {
    showMessage('⚠️ Please enter a valid email.', 'error');
    return;
  }
  if (!phoneNumber.value.trim()) {
    showMessage('⚠️ Please enter your phone number.', 'error');
    return;
  }
  if (!checkoutCountry.value) {
    showMessage('⚠️ Please select your country.', 'error');
    return;
  }
  if (!checkoutState.value.trim()) {
    showMessage('⚠️ Please enter your state/province.', 'error');
    return;
  }
  if (!checkoutCity.value.trim()) {
    showMessage('⚠️ Please enter your city.', 'error');
    return;
  }
  if (!checkoutZip.value.trim()) {
    showMessage('⚠️ Please enter your ZIP code.', 'error');
    return;
  }
  if (!checkoutStreet.value.trim()) {
    showMessage('⚠️ Please enter your street address.', 'error');
    return;
  }

  const orderData = {
    customer: {
      name: fullName.value.trim(),
      email: emailAddress.value.trim(),
      phone: phoneNumber.value.trim()
    },
    shipping: {
      country: checkoutCountry.value,
      state: checkoutState.value.trim(),
      city: checkoutCity.value.trim(),
      zip: checkoutZip.value.trim(),
      street: checkoutStreet.value.trim()
    },
    items: cart,
    subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    shipping: shippingCost,
    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + shippingCost
  };

  console.log('📦 ORDER DATA:', JSON.stringify(orderData, null, 2));
  showMessage('✅ Order placed successfully! Check console for details.', 'success');

  setTimeout(() => {
    checkoutOverlay.classList.remove('active');
    cart = [];
    saveCart();
    updateCartUI();
    document.body.style.overflow = 'auto';
  }, 1500);
});

// ============================================================
// PRODUCT FUNCTIONS
// ============================================================
function extractColors(product) {
  const colors = [];
  const options = product.options || [];
  const colorOption = options.find(opt => opt.type === 'color');
  if (colorOption && colorOption.values) {
    colorOption.values.forEach(val => colors.push(val.title));
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

function extractSizes(product) {
  const sizes = [];
  const options = product.options || [];
  const sizeOption = options.find(opt => opt.type === 'size');
  if (sizeOption && sizeOption.values) {
    sizeOption.values.forEach(val => sizes.push(val.title));
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

function findVariant(product, color, size) {
  if (!product || !product.variants) return null;
  return product.variants.find(v => {
    const vColor = v.color || 'Default';
    const vSize = v.size || 'One Size';
    if (vColor === color && vSize === size) return true;
    if (v.title) {
      const parts = v.title.split(' / ');
      if (parts.length === 2) {
        const titleColor = parts[0].trim();
        const titleSize = parts[1].trim();
        if (titleColor === color && titleSize === size) return true;
      }
    }
    return false;
  });
}

function renderColorOptions(colors) {
  const container = document.getElementById('colorOptions');
  const group = document.getElementById('colorGroup');
  container.innerHTML = '';
  if (colors.length === 0) {
    group.style.display = 'none';
    return;
  }
  group.style.display = 'block';
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
      updateVariantSelection();
    });
    container.appendChild(btn);
  });
}

function getColorBackground(color) {
  const map = {
    'Black': '#000000', 'White': '#FFFFFF', 'Red': '#FF0000', 'Blue': '#0000FF',
    'Green': '#00FF00', 'Yellow': '#FFFF00', 'Gold': '#D4A843', 'Navy': '#000080',
    'Gray': '#808080', 'Brown': '#8B4513', 'Pink': '#FFC0CB', 'Purple': '#800080',
    'Orange': '#FFA500', 'Ash': '#C0C0C0', 'Sand': '#DCD2BE', 'Sport Grey': '#CACACA',
    'Dark Heather': '#454545', 'Charcoal': '#585559', 'Royal': '#084f97',
    'Maroon': '#642838', 'Dark Chocolate': '#31221D', 'Military Green': '#62664C',
    'Forest Green': '#223b26', 'Irish Green': '#279436', 'Light Blue': '#d6e6f7',
    'Carolina Blue': '#7BA4DB', 'Indigo Blue': '#476579', 'Antique Sapphire': '#0082AE',
    'Light Pink': '#FEE0EB', 'Heliconia': '#DF5086', 'Cardinal Red': '#911a30',
    'Safety Orange': '#F88D20', 'Safety Green': '#F2FB00', 'Safety Pink': '#FF8E9D',
    'Orchid': '#D7C5F0'
  };
  return map[color] || '#D4A843';
}

function renderSizeOptions(sizes) {
  const container = document.getElementById('sizeOptions');
  const group = document.getElementById('sizeGroup');
  container.innerHTML = '';
  if (sizes.length === 0) {
    group.style.display = 'none';
    return;
  }
  group.style.display = 'block';
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
// ✅ UPDATE VARIANT SELECTION - FIXED
// ============================================================
function updateVariantSelection() {
  const btn = document.getElementById('addToCartBtn');

  const hasColors = document.querySelectorAll('#colorOptions .color-swatch').length > 0;
  const hasSizes = document.querySelectorAll('#sizeOptions .option-btn').length > 0;

  // CASE 1: Single variant (no colors, no sizes)
  if (!hasColors && !hasSizes) {
    const variant = selectedProduct && selectedProduct.variants ? selectedProduct.variants.find(v => v.available !== false) : null;
    if (variant) {
      selectedVariant = variant;
      btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
      btn.disabled = false;
      updatePrice();
      return;
    }
    btn.textContent = 'Add to Cart';
    btn.disabled = false;
    return;
  }

  // CASE 2: Only sizes, no colors
  if (!hasColors && hasSizes) {
    if (selectedSize) {
      const variant = findVariant(selectedProduct, null, selectedSize);
      if (variant) {
        selectedVariant = variant;
        btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
        btn.disabled = false;
        updatePrice();
        return;
      } else {
        showMessage('⚠️ This size is not available.', 'error');
        btn.textContent = 'Select Size';
        btn.disabled = true;
        return;
      }
    }
    btn.textContent = 'Select Size';
    btn.disabled = true;
    return;
  }

  // CASE 3: Only colors, no sizes
  if (hasColors && !hasSizes) {
    if (selectedColor) {
      const variant = findVariant(selectedProduct, selectedColor, null);
      if (variant) {
        selectedVariant = variant;
        btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
        btn.disabled = false;
        updatePrice();
        return;
      } else {
        showMessage('⚠️ This color is not available.', 'error');
        btn.textContent = 'Select Color';
        btn.disabled = true;
        return;
      }
    }
    btn.textContent = 'Select Color';
    btn.disabled = true;
    return;
  }

  // CASE 4: Both colors and sizes
  if (selectedColor && selectedSize) {
    const variant = findVariant(selectedProduct, selectedColor, selectedSize);
    if (variant) {
      selectedVariant = variant;
      btn.textContent = `Add to Cart - $${(variant.price / 100).toFixed(2)}`;
      btn.disabled = false;
      updatePrice();
      return;
    } else {
      showMessage('⚠️ This combination is not available.', 'error');
    }
  }

  selectedVariant = null;
  if (!selectedColor && !selectedSize) {
    btn.textContent = 'Select Size & Color';
  } else if (!selectedColor) {
    btn.textContent = 'Select Color';
  } else {
    btn.textContent = 'Select Size';
  }
  btn.disabled = true;
}

function updatePrice() {
  const priceEl = document.getElementById('detailPrice');
  if (selectedVariant) {
    priceEl.textContent = `$${(selectedVariant.price / 100).toFixed(2)}`;
  } else if (selectedProduct && selectedProduct.variants) {
    const prices = selectedProduct.variants.filter(v => v.available !== false).map(v => v.price / 100).sort((a, b) => a - b);
    if (prices.length > 0) {
      const min = prices[0].toFixed(2);
      const max = prices[prices.length - 1].toFixed(2);
      priceEl.textContent = min === max ? `$${min}` : `$${min} - $${max}`;
    }
  }
}

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
  mainImage.src = product.images && product.images[0] && product.images[0].src ? product.images[0].src : 'https://via.placeholder.com/400x400/1a1a1a/d4a843?text=Royal+Cartouche';

  const thumbnails = document.getElementById('detailThumbnails');
  thumbnails.innerHTML = '';
  if (product.images) {
    product.images.forEach(img => {
      if (img.src) {
        const thumb = document.createElement('img');
        thumb.src = img.src;
        thumb.addEventListener('click', () => { mainImage.src = img.src; });
        thumbnails.appendChild(thumb);
      }
    });
  }

  renderColorOptions(extractColors(product));
  renderSizeOptions(extractSizes(product));
  updatePrice();
  updateVariantSelection();
}

async function fetchProducts() {
  try {
    const response = await fetch(CONFIG.BACKEND_URL + '/api/products');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (result.data && result.data.length > 0) {
      products = result.data;
      renderGrid(products);
    } else {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#b8956a;padding:40px;"><p>No products available yet.</p></div>`;
    }
  } catch (error) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#ff6b6b;padding:40px;"><p>⚠️ Failed to load products.</p><p style="font-size:12px;">${error.message}</p></div>`;
  }
}

function renderGrid(products) {
  grid.innerHTML = '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const firstVariant = product.variants && product.variants[0];
    const price = firstVariant ? (firstVariant.price / 100).toFixed(2) : '0.00';
    const imageUrl = product.images && product.images[0] && product.images[0].src ? product.images[0].src : 'https://via.placeholder.com/300x300/1a1a1a/d4a843?text=Royal+Cartouche';
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
      const product = products.find(p => p.id === this.dataset.id);
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
// ✅ ADD TO CART - FIXED
// ============================================================
document.getElementById('addToCartBtn').addEventListener('click', function() {
  const hasColors = document.querySelectorAll('#colorOptions .color-swatch').length > 0;
  const hasSizes = document.querySelectorAll('#sizeOptions .option-btn').length > 0;

  // CASE 1: Single variant product (no colors, no sizes)
  if (!hasColors && !hasSizes) {
    const variant = selectedProduct && selectedProduct.variants ? selectedProduct.variants.find(v => v.available !== false) : null;
    if (!variant) {
      showMessage('⚠️ This product is not available.', 'error');
      return;
    }
    selectedVariant = variant;
    selectedColor = 'Default';
    selectedSize = 'One Size';
  }

  // CASE 2: Only sizes, no colors
  if (!hasColors && hasSizes) {
    if (!selectedSize) {
      showMessage('⚠️ Please select a size.', 'error');
      return;
    }
    const variant = findVariant(selectedProduct, null, selectedSize);
    if (!variant) {
      showMessage('⚠️ This size is not available.', 'error');
      return;
    }
    selectedVariant = variant;
    selectedColor = 'Default';
  }

  // CASE 3: Only colors, no sizes
  if (hasColors && !hasSizes) {
    if (!selectedColor) {
      showMessage('⚠️ Please select a color.', 'error');
      return;
    }
    const variant = findVariant(selectedProduct, selectedColor, null);
    if (!variant) {
      showMessage('⚠️ This color is not available.', 'error');
      return;
    }
    selectedVariant = variant;
    selectedSize = 'One Size';
  }

  // CASE 4: Both colors and sizes
  if (hasColors && hasSizes) {
    if (!selectedColor || !selectedSize) {
      showMessage('⚠️ Please select both color and size.', 'error');
      return;
    }
    const variant = findVariant(selectedProduct, selectedColor, selectedSize);
    if (!variant) {
      showMessage('⚠️ This combination is not available.', 'error');
      return;
    }
    selectedVariant = variant;
  }

  if (!selectedVariant) {
    showMessage('⚠️ Please select all options.', 'error');
    return;
  }

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
      this.textContent = 'Add to Cart';
    }
    this.classList.remove('added');
  }, 1500);

  updateCartUI();
  setTimeout(() => {
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }, 300);
});

// ============================================================
// BACK TO GRID
// ============================================================
backBtn.addEventListener('click', function() {
  detailView.classList.remove('visible');
  grid.style.display = 'grid';
  selectedProduct = null;
  selectedColor = null;
  selectedSize = null;
  selectedVariant = null;
});

// ============================================================
// INIT
// ============================================================
loadCart();
fetchProducts();
console.log('👑 Royal Cartouche - Product Page with Popup Cart & Checkout Loaded');
