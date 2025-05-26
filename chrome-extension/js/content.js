// AI Affiliate Pro - Content Script

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkProductPage') {
    // Check if current page is an Amazon product page
    const isProductPage = checkIfProductPage();
    sendResponse({ isProductPage });
  } else if (message.action === 'startArticleWizard') {
    // Start the article wizard
    if (document.getElementById('ai-affiliate-pro-expanded')) {
      document.getElementById('ai-affiliate-pro-expanded').classList.add('active');
      startArticleWizard();
    } else {
      createWidget();
      setTimeout(() => {
        document.getElementById('ai-affiliate-pro-expanded').classList.add('active');
        startArticleWizard();
      }, 500);
    }
  } else if (message.action === 'extractProductData') {
    // Extract product data
    const productData = extractProductData();
    sendResponse(productData);
  }
  
  // Return true to indicate async response
  return true;
});

// Initialize when page loads
window.addEventListener('load', () => {
  // Check if we should auto-extract data
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    // Check if we should show the widget
    if (settings.showWidget !== false) {
      // Check if current page is an Amazon product page
      if (checkIfProductPage()) {
        createWidget();
      }
    }
    
    // Check if we should auto-extract data
    if (settings.autoExtract) {
      // Check if current page is an Amazon product page
      if (checkIfProductPage()) {
        // Extract product data
        const productData = extractProductData();
        
        // Send data to background script
        chrome.runtime.sendMessage({
          action: 'productDataExtracted',
          productData
        });
      }
    }
  });
});

// Function to check if current page is an Amazon product page
function checkIfProductPage() {
  // Check URL patterns
  const amazonDomains = [
    'amazon.com',
    'amazon.co.uk',
    'amazon.ca',
    'amazon.com.au',
    'amazon.de',
    'amazon.fr',
    'amazon.it',
    'amazon.es',
    'amazon.co.jp',
    'amazon.in'
  ];
  
  // Check if URL contains an Amazon domain
  const isAmazonSite = amazonDomains.some(domain => window.location.hostname.includes(domain));
  
  if (!isAmazonSite) {
    return false;
  }
  
  // Check for product page indicators with multiple methods
  
  // Method 1: Check URL patterns
  const productUrlPatterns = [
    /\/dp\/[A-Z0-9]{10}/i,
    /\/gp\/product\/[A-Z0-9]{10}/i,
    /\/exec\/obidos\/ASIN\/[A-Z0-9]{10}/i,
    /\/product\/[A-Z0-9]{10}/i
  ];
  
  for (const pattern of productUrlPatterns) {
    if (pattern.test(window.location.pathname)) {
      return true;
    }
  }
  
  // Method 2: Check for product page elements
  const productPageSelectors = [
    '#productTitle',
    '#title',
    '#dp',
    '#ppd',
    '#centerCol',
    '#buybox',
    '#addToCart',
    '#add-to-cart-button',
    '#productDescription',
    '#feature-bullets',
    '#acrCustomerReviewText',
    '#landingImage',
    '#imgBlkFront'
  ];
  
  for (const selector of productPageSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // Method 3: Check for ASIN in page metadata
  const asinElement = document.querySelector('input[name="ASIN"]');
  if (asinElement && asinElement.value) {
    return true;
  }
  
  // Method 4: Check for data-asin attributes
  const dataAsinElements = document.querySelectorAll('[data-asin]');
  for (const element of dataAsinElements) {
    const asin = element.getAttribute('data-asin');
    if (asin && asin.length === 10) {
      return true;
    }
  }
  
  // Method 5: Check for structured data
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of structuredDataElements) {
    try {
      const data = JSON.parse(element.textContent);
      if (data && (data['@type'] === 'Product' || data.sku || data.productID)) {
        return true;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  
  // If none of the above methods detected a product page
  return false;
}

// Function to extract product data from the page
function extractProductData() {
  // Initialize product data object
  const productData = {
    title: '',
    price: '',
    currency: '',
    asin: '',
    rating: '',
    reviewCount: '',
    description: '',
    features: [],
    category: '',
    image: '',
    images: []
  };
  
  // Extract product title with multiple selectors
  const titleSelectors = [
    '#productTitle', 
    '#title', 
    '.product-title', 
    '[data-feature-name="title"]',
    '.a-size-large.product-title-word-break'
  ];
  
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement) {
      productData.title = titleElement.textContent.trim();
      break;
    }
  }
  
  // Extract price with multiple selectors
  const priceSelectors = [
    '.a-price .a-offscreen',
    '#price',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price',
    '.a-color-price'
  ];
  
  for (const selector of priceSelectors) {
    const priceElement = document.querySelector(selector);
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      // Extract currency and numeric price
      const currencyMatch = priceText.match(/[^\d.,]+/);
      if (currencyMatch) {
        productData.currency = currencyMatch[0];
      }
      
      const priceMatch = priceText.match(/[\d.,]+/);
      if (priceMatch) {
        productData.price = priceMatch[0];
      }
      break;
    }
  }
  
  // Extract ASIN from URL or page with multiple methods
  // Method 1: From URL
  const asinPatterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i
  ];
  
  for (const pattern of asinPatterns) {
    const match = window.location.pathname.match(pattern);
    if (match && match[1]) {
      productData.asin = match[1];
      break;
    }
  }
  
  // Method 2: From page metadata
  if (!productData.asin) {
    const asinElement = document.querySelector('input[name="ASIN"]');
    if (asinElement && asinElement.value) {
      productData.asin = asinElement.value;
    }
  }
  
  // Method 3: From data attributes
  if (!productData.asin) {
    const dataAsinElements = document.querySelectorAll('[data-asin]');
    for (const element of dataAsinElements) {
      const asin = element.getAttribute('data-asin');
      if (asin && asin.length === 10) {
        productData.asin = asin;
        break;
      }
    }
  }
  
  // Method 4: From structured data
  if (!productData.asin) {
    const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
    for (const element of structuredDataElements) {
      try {
        const data = JSON.parse(element.textContent);
        if (data && data.sku) {
          productData.asin = data.sku;
          break;
        }
        if (data && data.productID && data.productID.includes(':')) {
          const parts = data.productID.split(':');
          if (parts[1] && parts[1].length === 10) {
            productData.asin = parts[1];
            break;
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  
  // Extract rating with multiple selectors
  const ratingSelectors = [
    '#acrPopover',
    '.a-icon-star',
    '.a-star-rating'
  ];
  
  for (const selector of ratingSelectors) {
    const ratingElement = document.querySelector(selector);
    if (ratingElement) {
      const ratingText = ratingElement.title || ratingElement.textContent;
      const ratingMatch = ratingText.match(/[\d.]+/);
      if (ratingMatch) {
        productData.rating = ratingMatch[0];
        break;
      }
    }
  }
  
  // Extract review count with multiple selectors
  const reviewCountSelectors = [
    '#acrCustomerReviewText',
    '.review-count',
    '.totalReviewCount'
  ];
  
  for (const selector of reviewCountSelectors) {
    const reviewCountElement = document.querySelector(selector);
    if (reviewCountElement) {
      const reviewText = reviewCountElement.textContent.trim();
      const reviewMatch = reviewText.match(/[\d,]+/);
      if (reviewMatch) {
        productData.reviewCount = reviewMatch[0].replace(/,/g, '');
        break;
      }
    }
  }
  
  // Extract product description with multiple selectors
  const descriptionSelectors = [
    '#productDescription',
    '#product-description',
    '.product-description',
    '[data-feature-name="productDescription"]'
  ];
  
  for (const selector of descriptionSelectors) {
    const descriptionElement = document.querySelector(selector);
    if (descriptionElement) {
      productData.description = descriptionElement.textContent.trim();
      break;
    }
  }
  
  // Extract product features with multiple selectors
  const featureSelectors = [
    '#feature-bullets .a-list-item',
    '.feature-bullets .a-list-item',
    '.a-unordered-list .a-list-item'
  ];
  
  for (const selector of featureSelectors) {
    const featureElements = document.querySelectorAll(selector);
    if (featureElements.length > 0) {
      featureElements.forEach(element => {
        const feature = element.textContent.trim();
        if (feature) {
          productData.features.push(feature);
        }
      });
      break;
    }
  }
  
  // Extract product category with multiple selectors
  const categorySelectors = [
    '#wayfinding-breadcrumbs_feature_div .a-link-normal',
    '.a-breadcrumb .a-link-normal',
    '#nav-subnav .nav-a-content'
  ];
  
  for (const selector of categorySelectors) {
    const categoryElement = document.querySelector(selector);
    if (categoryElement) {
      productData.category = categoryElement.textContent.trim();
      break;
    }
  }
  
  // Extract main product image with multiple selectors
  const mainImageSelectors = [
    '#landingImage',
    '#imgBlkFront',
    '#main-image',
    '.a-dynamic-image'
  ];
  
  for (const selector of mainImageSelectors) {
    const mainImageElement = document.querySelector(selector);
    if (mainImageElement) {
      productData.image = mainImageElement.src || mainImageElement.getAttribute('data-old-hires') || mainImageElement.getAttribute('data-a-dynamic-image');
      
      // Handle JSON-encoded image URLs
      if (productData.image && productData.image.startsWith('{')) {
        try {
          const imageJson = JSON.parse(productData.image);
          const imageUrls = Object.keys(imageJson);
          if (imageUrls.length > 0) {
            productData.image = imageUrls[0];
          }
        } catch (e) {
          // Use as is if parsing fails
        }
      }
      
      if (productData.image) {
        productData.images.push(productData.image);
        break;
      }
    }
  }
  
  // Extract additional product images with multiple selectors
  const thumbnailSelectors = [
    '.imageThumbnail img',
    '#altImages .a-button-thumbnail img',
    '.item-thumbnails img'
  ];
  
  for (const selector of thumbnailSelectors) {
    const thumbnailElements = document.querySelectorAll(selector);
    if (thumbnailElements.length > 0) {
      thumbnailElements.forEach(element => {
        let thumbnailSrc = element.src || element.getAttribute('data-old-hires');
        if (thumbnailSrc) {
          // Convert thumbnail URL to full-size image URL
          const fullSizeUrl = thumbnailSrc.replace(/\._.*_\./, '.');
          if (!productData.images.includes(fullSizeUrl)) {
            productData.images.push(fullSizeUrl);
          }
        }
      });
      break;
    }
  }
  
  return {
    success: true,
    productInfo: productData
  };
}

// Function to create and inject the widget
function createWidget() {
  // Get user settings for theme
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    const theme = settings.theme || 'light';
    
    // Create widget button
    const widget = document.createElement('div');
    widget.id = 'ai-affiliate-pro-widget';
    widget.innerHTML = `<div id="ai-affiliate-pro-widget-icon">AI</div>`;
    
    // Create expanded widget container
    const expandedWidget = document.createElement('div');
    expandedWidget.id = 'ai-affiliate-pro-expanded';
    if (theme === 'dark') {
      expandedWidget.classList.add('ai-affiliate-dark-mode');
    }
    
    // Add initial loading content to expanded widget
    expandedWidget.innerHTML = `
      <div class="ai-affiliate-header">
        <h3>AI Affiliate Pro</h3>
        <button class="ai-affiliate-close">✕</button>
      </div>
      <div class="ai-affiliate-content">
        <div class="ai-affiliate-loading">
          <div class="ai-affiliate-spinner"></div>
          <span>Loading product data...</span>
        </div>
      </div>
    `;
    
    // Append widgets to body
    document.body.appendChild(widget);
    document.body.appendChild(expandedWidget);
    
    // Add event listeners
    widget.addEventListener('click', toggleWidget);
    expandedWidget.querySelector('.ai-affiliate-close').addEventListener('click', closeWidget);
    
    // Load product data when widget is first created
    loadProductData();
  });
}

// Function to toggle widget visibility
function toggleWidget() {
  const expandedWidget = document.getElementById('ai-affiliate-pro-expanded');
  expandedWidget.classList.toggle('active');
}

// Function to close widget
function closeWidget() {
  const expandedWidget = document.getElementById('ai-affiliate-pro-expanded');
  expandedWidget.classList.remove('active');
}

// Function to load product data into widget
function loadProductData() {
  const productData = extractProductData();
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  if (productData.success) {
    const info = productData.productInfo;
    
    // Format rating stars
    let stars = '';
    const rating = parseFloat(info.rating) || 0;
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars += '★';
      } else if (i - 0.5 <= rating) {
        stars += '½';
      } else {
        stars += '☆';
      }
    }
    
    // Update widget content
    contentElement.innerHTML = `
      <div class="ai-affiliate-product-info">
        <div class="ai-affiliate-product-title">${info.title}</div>
        <div class="ai-affiliate-product-price">${info.currency}${info.price}</div>
        <div class="ai-affiliate-product-rating">
          <span class="ai-affiliate-stars">${stars}</span>
          <span class="ai-affiliate-review-count">(${info.reviewCount} reviews)</span>
        </div>
        <img class="ai-affiliate-product-image" src="${info.image}" alt="${info.title}">
        <div class="ai-affiliate-product-asin">ASIN: ${info.asin}</div>
      </div>
      <div class="ai-affiliate-footer">
        <button class="ai-affiliate-button" id="ai-affiliate-start-wizard">Start Article Wizard</button>
        <button class="ai-affiliate-button secondary" id="ai-affiliate-help">Help</button>
      </div>
    `;
    
    // Add event listeners for buttons
    document.getElementById('ai-affiliate-start-wizard').addEventListener('click', startArticleWizard);
    document.getElementById('ai-affiliate-help').addEventListener('click', showHelp);
  } else {
    // Show error message
    contentElement.innerHTML = `
      <div class="ai-affiliate-error">
        <p>Unable to extract product data. Please make sure you're on an Amazon product page.</p>
      </div>
      <div class="ai-affiliate-footer">
        <button class="ai-affiliate-button secondary" id="ai-affiliate-help">Help</button>
      </div>
    `;
    
    // Add event listener for help button
    document.getElementById('ai-affiliate-help').addEventListener('click', showHelp);
  }
}

// Global variable to store wizard data
let wizardData = {
  articleType: '',
  wordCount: 2000,
  tone: 'informative',
  includeImages: true,
  includeTOC: true,
  includeAffiliate: true,
  productData: null
};

// Function to start the article wizard
function startArticleWizard() {
  const contentElement = document.querySelector('.ai-affiliate-content');
  const productData = extractProductData().productInfo;
  
  // Store product data in wizard data
  wizardData.productData = productData;
  
  // Create wizard content
  contentElement.innerHTML = `
    <div class="ai-affiliate-wizard active">
      <!-- Step 1: Article Type Selection -->
      <div class="ai-affiliate-wizard-step active" data-step="1">
        <div class="ai-affiliate-wizard-title">Step 1: Select Article Type</div>
        <div class="ai-affiliate-wizard-options">
          <div class="ai-affiliate-option" data-value="product-review">
            <input type="radio" name="article-type" class="ai-affiliate-option-radio" value="product-review">
            <span class="ai-affiliate-option-label">Product Review Article (2000-3000 words)</span>
          </div>
          <div class="ai-affiliate-option" data-value="comparison">
            <input type="radio" name="article-type" class="ai-affiliate-option-radio" value="comparison">
            <span class="ai-affiliate-option-label">Comparison Article ("Product X vs Y vs Z")</span>
          </div>
          <div class="ai-affiliate-option" data-value="buying-guide">
            <input type="radio" name="article-type" class="ai-affiliate-option-radio" value="buying-guide">
            <span class="ai-affiliate-option-label">Buying Guide ("Best [Product Category] 2025")</span>
          </div>
          <div class="ai-affiliate-option" data-value="how-to">
            <input type="radio" name="article-type" class="ai-affiliate-option-radio" value="how-to">
            <span class="ai-affiliate-option-label">How-to/Tutorial Article</span>
          </div>
          <div class="ai-affiliate-option" data-value="top-10">
            <input type="radio" name="article-type" class="ai-affiliate-option-radio" value="top-10">
            <span class="ai-affiliate-option-label">"Top 10 Best [Product]" Listicle</span>
          </div>
          <div class="ai-affiliate-option" data-value="problem-solution">
            <input type="radio" name="article-type" class="ai-affiliate-option-radio" value="problem-solution">
            <span class="ai-affiliate-option-label">Problem/Solution Article</span>
          </div>
        </div>
        <div class="ai-affiliate-wizard-navigation">
          <button class="ai-affiliate-button secondary" id="ai-affiliate-wizard-cancel">Cancel</button>
          <button class="ai-affiliate-button" id="ai-affiliate-wizard-next" disabled>Next</button>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners for wizard
  document.querySelectorAll('.ai-affiliate-option').forEach(option => {
    option.addEventListener('click', function() {
      // Select the radio button
      const radio = this.querySelector('.ai-affiliate-option-radio');
      radio.checked = true;
      
      // Store selected article type
      wizardData.articleType = radio.value;
      
      // Highlight the selected option
      document.querySelectorAll('.ai-affiliate-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      this.classList.add('selected');
      
      // Enable the next button
      document.getElementById('ai-affiliate-wizard-next').disabled = false;
    });
  });
  
  // Add event listener for cancel button
  document.getElementById('ai-affiliate-wizard-cancel').addEventListener('click', function() {
    loadProductData();
  });
  
  // Add event listener for next button
  document.getElementById('ai-affiliate-wizard-next').addEventListener('click', function() {
    showContentOptions();
  });
}

// Function to show content options
function showContentOptions() {
  const wizardElement = document.querySelector('.ai-affiliate-wizard');
  const currentStep = document.querySelector('.ai-affiliate-wizard-step.active');
  
  // Hide current step
  currentStep.classList.remove('active');
  
  // Create next step
  const nextStep = document.createElement('div');
  nextStep.className = 'ai-affiliate-wizard-step active';
  nextStep.setAttribute('data-step', '2');
  
  // Set content based on article type
  let stepTitle = 'Step 2: Content Options';
  let optionsHTML = '';
  
  // Default word count options
  const wordCountOptions = [
    { value: 1000, label: '1000 words (Short)' },
    { value: 2000, label: '2000 words (Medium)' },
    { value: 3000, label: '3000 words (Long)' },
    { value: 4000, label: '4000 words (Comprehensive)' }
  ];
  
  // Default tone options
  const toneOptions = [
    { value: 'informative', label: 'Informative & Educational' },
    { value: 'persuasive', label: 'Persuasive & Sales-Oriented' },
    { value: 'conversational', label: 'Conversational & Friendly' },
    { value: 'authoritative', label: 'Authoritative & Expert' }
  ];
  
  // Build options HTML
  optionsHTML += `
    <div class="ai-affiliate-option-group">
      <label class="ai-affiliate-option-group-label">Word Count:</label>
      <div class="ai-affiliate-select-wrapper">
        <select id="ai-affiliate-word-count" class="ai-affiliate-select">
          ${wordCountOptions.map(option => `
            <option value="${option.value}" ${option.value === wizardData.wordCount ? 'selected' : ''}>
              ${option.label}
            </option>
          `).join('')}
        </select>
      </div>
    </div>
    
    <div class="ai-affiliate-option-group">
      <label class="ai-affiliate-option-group-label">Content Tone:</label>
      <div class="ai-affiliate-select-wrapper">
        <select id="ai-affiliate-tone" class="ai-affiliate-select">
          ${toneOptions.map(option => `
            <option value="${option.value}" ${option.value === wizardData.tone ? 'selected' : ''}>
              ${option.label}
            </option>
          `).join('')}
        </select>
      </div>
    </div>
    
    <div class="ai-affiliate-option-group">
      <label class="ai-affiliate-option-group-label">Content Features:</label>
      <div class="ai-affiliate-checkbox-option">
        <input type="checkbox" id="ai-affiliate-include-images" ${wizardData.includeImages ? 'checked' : ''}>
        <label for="ai-affiliate-include-images">Include Product Images</label>
      </div>
      <div class="ai-affiliate-checkbox-option">
        <input type="checkbox" id="ai-affiliate-include-toc" ${wizardData.includeTOC ? 'checked' : ''}>
        <label for="ai-affiliate-include-toc">Include Table of Contents</label>
      </div>
      <div class="ai-affiliate-checkbox-option">
        <input type="checkbox" id="ai-affiliate-include-affiliate" ${wizardData.includeAffiliate ? 'checked' : ''}>
        <label for="ai-affiliate-include-affiliate">Include Affiliate Disclosure</label>
      </div>
    </div>
  `;
  
  // Add competitor research option for certain article types
  if (['product-review', 'comparison', 'buying-guide', 'top-10'].includes(wizardData.articleType)) {
    optionsHTML += `
      <div class="ai-affiliate-option-group">
        <label class="ai-affiliate-option-group-label">Competitor Research:</label>
        <div class="ai-affiliate-checkbox-option">
          <input type="checkbox" id="ai-affiliate-competitor-research" checked>
          <label for="ai-affiliate-competitor-research">Analyze Top-Ranking Content</label>
        </div>
        <div class="ai-affiliate-select-wrapper" style="margin-left: 25px;">
          <select id="ai-affiliate-research-depth" class="ai-affiliate-select">
            <option value="basic">Basic Analysis (Faster)</option>
            <option value="standard" selected>Standard Analysis</option>
            <option value="deep">Deep Analysis (Slower)</option>
          </select>
        </div>
      </div>
    `;
  }
  
  // Set HTML content for the step
  nextStep.innerHTML = `
    <div class="ai-affiliate-wizard-title">${stepTitle}</div>
    <div class="ai-affiliate-wizard-options">
      ${optionsHTML}
    </div>
    <div class="ai-affiliate-wizard-navigation">
      <button class="ai-affiliate-button secondary" id="ai-affiliate-wizard-back">Back</button>
      <button class="ai-affiliate-button" id="ai-affiliate-wizard-next">Next</button>
    </div>
  `;
  
  // Add step to wizard
  wizardElement.appendChild(nextStep);
  
  // Add event listeners for form elements
  document.getElementById('ai-affiliate-word-count').addEventListener('change', function() {
    wizardData.wordCount = parseInt(this.value);
  });
  
  document.getElementById('ai-affiliate-tone').addEventListener('change', function() {
    wizardData.tone = this.value;
  });
  
  document.getElementById('ai-affiliate-include-images').addEventListener('change', function() {
    wizardData.includeImages = this.checked;
  });
  
  document.getElementById('ai-affiliate-include-toc').addEventListener('change', function() {
    wizardData.includeTOC = this.checked;
  });
  
  document.getElementById('ai-affiliate-include-affiliate').addEventListener('change', function() {
    wizardData.includeAffiliate = this.checked;
  });
  
  // Add event listener for back button
  document.getElementById('ai-affiliate-wizard-back').addEventListener('click', function() {
    // Remove current step
    nextStep.remove();
    
    // Show previous step
    currentStep.classList.add('active');
  });
  
  // Add event listener for next button
  document.getElementById('ai-affiliate-wizard-next').addEventListener('click', function() {
    showGenerationOptions();
  });
}

// Function to show generation options
function showGenerationOptions() {
  const wizardElement = document.querySelector('.ai-affiliate-wizard');
  const currentStep = document.querySelector('.ai-affiliate-wizard-step.active');
  
  // Hide current step
  currentStep.classList.remove('active');
  
  // Create next step
  const nextStep = document.createElement('div');
  nextStep.className = 'ai-affiliate-wizard-step active';
  nextStep.setAttribute('data-step', '3');
  
  // Get API settings
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    const aiSettings = settings.aiSettings || {};
    
    // Set HTML content for the step
    nextStep.innerHTML = `
      <div class="ai-affiliate-wizard-title">Step 3: AI Generation Options</div>
      <div class="ai-affiliate-wizard-options">
        <div class="ai-affiliate-option-group">
          <label class="ai-affiliate-option-group-label">Select AI Model:</label>
          <div class="ai-affiliate-select-wrapper">
            <select id="ai-affiliate-model" class="ai-affiliate-select">
              <option value="openai" ${!aiSettings.preferredModel || aiSettings.preferredModel === 'openai' ? 'selected' : ''}>OpenAI (GPT)</option>
              <option value="anthropic" ${aiSettings.preferredModel === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
            </select>
          </div>
        </div>
        
        <div class="ai-affiliate-api-key-section">
          <div class="ai-affiliate-api-notice">
            <p><strong>Note:</strong> You need to provide an API key for the selected AI model.</p>
            <p>If you haven't added your API key yet, you can do so in the extension settings.</p>
          </div>
          
          <div class="ai-affiliate-api-status">
            <div id="openai-status" class="${!aiSettings.preferredModel || aiSettings.preferredModel === 'openai' ? '' : 'hidden'}">
              <span class="ai-affiliate-api-label">OpenAI API Key:</span>
              <span class="ai-affiliate-api-value">${aiSettings.openaiKey ? '••••••••••••••••' : 'Not set'}</span>
              ${!aiSettings.openaiKey ? '<a href="#" id="add-openai-key">Add Key</a>' : ''}
            </div>
            
            <div id="anthropic-status" class="${aiSettings.preferredModel === 'anthropic' ? '' : 'hidden'}">
              <span class="ai-affiliate-api-label">Anthropic API Key:</span>
              <span class="ai-affiliate-api-value">${aiSettings.anthropicKey ? '••••••••••••••••' : 'Not set'}</span>
              ${!aiSettings.anthropicKey ? '<a href="#" id="add-anthropic-key">Add Key</a>' : ''}
            </div>
          </div>
        </div>
        
        <div class="ai-affiliate-summary-section">
          <h4>Article Summary:</h4>
          <ul>
            <li><strong>Article Type:</strong> ${getArticleTypeName(wizardData.articleType)}</li>
            <li><strong>Word Count:</strong> ${wizardData.wordCount} words</li>
            <li><strong>Tone:</strong> ${getToneName(wizardData.tone)}</li>
            <li><strong>Product:</strong> ${wizardData.productData.title}</li>
          </ul>
        </div>
      </div>
      <div class="ai-affiliate-wizard-navigation">
        <button class="ai-affiliate-button secondary" id="ai-affiliate-wizard-back">Back</button>
        <button class="ai-affiliate-button" id="ai-affiliate-wizard-generate">Generate Article</button>
      </div>
    `;
    
    // Add step to wizard
    wizardElement.appendChild(nextStep);
    
    // Add event listeners for form elements
    document.getElementById('ai-affiliate-model').addEventListener('change', function() {
      const model = this.value;
      
      // Show/hide API key status
      document.getElementById('openai-status').classList.toggle('hidden', model !== 'openai');
      document.getElementById('anthropic-status').classList.toggle('hidden', model !== 'anthropic');
      
      // Save preferred model
      chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        settings.aiSettings = settings.aiSettings || {};
        settings.aiSettings.preferredModel = model;
        chrome.storage.sync.set({ settings });
      });
    });
    
    // Add event listeners for API key links
    if (!aiSettings.openaiKey) {
      document.getElementById('add-openai-key').addEventListener('click', function(e) {
        e.preventDefault();
        showApiKeyInput('openai');
      });
    }
    
    if (!aiSettings.anthropicKey) {
      document.getElementById('add-anthropic-key').addEventListener('click', function(e) {
        e.preventDefault();
        showApiKeyInput('anthropic');
      });
    }
    
    // Add event listener for back button
    document.getElementById('ai-affiliate-wizard-back').addEventListener('click', function() {
      // Remove current step
      nextStep.remove();
      
      // Show previous step
      currentStep.classList.add('active');
    });
    
    // Add event listener for generate button
    document.getElementById('ai-affiliate-wizard-generate').addEventListener('click', function() {
      generateArticle();
    });
  });
}

// Function to show API key input
function showApiKeyInput(provider) {
  const apiStatusElement = document.getElementById(`${provider}-status`);
  const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
  const providerUrl = provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.anthropic.com/keys';
  
  // Replace status with input
  apiStatusElement.innerHTML = `
    <div class="ai-affiliate-api-input">
      <label for="${provider}-key-input">${providerName} API Key:</label>
      <input type="password" id="${provider}-key-input" placeholder="Enter your ${providerName} API key">
      <div class="ai-affiliate-api-buttons">
        <button id="${provider}-key-save">Save</button>
        <button id="${provider}-key-cancel" class="secondary">Cancel</button>
      </div>
      <div class="ai-affiliate-api-help">
        <a href="${providerUrl}" target="_blank">Get your ${providerName} API key</a>
      </div>
    </div>
  `;
  
  // Add event listeners
  document.getElementById(`${provider}-key-save`).addEventListener('click', function() {
    const key = document.getElementById(`${provider}-key-input`).value.trim();
    
    if (key) {
      // Save API key
      chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        settings.aiSettings = settings.aiSettings || {};
        settings.aiSettings[`${provider}Key`] = key;
        chrome.storage.sync.set({ settings }, () => {
          // Update UI
          apiStatusElement.innerHTML = `
            <span class="ai-affiliate-api-label">${providerName} API Key:</span>
            <span class="ai-affiliate-api-value">••••••••••••••••</span>
          `;
        });
      });
    } else {
      alert('Please enter a valid API key');
    }
  });
  
  document.getElementById(`${provider}-key-cancel`).addEventListener('click', function() {
    // Restore original status
    apiStatusElement.innerHTML = `
      <span class="ai-affiliate-api-label">${providerName} API Key:</span>
      <span class="ai-affiliate-api-value">Not set</span>
      <a href="#" id="add-${provider}-key">Add Key</a>
    `;
    
    // Re-add event listener
    document.getElementById(`add-${provider}-key`).addEventListener('click', function(e) {
      e.preventDefault();
      showApiKeyInput(provider);
    });
  });
}

// Function to generate article
function generateArticle() {
  const wizardElement = document.querySelector('.ai-affiliate-wizard');
  const currentStep = document.querySelector('.ai-affiliate-wizard-step.active');
  
  // Hide current step
  currentStep.classList.remove('active');
  
  // Create next step
  const nextStep = document.createElement('div');
  nextStep.className = 'ai-affiliate-wizard-step active';
  nextStep.setAttribute('data-step', '4');
  
  // Set HTML content for the step
  nextStep.innerHTML = `
    <div class="ai-affiliate-wizard-title">Generating Your Article</div>
    <div class="ai-affiliate-wizard-options">
      <div class="ai-affiliate-generation-progress">
        <div class="ai-affiliate-spinner"></div>
        <div class="ai-affiliate-progress-status">
          <p id="generation-status">Preparing to generate your article...</p>
          <div class="ai-affiliate-progress-bar">
            <div class="ai-affiliate-progress-fill" style="width: 0%"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="ai-affiliate-wizard-navigation">
      <button class="ai-affiliate-button secondary" id="ai-affiliate-wizard-cancel">Cancel</button>
    </div>
  `;
  
  // Add step to wizard
  wizardElement.appendChild(nextStep);
  
  // Add event listener for cancel button
  document.getElementById('ai-affiliate-wizard-cancel').addEventListener('click', function() {
    if (confirm('Are you sure you want to cancel article generation?')) {
      loadProductData();
    }
  });
  
  // Simulate article generation progress
  simulateArticleGeneration();
}

// Function to simulate article generation
function simulateArticleGeneration() {
  const statusElement = document.getElementById('generation-status');
  const progressFill = document.querySelector('.ai-affiliate-progress-fill');
  const steps = [
    { message: 'Analyzing product data...', progress: 10 },
    { message: 'Researching top-ranking content...', progress: 25 },
    { message: 'Generating article outline...', progress: 40 },
    { message: 'Writing introduction and key sections...', progress: 60 },
    { message: 'Adding product comparisons and recommendations...', progress: 75 },
    { message: 'Finalizing article and formatting...', progress: 90 },
    { message: 'Article generation complete!', progress: 100 }
  ];
  
  let currentStep = 0;
  
  function updateProgress() {
    if (currentStep < steps.length) {
      statusElement.textContent = steps[currentStep].message;
      progressFill.style.width = `${steps[currentStep].progress}%`;
      currentStep++;
      
      if (currentStep < steps.length) {
        setTimeout(updateProgress, 1500);
      } else {
        // Final step - show article editor
        setTimeout(showArticleEditor, 1000);
      }
    }
  }
  
  // Start progress simulation
  updateProgress();
}

// Function to show article editor
function showArticleEditor() {
  // Redirect to editor page
  chrome.runtime.sendMessage({
    action: 'openArticleEditor',
    articleData: {
      title: getArticleTitle(),
      content: generateArticleContent(),
      productData: wizardData.productData
    }
  });
  
  // Close widget
  closeWidget();
}

// Helper function to get article type name
function getArticleTypeName(type) {
  const types = {
    'product-review': 'Product Review',
    'comparison': 'Comparison Article',
    'buying-guide': 'Buying Guide',
    'how-to': 'How-to/Tutorial',
    'top-10': 'Top 10 List',
    'problem-solution': 'Problem/Solution Article'
  };
  
  return types[type] || type;
}

// Helper function to get tone name
function getToneName(tone) {
  const tones = {
    'informative': 'Informative & Educational',
    'persuasive': 'Persuasive & Sales-Oriented',
    'conversational': 'Conversational & Friendly',
    'authoritative': 'Authoritative & Expert'
  };
  
  return tones[tone] || tone;
}

// Helper function to generate article title
function getArticleTitle() {
  const product = wizardData.productData;
  const productName = product.title;
  
  switch (wizardData.articleType) {
    case 'product-review':
      return `${productName} Review: Is It Worth It in ${new Date().getFullYear()}?`;
    case 'comparison':
      return `${productName} vs. Competitors: Which One Should You Buy?`;
    case 'buying-guide':
      return `Best ${product.category || 'Products'} in ${new Date().getFullYear()}: Complete Buying Guide`;
    case 'how-to':
      return `How to Get the Most Out of Your ${productName}: Complete Guide`;
    case 'top-10':
      return `Top 10 Best ${product.category || 'Products'} in ${new Date().getFullYear()}`;
    case 'problem-solution':
      return `How ${productName} Solves Your ${product.category || 'Product'} Problems`;
    default:
      return `${productName} - Complete Guide`;
  }
}

// Helper function to generate placeholder article content
function generateArticleContent() {
  return `<h2>Introduction</h2>
<p>This is a placeholder for your generated article about ${wizardData.productData.title}. In the actual implementation, this would be replaced with AI-generated content based on your selected options.</p>

<h2>Product Overview</h2>
<p>The ${wizardData.productData.title} is a high-quality product with the following features:</p>
<ul>
${wizardData.productData.features.map(feature => `<li>${feature}</li>`).join('\n')}
</ul>

<h2>Pros and Cons</h2>
<h3>What We Like</h3>
<ul>
<li>Feature 1</li>
<li>Feature 2</li>
<li>Feature 3</li>
</ul>

<h3>What We Don't Like</h3>
<ul>
<li>Limitation 1</li>
<li>Limitation 2</li>
</ul>

<h2>Conclusion</h2>
<p>Final thoughts about the ${wizardData.productData.title} and recommendations for potential buyers.</p>`;
}

// Function to show help
function showHelp() {
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  contentElement.innerHTML = `
    <div class="ai-affiliate-help-content">
      <h3>AI Affiliate Pro Help</h3>
      
      <div class="ai-affiliate-help-section">
        <h4>Getting Started</h4>
        <p>AI Affiliate Pro helps you create high-quality Amazon affiliate content in minutes. Here's how to get started:</p>
        <ol>
          <li>Navigate to any Amazon product page</li>
          <li>Click the AI Affiliate Pro icon in your browser</li>
          <li>Click "Start Article Wizard" to begin creating content</li>
        </ol>
      </div>
      
      <div class="ai-affiliate-help-section">
        <h4>Article Creation</h4>
        <p>The Article Wizard guides you through these steps:</p>
        <ol>
          <li>Select an article type (review, comparison, etc.)</li>
          <li>Choose content options (word count, tone, etc.)</li>
          <li>Select AI model and generation settings</li>
          <li>Generate and edit your article</li>
          <li>Download or publish to WordPress</li>
        </ol>
      </div>
      
      <div class="ai-affiliate-help-section">
        <h4>WordPress Integration</h4>
        <p>To publish directly to WordPress:</p>
        <ol>
          <li>Go to Settings > WordPress Sites</li>
          <li>Click "Add WordPress Site"</li>
          <li>Enter your site details and credentials</li>
          <li>Test the connection</li>
          <li>Save your site</li>
        </ol>
        <p>You can then select this site when publishing articles.</p>
      </div>
      
      <div class="ai-affiliate-help-section">
        <h4>AI Settings</h4>
        <p>AI Affiliate Pro supports these AI models:</p>
        <ul>
          <li><strong>OpenAI (GPT):</strong> <a href="https://platform.openai.com/api-keys" target="_blank">Get API key</a></li>
          <li><strong>Anthropic (Claude):</strong> <a href="https://console.anthropic.com/keys" target="_blank">Get API key</a></li>
        </ul>
        <p>To add your API keys:</p>
        <ol>
          <li>Go to Settings > AI Settings</li>
          <li>Enter your API keys for your preferred models</li>
          <li>Save your settings</li>
        </ol>
      </div>
      
      <div class="ai-affiliate-help-section">
        <h4>Troubleshooting</h4>
        <p><strong>Product not detected:</strong> Make sure you're on an Amazon product page. Try refreshing the page.</p>
        <p><strong>Article generation fails:</strong> Check your API key and internet connection.</p>
        <p><strong>WordPress publishing fails:</strong> Verify your WordPress credentials and make sure your site has the REST API enabled.</p>
        <p><strong>Need more help?</strong> Contact support at <a href="mailto:affiliatepro@aiwriterpros.com">affiliatepro@aiwriterpros.com</a></p>
      </div>
      
      <div class="ai-affiliate-help-section">
        <h4>Legal Information</h4>
        <p>
          <a href="https://affiliate.aiwriterpros.com/terms" target="_blank">Terms of Service</a> | 
          <a href="https://affiliate.aiwriterpros.com/privacy" target="_blank">Privacy Policy</a> | 
          <a href="https://affiliate.aiwriterpros.com/disclaimer" target="_blank">Disclaimer</a>
        </p>
      </div>
    </div>
    
    <div class="ai-affiliate-footer">
      <button class="ai-affiliate-button" id="ai-affiliate-back-to-product">Back to Product</button>
    </div>
  `;
  
  // Add event listener for back button
  document.getElementById('ai-affiliate-back-to-product').addEventListener('click', function() {
    loadProductData();
  });
}
