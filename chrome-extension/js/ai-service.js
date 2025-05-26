// AI Affiliate Pro - AI Service
// This file handles communication with AI providers (OpenAI and Anthropic)

class AIService {
  constructor() {
    this.prompts = typeof AI_PROMPTS !== 'undefined' ? AI_PROMPTS : {};
    this.defaultProvider = 'openai';
    this.defaultModels = {
      'openai': 'gpt-3.5-turbo',
      'anthropic': 'claude-instant'
    };
  }

  // Initialize with settings
  async init() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        this.aiSettings = settings.aiSettings || {
          provider: this.defaultProvider,
          openaiModel: this.defaultModels.openai,
          anthropicModel: this.defaultModels.anthropic,
          openaiApiKey: '',
          anthropicApiKey: ''
        };
        resolve();
      });
    });
  }

  // Save AI settings
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        const currentSettings = result.settings || {};
        currentSettings.aiSettings = settings;
        
        chrome.storage.sync.set({ settings: currentSettings }, () => {
          this.aiSettings = settings;
          resolve();
        });
      });
    });
  }

  // Get current AI settings
  getSettings() {
    return this.aiSettings || {
      provider: this.defaultProvider,
      openaiModel: this.defaultModels.openai,
      anthropicModel: this.defaultModels.anthropic,
      openaiApiKey: '',
      anthropicApiKey: ''
    };
  }

  // Test API connection
  async testConnection(provider, apiKey, model) {
    try {
      if (provider === 'openai') {
        return await this.testOpenAI(apiKey, model);
      } else if (provider === 'anthropic') {
        return await this.testAnthropic(apiKey, model);
      }
      return { success: false, message: 'Invalid provider' };
    } catch (error) {
      console.error('Error testing API connection:', error);
      return { success: false, message: error.message || 'Unknown error' };
    }
  }

  // Test OpenAI API connection
  async testOpenAI(apiKey, model) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || this.defaultModels.openai,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello, this is a test message. Please respond with "API connection successful".' }
          ],
          max_tokens: 20
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'API connection successful' };
      } else {
        return { success: false, message: data.error?.message || 'API connection failed' };
      }
    } catch (error) {
      console.error('Error testing OpenAI API:', error);
      return { success: false, message: error.message || 'API connection failed' };
    }
  }

  // Test Anthropic API connection
  async testAnthropic(apiKey, model) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || this.defaultModels.anthropic,
          messages: [
            { role: 'user', content: 'Hello, this is a test message. Please respond with "API connection successful".' }
          ],
          max_tokens: 20
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        return { success: true, message: 'API connection successful' };
      } else {
        return { success: false, message: data.error?.message || 'API connection failed' };
      }
    } catch (error) {
      console.error('Error testing Anthropic API:', error);
      return { success: false, message: error.message || 'API connection failed' };
    }
  }

  // Generate article using selected AI provider
  async generateArticle(articleType, data) {
    await this.init();
    
    const settings = this.getSettings();
    const provider = settings.provider;
    
    if (provider === 'openai') {
      return await this.generateWithOpenAI(articleType, data);
    } else if (provider === 'anthropic') {
      return await this.generateWithAnthropic(articleType, data);
    } else {
      // Fallback to simulated generation for demo or when no API keys are set
      return this.simulateArticleGeneration(articleType, data);
    }
  }

  // Generate article with OpenAI
  async generateWithOpenAI(articleType, data) {
    try {
      const settings = this.getSettings();
      const apiKey = settings.openaiApiKey;
      const model = settings.openaiModel;
      
      if (!apiKey) {
        throw new Error('OpenAI API key not set');
      }
      
      const prompt = this.prompts[articleType];
      if (!prompt) {
        throw new Error(`No prompt template found for article type: ${articleType}`);
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user(data) }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error?.message || 'Error generating article with OpenAI');
      }
      
      const content = responseData.choices[0].message.content;
      
      // Extract title from content (assuming it's in an H1 tag or at the beginning)
      let title = data.productInfo.title + ' Review';
      const titleMatch = content.match(/<h1>(.*?)<\/h1>/i) || content.match(/^# (.*?)$/m);
      if (titleMatch) {
        title = titleMatch[1];
      }
      
      return {
        success: true,
        article: {
          title: title,
          content: content
        }
      };
    } catch (error) {
      console.error('Error generating article with OpenAI:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  // Generate article with Anthropic
  async generateWithAnthropic(articleType, data) {
    try {
      const settings = this.getSettings();
      const apiKey = settings.anthropicApiKey;
      const model = settings.anthropicModel;
      
      if (!apiKey) {
        throw new Error('Anthropic API key not set');
      }
      
      const prompt = this.prompts[articleType];
      if (!prompt) {
        throw new Error(`No prompt template found for article type: ${articleType}`);
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          system: prompt.system,
          messages: [
            { role: 'user', content: prompt.user(data) }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error?.message || 'Error generating article with Anthropic');
      }
      
      const content = responseData.content[0].text;
      
      // Extract title from content (assuming it's in an H1 tag or at the beginning)
      let title = data.productInfo.title + ' Review';
      const titleMatch = content.match(/<h1>(.*?)<\/h1>/i) || content.match(/^# (.*?)$/m);
      if (titleMatch) {
        title = titleMatch[1];
      }
      
      return {
        success: true,
        article: {
          title: title,
          content: content
        }
      };
    } catch (error) {
      console.error('Error generating article with Anthropic:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  // Simulate article generation for demo purposes or when no API keys are set
  simulateArticleGeneration(articleType, data) {
    console.log('Simulating article generation for type:', articleType);
    
    // Sample article templates based on type
    const articleTypes = {
      'product-review': this.generateProductReview,
      'comparison': this.generateComparison,
      'buying-guide': this.generateBuyingGuide,
      'how-to': this.generateHowTo,
      'top-10': this.generateTop10,
      'problem-solution': this.generateProblemSolution
    };
    
    const generator = articleTypes[articleType] || this.generateProductReview;
    const article = generator(data);
    
    return {
      success: true,
      article: article
    };
  }

  // Sample article generators (for demo or fallback)
  generateProductReview(data) {
    return {
      title: `${data.productInfo.title} Review: Is It Worth It in 2025?`,
      content: `<h1>${data.productInfo.title} Review: Is It Worth It in 2025?</h1>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <h2>Introduction</h2>
      
      <p>Are you considering purchasing the ${data.productInfo.title}? In this comprehensive review, we'll take a deep dive into this product's features, performance, and value to help you decide if it's the right choice for you.</p>
      
      <h2>Product Overview</h2>
      
      <p>The ${data.productInfo.title} is a ${data.productInfo.category} product that offers ${data.productInfo.features ? data.productInfo.features.join(', ') : 'various features'}. Priced at ${data.productInfo.price}, it positions itself in the ${data.productInfo.price > 100 ? 'premium' : 'affordable'} segment of the market.</p>
      
      <h2>Key Features</h2>
      
      <ul>
        <li>Feature 1: Description</li>
        <li>Feature 2: Description</li>
        <li>Feature 3: Description</li>
      </ul>
      
      <h2>Performance and Quality</h2>
      
      <p>Based on our testing and customer reviews, the ${data.productInfo.title} performs exceptionally well in [specific areas]. The build quality is [quality assessment], and durability appears to be [durability assessment].</p>
      
      <h2>Pros and Cons</h2>
      
      <h3>Pros</h3>
      <ul>
        <li>Pro 1</li>
        <li>Pro 2</li>
        <li>Pro 3</li>
      </ul>
      
      <h3>Cons</h3>
      <ul>
        <li>Con 1</li>
        <li>Con 2</li>
      </ul>
      
      <h2>Value for Money</h2>
      
      <p>At ${data.productInfo.price}, the ${data.productInfo.title} offers [value assessment] value for money compared to similar products in the market.</p>
      
      <h2>Conclusion</h2>
      
      <p>Overall, the ${data.productInfo.title} is a [overall assessment] product that [recommendation]. If you're looking for [specific use case], this product is definitely worth considering.</p>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Current Price on Amazon</a></p>`
    };
  }

  generateComparison(data) {
    return {
      title: `${data.productInfo.title} vs Competitors: Which Should You Buy in 2025?`,
      content: `<h1>${data.productInfo.title} vs Competitors: Which Should You Buy in 2025?</h1>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <h2>Introduction</h2>
      
      <p>Choosing the right ${data.productInfo.category} can be challenging with so many options available. In this comparison, we'll pit the ${data.productInfo.title} against its top competitors to help you make an informed decision.</p>
      
      <h2>Comparison Table</h2>
      
      <table>
        <tr>
          <th>Feature</th>
          <th>${data.productInfo.title}</th>
          <th>Competitor 1</th>
          <th>Competitor 2</th>
        </tr>
        <tr>
          <td>Price</td>
          <td>${data.productInfo.price}</td>
          <td>$XX.XX</td>
          <td>$XX.XX</td>
        </tr>
        <tr>
          <td>Feature 1</td>
          <td>✓</td>
          <td>✓</td>
          <td>✗</td>
        </tr>
        <tr>
          <td>Feature 2</td>
          <td>✓</td>
          <td>✗</td>
          <td>✓</td>
        </tr>
        <tr>
          <td>Feature 3</td>
          <td>✓</td>
          <td>✓</td>
          <td>✓</td>
        </tr>
        <tr>
          <td>Rating</td>
          <td>${data.productInfo.rating}/5</td>
          <td>X.X/5</td>
          <td>X.X/5</td>
        </tr>
      </table>
      
      <h2>Detailed Comparison</h2>
      
      <h3>${data.productInfo.title}</h3>
      
      <p>The ${data.productInfo.title} offers [unique selling points]. It excels in [specific areas] but falls short in [weaknesses].</p>
      
      <h3>Competitor 1</h3>
      
      <p>Competitor 1 stands out for its [strengths] but lacks [weaknesses] compared to the ${data.productInfo.title}.</p>
      
      <h3>Competitor 2</h3>
      
      <p>Competitor 2 provides [strengths] at a [price comparison] price point, making it [value assessment] compared to the ${data.productInfo.title}.</p>
      
      <h2>Which One Should You Choose?</h2>
      
      <ul>
        <li>Choose the <strong>${data.productInfo.title}</strong> if you prioritize [specific benefits].</li>
        <li>Choose <strong>Competitor 1</strong> if [specific use case or preference].</li>
        <li>Choose <strong>Competitor 2</strong> if [specific use case or preference].</li>
      </ul>
      
      <h2>Conclusion</h2>
      
      <p>After thorough comparison, the ${data.productInfo.title} [overall assessment]. It offers the best value for [specific users] and excels in [key areas].</p>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Current Price on Amazon</a></p>`
    };
  }

  generateBuyingGuide(data) {
    // Implementation similar to other generators
    return {
      title: `Best ${data.productInfo.category} in 2025: Ultimate Buying Guide`,
      content: `<h1>Best ${data.productInfo.category} in 2025: Ultimate Buying Guide</h1>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <h2>Introduction</h2>
      
      <p>Looking for the perfect ${data.productInfo.category}? This comprehensive buying guide will walk you through everything you need to know before making a purchase, including key features to look for, top recommendations, and common pitfalls to avoid.</p>
      
      <h2>What to Look for in a ${data.productInfo.category}</h2>
      
      <h3>Key Features</h3>
      
      <ul>
        <li>Feature 1: Why it matters and what to look for</li>
        <li>Feature 2: Why it matters and what to look for</li>
        <li>Feature 3: Why it matters and what to look for</li>
      </ul>
      
      <h3>Price Range</h3>
      
      <ul>
        <li>Budget options ($XX-$XX): What to expect</li>
        <li>Mid-range options ($XX-$XX): What to expect</li>
        <li>Premium options ($XX+): What to expect</li>
      </ul>
      
      <h2>Top Recommendations</h2>
      
      <h3>Best Overall: ${data.productInfo.title}</h3>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <p>The ${data.productInfo.title} earns our top recommendation for its [key strengths]. Priced at ${data.productInfo.price}, it offers exceptional value with features like ${data.productInfo.features ? data.productInfo.features.join(', ') : 'various features'}.</p>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Price on Amazon</a></p>
      
      <h3>Best Budget Option: [Budget Product]</h3>
      
      <p>For those on a tighter budget, [Budget Product] offers [key benefits] at a more affordable price point.</p>
      
      <h3>Best Premium Option: [Premium Product]</h3>
      
      <p>If budget isn't a concern, [Premium Product] provides the ultimate experience with [premium features].</p>
      
      <h2>Common Mistakes to Avoid</h2>
      
      <ul>
        <li>Mistake 1: Explanation and how to avoid it</li>
        <li>Mistake 2: Explanation and how to avoid it</li>
        <li>Mistake 3: Explanation and how to avoid it</li>
      </ul>
      
      <h2>Conclusion</h2>
      
      <p>When shopping for a ${data.productInfo.category}, prioritize [most important factors] based on your specific needs. Our top recommendation, the ${data.productInfo.title}, offers the best balance of features, quality, and value for most users.</p>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Current Price on Amazon</a></p>`
    };
  }

  generateHowTo(data) {
    // Implementation similar to other generators
    return {
      title: `How to Use ${data.productInfo.title}: Complete Guide & Tips`,
      content: `<h1>How to Use ${data.productInfo.title}: Complete Guide & Tips</h1>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <h2>Introduction</h2>
      
      <p>The ${data.productInfo.title} is a versatile ${data.productInfo.category} that can [primary function]. This comprehensive guide will walk you through setup, basic and advanced usage, troubleshooting, and maintenance to help you get the most out of your purchase.</p>
      
      <h2>What You'll Need</h2>
      
      <ul>
        <li>${data.productInfo.title} <a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Price on Amazon</a></li>
        <li>Item 2 (optional)</li>
        <li>Item 3 (optional)</li>
      </ul>
      
      <h2>Setup and Installation</h2>
      
      <ol>
        <li>Step 1: Description</li>
        <li>Step 2: Description</li>
        <li>Step 3: Description</li>
      </ol>
      
      <h2>Basic Usage</h2>
      
      <h3>Function 1</h3>
      
      <ol>
        <li>Step 1: Description</li>
        <li>Step 2: Description</li>
      </ol>
      
      <h3>Function 2</h3>
      
      <ol>
        <li>Step 1: Description</li>
        <li>Step 2: Description</li>
      </ol>
      
      <h2>Advanced Techniques</h2>
      
      <h3>Technique 1</h3>
      
      <p>Detailed explanation of advanced technique 1.</p>
      
      <h3>Technique 2</h3>
      
      <p>Detailed explanation of advanced technique 2.</p>
      
      <h2>Troubleshooting Common Issues</h2>
      
      <h3>Issue 1</h3>
      
      <ul>
        <li>Cause: Explanation</li>
        <li>Solution: Steps to resolve</li>
      </ul>
      
      <h3>Issue 2</h3>
      
      <ul>
        <li>Cause: Explanation</li>
        <li>Solution: Steps to resolve</li>
      </ul>
      
      <h2>Maintenance and Care</h2>
      
      <p>To keep your ${data.productInfo.title} in optimal condition, follow these maintenance tips:</p>
      
      <ul>
        <li>Tip 1: Description</li>
        <li>Tip 2: Description</li>
        <li>Tip 3: Description</li>
      </ul>
      
      <h2>Conclusion</h2>
      
      <p>With this guide, you're now equipped to make the most of your ${data.productInfo.title}. Whether you're a beginner or looking to master advanced techniques, following these instructions will help you achieve the best results.</p>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Current Price on Amazon</a></p>`
    };
  }

  generateTop10(data) {
    // Implementation similar to other generators
    return {
      title: `Top 10 Best ${data.productInfo.category} in 2025`,
      content: `<h1>Top 10 Best ${data.productInfo.category} in 2025</h1>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <h2>Introduction</h2>
      
      <p>Looking for the best ${data.productInfo.category} in 2025? We've researched and tested dozens of options to bring you this definitive list of the top 10 products available today.</p>
      
      <h2>Our Top Picks at a Glance</h2>
      
      <ol>
        <li><strong>Best Overall:</strong> ${data.productInfo.title}</li>
        <li><strong>Best Budget:</strong> [Budget Product]</li>
        <li><strong>Best Premium:</strong> [Premium Product]</li>
        <li><strong>Best for Beginners:</strong> [Beginner Product]</li>
        <li><strong>Best for Professionals:</strong> [Professional Product]</li>
        <li><strong>Most Versatile:</strong> [Versatile Product]</li>
        <li><strong>Best Compact:</strong> [Compact Product]</li>
        <li><strong>Best Value:</strong> [Value Product]</li>
        <li><strong>Most Innovative:</strong> [Innovative Product]</li>
        <li><strong>Editor's Choice:</strong> [Editor's Choice Product]</li>
      </ol>
      
      <h2>1. Best Overall: ${data.productInfo.title}</h2>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <p><strong>Price:</strong> ${data.productInfo.price}</p>
      
      <p><strong>Why we love it:</strong> The ${data.productInfo.title} earns our top spot for its exceptional [key strengths]. With features like ${data.productInfo.features ? data.productInfo.features.join(', ') : 'various features'}, it outperforms competitors in [key areas].</p>
      
      <p><strong>Pros:</strong></p>
      <ul>
        <li>Pro 1</li>
        <li>Pro 2</li>
        <li>Pro 3</li>
      </ul>
      
      <p><strong>Cons:</strong></p>
      <ul>
        <li>Con 1</li>
        <li>Con 2</li>
      </ul>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Price on Amazon</a></p>
      
      <h2>2. Best Budget: [Budget Product]</h2>
      
      <p>[Content for budget product]</p>
      
      <h2>3. Best Premium: [Premium Product]</h2>
      
      <p>[Content for premium product]</p>
      
      <p>[Content for remaining products...]</p>
      
      <h2>Buying Guide: How to Choose the Right ${data.productInfo.category}</h2>
      
      <p>When shopping for a ${data.productInfo.category}, consider these key factors:</p>
      
      <ul>
        <li>Factor 1: Explanation</li>
        <li>Factor 2: Explanation</li>
        <li>Factor 3: Explanation</li>
      </ul>
      
      <h2>Conclusion</h2>
      
      <p>After extensive testing and research, the ${data.productInfo.title} stands out as our top recommendation for most users. However, depending on your specific needs and budget, any of the options on our list would be an excellent choice.</p>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Current Price on Amazon</a></p>`
    };
  }

  generateProblemSolution(data) {
    // Implementation similar to other generators
    return {
      title: `How to Solve [Common Problem] with ${data.productInfo.title}`,
      content: `<h1>How to Solve [Common Problem] with ${data.productInfo.title}</h1>
      
      <img src="${data.productInfo.image}" alt="${data.productInfo.title}">
      
      <h2>Introduction</h2>
      
      <p>[Common Problem] affects many people, causing [negative effects]. Fortunately, the ${data.productInfo.title} offers an effective solution that can [benefits]. In this article, we'll explore how this product can help you overcome this challenge.</p>
      
      <h2>Understanding the Problem</h2>
      
      <h3>What Causes [Common Problem]?</h3>
      
      <p>[Common Problem] typically occurs due to [causes]. This can lead to [consequences] if left unaddressed.</p>
      
      <h3>Common Symptoms</h3>
      
      <ul>
        <li>Symptom 1: Description</li>
        <li>Symptom 2: Description</li>
        <li>Symptom 3: Description</li>
      </ul>
      
      <h2>How ${data.productInfo.title} Solves the Problem</h2>
      
      <p>The ${data.productInfo.title} addresses [Common Problem] through its [key features/mechanisms]. Here's how it works:</p>
      
      <ol>
        <li>Function 1: Explanation</li>
        <li>Function 2: Explanation</li>
        <li>Function 3: Explanation</li>
      </ol>
      
      <h2>Step-by-Step Solution</h2>
      
      <ol>
        <li>Step 1: Description</li>
        <li>Step 2: Description</li>
        <li>Step 3: Description</li>
        <li>Step 4: Description</li>
      </ol>
      
      <h2>Real-World Results</h2>
      
      <p>Users of the ${data.productInfo.title} report [positive outcomes] after implementing this solution. According to customer reviews, [specific benefits] are commonly experienced.</p>
      
      <h2>Alternative Solutions</h2>
      
      <p>While the ${data.productInfo.title} is our recommended solution, there are alternatives:</p>
      
      <ul>
        <li>Alternative 1: Pros and cons</li>
        <li>Alternative 2: Pros and cons</li>
        <li>Alternative 3: Pros and cons</li>
      </ul>
      
      <h2>Prevention Tips</h2>
      
      <p>To prevent [Common Problem] from recurring, consider these additional tips:</p>
      
      <ul>
        <li>Tip 1: Description</li>
        <li>Tip 2: Description</li>
        <li>Tip 3: Description</li>
      </ul>
      
      <h2>Conclusion</h2>
      
      <p>The ${data.productInfo.title} offers an effective solution for [Common Problem]. By following the steps outlined in this guide, you can [desired outcome] and enjoy [benefits].</p>
      
      <p><a href="https://amazon.com/${data.productInfo.asin}?tag=${data.associateId}">Check Current Price on Amazon</a></p>`
    };
  }
}

// Export the service
if (typeof module !== 'undefined') {
  module.exports = AIService;
}
