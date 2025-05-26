/**
 * AI Affiliate Pro - Enhanced Product Data Extractor
 * 
 * This module provides comprehensive extraction of Amazon product data including:
 * - Core product information (title, price, ASIN, etc.)
 * - Product images with SEO optimization
 * - Product variations (colors, styles, sizes)
 * - Detailed product attributes and specifications
 * - Customer Q&A and reviews
 * 
 * Features:
 * - Multiple fallback selectors for resilience
 * - Support for all Amazon locales
 * - Base64 image conversion
 * - SEO-optimized image naming and alt tags
 * - Automatic "Show More" expansion for complete data
 */

// Function to extract all product data from an Amazon product page
async function extractCompleteProductData() {
  try {
    // Click "Show More" button for About This Item section if available
    await expandAboutThisItem();
    
    // Extract all product data
    const productData = {
      // Core product information
      core: extractCoreProductInfo(),
      
      // Product images
      images: await extractAndProcessImages(),
      
      // Product variations
      variations: extractProductVariations(),
      
      // Detailed product data
      details: extractDetailedProductData(),
      
      // Reviews and ratings
      reviews: extractReviewsAndRatings(),
      
      // Extraction metadata
      meta: {
        extractionDate: new Date().toISOString(),
        success: true
      }
    };
    
    return productData;
  } catch (error) {
    console.error('Error extracting product data:', error);
    return {
      meta: {
        extractionDate: new Date().toISOString(),
        success: false,
        error: error.message
      }
    };
  }
}

/**
 * Core Product Information Extraction
 */
function extractCoreProductInfo() {
  return {
    url: window.location.href,
    asin: extractASIN(),
    title: extractTitle(),
    price: extractPrice(),
    currency: extractCurrency(),
    breadcrumbs: extractBreadcrumbs(),
    amazonSite: extractAmazonSite()
  };
}

// Extract ASIN using multiple methods
function extractASIN() {
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
      return match[1];
    }
  }
  
  // Method 2: From page metadata
  const asinElement = document.querySelector('input[name="ASIN"]');
  if (asinElement && asinElement.value) {
    return asinElement.value;
  }
  
  // Method 3: From data attributes
  const dataAsinElements = document.querySelectorAll('[data-asin]');
  for (const element of dataAsinElements) {
    const asin = element.getAttribute('data-asin');
    if (asin && asin.length === 10) {
      return asin;
    }
  }
  
  // Method 4: From structured data
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of structuredDataElements) {
    try {
      const data = JSON.parse(element.textContent);
      if (data && data.sku) {
        return data.sku;
      }
      if (data && data.productID && data.productID.includes(':')) {
        const parts = data.productID.split(':');
        if (parts[1] && parts[1].length === 10) {
          return parts[1];
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  
  return 'ASIN not found';
}

// Extract product title with multiple selectors
function extractTitle() {
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
      return titleElement.textContent.trim();
    }
  }
  
  return 'Title not found';
}

// Extract price with multiple selectors
function extractPrice() {
  const priceSelectors = [
    '.a-price .a-offscreen',
    '#price',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price',
    '.a-color-price',
    'span.a-price[data-a-size="xl"] .a-offscreen',
    'span.a-price-whole'
  ];
  
  for (const selector of priceSelectors) {
    const priceElement = document.querySelector(selector);
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      // Extract numeric price
      const priceMatch = priceText.match(/[\d.,]+/);
      if (priceMatch) {
        return priceMatch[0];
      }
      return priceText;
    }
  }
  
  return 'Price not available';
}

// Extract currency symbol
function extractCurrency() {
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
      // Extract currency symbol
      const currencyMatch = priceText.match(/[^\d.,]+/);
      if (currencyMatch) {
        return currencyMatch[0].trim();
      }
    }
  }
  
  // Default currency based on domain
  const domain = window.location.hostname;
  if (domain.includes('amazon.com')) return '$';
  if (domain.includes('amazon.co.uk')) return '£';
  if (domain.includes('amazon.de') || domain.includes('amazon.fr') || domain.includes('amazon.it') || domain.includes('amazon.es')) return '€';
  if (domain.includes('amazon.co.jp')) return '¥';
  if (domain.includes('amazon.ca')) return 'CA$';
  if (domain.includes('amazon.com.au')) return 'AU$';
  
  return '$';
}

// Extract breadcrumbs
function extractBreadcrumbs() {
  const breadcrumbs = [];
  const breadcrumbSelectors = [
    '#wayfinding-breadcrumbs_feature_div .a-link-normal',
    '.a-breadcrumb .a-link-normal'
  ];
  
  for (const selector of breadcrumbSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(element => {
        breadcrumbs.push({
          text: element.textContent.trim(),
          url: element.href
        });
      });
      return breadcrumbs;
    }
  }
  
  return breadcrumbs;
}

// Extract Amazon site/domain
function extractAmazonSite() {
  const domain = window.location.hostname;
  
  // Map domain to locale
  const domainMap = {
    'www.amazon.com': 'US',
    'www.amazon.co.uk': 'UK',
    'www.amazon.de': 'DE',
    'www.amazon.fr': 'FR',
    'www.amazon.it': 'IT',
    'www.amazon.es': 'ES',
    'www.amazon.co.jp': 'JP',
    'www.amazon.ca': 'CA',
    'www.amazon.com.au': 'AU',
    'www.amazon.in': 'IN',
    'www.amazon.com.mx': 'MX',
    'www.amazon.com.br': 'BR'
  };
  
  for (const [key, value] of Object.entries(domainMap)) {
    if (domain.includes(key)) {
      return {
        domain: domain,
        locale: value,
        fullDomain: key
      };
    }
  }
  
  return {
    domain: domain,
    locale: 'Unknown',
    fullDomain: domain
  };
}

/**
 * Product Images Extraction and Processing
 */
async function extractAndProcessImages() {
  const images = [];
  const productTitle = extractTitle();
  const asin = extractASIN();
  
  // Extract main product image
  const mainImage = await extractMainProductImage(productTitle, asin);
  if (mainImage) {
    images.push(mainImage);
  }
  
  // Extract additional product images (up to 3 more)
  const additionalImages = await extractAdditionalProductImages(productTitle, asin, 3);
  images.push(...additionalImages);
  
  return images;
}

// Extract main product image
async function extractMainProductImage(productTitle, asin) {
  const mainImageSelectors = [
    '#landingImage',
    '#imgBlkFront',
    '#main-image',
    '.a-dynamic-image',
    '#ebooksImgBlkFront'
  ];
  
  for (const selector of mainImageSelectors) {
    const mainImageElement = document.querySelector(selector);
    if (mainImageElement) {
      // Get the highest resolution image URL
      let imageUrl = mainImageElement.getAttribute('data-old-hires') || 
                     mainImageElement.src;
      
      // Handle JSON-encoded image URLs
      if (mainImageElement.hasAttribute('data-a-dynamic-image')) {
        try {
          const imageJson = JSON.parse(mainImageElement.getAttribute('data-a-dynamic-image'));
          const imageUrls = Object.keys(imageJson);
          if (imageUrls.length > 0) {
            // Sort by resolution and get the highest
            imageUrls.sort((a, b) => {
              const aRes = imageJson[a][0] * imageJson[a][1];
              const bRes = imageJson[b][0] * imageJson[b][1];
              return bRes - aRes;
            });
            imageUrl = imageUrls[0];
          }
        } catch (e) {
          // Use as is if parsing fails
        }
      }
      
      // Convert to high-resolution version
      imageUrl = convertToHighResImage(imageUrl);
      
      // Generate SEO-friendly filename and alt text
      const seoFilename = generateSEOFilename(productTitle, asin, 'main');
      const seoAltText = generateSEOAltText(productTitle, 'main product image');
      
      // Convert image to base64
      const base64Data = await convertImageToBase64(imageUrl);
      
      return {
        url: imageUrl,
        base64: base64Data,
        seoFilename: seoFilename,
        seoAltText: seoAltText,
        type: 'main',
        position: 1
      };
    }
  }
  
  return null;
}

// Extract additional product images
async function extractAdditionalProductImages(productTitle, asin, maxImages = 3) {
  const images = [];
  const thumbnailSelectors = [
    '.imageThumbnail img',
    '#altImages .a-button-thumbnail img',
    '.item-thumbnails img',
    '#imageBlock .image.item img',
    '#imageBlockThumbs .a-list-item img'
  ];
  
  for (const selector of thumbnailSelectors) {
    const thumbnailElements = document.querySelectorAll(selector);
    if (thumbnailElements.length > 0) {
      let count = 0;
      for (const element of thumbnailElements) {
        if (count >= maxImages) break;
        
        // Skip if this is a video thumbnail
        if (element.closest('.videoThumbnail')) continue;
        
        let thumbnailSrc = element.getAttribute('src');
        if (!thumbnailSrc) continue;
        
        // Convert thumbnail URL to full-size image URL
        const fullSizeUrl = convertToHighResImage(thumbnailSrc);
        
        // Generate SEO-friendly filename and alt text
        const seoFilename = generateSEOFilename(productTitle, asin, `additional-${count + 1}`);
        const seoAltText = generateSEOAltText(productTitle, `additional view ${count + 1}`);
        
        // Convert image to base64
        const base64Data = await convertImageToBase64(fullSizeUrl);
        
        images.push({
          url: fullSizeUrl,
          base64: base64Data,
          seoFilename: seoFilename,
          seoAltText: seoAltText,
          type: 'additional',
          position: count + 2
        });
        
        count++;
      }
      
      break;
    }
  }
  
  return images;
}

// Convert thumbnail or low-res image URL to high-resolution version
function convertToHighResImage(imageUrl) {
  if (!imageUrl) return '';
  
  // Remove size constraints in Amazon image URLs
  return imageUrl.replace(/\._.*_\./, '.');
}

// Generate SEO-friendly filename
function generateSEOFilename(productTitle, asin, type) {
  // Create a base filename from the product title
  let filename = productTitle
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .substring(0, 50);        // Limit length
  
  // Add type and ASIN
  return `${filename}-${type}-${asin}.jpg`;
}

// Generate SEO-friendly alt text
function generateSEOAltText(productTitle, description) {
  return `${productTitle} - ${description}`;
}

// Convert image to base64
async function convertImageToBase64(imageUrl) {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Convert to blob
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Product Variations Extraction
 */
function extractProductVariations() {
  return {
    colors: extractColorOptions(),
    styles: extractStyleOptions(),
    sizes: extractSizeOptions()
  };
}

// Extract color options
function extractColorOptions() {
  const colorOptions = [];
  
  // Method 1: From color swatches
  const colorElements = document.querySelectorAll('#variation_color_name ul li, #inline-twister-expander-content-color_name ul li');
  if (colorElements.length > 0) {
    colorElements.forEach(element => {
      const colorImage = element.querySelector('.swatch-image-container img, .imgSwatch');
      if (colorImage) {
        const colorName = colorImage.getAttribute('alt');
        if (colorName && !colorOptions.includes(colorName)) {
          colorOptions.push(colorName);
        }
      }
    });
  }
  
  // Method 2: From dropdown
  const colorSelect = document.querySelector('#variation_color_name select');
  if (colorSelect && colorOptions.length === 0) {
    const options = colorSelect.querySelectorAll('option');
    options.forEach(option => {
      const value = option.textContent.trim();
      if (value && value !== 'Select' && !colorOptions.includes(value)) {
        colorOptions.push(value);
      }
    });
  }
  
  // Method 3: From color name span
  if (colorOptions.length === 0) {
    const colorNameElement = document.querySelector('#variation_color_name .selection');
    if (colorNameElement) {
      const colorName = colorNameElement.textContent.trim();
      if (colorName) {
        colorOptions.push(colorName);
      }
    }
  }
  
  return colorOptions;
}

// Extract style options
function extractStyleOptions() {
  const styleOptions = [];
  
  // Method 1: From style buttons
  const styleElements = document.querySelectorAll('#variation_style_name ul li, #inline-twister-expander-content-style_name ul li');
  if (styleElements.length > 0) {
    styleElements.forEach(element => {
      const styleText = element.textContent.trim();
      if (styleText && !styleOptions.includes(styleText)) {
        styleOptions.push(styleText);
      }
    });
  }
  
  // Method 2: From dropdown
  const styleSelect = document.querySelector('#variation_style_name select');
  if (styleSelect && styleOptions.length === 0) {
    const options = styleSelect.querySelectorAll('option');
    options.forEach(option => {
      const value = option.textContent.trim();
      if (value && value !== 'Select' && !styleOptions.includes(value)) {
        styleOptions.push(value);
      }
    });
  }
  
  // Method 3: From style name span
  if (styleOptions.length === 0) {
    const styleNameElement = document.querySelector('#variation_style_name .selection');
    if (styleNameElement) {
      const styleName = styleNameElement.textContent.trim();
      if (styleName) {
        styleOptions.push(styleName);
      }
    }
  }
  
  return styleOptions;
}

// Extract size options
function extractSizeOptions() {
  const sizeOptions = [];
  
  // Method 1: From size buttons
  const sizeElements = document.querySelectorAll('#variation_size_name ul li, #inline-twister-expander-content-size_name ul li');
  if (sizeElements.length > 0) {
    sizeElements.forEach(element => {
      const sizeText = element.textContent.trim();
      if (sizeText && !sizeOptions.includes(sizeText)) {
        sizeOptions.push(sizeText);
      }
    });
  }
  
  // Method 2: From dropdown
  const sizeSelect = document.querySelector('#variation_size_name select');
  if (sizeSelect && sizeOptions.length === 0) {
    const options = sizeSelect.querySelectorAll('option');
    options.forEach(option => {
      const value = option.textContent.trim();
      if (value && value !== 'Select' && !sizeOptions.includes(value)) {
        sizeOptions.push(value);
      }
    });
  }
  
  // Method 3: From size name span
  if (sizeOptions.length === 0) {
    const sizeNameElement = document.querySelector('#variation_size_name .selection');
    if (sizeNameElement) {
      const sizeName = sizeNameElement.textContent.trim();
      if (sizeName) {
        sizeOptions.push(sizeName);
      }
    }
  }
  
  return sizeOptions;
}

/**
 * Detailed Product Data Extraction
 */
function extractDetailedProductData() {
  return {
    attributes: extractProductAttributes(),
    aboutThisItem: extractAboutThisItem(),
    productDetails: extractProductDetails(),
    customerQA: extractCustomerQA()
  };
}

// Extract product attributes from overview section
function extractProductAttributes() {
  const attributes = {};
  
  // Method 1: From product overview table
  const overviewRows = document.querySelectorAll('#productOverview_feature_div table tr');
  if (overviewRows.length > 0) {
    overviewRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const key = cells[0].textContent.trim();
        const value = cells[1].textContent.trim();
        if (key && value) {
          attributes[key] = value;
        }
      }
    });
  }
  
  // Method 2: From product details section
  if (Object.keys(attributes).length === 0) {
    const detailRows = document.querySelectorAll('#detailBullets_feature_div .a-list-item');
    detailRows.forEach(row => {
      const text = row.textContent.trim();
      const parts = text.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key && value) {
          attributes[key] = value;
        }
      }
    });
  }
  
  return attributes;
}

// Extract "About This Item" bullet points
function extractAboutThisItem() {
  const features = [];
  
  // Method 1: From feature bullets
  const featureElements = document.querySelectorAll('#feature-bullets .a-list-item, #featurebullets_feature_div .a-list-item');
  if (featureElements.length > 0) {
    featureElements.forEach(element => {
      const feature = element.textContent.trim();
      if (feature) {
        features.push(feature);
      }
    });
  }
  
  // Method 2: From product description
  if (features.length === 0) {
    const descriptionElement = document.querySelector('#productDescription');
    if (descriptionElement) {
      const paragraphs = descriptionElement.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (text) {
          features.push(text);
        }
      });
    }
  }
  
  return features;
}

// Expand "About This Item" section by clicking "Show More" button
async function expandAboutThisItem() {
  const showMoreLink = document.querySelector('#feature-bullets #showMore, .a-expander-prompt');
  if (showMoreLink) {
    // Create and dispatch a native click event
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    showMoreLink.dispatchEvent(clickEvent);
    
    // Wait for content to expand
    return new Promise(resolve => {
      setTimeout(resolve, 500);
    });
  }
  
  return Promise.resolve();
}

// Extract product details from tables
function extractProductDetails() {
  const details = {};
  
  // Method 1: From product information section
  const infoRows = document.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_techSpec_section_2 tr, #prodDetails .a-keyvalue');
  if (infoRows.length > 0) {
    infoRows.forEach(row => {
      const label = row.querySelector('th, .a-span3');
      const value = row.querySelector('td, .a-span9');
      
      if (label && value) {
        const key = label.textContent.trim();
        const val = value.textContent.trim();
        if (key && val) {
          details[key] = val;
        }
      }
    });
  }
  
  // Method 2: From detail bullets
  if (Object.keys(details).length === 0) {
    const detailRows = document.querySelectorAll('#detailBulletsWrapper_feature_div .a-list-item');
    detailRows.forEach(row => {
      const text = row.textContent.trim();
      const parts = text.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        if (key && value) {
          details[key] = value;
        }
      }
    });
  }
  
  return details;
}

// Extract customer Q&A
function extractCustomerQA() {
  const qa = [];
  
  // From customer questions section
  const questionElements = document.querySelectorAll('#ask-btf-container .a-fixed-left-grid, .askTeaserQuestions .a-fixed-left-grid');
  
  let count = 0;
  questionElements.forEach(element => {
    if (count >= 10) return; // Limit to 10 Q&As
    
    const questionElement = element.querySelector('.a-text-bold');
    const answerElement = element.querySelector('.a-fixed-left-grid-col.a-col-right .a-spacing-small:not(.a-text-bold)');
    
    if (questionElement && answerElement) {
      const question = questionElement.textContent.trim();
      const answer = answerElement.textContent.trim();
      
      if (question && answer) {
        qa.push({
          question: question,
          answer: answer
        });
        
        count++;
      }
    }
  });
  
  return qa;
}

/**
 * Reviews and Ratings Extraction
 */
function extractReviewsAndRatings() {
  return {
    averageRating: extractAverageRating(),
    ratingCount: extractRatingCount(),
    ratingsBreakdown: extractRatingsBreakdown(),
    topReviews: extractTopReviews()
  };
}

// Extract average rating
function extractAverageRating() {
  // Method 1: From rating element
  const ratingElement = document.querySelector('#acrPopover, .a-star-medium-4');
  if (ratingElement) {
    const ratingText = ratingElement.title || ratingElement.textContent;
    const ratingMatch = ratingText.match(/[\d.]+/);
    if (ratingMatch) {
      return parseFloat(ratingMatch[0]);
    }
  }
  
  // Method 2: From review summary
  const summaryElement = document.querySelector('#averageCustomerReviews .a-icon-alt');
  if (summaryElement) {
    const summaryText = summaryElement.textContent;
    const ratingMatch = summaryText.match(/[\d.]+/);
    if (ratingMatch) {
      return parseFloat(ratingMatch[0]);
    }
  }
  
  return 0;
}

// Extract rating count
function extractRatingCount() {
  // Method 1: From rating count element
  const countElement = document.querySelector('#acrCustomerReviewText, #ratings-count');
  if (countElement) {
    const countText = countElement.textContent.trim();
    const countMatch = countText.match(/[\d,]+/);
    if (countMatch) {
      return parseInt(countMatch[0].replace(/,/g, ''));
    }
  }
  
  // Method 2: From review summary
  const summaryElement = document.querySelector('#averageCustomerReviews_feature_div .a-size-base');
  if (summaryElement) {
    const summaryText = summaryElement.textContent.trim();
    const countMatch = summaryText.match(/[\d,]+/);
    if (countMatch) {
      return parseInt(countMatch[0].replace(/,/g, ''));
    }
  }
  
  return 0;
}

// Extract ratings breakdown (5-star, 4-star, etc.)
function extractRatingsBreakdown() {
  const breakdown = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0
  };
  
  // From ratings breakdown table
  const rows = document.querySelectorAll('#histogramTable .a-histogram-row');
  rows.forEach(row => {
    const starElement = row.querySelector('.a-text-right');
    const percentElement = row.querySelector('.a-text-left');
    
    if (starElement && percentElement) {
      const starText = starElement.textContent.trim();
      const starMatch = starText.match(/(\d+)/);
      
      const percentText = percentElement.textContent.trim();
      const percentMatch = percentText.match(/(\d+)/);
      
      if (starMatch && percentMatch) {
        const stars = parseInt(starMatch[1]);
        const percent = parseInt(percentMatch[1]);
        
        if (stars >= 1 && stars <= 5) {
          breakdown[stars] = percent;
        }
      }
    }
  });
  
  return breakdown;
}

// Extract top reviews
function extractTopReviews() {
  const reviews = [];
  
  // From customer reviews section
  const reviewElements = document.querySelectorAll('#cm-cr-dp-review-list .review, #customer-reviews-content .review');
  
  let count = 0;
  reviewElements.forEach(element => {
    if (count >= 5) return; // Limit to 5 reviews
    
    const titleElement = element.querySelector('.review-title');
    const textElement = element.querySelector('.review-text');
    const ratingElement = element.querySelector('.review-rating');
    const authorElement = element.querySelector('.a-profile-name');
    const dateElement = element.querySelector('.review-date');
    
    if (titleElement && textElement) {
      const title = titleElement.textContent.trim();
      const text = textElement.textContent.trim();
      
      let rating = 0;
      if (ratingElement) {
        const ratingText = ratingElement.textContent.trim();
        const ratingMatch = ratingText.match(/[\d.]+/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[0]);
        }
      }
      
      let author = 'Anonymous';
      if (authorElement) {
        author = authorElement.textContent.trim();
      }
      
      let date = '';
      if (dateElement) {
        date = dateElement.textContent.trim();
      }
      
      reviews.push({
        title: title,
        text: text,
        rating: rating,
        author: author,
        date: date
      });
      
      count++;
    }
  });
  
  return reviews;
}

// Export the main extraction function
export { extractCompleteProductData, expandAboutThisItem };
