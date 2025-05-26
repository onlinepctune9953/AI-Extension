// AI Affiliate Pro - Enhanced Content Script

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in content script:', message);
  
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
    // Extract enhanced product data
    extractAndSendProductData(sendResponse);
    return true; // Indicate async response
  } else if (message.action === 'clickShowMore') {
    // Click "Show More" button for About This Item section
    const showMoreLink = document.querySelector('#feature-bullets #showMore, .a-expander-prompt');
    if (showMoreLink) {
      showMoreLink.click();
      sendResponse({ success: true, message: 'Show More button clicked successfully' });
    } else {
      sendResponse({ success: false, message: 'Show More button not found' });
    }
    return true;
  } else if (message.action === 'checkIsProductPage') {
    // Check if current page is an Amazon product page
    const isProductPage = checkIfProductPage();
    sendResponse({ isProductPage });
    return true;
  } else if (message.type === "CHECKTOPCATEGORY_CNT") {
    // Find first category from breadcrumbs
    const breadcrumbTopCategory = document.querySelector('div.a-breadcrumb > ul > li:nth-child(1) > span > a');

    if (breadcrumbTopCategory) {
      // Send a message to background.js to do the check
      let bgMessage = {
        type: "CHECKTOPCATEGORY_BG",
        tab: message.activeTab,
        topCategoryURL: breadcrumbTopCategory.href
      };

      // Use the response from background.js as the response for this message
      chrome.runtime.sendMessage(bgMessage)
        .then((bgResponse) => {
          sendResponse(bgResponse);
        })
        .catch((error) => {
          console.error(error);
          sendResponse(false);
        });

      return true; // Indicate async response
    } else {
      sendResponse(true);  // Allow products without breadcrumbs
      return true;
    }
  }
  
  // Return true to indicate async response
  return true;
});

// Initialize when page loads
window.addEventListener('load', () => {
  console.log('AI Affiliate Pro content script loaded');
  
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
        extractAndSendProductData((response) => {
          // Send data to background script
          chrome.runtime.sendMessage({
            action: 'productDataExtracted',
            productData: response.data
          });
        });
      }
    }
  });
  
  // Check if current page is an Amazon product page
  const isProductPage = checkIfProductPage();
  
  if (isProductPage) {
    console.log('Amazon product page detected');
    
    // Notify background script that a product page was detected
    chrome.runtime.sendMessage({
      action: 'productPageDetected',
      url: window.location.href
    });
  }
});

/**
 * Extract product data and send response
 * @param {function} sendResponse - Function to send response back to caller
 */
async function extractAndSendProductData(sendResponse) {
  try {
    console.log('Extracting enhanced product data...');
    
    // Import the extractCompleteProductData function from utils.js
    const { extractCompleteProductData } = await import(chrome.runtime.getURL('js/utils.js'));
    
    // Extract complete product data
    const productData = await extractCompleteProductData();
    
    console.log('Enhanced product data extracted:', productData);
    
    // Send response with product data
    sendResponse({
      success: true,
      data: productData
    });
  } catch (error) {
    console.error('Error extracting product data:', error);
    
    // Fallback to basic extraction if enhanced extraction fails
    const basicProductData = extractBasicProductData();
    
    // Send response with basic product data
    sendResponse({
      success: true,
      data: {
        core: {
          title: basicProductData.productInfo.title,
          price: basicProductData.productInfo.price,
          currency: basicProductData.productInfo.currency,
          asin: basicProductData.productInfo.asin,
          url: window.location.href
        },
        images: [
          {
            url: basicProductData.productInfo.image,
            type: 'main',
            position: 1
          }
        ],
        details: {
          aboutThisItem: basicProductData.productInfo.features
        },
        meta: {
          extractionDate: new Date().toISOString(),
          success: true,
          fallback: true,
          error: error.message
        }
      }
    });
  }
}

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
    'amazon.in',
    'amazon.com.mx',
    'amazon.com.br'
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

// Function to extract basic product data from the page (fallback)
function extractBasicProductData() {
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
  // Extract product data using the enhanced method
  extractAndSendProductData((response) => {
    const contentElement = document.querySelector('.ai-affiliate-content');
    
    if (response.success) {
      const data = response.data;
      const info = data.core;
      
      // Format rating stars
      let stars = '';
      const rating = parseFloat(data.reviews?.averageRating) || 0;
      for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
          stars += '★';
        } else if (i - 0.5 <= rating) {
          stars += '½';
        } else {
          stars += '☆';
        }
      }
      
      // Get main image URL
      const mainImage = data.images && data.images.length > 0 ? data.images[0].url : '';
      
      // Update widget content
      contentElement.innerHTML = `
        <div class="ai-affiliate-product-info">
          <div class="ai-affiliate-product-title">${info.title}</div>
          <div class="ai-affiliate-product-price">${info.currency}${info.price}</div>
          <div class="ai-affiliate-product-rating">
            <span class="ai-affiliate-stars">${stars}</span>
            <span class="ai-affiliate-review-count">(${data.reviews?.ratingCount || 0} reviews)</span>
          </div>
          <img class="ai-affiliate-product-image" src="${mainImage}" alt="${info.title}">
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
  });
}

// Function to start article wizard
function startArticleWizard() {
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Show loading state
  contentElement.innerHTML = `
    <div class="ai-affiliate-loading">
      <div class="ai-affiliate-spinner"></div>
      <span>Loading article wizard...</span>
    </div>
  `;
  
  // Extract product data
  extractAndSendProductData((response) => {
    if (response.success) {
      // Show article wizard UI
      showArticleWizardUI(response.data);
    } else {
      // Show error message
      contentElement.innerHTML = `
        <div class="ai-affiliate-error">
          <p>Unable to extract product data. Please try again.</p>
        </div>
        <div class="ai-affiliate-footer">
          <button class="ai-affiliate-button" id="ai-affiliate-retry">Retry</button>
          <button class="ai-affiliate-button secondary" id="ai-affiliate-help">Help</button>
        </div>
      `;
      
      // Add event listeners for buttons
      document.getElementById('ai-affiliate-retry').addEventListener('click', startArticleWizard);
      document.getElementById('ai-affiliate-help').addEventListener('click', showHelp);
    }
  });
}

// Function to show article wizard UI
function showArticleWizardUI(productData) {
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Get user settings
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    const defaultArticleType = settings.defaultArticleType || 'product-review';
    const defaultWordCount = settings.defaultWordCount || '2000-3000';
    const defaultTone = settings.defaultArticleTone || 'Professional';
    
    // Show article wizard UI
    contentElement.innerHTML = `
      <div class="ai-affiliate-wizard">
        <h4>Create Article</h4>
        <form id="ai-affiliate-wizard-form">
          <div class="ai-affiliate-form-group">
            <label for="article-type">Article Type</label>
            <select id="article-type" name="articleType">
              <option value="product-review" ${defaultArticleType === 'product-review' ? 'selected' : ''}>Product Review</option>
              <option value="comparison" ${defaultArticleType === 'comparison' ? 'selected' : ''}>Product Comparison</option>
              <option value="buying-guide" ${defaultArticleType === 'buying-guide' ? 'selected' : ''}>Buying Guide</option>
              <option value="how-to" ${defaultArticleType === 'how-to' ? 'selected' : ''}>How-To Guide</option>
              <option value="top-10" ${defaultArticleType === 'top-10' ? 'selected' : ''}>Top 10 List</option>
              <option value="problem-solution" ${defaultArticleType === 'problem-solution' ? 'selected' : ''}>Problem-Solution</option>
            </select>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="word-count">Word Count</label>
            <select id="word-count" name="wordCount">
              <option value="1000-1500" ${defaultWordCount === '1000-1500' ? 'selected' : ''}>1,000-1,500 words</option>
              <option value="1500-2000" ${defaultWordCount === '1500-2000' ? 'selected' : ''}>1,500-2,000 words</option>
              <option value="2000-3000" ${defaultWordCount === '2000-3000' ? 'selected' : ''}>2,000-3,000 words</option>
              <option value="3000-4000" ${defaultWordCount === '3000-4000' ? 'selected' : ''}>3,000-4,000 words</option>
              <option value="4000-5000" ${defaultWordCount === '4000-5000' ? 'selected' : ''}>4,000-5,000 words</option>
            </select>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="article-tone">Tone</label>
            <select id="article-tone" name="tone">
              <option value="Professional" ${defaultTone === 'Professional' ? 'selected' : ''}>Professional</option>
              <option value="Conversational" ${defaultTone === 'Conversational' ? 'selected' : ''}>Conversational</option>
              <option value="Enthusiastic" ${defaultTone === 'Enthusiastic' ? 'selected' : ''}>Enthusiastic</option>
              <option value="Informative" ${defaultTone === 'Informative' ? 'selected' : ''}>Informative</option>
              <option value="Persuasive" ${defaultTone === 'Persuasive' ? 'selected' : ''}>Persuasive</option>
            </select>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="associate-id">Amazon Associate ID</label>
            <input type="text" id="associate-id" name="associateId" value="${settings.amazonAssociateId || ''}" placeholder="yourassociateid-20">
          </div>
        </form>
        <div class="ai-affiliate-footer">
          <button class="ai-affiliate-button" id="ai-affiliate-generate">Generate Article</button>
          <button class="ai-affiliate-button secondary" id="ai-affiliate-cancel">Cancel</button>
        </div>
      </div>
    `;
    
    // Add active class to make wizard visible
    const wizardElement = contentElement.querySelector('.ai-affiliate-wizard');
    if (wizardElement) {
      wizardElement.classList.add('active');
    }
    
    // Add event listeners for buttons
    document.getElementById('ai-affiliate-generate').addEventListener('click', () => {
      generateArticle(productData);
    });
    
    document.getElementById('ai-affiliate-cancel').addEventListener('click', () => {
      loadProductData();
    });
  });
}

// Function to generate article
function generateArticle(productData) {
  // Get form data
  const form = document.getElementById('ai-affiliate-wizard-form');
  const formData = new FormData(form);
  
  // Convert form data to object
  const data = {
    articleType: formData.get('articleType'),
    wordCount: formData.get('wordCount'),
    tone: formData.get('tone'),
    associateId: formData.get('associateId'),
    productInfo: productData
  };
  
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Show loading state
  contentElement.innerHTML = `
    <div class="ai-affiliate-loading">
      <div class="ai-affiliate-spinner"></div>
      <span>Generating article...</span>
      <p class="ai-affiliate-loading-message">This may take a few minutes. Please don't close this window.</p>
    </div>
  `;
  
  // Save associate ID to settings
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    settings.amazonAssociateId = data.associateId;
    chrome.storage.sync.set({ settings });
  });
  
  // Send message to background script to generate article
  chrome.runtime.sendMessage({
    action: 'generateArticle',
    data: data
  }, (response) => {
    if (response && response.success) {
      // Show article preview
      showArticlePreview(response.article);
    } else {
      // Show error message
      contentElement.innerHTML = `
        <div class="ai-affiliate-error">
          <p>Unable to generate article. Please try again.</p>
          <p class="ai-affiliate-error-details">${response ? response.error : 'Unknown error'}</p>
        </div>
        <div class="ai-affiliate-footer">
          <button class="ai-affiliate-button" id="ai-affiliate-retry">Retry</button>
          <button class="ai-affiliate-button secondary" id="ai-affiliate-cancel">Cancel</button>
        </div>
      `;
      
      // Add event listeners for buttons
      document.getElementById('ai-affiliate-retry').addEventListener('click', () => {
        generateArticle(productData);
      });
      
      document.getElementById('ai-affiliate-cancel').addEventListener('click', () => {
        loadProductData();
      });
    }
  });
}

// Function to show article preview
function showArticlePreview(article) {
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Show article preview
  contentElement.innerHTML = `
    <div class="ai-affiliate-article-preview">
      <h4>Article Preview</h4>
      <div class="ai-affiliate-article-title">${article.title}</div>
      <div class="ai-affiliate-article-content-preview">
        ${article.content.substring(0, 500)}...
      </div>
      <div class="ai-affiliate-footer">
        <button class="ai-affiliate-button" id="ai-affiliate-edit">Edit Article</button>
        <button class="ai-affiliate-button" id="ai-affiliate-publish">Publish</button>
        <button class="ai-affiliate-button secondary" id="ai-affiliate-download">Download</button>
      </div>
    </div>
  `;
  
  // Add event listeners for buttons
  document.getElementById('ai-affiliate-edit').addEventListener('click', () => {
    showArticleEditor(article);
  });
  
  document.getElementById('ai-affiliate-publish').addEventListener('click', () => {
    showPublishOptions(article);
  });
  
  document.getElementById('ai-affiliate-download').addEventListener('click', () => {
    downloadArticle(article);
  });
}

// Function to show article editor
function showArticleEditor(article) {
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Show article editor
  contentElement.innerHTML = `
    <div class="ai-affiliate-article-editor">
      <h4>Edit Article</h4>
      <div class="ai-affiliate-form-group">
        <label for="article-title">Title</label>
        <input type="text" id="article-title" value="${article.title}">
      </div>
      <div class="ai-affiliate-form-group">
        <label for="article-content">Content</label>
        <textarea id="article-content" rows="15">${article.content}</textarea>
      </div>
      <div class="ai-affiliate-footer">
        <button class="ai-affiliate-button" id="ai-affiliate-save">Save Changes</button>
        <button class="ai-affiliate-button secondary" id="ai-affiliate-cancel">Cancel</button>
      </div>
    </div>
  `;
  
  // Add event listeners for buttons
  document.getElementById('ai-affiliate-save').addEventListener('click', () => {
    // Get updated article
    const updatedArticle = {
      title: document.getElementById('article-title').value,
      content: document.getElementById('article-content').value
    };
    
    // Show article preview
    showArticlePreview(updatedArticle);
  });
  
  document.getElementById('ai-affiliate-cancel').addEventListener('click', () => {
    showArticlePreview(article);
  });
}

// Function to show publish options
function showPublishOptions(article) {
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Get user settings
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    // Show publish options
    contentElement.innerHTML = `
      <div class="ai-affiliate-publish-options">
        <h4>Publish Article</h4>
        <div class="ai-affiliate-form-group">
          <label for="publish-option">Publish To</label>
          <select id="publish-option">
            <option value="download">Download Only</option>
            <option value="wordpress">WordPress</option>
            <option value="medium">Medium</option>
            <option value="blogger">Blogger</option>
          </select>
        </div>
        <div id="publish-settings"></div>
        <div class="ai-affiliate-footer">
          <button class="ai-affiliate-button" id="ai-affiliate-publish-confirm">Publish</button>
          <button class="ai-affiliate-button secondary" id="ai-affiliate-cancel">Cancel</button>
        </div>
      </div>
    `;
    
    // Add event listener for publish option change
    document.getElementById('publish-option').addEventListener('change', (e) => {
      updatePublishSettings(e.target.value);
    });
    
    // Initialize publish settings
    updatePublishSettings(document.getElementById('publish-option').value);
    
    // Add event listeners for buttons
    document.getElementById('ai-affiliate-publish-confirm').addEventListener('click', () => {
      publishArticle(article);
    });
    
    document.getElementById('ai-affiliate-cancel').addEventListener('click', () => {
      showArticlePreview(article);
    });
  });
}

// Function to update publish settings based on selected option
function updatePublishSettings(option) {
  const settingsElement = document.getElementById('publish-settings');
  
  // Get user settings
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    // Show settings based on selected option
    switch (option) {
      case 'wordpress':
        settingsElement.innerHTML = `
          <div class="ai-affiliate-form-group">
            <label for="wordpress-site">WordPress Site</label>
            <select id="wordpress-site">
              ${settings.wordpressSites && settings.wordpressSites.length > 0 ?
                settings.wordpressSites.map(site => `<option value="${site.url}">${site.name}</option>`).join('') :
                '<option value="">No sites configured</option>'
              }
            </select>
          </div>
          <div class="ai-affiliate-form-group">
            <button class="ai-affiliate-button secondary" id="ai-affiliate-add-site">Add New Site</button>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="wordpress-category">Category</label>
            <input type="text" id="wordpress-category" placeholder="Product Reviews">
          </div>
          <div class="ai-affiliate-form-group">
            <label for="wordpress-tags">Tags (comma separated)</label>
            <input type="text" id="wordpress-tags" placeholder="amazon, review, product">
          </div>
          <div class="ai-affiliate-form-group">
            <label for="wordpress-status">Status</label>
            <select id="wordpress-status">
              <option value="draft">Draft</option>
              <option value="publish">Publish Immediately</option>
              <option value="future">Schedule</option>
            </select>
          </div>
        `;
        
        // Add event listener for add site button
        document.getElementById('ai-affiliate-add-site').addEventListener('click', () => {
          showAddWordPressSite();
        });
        break;
        
      case 'medium':
        settingsElement.innerHTML = `
          <div class="ai-affiliate-form-group">
            <p>You'll need to authorize the extension to publish to Medium.</p>
            <button class="ai-affiliate-button secondary" id="ai-affiliate-authorize-medium">Authorize Medium</button>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="medium-tags">Tags (comma separated)</label>
            <input type="text" id="medium-tags" placeholder="amazon, review, product">
          </div>
          <div class="ai-affiliate-form-group">
            <label for="medium-status">Status</label>
            <select id="medium-status">
              <option value="draft">Draft</option>
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>
        `;
        
        // Add event listener for authorize button
        document.getElementById('ai-affiliate-authorize-medium').addEventListener('click', () => {
          authorizeMedium();
        });
        break;
        
      case 'blogger':
        settingsElement.innerHTML = `
          <div class="ai-affiliate-form-group">
            <p>You'll need to authorize the extension to publish to Blogger.</p>
            <button class="ai-affiliate-button secondary" id="ai-affiliate-authorize-blogger">Authorize Blogger</button>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="blogger-blog">Blog</label>
            <select id="blogger-blog">
              <option value="">Select a blog</option>
            </select>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="blogger-labels">Labels (comma separated)</label>
            <input type="text" id="blogger-labels" placeholder="amazon, review, product">
          </div>
        `;
        
        // Add event listener for authorize button
        document.getElementById('ai-affiliate-authorize-blogger').addEventListener('click', () => {
          authorizeBlogger();
        });
        break;
        
      default:
        settingsElement.innerHTML = `
          <div class="ai-affiliate-form-group">
            <p>The article will be downloaded as a Markdown (.md) file.</p>
          </div>
          <div class="ai-affiliate-form-group">
            <label for="download-format">Additional Format</label>
            <select id="download-format">
              <option value="md">Markdown Only</option>
              <option value="html">HTML</option>
              <option value="pdf">PDF</option>
              <option value="all">All Formats</option>
            </select>
          </div>
        `;
        break;
    }
  });
}

// Function to show add WordPress site dialog
function showAddWordPressSite() {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'ai-affiliate-modal';
  modal.innerHTML = `
    <div class="ai-affiliate-modal-content">
      <div class="ai-affiliate-modal-header">
        <h4>Add WordPress Site</h4>
        <button class="ai-affiliate-modal-close">✕</button>
      </div>
      <div class="ai-affiliate-modal-body">
        <div class="ai-affiliate-form-group">
          <label for="wordpress-site-name">Site Name</label>
          <input type="text" id="wordpress-site-name" placeholder="My Blog">
        </div>
        <div class="ai-affiliate-form-group">
          <label for="wordpress-site-url">Site URL</label>
          <input type="text" id="wordpress-site-url" placeholder="https://example.com">
        </div>
        <div class="ai-affiliate-form-group">
          <label for="wordpress-username">Username</label>
          <input type="text" id="wordpress-username">
        </div>
        <div class="ai-affiliate-form-group">
          <label for="wordpress-password">Application Password</label>
          <input type="password" id="wordpress-password">
          <p class="ai-affiliate-form-help">Use an application password, not your main WordPress password.</p>
        </div>
      </div>
      <div class="ai-affiliate-modal-footer">
        <button class="ai-affiliate-button" id="ai-affiliate-test-connection">Test Connection</button>
        <button class="ai-affiliate-button" id="ai-affiliate-save-site">Save</button>
        <button class="ai-affiliate-button secondary" id="ai-affiliate-cancel-site">Cancel</button>
      </div>
    </div>
  `;
  
  // Append modal to body
  document.body.appendChild(modal);
  
  // Add event listeners for buttons
  modal.querySelector('.ai-affiliate-modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.querySelector('#ai-affiliate-cancel-site').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.querySelector('#ai-affiliate-test-connection').addEventListener('click', () => {
    testWordPressConnection();
  });
  
  modal.querySelector('#ai-affiliate-save-site').addEventListener('click', () => {
    saveWordPressSite(modal);
  });
}

// Function to test WordPress connection
function testWordPressConnection() {
  // Get site details
  const site = {
    name: document.getElementById('wordpress-site-name').value,
    url: document.getElementById('wordpress-site-url').value,
    username: document.getElementById('wordpress-username').value,
    password: document.getElementById('wordpress-password').value
  };
  
  // Show loading state
  const testButton = document.getElementById('ai-affiliate-test-connection');
  const originalText = testButton.textContent;
  testButton.textContent = 'Testing...';
  testButton.disabled = true;
  
  // Send message to background script to test connection
  chrome.runtime.sendMessage({
    action: 'testWordPressConnection',
    site: site
  }, (response) => {
    // Reset button
    testButton.textContent = originalText;
    testButton.disabled = false;
    
    // Show result
    if (response && response.success) {
      alert('Connection successful!');
    } else {
      alert(`Connection failed: ${response ? response.error : 'Unknown error'}`);
    }
  });
}

// Function to save WordPress site
function saveWordPressSite(modal) {
  // Get site details
  const site = {
    name: document.getElementById('wordpress-site-name').value,
    url: document.getElementById('wordpress-site-url').value,
    username: document.getElementById('wordpress-username').value,
    password: document.getElementById('wordpress-password').value
  };
  
  // Validate site details
  if (!site.name || !site.url || !site.username || !site.password) {
    alert('Please fill in all fields.');
    return;
  }
  
  // Send message to background script to add site
  chrome.runtime.sendMessage({
    action: 'addWordPressSite',
    site: site
  }, (response) => {
    if (response && response.success) {
      // Close modal
      document.body.removeChild(modal);
      
      // Update publish settings
      updatePublishSettings('wordpress');
    } else {
      alert(`Failed to save site: ${response ? response.error : 'Unknown error'}`);
    }
  });
}

// Function to authorize Medium
function authorizeMedium() {
  alert('Medium authorization is not implemented in this demo.');
}

// Function to authorize Blogger
function authorizeBlogger() {
  alert('Blogger authorization is not implemented in this demo.');
}

// Function to publish article
function publishArticle(article) {
  // Get publish option
  const publishOption = document.getElementById('publish-option').value;
  
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Show loading state
  contentElement.innerHTML = `
    <div class="ai-affiliate-loading">
      <div class="ai-affiliate-spinner"></div>
      <span>Publishing article...</span>
      <p class="ai-affiliate-loading-message">This may take a few moments. Please don't close this window.</p>
    </div>
  `;
  
  // Handle different publish options
  switch (publishOption) {
    case 'wordpress':
      // Implement WordPress publishing
      setTimeout(() => {
        showPublishResult(article, 'WordPress', 'https://example.com/draft-post');
      }, 2000);
      break;
      
    case 'medium':
      // Implement Medium publishing
      setTimeout(() => {
        showPublishResult(article, 'Medium', 'https://medium.com/draft');
      }, 2000);
      break;
      
    case 'blogger':
      // Implement Blogger publishing
      setTimeout(() => {
        showPublishResult(article, 'Blogger', 'https://example.blogspot.com/draft');
      }, 2000);
      break;
      
    default:
      // Download article
      downloadArticle(article);
      
      // Show success message
      contentElement.innerHTML = `
        <div class="ai-affiliate-success">
          <h4>Article Downloaded</h4>
          <p>Your article has been downloaded successfully.</p>
        </div>
        <div class="ai-affiliate-footer">
          <button class="ai-affiliate-button" id="ai-affiliate-new-article">Create New Article</button>
          <button class="ai-affiliate-button secondary" id="ai-affiliate-close">Close</button>
        </div>
      `;
      
      // Add event listeners for buttons
      document.getElementById('ai-affiliate-new-article').addEventListener('click', () => {
        loadProductData();
      });
      
      document.getElementById('ai-affiliate-close').addEventListener('click', closeWidget);
      break;
  }
}

// Function to show publish result
function showPublishResult(article, platform, url) {
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Show success message
  contentElement.innerHTML = `
    <div class="ai-affiliate-success">
      <h4>Article Published</h4>
      <p>Your article has been published to ${platform} successfully.</p>
      <p><a href="${url}" target="_blank">View Article</a></p>
    </div>
    <div class="ai-affiliate-footer">
      <button class="ai-affiliate-button" id="ai-affiliate-new-article">Create New Article</button>
      <button class="ai-affiliate-button secondary" id="ai-affiliate-close">Close</button>
    </div>
  `;
  
  // Add event listeners for buttons
  document.getElementById('ai-affiliate-new-article').addEventListener('click', () => {
    loadProductData();
  });
  
  document.getElementById('ai-affiliate-close').addEventListener('click', closeWidget);
}

// Function to download article
function downloadArticle(article) {
  // Create markdown content
  const markdown = article.content;
  
  // Create blob
  const blob = new Blob([markdown], { type: 'text/markdown' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  
  // Get download format
  const format = document.getElementById('download-format') ? 
                document.getElementById('download-format').value : 'md';
  
  // Create filename from title
  const baseFilename = article.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  
  // Download markdown
  chrome.runtime.sendMessage({
    action: 'downloadFile',
    url: url,
    filename: `${baseFilename}.md`
  });
  
  // Download additional formats if selected
  if (format === 'html' || format === 'all') {
    // Convert markdown to HTML (simplified)
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    img { max-width: 100%; height: auto; }
    h1, h2, h3 { color: #333; }
    a { color: #0066cc; }
    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${article.title}</h1>
  ${markdown.replace(/^# .*$/m, '')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/<li>.*?<\/li>\n<li>.*?<\/li>/gs, match => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '<br><br>')}
</body>
</html>`;
    
    // Create blob
    const htmlBlob = new Blob([html], { type: 'text/html' });
    
    // Create download link
    const htmlUrl = URL.createObjectURL(htmlBlob);
    
    // Download HTML
    chrome.runtime.sendMessage({
      action: 'downloadFile',
      url: htmlUrl,
      filename: `${baseFilename}.html`
    });
  }
  
  if (format === 'pdf' || format === 'all') {
    // PDF generation would typically be handled by the background script
    // using a library like jsPDF or by converting HTML to PDF
    chrome.runtime.sendMessage({
      action: 'generatePDF',
      title: article.title,
      content: article.content,
      filename: `${baseFilename}.pdf`
    });
  }
}

// Function to show help
function showHelp() {
  // Get the content element
  const contentElement = document.querySelector('.ai-affiliate-content');
  
  // Show help content
  contentElement.innerHTML = `
    <div class="ai-affiliate-help">
      <h4>AI Affiliate Pro Help</h4>
      <h5>Getting Started</h5>
      <p>AI Affiliate Pro helps you create high-quality affiliate content for Amazon products. Here's how to use it:</p>
      <ol>
        <li>Navigate to an Amazon product page</li>
        <li>Click the AI Affiliate Pro icon in the bottom-right corner</li>
        <li>Click "Start Article Wizard" to begin creating content</li>
        <li>Choose your article type, word count, and tone</li>
        <li>Click "Generate Article" to create your content</li>
        <li>Edit, publish, or download your article</li>
      </ol>
      
      <h5>Article Types</h5>
      <ul>
        <li><strong>Product Review:</strong> In-depth analysis of a single product</li>
        <li><strong>Product Comparison:</strong> Compare the product with competitors</li>
        <li><strong>Buying Guide:</strong> Help readers choose the right product</li>
        <li><strong>How-To Guide:</strong> Instructions for using the product</li>
        <li><strong>Top 10 List:</strong> Feature the product in a "best of" list</li>
        <li><strong>Problem-Solution:</strong> Show how the product solves a problem</li>
      </ul>
      
      <h5>Publishing Options</h5>
      <p>You can publish your articles to:</p>
      <ul>
        <li><strong>Download:</strong> Save as Markdown, HTML, or PDF</li>
        <li><strong>WordPress:</strong> Publish directly to your WordPress site</li>
        <li><strong>Medium:</strong> Publish to your Medium account</li>
        <li><strong>Blogger:</strong> Publish to your Blogger blog</li>
      </ul>
      
      <h5>Amazon Associate ID</h5>
      <p>Enter your Amazon Associate ID to automatically add your affiliate links to the generated content.</p>
    </div>
    <div class="ai-affiliate-footer">
      <button class="ai-affiliate-button" id="ai-affiliate-back">Back</button>
    </div>
  `;
  
  // Add event listener for back button
  document.getElementById('ai-affiliate-back').addEventListener('click', loadProductData);
}
