// AI Affiliate Pro - Background Script
// This script runs in the background and handles communication between popup and content scripts

// Initialize extension data when installed
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      const defaultSettings = {
        amazonAssociateId: '',
        defaultWordCount: '2000-3000',
        defaultArticleTone: 'Professional',
        defaultPublishingOption: 'Download Only',
        theme: 'light',
        wordpressSites: [],
        socialAccounts: []
      };
      
      chrome.storage.sync.set({ settings: defaultSettings });
    }
  });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle different message types
  switch (message.action) {
    case 'extractProductData':
      // Forward the request to content script to extract product data
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'extractProductData' }, (response) => {
            sendResponse(response);
          });
        }
      });
      return true; // Keep the message channel open for async response
      
    case 'generateArticle':
      // Process article generation request
      generateArticle(message.data, sendResponse);
      return true; // Keep the message channel open for async response
      
    case 'saveSettings':
      // Save user settings
      chrome.storage.sync.set({ settings: message.settings }, () => {
        sendResponse({ success: true });
      });
      return true; // Keep the message channel open for async response
      
    case 'getSettings':
      // Retrieve user settings
      chrome.storage.sync.get(['settings'], (result) => {
        sendResponse({ settings: result.settings || {} });
      });
      return true; // Keep the message channel open for async response
      
    case 'addWordPressSite':
      // Add a new WordPress site
      addWordPressSite(message.site, sendResponse);
      return true; // Keep the message channel open for async response
      
    case 'testWordPressConnection':
      // Test WordPress connection
      testWordPressConnection(message.site, sendResponse);
      return true; // Keep the message channel open for async response
  }
});

// Function to handle article generation
function generateArticle(data, sendResponse) {
  // In a real implementation, this would call an AI service API
  // For this demo, we'll simulate the generation process
  
  // Simulate API call delay
  setTimeout(() => {
    // Create a sample article structure based on the requested type
    const articleTypes = {
      'product-review': generateProductReview,
      'comparison': generateComparison,
      'buying-guide': generateBuyingGuide,
      'how-to': generateHowTo,
      'top-10': generateTop10,
      'problem-solution': generateProblemSolution
    };
    
    const generator = articleTypes[data.articleType] || generateProductReview;
    const article = generator(data);
    
    // Return the generated article
    sendResponse({
      success: true,
      article: article
    });
  }, 2000); // Simulate 2-second generation time
}

// Sample article generators (in a real implementation, these would use AI APIs)
function generateProductReview(data) {
  return {
    title: `${data.productInfo.title} Review: Is It Worth It in 2025?`,
    content: `# ${data.productInfo.title} Review: Is It Worth It in 2025?\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `## Introduction\n\n` +
      `Are you considering purchasing the ${data.productInfo.title}? In this comprehensive review, we'll take a deep dive into this product's features, performance, and value to help you decide if it's the right choice for you.\n\n` +
      `## Product Overview\n\n` +
      `The ${data.productInfo.title} is a ${data.productInfo.category} product that offers ${data.productInfo.features.join(', ')}. Priced at ${data.productInfo.price}, it positions itself in the ${data.productInfo.price > 100 ? 'premium' : 'affordable'} segment of the market.\n\n` +
      `## Key Features\n\n` +
      `* Feature 1: Description\n` +
      `* Feature 2: Description\n` +
      `* Feature 3: Description\n\n` +
      `## Performance and Quality\n\n` +
      `Based on our testing and customer reviews, the ${data.productInfo.title} performs exceptionally well in [specific areas]. The build quality is [quality assessment], and durability appears to be [durability assessment].\n\n` +
      `## Pros and Cons\n\n` +
      `### Pros\n` +
      `* Pro 1\n` +
      `* Pro 2\n` +
      `* Pro 3\n\n` +
      `### Cons\n` +
      `* Con 1\n` +
      `* Con 2\n\n` +
      `## Value for Money\n\n` +
      `At ${data.productInfo.price}, the ${data.productInfo.title} offers [value assessment] value for money compared to similar products in the market.\n\n` +
      `## Conclusion\n\n` +
      `Overall, the ${data.productInfo.title} is a [overall assessment] product that [recommendation]. If you're looking for [specific use case], this product is definitely worth considering.\n\n` +
      `[Check Current Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})`
  };
}

function generateComparison(data) {
  return {
    title: `${data.productInfo.title} vs Competitors: Which Should You Buy in 2025?`,
    content: `# ${data.productInfo.title} vs Competitors: Which Should You Buy in 2025?\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `## Introduction\n\n` +
      `Choosing the right ${data.productInfo.category} can be challenging with so many options available. In this comparison, we'll pit the ${data.productInfo.title} against its top competitors to help you make an informed decision.\n\n` +
      `## Comparison Table\n\n` +
      `| Feature | ${data.productInfo.title} | Competitor 1 | Competitor 2 |\n` +
      `|---------|---------|-------------|-------------|\n` +
      `| Price | ${data.productInfo.price} | $XX.XX | $XX.XX |\n` +
      `| Feature 1 | ✓ | ✓ | ✗ |\n` +
      `| Feature 2 | ✓ | ✗ | ✓ |\n` +
      `| Feature 3 | ✓ | ✓ | ✓ |\n` +
      `| Rating | ${data.productInfo.rating}/5 | X.X/5 | X.X/5 |\n\n` +
      `## Detailed Comparison\n\n` +
      `### ${data.productInfo.title}\n\n` +
      `The ${data.productInfo.title} offers [unique selling points]. It excels in [specific areas] but falls short in [weaknesses].\n\n` +
      `### Competitor 1\n\n` +
      `Competitor 1 stands out for its [strengths] but lacks [weaknesses] compared to the ${data.productInfo.title}.\n\n` +
      `### Competitor 2\n\n` +
      `Competitor 2 provides [strengths] at a [price comparison] price point, making it [value assessment] compared to the ${data.productInfo.title}.\n\n` +
      `## Which One Should You Choose?\n\n` +
      `* Choose the **${data.productInfo.title}** if you prioritize [specific benefits].\n` +
      `* Choose **Competitor 1** if [specific use case or preference].\n` +
      `* Choose **Competitor 2** if [specific use case or preference].\n\n` +
      `## Conclusion\n\n` +
      `After thorough comparison, the ${data.productInfo.title} [overall assessment]. It offers the best value for [specific users] and excels in [key areas].\n\n` +
      `[Check Current Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})`
  };
}

function generateBuyingGuide(data) {
  return {
    title: `Best ${data.productInfo.category} in 2025: Ultimate Buying Guide`,
    content: `# Best ${data.productInfo.category} in 2025: Ultimate Buying Guide\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `## Introduction\n\n` +
      `Looking for the perfect ${data.productInfo.category}? This comprehensive buying guide will walk you through everything you need to know before making a purchase, including key features to look for, top recommendations, and common pitfalls to avoid.\n\n` +
      `## What to Look for in a ${data.productInfo.category}\n\n` +
      `### Key Features\n\n` +
      `* Feature 1: Why it matters and what to look for\n` +
      `* Feature 2: Why it matters and what to look for\n` +
      `* Feature 3: Why it matters and what to look for\n\n` +
      `### Price Range\n\n` +
      `* Budget options ($XX-$XX): What to expect\n` +
      `* Mid-range options ($XX-$XX): What to expect\n` +
      `* Premium options ($XX+): What to expect\n\n` +
      `## Top Recommendations\n\n` +
      `### Best Overall: ${data.productInfo.title}\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `The ${data.productInfo.title} earns our top recommendation for its [key strengths]. Priced at ${data.productInfo.price}, it offers exceptional value with features like ${data.productInfo.features.join(', ')}.\n\n` +
      `[Check Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})\n\n` +
      `### Best Budget Option: [Budget Product]\n\n` +
      `For those on a tighter budget, [Budget Product] offers [key benefits] at a more affordable price point.\n\n` +
      `### Best Premium Option: [Premium Product]\n\n` +
      `If budget isn't a concern, [Premium Product] provides the ultimate experience with [premium features].\n\n` +
      `## Common Mistakes to Avoid\n\n` +
      `* Mistake 1: Explanation and how to avoid it\n` +
      `* Mistake 2: Explanation and how to avoid it\n` +
      `* Mistake 3: Explanation and how to avoid it\n\n` +
      `## Conclusion\n\n` +
      `When shopping for a ${data.productInfo.category}, prioritize [most important factors] based on your specific needs. Our top recommendation, the ${data.productInfo.title}, offers the best balance of features, quality, and value for most users.\n\n` +
      `[Check Current Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})`
  };
}

function generateHowTo(data) {
  return {
    title: `How to Use ${data.productInfo.title}: Complete Guide & Tips`,
    content: `# How to Use ${data.productInfo.title}: Complete Guide & Tips\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `## Introduction\n\n` +
      `The ${data.productInfo.title} is a versatile ${data.productInfo.category} that can [primary function]. This comprehensive guide will walk you through setup, basic and advanced usage, troubleshooting, and maintenance to help you get the most out of your purchase.\n\n` +
      `## What You'll Need\n\n` +
      `* ${data.productInfo.title} [Check Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})\n` +
      `* Item 2 (optional)\n` +
      `* Item 3 (optional)\n\n` +
      `## Setup and Installation\n\n` +
      `1. Step 1: Description\n` +
      `2. Step 2: Description\n` +
      `3. Step 3: Description\n\n` +
      `## Basic Usage\n\n` +
      `### Function 1\n\n` +
      `1. Step 1: Description\n` +
      `2. Step 2: Description\n\n` +
      `### Function 2\n\n` +
      `1. Step 1: Description\n` +
      `2. Step 2: Description\n\n` +
      `## Advanced Techniques\n\n` +
      `### Technique 1\n\n` +
      `Detailed explanation of advanced technique 1.\n\n` +
      `### Technique 2\n\n` +
      `Detailed explanation of advanced technique 2.\n\n` +
      `## Troubleshooting Common Issues\n\n` +
      `### Issue 1\n\n` +
      `* Cause: Explanation\n` +
      `* Solution: Steps to resolve\n\n` +
      `### Issue 2\n\n` +
      `* Cause: Explanation\n` +
      `* Solution: Steps to resolve\n\n` +
      `## Maintenance and Care\n\n` +
      `To keep your ${data.productInfo.title} in optimal condition, follow these maintenance tips:\n\n` +
      `* Tip 1: Description\n` +
      `* Tip 2: Description\n` +
      `* Tip 3: Description\n\n` +
      `## Conclusion\n\n` +
      `With this guide, you're now equipped to make the most of your ${data.productInfo.title}. Whether you're a beginner or looking to master advanced techniques, following these instructions will help you achieve the best results.\n\n` +
      `[Check Current Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})`
  };
}

function generateTop10(data) {
  return {
    title: `Top 10 Best ${data.productInfo.category} in 2025`,
    content: `# Top 10 Best ${data.productInfo.category} in 2025\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `## Introduction\n\n` +
      `Looking for the best ${data.productInfo.category} in 2025? We've researched and tested dozens of options to bring you this definitive list of the top 10 products available today.\n\n` +
      `## Our Top Picks at a Glance\n\n` +
      `1. **Best Overall:** ${data.productInfo.title}\n` +
      `2. **Best Budget:** [Budget Product]\n` +
      `3. **Best Premium:** [Premium Product]\n` +
      `4. **Best for Beginners:** [Beginner Product]\n` +
      `5. **Best for Professionals:** [Professional Product]\n` +
      `6. **Most Versatile:** [Versatile Product]\n` +
      `7. **Best Compact:** [Compact Product]\n` +
      `8. **Best Value:** [Value Product]\n` +
      `9. **Most Innovative:** [Innovative Product]\n` +
      `10. **Editor's Choice:** [Editor's Choice Product]\n\n` +
      `## 1. Best Overall: ${data.productInfo.title}\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `**Price:** ${data.productInfo.price}\n\n` +
      `**Why we love it:** The ${data.productInfo.title} earns our top spot for its exceptional [key strengths]. With features like ${data.productInfo.features.join(', ')}, it outperforms competitors in [key areas].\n\n` +
      `**Pros:**\n` +
      `* Pro 1\n` +
      `* Pro 2\n` +
      `* Pro 3\n\n` +
      `**Cons:**\n` +
      `* Con 1\n` +
      `* Con 2\n\n` +
      `[Check Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})\n\n` +
      `## 2. Best Budget: [Budget Product]\n\n` +
      `[Content for budget product]\n\n` +
      `## 3. Best Premium: [Premium Product]\n\n` +
      `[Content for premium product]\n\n` +
      `[Content for remaining products...]\n\n` +
      `## Buying Guide: How to Choose the Right ${data.productInfo.category}\n\n` +
      `When shopping for a ${data.productInfo.category}, consider these key factors:\n\n` +
      `* Factor 1: Explanation\n` +
      `* Factor 2: Explanation\n` +
      `* Factor 3: Explanation\n\n` +
      `## Conclusion\n\n` +
      `After extensive testing and research, the ${data.productInfo.title} stands out as our top recommendation for most users. However, depending on your specific needs and budget, any of the options on our list would be an excellent choice.\n\n` +
      `[Check Current Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})`
  };
}

function generateProblemSolution(data) {
  return {
    title: `How to Solve [Common Problem] with ${data.productInfo.title}`,
    content: `# How to Solve [Common Problem] with ${data.productInfo.title}\n\n` +
      `![${data.productInfo.title}](${data.productInfo.image})\n\n` +
      `## Introduction\n\n` +
      `[Common Problem] affects many people, causing [negative effects]. Fortunately, the ${data.productInfo.title} offers an effective solution that can [benefits]. In this article, we'll explore how this product can help you overcome this challenge.\n\n` +
      `## Understanding the Problem\n\n` +
      `### What Causes [Common Problem]?\n\n` +
      `[Common Problem] typically occurs due to [causes]. This can lead to [consequences] if left unaddressed.\n\n` +
      `### Common Symptoms\n\n` +
      `* Symptom 1: Description\n` +
      `* Symptom 2: Description\n` +
      `* Symptom 3: Description\n\n` +
      `## How ${data.productInfo.title} Helps\n\n` +
      `The ${data.productInfo.title} addresses [Common Problem] through its [key features]. Here's how it works:\n\n` +
      `### Feature 1: [Specific Feature]\n\n` +
      `This feature helps by [explanation of how it solves the problem].\n\n` +
      `### Feature 2: [Specific Feature]\n\n` +
      `This feature contributes by [explanation of how it solves the problem].\n\n` +
      `## Step-by-Step Solution\n\n` +
      `1. Step 1: Description\n` +
      `2. Step 2: Description\n` +
      `3. Step 3: Description\n\n` +
      `## Real User Results\n\n` +
      `Users who have tried the ${data.productInfo.title} report [positive outcomes]. According to reviews, many have experienced [specific benefits] within [timeframe].\n\n` +
      `## Alternative Solutions\n\n` +
      `While the ${data.productInfo.title} is our recommended solution, here are some alternatives:\n\n` +
      `* Alternative 1: Pros and cons\n` +
      `* Alternative 2: Pros and cons\n` +
      `* Alternative 3: Pros and cons\n\n` +
      `## Conclusion\n\n` +
      `If you're struggling with [Common Problem], the ${data.productInfo.title} offers a reliable and effective solution. With its [key benefits], it can help you [desired outcome] and improve your overall experience.\n\n` +
      `[Check Current Price on Amazon](https://amazon.com/${data.productInfo.asin}?tag=${data.associateId})`
  };
}

// Function to add a new WordPress site
function addWordPressSite(site, sendResponse) {
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    const wordpressSites = settings.wordpressSites || [];
    
    // Add new site
    wordpressSites.push(site);
    
    // Update settings
    settings.wordpressSites = wordpressSites;
    chrome.storage.sync.set({ settings }, () => {
      sendResponse({ success: true, sites: wordpressSites });
    });
  });
}

// Function to test WordPress connection
function testWordPressConnection(site, sendResponse) {
  // In a real implementation, this would make an API request to the WordPress site
  // For this demo, we'll simulate a successful connection
  
  // Simulate API call delay
  setTimeout(() => {
    // Simulate successful connection
    sendResponse({
      success: true,
      message: "Successfully connected to WordPress site"
    });
  }, 1000); // Simulate 1-second API call
}
