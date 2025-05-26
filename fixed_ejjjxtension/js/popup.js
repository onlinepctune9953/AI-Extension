// AI Affiliate Pro - Popup Script

document.addEventListener('DOMContentLoaded', function() {
    // Initialize popup
    initializePopup();
    
    // Check current tab for Amazon product page
    checkCurrentPage();
    
    // Set up event listeners
    setupEventListeners();
});

// Function to initialize popup with saved settings
function initializePopup() {
    // Get saved settings
    chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        
        // Set Associate ID if saved
        if (settings.amazonAssociateId) {
            document.getElementById('associate-id').value = settings.amazonAssociateId;
        }
        
        // Set theme toggle based on saved theme
        const themeToggle = document.getElementById('theme-toggle');
        if (settings.theme === 'dark') {
            themeToggle.checked = true;
            document.body.setAttribute('data-theme', 'dark');
        } else {
            themeToggle.checked = false;
            document.body.setAttribute('data-theme', 'light');
        }
        
        // Populate WordPress sites if available
        if (settings.wordpressSites && settings.wordpressSites.length > 0) {
            populateWordPressSites(settings.wordpressSites);
        }
        
        // Set default values in settings panel
        if (settings.defaultArticleTone) {
            document.getElementById('default-tone').value = settings.defaultArticleTone;
        }
        
        if (settings.defaultWordCount) {
            document.getElementById('default-word-count').value = settings.defaultWordCount;
        }
        
        if (settings.defaultArticleType) {
            document.getElementById('default-article-type').value = settings.defaultArticleType;
        }
        
        if (settings.defaultPublishingOption) {
            document.getElementById('default-publishing').value = settings.defaultPublishingOption;
        }
        
        if (settings.defaultDownloadFormat) {
            document.getElementById('default-download-format').value = settings.defaultDownloadFormat;
        }
        
        // Set checkboxes
        if (settings.autoExtract !== undefined) {
            document.getElementById('auto-extract').checked = settings.autoExtract;
        }
        
        if (settings.showWidget !== undefined) {
            document.getElementById('show-widget').checked = settings.showWidget;
        }
    });
}

// Function to check if current tab is an Amazon product page
function checkCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const url = tabs[0].url;
            const isAmazon = url.includes('amazon.com') || 
                            url.includes('amazon.co.uk') || 
                            url.includes('amazon.ca') ||
                            url.includes('amazon.com.au') ||
                            url.includes('amazon.de') ||
                            url.includes('amazon.fr') ||
                            url.includes('amazon.it') ||
                            url.includes('amazon.es') ||
                            url.includes('amazon.co.jp') ||
                            url.includes('amazon.in');
            
            const statusIcon = document.getElementById('status-icon');
            const statusText = document.getElementById('status-text');
            const startWizardButton = document.getElementById('start-wizard-button');
            const extractDataButton = document.getElementById('extract-data-button');
            
            if (isAmazon) {
                // Check if it's a product page by sending a message to content script
                chrome.tabs.sendMessage(tabs[0].id, { action: 'checkProductPage' }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Content script not loaded, likely not a product page
                        statusIcon.textContent = '❌';
                        statusText.textContent = 'Not on an Amazon product page';
                        startWizardButton.disabled = true;
                        extractDataButton.disabled = true;
                    } else if (response && response.isProductPage) {
                        // It's a product page
                        statusIcon.textContent = '✅';
                        statusText.textContent = 'Amazon product page detected';
                        startWizardButton.disabled = false;
                        extractDataButton.disabled = false;
                    } else {
                        // Not a product page
                        statusIcon.textContent = '❌';
                        statusText.textContent = 'Not on an Amazon product page';
                        startWizardButton.disabled = true;
                        extractDataButton.disabled = true;
                    }
                });
            } else {
                // Not an Amazon site
                statusIcon.textContent = '❌';
                statusText.textContent = 'Not on an Amazon website';
                startWizardButton.disabled = true;
                extractDataButton.disabled = true;
            }
        }
    });
}

// Function to set up event listeners
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', function() {
        const theme = this.checked ? 'dark' : 'light';
        document.body.setAttribute('data-theme', theme);
        
        // Save theme preference
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || {};
            settings.theme = theme;
            chrome.storage.sync.set({ settings });
        });
    });
    
    // Associate ID input
    const associateIdInput = document.getElementById('associate-id');
    associateIdInput.addEventListener('blur', function() {
        // Save Associate ID
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || {};
            settings.amazonAssociateId = this.value;
            chrome.storage.sync.set({ settings });
        });
    });
    
    // Start Article Wizard button
    const startWizardButton = document.getElementById('start-wizard-button');
    startWizardButton.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'startArticleWizard' });
                window.close(); // Close popup
            }
        });
    });
    
    // Extract Product Data button
    const extractDataButton = document.getElementById('extract-data-button');
    extractDataButton.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Show loading state
                const statusText = document.getElementById('status-text');
                const statusIcon = document.getElementById('status-icon');
                statusText.textContent = 'Extracting product data...';
                
                // Show product data section with loading state
                const productDataSection = document.getElementById('product-data-section');
                const productDataContent = document.getElementById('product-data-content');
                productDataContent.innerHTML = '<div class="product-data-loading">Extracting product data...</div>';
                productDataSection.style.display = 'block';
                
                chrome.tabs.sendMessage(tabs[0].id, { action: 'extractProductData' }, (response) => {
                    if (response && response.success) {
                        // Add to recent activity
                        const productTitle = response.data && response.data.core ? response.data.core.title : 'Product';
                        addActivity(`Extracted data for "${productTitle}"`);
                        
                        // Show success message
                        statusIcon.textContent = '✅';
                        statusText.textContent = 'Product data extracted successfully!';
                        
                        // Display the extracted data in the product data section
                        displayProductData(response.data);
                    } else {
                        // Show error message
                        statusIcon.textContent = '❌';
                        statusText.textContent = 'Failed to extract product data';
                        
                        // Display error in product data section
                        productDataContent.innerHTML = '<div class="product-data-error">Failed to extract product data. Please try again.</div>';
                        
                        setTimeout(() => {
                            statusIcon.textContent = '✅';
                            statusText.textContent = 'Amazon product page detected';
                        }, 3000);
                    }
                });
            }
        });
    });
    
    // Close Product Data button
    const closeProductDataButton = document.getElementById('close-product-data-button');
    closeProductDataButton.addEventListener('click', function() {
        document.getElementById('product-data-section').style.display = 'none';
    });
    
    // Function to display product data in a readable format
    function displayProductData(data) {
        const productDataContent = document.getElementById('product-data-content');
        
        if (!data) {
            productDataContent.innerHTML = '<div class="product-data-error">No data available</div>';
            return;
        }
        
        // Clear previous content
        productDataContent.innerHTML = '';
        
        // Create a recursive function to render nested objects and arrays
        function renderData(data, container) {
            if (typeof data === 'object' && data !== null) {
                if (Array.isArray(data)) {
                    // Handle arrays
                    const arrayContainer = document.createElement('div');
                    arrayContainer.className = 'product-data-array';
                    
                    if (data.length === 0) {
                        const emptyItem = document.createElement('div');
                        emptyItem.className = 'product-data-value';
                        emptyItem.textContent = '(empty array)';
                        arrayContainer.appendChild(emptyItem);
                    } else {
                        data.forEach((item, index) => {
                            const arrayItem = document.createElement('div');
                            arrayItem.className = 'product-data-array-item';
                            
                            const itemHeader = document.createElement('div');
                            itemHeader.className = 'product-data-key';
                            itemHeader.textContent = `[${index}]`;
                            arrayItem.appendChild(itemHeader);
                            
                            renderData(item, arrayItem);
                            arrayContainer.appendChild(arrayItem);
                        });
                    }
                    
                    container.appendChild(arrayContainer);
                } else {
                    // Handle objects
                    const objectContainer = document.createElement('div');
                    objectContainer.className = 'product-data-object';
                    
                    const keys = Object.keys(data);
                    if (keys.length === 0) {
                        const emptyItem = document.createElement('div');
                        emptyItem.className = 'product-data-value';
                        emptyItem.textContent = '(empty object)';
                        objectContainer.appendChild(emptyItem);
                    } else {
                        keys.forEach(key => {
                            const item = document.createElement('div');
                            item.className = 'product-data-item';
                            
                            const keyElement = document.createElement('div');
                            keyElement.className = 'product-data-key';
                            
                            // Make objects collapsible
                            if (typeof data[key] === 'object' && data[key] !== null) {
                                const collapsibleHeader = document.createElement('div');
                                collapsibleHeader.className = 'collapsible-header';
                                
                                const icon = document.createElement('span');
                                icon.className = 'collapsible-icon';
                                icon.textContent = '▶';
                                collapsibleHeader.appendChild(icon);
                                
                                const keyText = document.createElement('span');
                                keyText.textContent = key + ': ' + (Array.isArray(data[key]) ? 
                                    `Array(${data[key].length})` : 
                                    `Object(${Object.keys(data[key]).length})`);
                                collapsibleHeader.appendChild(keyText);
                                
                                keyElement.appendChild(collapsibleHeader);
                                
                                const valueElement = document.createElement('div');
                                valueElement.className = 'collapsible-content';
                                
                                // Toggle collapse on click
                                collapsibleHeader.addEventListener('click', function() {
                                    icon.classList.toggle('expanded');
                                    valueElement.classList.toggle('expanded');
                                    icon.textContent = valueElement.classList.contains('expanded') ? '▼' : '▶';
                                });
                                
                                renderData(data[key], valueElement);
                                item.appendChild(keyElement);
                                item.appendChild(valueElement);
                            } else {
                                // Simple key-value for primitives
                                keyElement.textContent = key + ':';
                                
                                const valueElement = document.createElement('div');
                                valueElement.className = 'product-data-value';
                                
                                if (data[key] === null) {
                                    valueElement.textContent = 'null';
                                } else if (data[key] === undefined) {
                                    valueElement.textContent = 'undefined';
                                } else if (typeof data[key] === 'string') {
                                    // Handle image URLs specially
                                    if (key.includes('image') || key.includes('url') || key.includes('src')) {
                                        try {
                                            const url = new URL(data[key]);
                                            if (url.protocol === 'http:' || url.protocol === 'https:') {
                                                const link = document.createElement('a');
                                                link.href = data[key];
                                                link.textContent = data[key];
                                                link.target = '_blank';
                                                valueElement.appendChild(link);
                                            } else {
                                                valueElement.textContent = data[key];
                                            }
                                        } catch (e) {
                                            valueElement.textContent = data[key];
                                        }
                                    } else {
                                        valueElement.textContent = data[key];
                                    }
                                } else {
                                    valueElement.textContent = data[key];
                                }
                                
                                item.appendChild(keyElement);
                                item.appendChild(valueElement);
                            }
                            
                            objectContainer.appendChild(item);
                        });
                    }
                    
                    container.appendChild(objectContainer);
                }
            } else {
                // Handle primitive values
                const valueElement = document.createElement('div');
                valueElement.className = 'product-data-value';
                
                if (data === null) {
                    valueElement.textContent = 'null';
                } else if (data === undefined) {
                    valueElement.textContent = 'undefined';
                } else {
                    valueElement.textContent = data.toString();
                }
                
                container.appendChild(valueElement);
            }
        }
        
        // Start rendering the data
        renderData(data, productDataContent);
    }
    
    // Settings button
    const settingsButton = document.getElementById('settings-button');
    settingsButton.addEventListener('click', function() {
        document.getElementById('settings-panel').classList.add('active');
    });
    
    // Close Settings button
    const closeSettingsButton = document.getElementById('close-settings-button');
    closeSettingsButton.addEventListener('click', function() {
        document.getElementById('settings-panel').classList.remove('active');
    });
    
    // Help button
    const helpButton = document.getElementById('help-button');
    helpButton.addEventListener('click', function() {
        document.getElementById('help-panel').classList.add('active');
    });
    
    // Close Help button
    const closeHelpButton = document.getElementById('close-help-button');
    closeHelpButton.addEventListener('click', function() {
        document.getElementById('help-panel').classList.remove('active');
    });
    
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // Remove active class from all tab buttons and content
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab button and corresponding content
            this.classList.add('active');
            document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add('active');
        });
    });
    
    // Add WordPress Site button
    const addSiteButton = document.getElementById('add-site-button');
    addSiteButton.addEventListener('click', function() {
        document.getElementById('add-site-form').style.display = 'block';
        document.getElementById('wordpress-sites-list').style.display = 'none';
        this.style.display = 'none';
    });
    
    // Cancel Add Site button
    const cancelAddSiteButton = document.getElementById('cancel-add-site-button');
    cancelAddSiteButton.addEventListener('click', function() {
        document.getElementById('add-site-form').style.display = 'none';
        document.getElementById('wordpress-sites-list').style.display = 'block';
        document.getElementById('add-site-button').style.display = 'block';
        
        // Clear form fields
        document.getElementById('site-name').value = '';
        document.getElementById('site-url').value = '';
        document.getElementById('site-username').value = '';
        document.getElementById('site-password').value = '';
    });
    
    // Test Connection button
    const testConnectionButton = document.getElementById('test-connection-button');
    testConnectionButton.addEventListener('click', function() {
        const siteName = document.getElementById('site-name').value;
        const siteUrl = document.getElementById('site-url').value;
        const username = document.getElementById('site-username').value;
        const password = document.getElementById('site-password').value;
        
        if (!siteName || !siteUrl || !username || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // Show loading state
        this.textContent = 'Testing...';
        this.disabled = true;
        
        // Send message to background script to test connection
        chrome.runtime.sendMessage({
            action: 'testWordPressConnection',
            site: {
                name: siteName,
                url: siteUrl,
                username: username,
                password: password
            }
        }, (response) => {
            // Reset button
            this.textContent = 'Test Connection';
            this.disabled = false;
            
            if (response && response.success) {
                alert('Connection successful!');
            } else {
                alert('Connection failed. Please check your credentials and try again.');
            }
        });
    });
    
    // Save Site button
    const saveSiteButton = document.getElementById('save-site-button');
    saveSiteButton.addEventListener('click', function() {
        const siteName = document.getElementById('site-name').value;
        const siteUrl = document.getElementById('site-url').value;
        const username = document.getElementById('site-username').value;
        const password = document.getElementById('site-password').value;
        
        if (!siteName || !siteUrl || !username || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // Show loading state
        this.textContent = 'Saving...';
        this.disabled = true;
        
        // Send message to background script to add site
        chrome.runtime.sendMessage({
            action: 'addWordPressSite',
            site: {
                name: siteName,
                url: siteUrl,
                username: username,
                password: password
            }
        }, (response) => {
            // Reset button
            this.textContent = 'Save Site';
            this.disabled = false;
            
            if (response && response.success) {
                // Update sites list
                populateWordPressSites(response.sites);
                
                // Hide form and show list
                document.getElementById('add-site-form').style.display = 'none';
                document.getElementById('wordpress-sites-list').style.display = 'block';
                document.getElementById('add-site-button').style.display = 'block';
                
                // Clear form fields
                document.getElementById('site-name').value = '';
                document.getElementById('site-url').value = '';
                document.getElementById('site-username').value = '';
                document.getElementById('site-password').value = '';
                
                // Add to recent activity
                addActivity(`Added WordPress site: ${siteName}`);
            } else {
                alert('Failed to save site. Please try again.');
            }
        });
    });
    
    // Save Settings button
    const saveSettingsButton = document.getElementById('save-settings-button');
    saveSettingsButton.addEventListener('click', function() {
        // Collect all settings
        const settings = {
            amazonAssociateId: document.getElementById('associate-id').value,
            theme: document.getElementById('theme-toggle').checked ? 'dark' : 'light',
            defaultArticleType: document.getElementById('default-article-type').value,
            defaultWordCount: document.getElementById('default-word-count').value,
            defaultArticleTone: document.getElementById('default-tone').value,
            defaultPublishingOption: document.getElementById('default-publishing').value,
            defaultDownloadFormat: document.getElementById('default-download-format').value,
            autoExtract: document.getElementById('auto-extract').checked,
            showWidget: document.getElementById('show-widget').checked
        };
        
        // Get existing settings to preserve WordPress sites
        chrome.storage.sync.get(['settings'], (result) => {
            const existingSettings = result.settings || {};
            
            // Preserve WordPress sites
            settings.wordpressSites = existingSettings.wordpressSites || [];
            
            // Save settings
            chrome.storage.sync.set({ settings }, () => {
                // Show success message
                const settingsPanel = document.getElementById('settings-panel');
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = 'Settings saved successfully!';
                successMessage.style.backgroundColor = 'var(--success-color)';
                successMessage.style.color = 'white';
                successMessage.style.padding = '8px 12px';
                successMessage.style.borderRadius = '4px';
                successMessage.style.marginBottom = '16px';
                successMessage.style.textAlign = 'center';
                
                settingsPanel.querySelector('.panel-content').prepend(successMessage);
                
                // Remove message after 3 seconds
                setTimeout(() => {
                    successMessage.remove();
                }, 3000);
                
                // Add to recent activity
                addActivity('Settings updated');
            });
        });
    });
}

// Function to populate WordPress sites list
function populateWordPressSites(sites) {
    const sitesList = document.getElementById('wordpress-sites-list');
    
    if (sites.length === 0) {
        sitesList.innerHTML = '<div class="site-empty">No WordPress sites added</div>';
        return;
    }
    
    let sitesHtml = '';
    
    sites.forEach((site, index) => {
        sitesHtml += `
            <div class="site-item">
                <div class="site-info">
                    <div class="site-name">${site.name}</div>
                    <div class="site-url">${site.url}</div>
                </div>
                <div class="site-actions">
                    <button class="site-action-button" data-action="edit" data-index="${index}">✏️</button>
                    <button class="site-action-button" data-action="delete" data-index="${index}">🗑️</button>
                </div>
            </div>
        `;
    });
    
    sitesList.innerHTML = sitesHtml;
    
    // Add event listeners for edit and delete buttons
    const actionButtons = sitesList.querySelectorAll('.site-action-button');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const index = parseInt(this.getAttribute('data-index'));
            
            if (action === 'edit') {
                editWordPressSite(index);
            } else if (action === 'delete') {
                deleteWordPressSite(index);
            }
        });
    });
}

// Function to edit WordPress site
function editWordPressSite(index) {
    chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        const sites = settings.wordpressSites || [];
        
        if (index >= 0 && index < sites.length) {
            const site = sites[index];
            
            // Populate form fields
            document.getElementById('site-name').value = site.name;
            document.getElementById('site-url').value = site.url;
            document.getElementById('site-username').value = site.username;
            document.getElementById('site-password').value = site.password;
            
            // Show form and hide list
            document.getElementById('add-site-form').style.display = 'block';
            document.getElementById('wordpress-sites-list').style.display = 'none';
            document.getElementById('add-site-button').style.display = 'none';
            
            // Update save button to handle edit
            const saveSiteButton = document.getElementById('save-site-button');
            saveSiteButton.textContent = 'Update Site';
            
            // Store index for update
            saveSiteButton.setAttribute('data-edit-index', index);
            
            // Update event listener for save button
            saveSiteButton.onclick = function() {
                const siteName = document.getElementById('site-name').value;
                const siteUrl = document.getElementById('site-url').value;
                const username = document.getElementById('site-username').value;
                const password = document.getElementById('site-password').value;
                
                if (!siteName || !siteUrl || !username || !password) {
                    alert('Please fill in all fields');
                    return;
                }
                
                // Update site in settings
                chrome.storage.sync.get(['settings'], (result) => {
                    const settings = result.settings || {};
                    const sites = settings.wordpressSites || [];
                    
                    sites[index] = {
                        name: siteName,
                        url: siteUrl,
                        username: username,
                        password: password
                    };
                    
                    settings.wordpressSites = sites;
                    
                    chrome.storage.sync.set({ settings }, () => {
                        // Update sites list
                        populateWordPressSites(sites);
                        
                        // Hide form and show list
                        document.getElementById('add-site-form').style.display = 'none';
                        document.getElementById('wordpress-sites-list').style.display = 'block';
                        document.getElementById('add-site-button').style.display = 'block';
                        
                        // Clear form fields
                        document.getElementById('site-name').value = '';
                        document.getElementById('site-url').value = '';
                        document.getElementById('site-username').value = '';
                        document.getElementById('site-password').value = '';
                        
                        // Reset save button
                        saveSiteButton.textContent = 'Save Site';
                        saveSiteButton.removeAttribute('data-edit-index');
                        
                        // Restore original event listener
                        setupEventListeners();
                        
                        // Add to recent activity
                        addActivity(`Updated WordPress site: ${siteName}`);
                    });
                });
            };
        }
    });
}

// Function to delete WordPress site
function deleteWordPressSite(index) {
    if (confirm('Are you sure you want to delete this WordPress site?')) {
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || {};
            const sites = settings.wordpressSites || [];
            
            if (index >= 0 && index < sites.length) {
                const siteName = sites[index].name;
                
                // Remove site from array
                sites.splice(index, 1);
                
                // Update settings
                settings.wordpressSites = sites;
                chrome.storage.sync.set({ settings }, () => {
                    // Update sites list
                    populateWordPressSites(sites);
                    
                    // Add to recent activity
                    addActivity(`Removed WordPress site: ${siteName}`);
                });
            }
        });
    }
}

// Function to add activity to recent activity list
function addActivity(text) {
    const activityList = document.getElementById('activity-list');
    
    // Remove empty message if present
    const emptyMessage = activityList.querySelector('.activity-empty');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    // Create new activity item
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    // Add timestamp and text
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    activityItem.textContent = `${timeString} - ${text}`;
    
    // Add to list
    activityList.prepend(activityItem);
    
    // Limit to 5 items
    const items = activityList.querySelectorAll('.activity-item');
    if (items.length > 5) {
        items[items.length - 1].remove();
    }
    
    // Save to storage
    chrome.storage.local.get(['recentActivity'], (result) => {
        let activities = result.recentActivity || [];
        
        // Add new activity
        activities.unshift({
            text: text,
            timestamp: now.getTime()
        });
        
        // Limit to 10 items
        if (activities.length > 10) {
            activities = activities.slice(0, 10);
        }
        
        // Save
        chrome.storage.local.set({ recentActivity: activities });
    });
}
