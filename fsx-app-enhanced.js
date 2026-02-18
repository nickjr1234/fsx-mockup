// Enhanced TLM State Management
let tlmState = {
    assigned: false,
    connectionStatus: 'grey', // grey, green, red
    provider: null,
    deviceId: null,
    tankType: null,
    strappingTable: null,
    strappingTableName: null,
    correctionFactor: 0,
    lastCommunication: null,
    lastReading: null,
    lastReadingTime: null,
    conversionModel: null, // linear or cubic
    coefficients: null,
    isOffline: false,
    localCache: []
};

// Available providers from AMP
const providers = [
    { value: 'tekelek', name: 'Tekelek', requiresFields: true, hasBarcode: true },
    { value: 'tekelek-api', name: 'Tekelek API', requiresFields: true, hasBarcode: true },
    { value: 'chevron-multitech', name: 'Chevron MultiTech', requiresFields: true, hasBarcode: true },
    { value: 'wellaware', name: 'Wellaware', requiresFields: false, hasBarcode: false },
    { value: 'other', name: 'Other', requiresFields: false, hasBarcode: false }
];

// Mock device database for typeahead
const mockDevices = {
    'tekelek': [
        'TLM-TEK-001', 'TLM-TEK-002', 'TLM-TEK-003', 'TLM-TEK-004', 'TLM-TEK-005'
    ],
    'tekelek-api': [
        'TLM-API-001', 'TLM-API-002', 'TLM-API-003', 'TLM-API-004', 'TLM-API-005'
    ],
    'chevron-multitech': [
        'CHV-MT-001', 'CHV-MT-002', 'CHV-MT-003', 'CHV-MT-004', 'CHV-MT-005'
    ],
    'wellaware': [
        'WA-001', 'WA-002', 'WA-003', 'WA-004', 'WA-005'
    ],
    'other': []
};

// Strapping tables storage
let strappingTables = [
    { value: 'default-vertical', name: 'Default Vertical Table', tankType: 'vertical', data: null },
    { value: 'default-horizontal', name: 'Default Horizontal Table', tankType: 'horizontal', data: null }
];

// Current operation mode
let currentMode = 'view'; // view, add, edit

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updateTLMIcon();
    checkConnectionStatus();
    
    // Simulate periodic connection checks
    setInterval(checkConnectionStatus, 30000); // Check every 30 seconds
});

// Update TLM icon based on state
function updateTLMIcon() {
    const icon = document.getElementById('tlmIcon');
    
    if (!tlmState.assigned) {
        icon.className = 'tlm-icon grey';
    } else {
        // Determine status based on last communication
        if (tlmState.lastCommunication) {
            const lastComm = new Date(tlmState.lastCommunication);
            const now = new Date();
            const daysDiff = (now - lastComm) / (1000 * 60 * 60 * 24);
            
            console.log('Device:', tlmState.deviceId, 'Days diff:', daysDiff, 'Last comm:', tlmState.lastCommunication);
            
            if (daysDiff < 2) {
                icon.className = 'tlm-icon green';
                tlmState.connectionStatus = 'green';
            } else {
                icon.className = 'tlm-icon red';
                tlmState.connectionStatus = 'red';
            }
        } else {
            icon.className = 'tlm-icon grey';
            tlmState.connectionStatus = 'grey';
        }
    }
}

// Check connection status (simulate network check)
function checkConnectionStatus() {
    // Simulate network check
    tlmState.isOffline = Math.random() > 0.95; // 5% chance of being offline
    
    if (tlmState.assigned && !tlmState.isOffline) {
        // Simulate getting last communication time
        if (Math.random() > 0.3) { // 70% chance of recent communication
            tlmState.lastCommunication = new Date();
            tlmState.lastReading = (180 + Math.random() * 20).toFixed(2) + ' GAL';
            tlmState.lastReadingTime = new Date().toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute:'2-digit'
            });
        }
    }
    
    updateTLMIcon();
}

// Open TLM Panel
function openTLMPanel() {
    document.getElementById('tlmPanelOverlay').classList.add('active');
    document.getElementById('tlmPanel').classList.add('active');
    renderTLMPanelContent();
}

// Close TLM Panel
function closeTLMPanel() {
    document.getElementById('tlmPanelOverlay').classList.remove('active');
    document.getElementById('tlmPanel').classList.remove('active');
    currentMode = 'view';
}

// Render TLM Panel Content based on state
function renderTLMPanelContent() {
    const content = document.getElementById('tlmPanelContent');
    
    console.log('Current mode:', currentMode, 'TLM assigned:', tlmState.assigned);
    
    if (currentMode === 'view') {
        content.innerHTML = renderOverviewContent();
    } else if (currentMode === 'add') {
        content.innerHTML = renderAddEditContent(false);
        setupEventListeners();
    } else if (currentMode === 'edit') {
        content.innerHTML = renderAddEditContent(true);
        setupEventListeners();
    }
}

// Render Overview Content
function renderOverviewContent() {
    if (!tlmState.assigned) {
        return `
            <div class="tlm-section">
                <div class="tlm-status">
                    <div class="tlm-status-icon unassigned"></div>
                    <div class="tlm-status-text">
                        <div class="tlm-status-primary">No TLM Connected</div>
                        <div class="tlm-status-secondary">This tank does not have a tank level monitor assigned</div>
                    </div>
                </div>
            </div>
            
            <div class="tlm-actions" style="grid-template-columns: 1fr;">
                <button class="tlm-action-btn primary" onclick="startAddTLM()">➕ Add TLM</button>
            </div>
        `;
    }
    
    // Determine connection status
    let statusClass = 'assigned';
    let statusText = 'TLM Connected';
    let statusSecondary = 'Communication active';
    
    if (tlmState.connectionStatus === 'red') {
        statusClass = 'error';
        statusText = 'TLM Connected - No Recent Communication';
        statusSecondary = 'No communication in 2+ days';
    } else if (tlmState.connectionStatus === 'grey') {
        statusClass = 'unassigned';
        statusText = 'TLM Assigned - Not Communicating';
        statusSecondary = 'Device not responding';
    }
    
    return `
        <div class="tlm-section">
            <div class="tlm-status">
                <div class="tlm-status-icon ${statusClass}"></div>
                <div class="tlm-status-text">
                    <div class="tlm-status-primary">${statusText}</div>
                    <div class="tlm-status-secondary">${statusSecondary}</div>
                </div>
            </div>
            
            <div class="info-row">
                <span class="info-label">TLM Provider</span>
                <span class="info-value">${tlmState.provider || 'Not set'}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">TLM Device ID</span>
                <span class="info-value">${tlmState.deviceId || 'Not set'}</span>
            </div>
            
            ${['tekelek', 'tekelek-api', 'chevron-multitech'].includes(tlmState.provider) ? `
            <div class="info-row">
                <span class="info-label">Tank Type</span>
                <span class="info-value">${tlmState.tankType ? capitalizeFirst(tlmState.tankType) : 'Not set'}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Strapping Table Name</span>
                <span class="info-value">
                    ${tlmState.strappingTableName || 'Not set'}
                    ${tlmState.strappingTable ? `<a href="#" onclick="viewStrappingTable('${tlmState.strappingTable}'); return false;" style="margin-left: 10px; color: #2196F3; text-decoration: none; font-weight: 500;">View</a>` : ''}
                </span>
            </div>
            
            <div class="info-row">
                <span class="info-label">TLM Correction Factor</span>
                <span class="info-value">${tlmState.correctionFactor} cm</span>
            </div>
            ` : ''}
            
            ${tlmState.lastReading ? `
            <div style="background: #e8f5e9; border: 1px solid #4CAF50; border-radius: 8px; padding: 12px; margin-top: 15px;">
                <div style="font-size: 12px; color: #2e7d32; margin-bottom: 5px;">Last Reading</div>
                <div style="font-size: 18px; font-weight: 600; color: #2e7d32;">${tlmState.lastReading}</div>
                <div style="font-size: 12px; color: #4CAF50; margin-top: 5px;">at ${tlmState.lastReadingTime}</div>
            </div>
            ` : ''}
        </div>
        
        <div class="tlm-actions">
            <button class="tlm-action-btn" onclick="checkReading()" ${!canCheckReading() ? 'disabled' : ''}>
                📊 Check Reading
            </button>
            <button class="tlm-action-btn" onclick="startEditTLM()">✏️ Edit</button>
        </div>
        
        ${!canCheckReading() ? `
        <div style="font-size: 12px; color: #666; text-align: center; margin-top: 10px;">
            Check Reading is only available for Tekelek devices with a Device ID
        </div>
        ` : ''}
    `;
}

// Render Add/Edit Content
function renderAddEditContent(isEdit) {
    const title = isEdit ? '✏️ Edit TLM' : '➕ Add TLM';
    
    return `
        <div class="tlm-section">
            <div class="tlm-section-title">${title}</div>
            
            <div class="form-group">
                <label for="tlm-provider">Provider <span class="required">*</span></label>
                <select id="tlm-provider" class="dropdown" onchange="handleProviderChange()">
                    <option value="">Select a provider</option>
                    ${providers.map(p => `
                        <option value="${p.value}" ${tlmState.provider === p.value ? 'selected' : ''}>
                            ${p.name}
                        </option>
                    `).join('')}
                </select>
                <div class="validation-error" id="provider-error" style="display: none;">Provider is required</div>
            </div>
            
            <div class="form-group">
                <label for="tlm-device-id">Device ID <span class="required">*</span></label>
                <div class="input-group">
                    <div style="position: relative; flex: 1;">
                        <input type="text" 
                               id="tlm-device-id" 
                               class="text-input" 
                               placeholder="Enter Device ID or scan barcode"
                               value="${tlmState.deviceId || ''}"
                               onkeyup="handleTypeahead(event)"
                               onfocus="showTypeahead()"
                               onblur="hideTypeahead(event)">
                        <div class="typeahead-dropdown" id="typeahead" style="display: none;"></div>
                    </div>
                    <button class="barcode-btn" 
                            id="barcode-btn" 
                            onclick="scanBarcode()" 
                            style="display: none;"
                            title="Scan Barcode">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 6H6V18H4V6M7 6H8V18H7V6M9 6H12V18H9V6M13 6H14V18H13V6M16 6H18V18H16V6M19 6H20V18H19V6M2 4V8H0V4C0 2.9 0.9 2 2 2H6V4H2M22 2C23.1 2 24 2.9 24 4V8H22V4H18V2H22M2 16V20H6V22H2C0.9 22 0 21.1 0 20V16H2M22 20V16H24V20C24 21.1 23.1 22 22 22H18V20H22Z"/>
                        </svg>
                    </button>
                </div>
                <button class="test-btn" onclick="testDevice()">Test Device</button>
                <div id="test-result"></div>
                <div class="validation-error" id="device-id-error" style="display: none;">Device ID is required</div>
            </div>
            
            <div class="progressive-fields" id="provider-fields">
                <div class="form-group">
                    <label for="tlm-tank-type">Tank Type <span class="required">*</span></label>
                    <select id="tlm-tank-type" class="dropdown" onchange="handleTankTypeChange()">
                        <option value="">Select tank type</option>
                        <option value="vertical" ${tlmState.tankType === 'vertical' ? 'selected' : ''}>Vertical</option>
                        <option value="horizontal" ${tlmState.tankType === 'horizontal' ? 'selected' : ''}>Horizontal</option>
                    </select>
                    <div class="validation-error" id="tank-type-error" style="display: none;">Tank type is required for this provider</div>
                </div>
                
                <div class="form-group">
                    <label for="tlm-strapping-table">Strapping Table <span class="required">*</span></label>
                    <div class="strapping-group">
                        <select id="tlm-strapping-table" class="dropdown strapping-dropdown">
                            <option value="">Select strapping table</option>
                            ${getFilteredStrappingTables()}
                        </select>
                        <button class="new-btn" onclick="openStrappingModal()" id="new-strapping-btn">+ New</button>
                    </div>
                    <div class="validation-error" id="strapping-table-error" style="display: none;">Strapping table is required for this provider</div>
                </div>
                
                <div class="form-group">
                    <label for="tlm-correction-factor">TLM Correction Factor (cm)</label>
                    <input type="number" 
                           id="tlm-correction-factor" 
                           class="number-input" 
                           placeholder="0" 
                           value="${tlmState.correctionFactor || 0}"
                           step="0.1" 
                           max="0"
                           onchange="validateCorrectionFactor()">
                    <div class="correction-info">
                        Correction Factor: If the measured level doesn't match the strapping table reading, you can adjust the correction factor by cm. This shifts the entire strapping table up or down so the displayed gallons align more closely with the actual level.
                    </div>
                    <div class="validation-error" id="correction-factor-error" style="display: none;">Only negative values or 0 allowed</div>
                </div>
            </div>
        </div>
        
        <div class="tlm-actions" style="grid-template-columns: ${isEdit ? '1fr 1fr 1fr' : '1fr 1fr'};">
            <button class="tlm-action-btn" onclick="cancelOperation()">Cancel</button>
            ${isEdit ? '<button class="tlm-action-btn danger" onclick="removeTLM()">Remove</button>' : ''}
            <button class="tlm-action-btn primary" onclick="saveTLM()">Save</button>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Set initial states
    handleProviderChange();
    
    // Add input validation listeners
    const deviceIdInput = document.getElementById('tlm-device-id');
    if (deviceIdInput) {
        deviceIdInput.addEventListener('input', clearValidationError);
    }
}

// Handle provider change
function handleProviderChange() {
    const providerSelect = document.getElementById('tlm-provider');
    if (!providerSelect) return;
    
    const selectedProvider = providerSelect.value;
    const provider = providers.find(p => p.value === selectedProvider);
    
    const providerFields = document.getElementById('provider-fields');
    const barcodeBtn = document.getElementById('barcode-btn');
    
    if (provider) {
        // Show/hide provider-specific fields
        if (provider.requiresFields) {
            providerFields.classList.add('active');
        } else {
            providerFields.classList.remove('active');
        }
        
        // Show/hide barcode button
        if (provider.hasBarcode) {
            barcodeBtn.style.display = 'flex';
        } else {
            barcodeBtn.style.display = 'none';
        }
    } else {
        providerFields.classList.remove('active');
        barcodeBtn.style.display = 'none';
    }
    
    clearValidationError();
}

// Handle tank type change
function handleTankTypeChange() {
    const tankType = document.getElementById('tlm-tank-type').value;
    updateStrappingTableOptions(tankType);
    clearValidationError();
}

// Update strapping table options based on tank type
function updateStrappingTableOptions(tankType) {
    const strappingSelect = document.getElementById('tlm-strapping-table');
    if (!strappingSelect) return;
    
    strappingSelect.innerHTML = '<option value="">Select strapping table</option>';
    strappingSelect.innerHTML += getFilteredStrappingTables(tankType);
}

// Get filtered strapping tables
function getFilteredStrappingTables(tankType) {
    let filtered = strappingTables;
    
    if (tankType) {
        filtered = strappingTables.filter(t => !t.tankType || t.tankType === tankType);
    }
    
    return filtered.map(t => `
        <option value="${t.value}" ${tlmState.strappingTable === t.value ? 'selected' : ''}>
            ${t.name}
        </option>
    `).join('');
}

// Handle typeahead
function handleTypeahead(event) {
    const input = event.target;
    const value = input.value.toLowerCase();
    const provider = document.getElementById('tlm-provider').value;
    
    if (!value || !provider) {
        hideTypeahead();
        return;
    }
    
    const devices = mockDevices[provider] || [];
    const filtered = devices.filter(d => d.toLowerCase().includes(value));
    
    if (filtered.length > 0) {
        showTypeaheadResults(filtered);
    } else {
        hideTypeahead();
    }
}

// Show typeahead
function showTypeahead() {
    const provider = document.getElementById('tlm-provider').value;
    if (!provider) return;
    
    const devices = mockDevices[provider] || [];
    if (devices.length > 0) {
        showTypeaheadResults(devices);
    }
}

// Show typeahead results
function showTypeaheadResults(results) {
    const dropdown = document.getElementById('typeahead');
    
    dropdown.innerHTML = results.map(device => `
        <div class="typeahead-item" onmousedown="selectDevice('${device}')">${device}</div>
    `).join('');
    
    dropdown.style.display = 'block';
}

// Hide typeahead
function hideTypeahead(event) {
    // Delay hiding to allow click events on dropdown items
    setTimeout(() => {
        const dropdown = document.getElementById('typeahead');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }, 200);
}

// Select device from typeahead
function selectDevice(deviceId) {
    document.getElementById('tlm-device-id').value = deviceId;
    hideTypeahead();
}

// Test Device
async function testDevice() {
    const deviceId = document.getElementById('tlm-device-id').value;
    const provider = document.getElementById('tlm-provider').value;
    const resultDiv = document.getElementById('test-result');
    
    if (!deviceId) {
        showTestResult('error', 'Please enter a Device ID first');
        return;
    }
    
    if (!provider) {
        showTestResult('error', 'Please select a Provider first');
        return;
    }
    
    // Show loading state
    const testBtn = event.target;
    testBtn.disabled = true;
    testBtn.innerHTML = '<span class="loading-spinner"></span> Testing...';
    
    // Simulate Influx query
    await simulateInfluxQuery(deviceId, provider);
    
    // Reset button
    testBtn.disabled = false;
    testBtn.innerHTML = 'Test Device';
}

// Simulate Influx query
async function simulateInfluxQuery(deviceId, provider) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const random = Math.random();
    
    if (random < 0.6) {
        // Device found with reading
        const reading = (180 + Math.random() * 20).toFixed(2);
        const timestamp = new Date().toLocaleString();
        showTestResult('success', `✅ Device found! Latest reading: ${reading} GAL at ${timestamp}`);
    } else if (random < 0.8) {
        // Device found but no readings
        showTestResult('warning', '⚠️ Device found but no readings available');
    } else if (random < 0.95) {
        // Device not found
        showTestResult('error', '❌ No device available. Try a different ID');
    } else {
        // Query error
        showTestResult('error', '❌ Unable to retrieve reading right now. Please try again');
    }
}

// Show test result
function showTestResult(type, message) {
    const resultDiv = document.getElementById('test-result');
    if (!resultDiv) return;
    
    resultDiv.className = `test-result ${type}`;
    resultDiv.innerHTML = message;
    resultDiv.style.display = 'block';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 10000);
}

// Check Reading (Post-save)
async function checkReading() {
    if (!canCheckReading()) {
        showTooltip(event.target, 'Check Reading requires Tekelek provider and Device ID');
        return;
    }
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Checking...';
    
    // Simulate Influx query
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const reading = (180 + Math.random() * 20).toFixed(2);
    const timestamp = new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute:'2-digit'
    });
    
    // Show result in alert with simplified format
    alert(`Reading Check\n\nDigital Reading: ${reading} GAL\nTimestamp: ${timestamp}`);
    
    btn.disabled = false;
    btn.innerHTML = '📊 Check Reading';
    
    // Update last reading
    tlmState.lastReading = reading + ' GAL';
    tlmState.lastReadingTime = new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute:'2-digit'
    });
    tlmState.lastCommunication = new Date();
    
    updateTLMIcon();
}

// Can check reading
function canCheckReading() {
    return tlmState.assigned && 
           tlmState.deviceId && 
           (tlmState.provider === 'tekelek' || tlmState.provider === 'tekelek-api');
}

// Scan barcode
function scanBarcode() {
    // Simulate barcode scanning
    const provider = document.getElementById('tlm-provider').value;
    
    // Show scanning animation (would be actual camera in production)
    const btn = event.target.closest('button');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span>';
    
    setTimeout(() => {
        // Generate mock barcode based on provider
        let mockBarcode = '';
        if (provider === 'tekelek' || provider === 'tekelek-api') {
            mockBarcode = 'TLM-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        } else if (provider === 'chevron-multitech') {
            mockBarcode = 'CHV-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        } else {
            mockBarcode = 'DEV-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
        
        document.getElementById('tlm-device-id').value = mockBarcode;
        
        // Reset button
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 6H6V18H4V6M7 6H8V18H7V6M9 6H12V18H9V6M13 6H14V18H13V6M16 6H18V18H16V6M19 6H20V18H19V6M2 4V8H0V4C0 2.9 0.9 2 2 2H6V4H2M22 2C23.1 2 24 2.9 24 4V8H22V4H18V2H22M2 16V20H6V22H2C0.9 22 0 21.1 0 20V16H2M22 20V16H24V20C24 21.1 23.1 22 22 22H18V20H22Z"/></svg>';
        
        // Flash success
        const input = document.getElementById('tlm-device-id');
        input.style.borderColor = '#4CAF50';
        setTimeout(() => {
            input.style.borderColor = '';
        }, 1000);
    }, 1500);
}

// Validate correction factor
function validateCorrectionFactor() {
    const input = document.getElementById('tlm-correction-factor');
    const error = document.getElementById('correction-factor-error');
    
    if (parseFloat(input.value) > 0) {
        input.classList.add('error');
        error.style.display = 'block';
        return false;
    } else {
        input.classList.remove('error');
        error.style.display = 'none';
        return true;
    }
}

// Clear validation errors
function clearValidationError() {
    const errors = document.querySelectorAll('.validation-error');
    errors.forEach(error => error.style.display = 'none');
    
    const inputs = document.querySelectorAll('.error');
    inputs.forEach(input => input.classList.remove('error'));
}

// Start Add TLM
function startAddTLM() {
    currentMode = 'add';
    // Reset state for new TLM
    tlmState.provider = null;
    tlmState.deviceId = null;
    tlmState.tankType = null;
    tlmState.strappingTable = null;
    tlmState.strappingTableName = null;
    tlmState.correctionFactor = 0;
    renderTLMPanelContent();
}

// Start Edit TLM
function startEditTLM() {
    currentMode = 'edit';
    renderTLMPanelContent();
}

// Cancel operation
function cancelOperation() {
    currentMode = 'view';
    renderTLMPanelContent();
}

// Save TLM
async function saveTLM() {
    // Validate required fields
    let isValid = true;
    
    const provider = document.getElementById('tlm-provider').value;
    const deviceId = document.getElementById('tlm-device-id').value;
    
    if (!provider) {
        document.getElementById('tlm-provider').classList.add('error');
        document.getElementById('provider-error').style.display = 'block';
        isValid = false;
    }
    
    if (!deviceId) {
        document.getElementById('tlm-device-id').classList.add('error');
        document.getElementById('device-id-error').style.display = 'block';
        isValid = false;
    }
    
    // Check provider-specific requirements
    const providerObj = providers.find(p => p.value === provider);
    if (providerObj && providerObj.requiresFields) {
        const tankType = document.getElementById('tlm-tank-type').value;
        const strappingTable = document.getElementById('tlm-strapping-table').value;
        
        if (!tankType) {
            document.getElementById('tlm-tank-type').classList.add('error');
            document.getElementById('tank-type-error').style.display = 'block';
            isValid = false;
        }
        
        if (!strappingTable) {
            document.getElementById('tlm-strapping-table').classList.add('error');
            document.getElementById('strapping-table-error').style.display = 'block';
            isValid = false;
        }
    }
    
    // Validate correction factor
    if (!validateCorrectionFactor()) {
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Update state
    tlmState.assigned = true;
    tlmState.provider = provider;
    tlmState.deviceId = deviceId;
    
    // Special case: TLM-TEK-003 has old communication to trigger red status
    if (deviceId === 'TLM-TEK-003') {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        tlmState.lastCommunication = threeDaysAgo;
        tlmState.lastReading = '189.45 GAL';
        tlmState.lastReadingTime = threeDaysAgo.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit', 
            year: 'numeric',
            hour: '2-digit', 
            minute:'2-digit'
        });
        tlmState.connectionStatus = 'red'; // Force red status
    } else {
        // For other devices, set recent communication for green status
        tlmState.lastCommunication = new Date();
        tlmState.lastReading = (180 + Math.random() * 20).toFixed(2) + ' GAL';
        tlmState.lastReadingTime = new Date().toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit', 
            year: 'numeric',
            hour: '2-digit', 
            minute:'2-digit'
        });
    }
    
    if (providerObj && providerObj.requiresFields) {
        tlmState.tankType = document.getElementById('tlm-tank-type').value;
        tlmState.strappingTable = document.getElementById('tlm-strapping-table').value;
        
        const strappingSelect = document.getElementById('tlm-strapping-table');
        tlmState.strappingTableName = strappingSelect.options[strappingSelect.selectedIndex].text;
        
        // Set conversion model based on tank type
        tlmState.conversionModel = tlmState.tankType === 'vertical' ? 'linear' : 'cubic';
        
        // Calculate coefficients (would be done server-side in production)
        calculateConversionCoefficients();
    }
    
    tlmState.correctionFactor = parseFloat(document.getElementById('tlm-correction-factor').value) || 0;
    tlmState.lastCommunication = new Date();
    
    // Sync to AMP
    await syncToAMP();
    
    // Update UI
    currentMode = 'view';
    updateTLMIcon();
    renderTLMPanelContent();
}

// Remove TLM
async function removeTLM() {
    if (confirm('Are you sure you want to remove this TLM? This will delete all configuration.')) {
        tlmState.assigned = false;
        tlmState.provider = null;
        tlmState.deviceId = null;
        tlmState.tankType = null;
        tlmState.strappingTable = null;
        tlmState.strappingTableName = null;
        tlmState.correctionFactor = 0;
        tlmState.conversionModel = null;
        tlmState.coefficients = null;
        tlmState.lastCommunication = null;
        tlmState.lastReading = null;
        tlmState.lastReadingTime = null;
        
        // Sync to AMP
        await syncToAMP();
        
        // Update UI
        currentMode = 'view';
        updateTLMIcon();
        renderTLMPanelContent();
    }
}

// Calculate conversion coefficients
function calculateConversionCoefficients() {
    if (tlmState.tankType === 'vertical') {
        // Linear model: y = mx + b
        tlmState.coefficients = {
            m: 1.67, // gallons per inch
            b: 0     // offset
        };
    } else {
        // Cubic model: y = ax³ + bx² + cx + d
        // These would be calculated from strapping table data
        tlmState.coefficients = {
            a: 0.0001,
            b: 0.002,
            c: 1.5,
            d: 0
        };
    }
}

// Sync to AMP
async function syncToAMP() {
    const syncStatus = document.getElementById('syncStatus');
    const syncMessage = document.getElementById('syncMessage');
    
    // Show sync status
    syncStatus.className = 'sync-status active';
    syncMessage.textContent = 'Saving to AMP...';
    
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (!tlmState.isOffline) {
        // Success
        syncStatus.className = 'sync-status active success';
        syncMessage.textContent = '✅ Saved to AMP';
        
        // Clear local cache
        tlmState.localCache = [];
    } else {
        // Offline - save to local cache
        tlmState.localCache.push({
            timestamp: new Date(),
            data: {...tlmState}
        });
        
        syncStatus.className = 'sync-status active warning';
        syncMessage.textContent = '⚠️ Saved offline - will sync when connected';
    }
    
    // Hide after 3 seconds
    setTimeout(() => {
        syncStatus.classList.remove('active');
    }, 3000);
}

// Open strapping modal
function openStrappingModal() {
    document.getElementById('strappingModal').classList.add('active');
    
    // Get tank type from the TLM form
    const tankType = document.getElementById('tlm-tank-type').value;
    
    // Update modal title based on tank type
    if (tankType) {
        document.getElementById('strappingModalTitle').textContent = `Create New ${tankType.charAt(0).toUpperCase() + tankType.slice(1)} Strapping Table`;
    } else {
        document.getElementById('strappingModalTitle').textContent = 'Create New Strapping Table';
    }
    
    // Clear form first
    clearStrappingForm();
    
    // Show percentage table for horizontal tanks
    if (tankType === 'horizontal') {
        document.getElementById('percentageTable').style.display = 'block';
        // Don't calculate heights yet as max-height is not entered
    } else {
        document.getElementById('percentageTable').style.display = 'none';
    }
    
    // Run validation to set initial button state after a short delay
    // to ensure all elements are properly initialized
    setTimeout(() => validateStrappingForm(), 100);
}

// Close strapping modal
function closeStrappingModal() {
    document.getElementById('strappingModal').classList.remove('active');
    clearStrappingForm();
}

// Clear strapping form
function clearStrappingForm() {
    document.getElementById('table-name').value = '';
    document.getElementById('max-height').value = '';
    document.getElementById('max-volume').value = '';
    
    // Clear volume inputs
    const percentages = [80, 60, 40, 20];
    percentages.forEach(p => {
        const input = document.getElementById(`volume-${p}`);
        if (input) input.value = '';
    });
    
    // Clear errors
    document.querySelectorAll('#strappingModal .validation-error').forEach(error => {
        error.style.display = 'none';
    });
    
    document.querySelectorAll('#strappingModal .error').forEach(input => {
        input.classList.remove('error');
    });
    
    // Disable save button
    document.getElementById('saveStrappingBtn').disabled = true;
}

// Calculate heights for horizontal tank
function calculateHeights() {
    const maxHeight = parseFloat(document.getElementById('max-height').value) || 0;
    const percentages = [100, 80, 60, 40, 20];
    
    percentages.forEach(percentage => {
        const height = (maxHeight * percentage / 100).toFixed(1);
        const heightElement = document.getElementById(`height-${percentage}`);
        if (heightElement) {
            heightElement.textContent = height;
        }
    });
    
    validateStrappingForm();
}

// Update max volume
function updateMaxVolume() {
    const maxVolume = parseFloat(document.getElementById('max-volume').value) || 0;
    const volume100Element = document.getElementById('volume-100');
    if (volume100Element) {
        volume100Element.textContent = maxVolume.toFixed(1);
    }
    
    validateStrappingForm();
}

// Validate volume order
function validateVolumeOrder() {
    const tankType = document.getElementById('tlm-tank-type').value;
    if (tankType !== 'horizontal') {
        return true;
    }
    
    const maxVolume = parseFloat(document.getElementById('max-volume').value) || 0;
    const volumes = {
        100: maxVolume,
        80: parseFloat(document.getElementById('volume-80').value) || 0,
        60: parseFloat(document.getElementById('volume-60').value) || 0,
        40: parseFloat(document.getElementById('volume-40').value) || 0,
        20: parseFloat(document.getElementById('volume-20').value) || 0
    };
    
    let isValid = true;
    const error = document.getElementById('volume-order-error');
    
    // Check descending order only if values are entered
    const percentages = [100, 80, 60, 40, 20];
    for (let i = 1; i < percentages.length; i++) {
        const current = volumes[percentages[i]];
        const previous = volumes[percentages[i-1]];
        
        // Only validate if both values are greater than 0
        if (current > 0 && previous > 0 && current >= previous) {
            isValid = false;
            document.getElementById(`volume-${percentages[i]}`).classList.add('error');
        } else {
            document.getElementById(`volume-${percentages[i]}`)?.classList.remove('error');
        }
    }
    
    if (!isValid && error) {
        error.style.display = 'block';
    } else if (error) {
        error.style.display = 'none';
    }
    
    // Trigger validation of the save button
    const saveBtn = document.getElementById('saveStrappingBtn');
    if (saveBtn) {
        // We'll update the button state directly here if needed
        // The main validation will handle it through validateStrappingForm
    }
    return isValid;
}

// Handle tank type change
function onTankTypeChange() {
    const tankTypeSelect = document.getElementById('strapping-tank-type');
    const percentageTable = document.getElementById('percentageTable');
    
    if (!tankTypeSelect || !percentageTable) {
        console.error('Tank type or percentage table element not found');
        return;
    }
    
    const tankType = tankTypeSelect.value;
    
    if (tankType === 'horizontal') {
        // Show the percentage table for horizontal tanks
        percentageTable.style.display = 'block';
        percentageTable.style.visibility = 'visible';
        percentageTable.style.opacity = '1';
        
        // Recalculate heights if max height is already entered
        calculateHeights();
        // Update max volume display if already entered
        updateMaxVolume();
        
        console.log('Horizontal tank selected - showing percentage table');
    } else {
        // Hide the percentage table for vertical tanks or no selection
        percentageTable.style.display = 'none';
        console.log('Vertical tank or no selection - hiding percentage table');
    }
    
    // Update modal title based on tank type
    const title = document.getElementById('strappingModalTitle');
    if (title && tankType) {
        title.textContent = `Create New ${tankType.charAt(0).toUpperCase() + tankType.slice(1)} Strapping Table`;
    }
    
    validateStrappingForm();
}

// Validate strapping form
function validateStrappingForm() {
    const tableName = document.getElementById('table-name')?.value.trim() || '';
    const maxHeightInput = document.getElementById('max-height')?.value;
    const maxVolumeInput = document.getElementById('max-volume')?.value;
    const tankType = document.getElementById('tlm-tank-type')?.value || '';
    
    const maxHeight = parseFloat(maxHeightInput) || 0;
    const maxVolume = parseFloat(maxVolumeInput) || 0;
    
    let isValid = true;
    
    // Check required fields
    if (!tableName) {
        document.getElementById('table-name-error').style.display = 'block';
        document.getElementById('table-name').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('table-name-error').style.display = 'none';
        document.getElementById('table-name').classList.remove('error');
    }
    
    // Check tank type is selected
    if (!tankType) {
        isValid = false;
    }
    
    if (!maxHeightInput || maxHeight <= 0) {
        document.getElementById('max-height-error').style.display = 'block';
        document.getElementById('max-height').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('max-height-error').style.display = 'none';
        document.getElementById('max-height').classList.remove('error');
    }
    
    if (!maxVolumeInput || maxVolume <= 0) {
        document.getElementById('max-volume-error').style.display = 'block';
        document.getElementById('max-volume').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('max-volume-error').style.display = 'none';
        document.getElementById('max-volume').classList.remove('error');
    }
    
    // For horizontal tanks, volume fields are optional but if entered must be in descending order
    if (tankType === 'horizontal' && tableName && maxHeight > 0 && maxVolume > 0) {
        // Don't call validateVolumeOrder here to avoid recursion
        // Instead check volume order directly
        const volumes = {
            100: maxVolume,
            80: parseFloat(document.getElementById('volume-80')?.value) || 0,
            60: parseFloat(document.getElementById('volume-60')?.value) || 0,
            40: parseFloat(document.getElementById('volume-40')?.value) || 0,
            20: parseFloat(document.getElementById('volume-20')?.value) || 0
        };
        
        // Check descending order only for entered values
        const percentages = [100, 80, 60, 40, 20];
        for (let i = 1; i < percentages.length; i++) {
            const current = volumes[percentages[i]];
            const previous = volumes[percentages[i-1]];
            
            if (current > 0 && previous > 0 && current >= previous) {
                isValid = false;
                break;
            }
        }
    }
    
    // Enable/disable save button
    const saveBtn = document.getElementById('saveStrappingBtn');
    if (saveBtn) {
        saveBtn.disabled = !isValid;
        // Make sure button has correct styling
        if (isValid) {
            saveBtn.style.background = '#4CAF50';
            saveBtn.style.cursor = 'pointer';
        } else {
            saveBtn.style.background = '#cccccc';
            saveBtn.style.cursor = 'not-allowed';
        }
    }
}

// Save strapping table
function saveStrappingTable() {
    validateStrappingForm();
    
    if (document.getElementById('saveStrappingBtn').disabled) {
        return;
    }
    
    const tableName = document.getElementById('table-name').value.trim();
    const maxHeight = parseFloat(document.getElementById('max-height').value);
    const maxVolume = parseFloat(document.getElementById('max-volume').value);
    const tankType = document.getElementById('tlm-tank-type').value;
    
    // Create table data
    const tableData = {
        tankType: tankType,
        maxHeight: maxHeight,
        maxVolume: maxVolume,
        measurements: {}
    };
    
    // For horizontal tanks, collect percentage data
    if (tankType === 'horizontal') {
        const percentages = [100, 80, 60, 40, 20];
        percentages.forEach(percentage => {
            let volume;
            const height = document.getElementById(`height-${percentage}`).textContent;
            
            if (percentage === 100) {
                volume = maxVolume;
            } else {
                volume = parseFloat(document.getElementById(`volume-${percentage}`).value) || 0;
            }
            
            tableData.measurements[percentage] = {
                height: parseFloat(height),
                volume: volume
            };
        });
    }
    
    // Add to strapping tables
    const tableId = 'table_' + Date.now();
    strappingTables.push({
        value: tableId,
        name: tableName,
        tankType: tankType,
        data: tableData
    });
    
    // Select the new table
    tlmState.strappingTable = tableId;
    tlmState.strappingTableName = tableName;
    
    // Update dropdown
    updateStrappingTableOptions(tankType);
    document.getElementById('tlm-strapping-table').value = tableId;
    
    // Close modal
    closeStrappingModal();
    
    // Show success
    showSyncStatus('success', `✅ Strapping table "${tableName}" created`);
}

// View strapping table
function viewStrappingTable(tableId) {
    // Find the strapping table data
    const table = strappingTables.find(t => t.value === tableId);
    
    if (!table) {
        alert('Strapping table not found.');
        return;
    }
    
    // Update modal title
    document.getElementById('viewModalTitle').textContent = `Strapping Table: ${table.name}`;
    
    // Generate content based on table data
    let content = `
        <div class="form-group">
            <label>Tank Type</label>
            <div style="padding: 12px 15px; background: #f8f9fa; border-radius: 10px; text-transform: capitalize;">
                ${table.tankType}
            </div>
        </div>
    `;
    
    if (table.data) {
        content += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>Max Tank Height</label>
                    <div style="padding: 12px 15px; background: #f8f9fa; border-radius: 10px;">
                        ${table.data.maxHeight} inches
                    </div>
                </div>
                <div class="form-group">
                    <label>Max Tank Volume</label>
                    <div style="padding: 12px 15px; background: #f8f9fa; border-radius: 10px;">
                        ${table.data.maxVolume} gallons
                    </div>
                </div>
            </div>
        `;
        
        // Add visual curve display
        content += generateCurveDisplay(table);
        
        
        // Add measurement table for horizontal tanks
        if (table.tankType === 'horizontal' && table.data.measurements) {
            content += `
                <div class="form-group" style="margin-top: 20px;">
                    <label>Measurement Points</label>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 15px;">
                        <div class="table-header">
                            <div>Fill Level</div>
                            <div>Height (in)</div>
                            <div>Volume (gal)</div>
                        </div>
            `;
            
            const percentages = [100, 80, 60, 40, 20];
            percentages.forEach(percentage => {
                if (table.data.measurements[percentage]) {
                    const measurement = table.data.measurements[percentage];
                    content += `
                        <div class="table-row">
                            <div class="percentage-label">${percentage}%</div>
                            <div style="text-align: center; padding: 10px; background: #e8f5e8; border-radius: 6px;">
                                ${measurement.height}
                            </div>
                            <div style="text-align: center; padding: 10px; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px;">
                                ${measurement.volume}
                            </div>
                        </div>
                    `;
                }
            });
            
            content += `
                    </div>
                </div>
            `;
            
            // Add regression curve visualization
            content += `
                <div class="form-group" style="margin-top: 20px;">
                    <label>Volume vs Height Curve (Cubic Regression)</label>
                    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px;">
                        <canvas id="regressionCanvas" width="400" height="250" style="width: 100%; max-width: 400px; height: auto; border: 1px solid #f0f0f0; border-radius: 8px;"></canvas>
                        <div style="margin-top: 10px; font-size: 12px; color: #666; text-align: center;">
                            <div>Tekelek Measurement: Volume → Deadspace conversion for tank level monitoring</div>
                            <div>Cubic Function: y = ax³ + bx² + cx + d</div>
                            <div id="equationText" style="margin-top: 5px; font-family: monospace; color: #1976d2; font-weight: 500;"></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (table.tankType === 'vertical') {
            // Add linear model visualization
        }
        
    } else {
        content += `
            <div style="background: #fff3e0; border: 1px solid #FF9800; border-radius: 8px; padding: 15px; text-align: center;">
                <div style="color: #e65100; margin-bottom: 5px;">Default Table</div>
                <div style="font-size: 14px; color: #666;">
                    This is a default strapping table. Specific measurement data would be configured based on actual tank dimensions and calibration.
                </div>
            </div>
        `;
    }
    
    // Update content and show modal
    document.getElementById('strappingViewContent').innerHTML = content;
    document.getElementById('strappingViewModal').classList.add('active');
    
    // Draw the regression curve if it's a horizontal tank with measurements
    if (table.tankType === 'horizontal' && table.data && table.data.measurements) {
        setTimeout(() => drawRegressionCurve(table.data), 100);
    }
}

// Close strapping view modal
function closeStrappingViewModal() {
    document.getElementById('strappingViewModal').classList.remove('active');
}

// Generate visual curve display for strapping table
function generateCurveDisplay(table) {
    if (!table || !table.data) return '';
    
    // Get correction factor from the TLM device (default to 0 if not set)
    const currentDevice = getCurrentDevice();
    const correctionFactor = currentDevice?.correctionFactor || 0;
    const correctionInches = correctionFactor / 2.54; // Convert cm to inches
    
    let content = `
        <div class="form-group" style="margin-top: 20px;">
            <label>Strapping Curve with Correction Factor</label>
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px;">
    `;
    
    // Show correction factor info if it's not zero
    if (correctionFactor !== 0) {
        content += `
            <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 10px; margin-bottom: 15px; text-align: center;">
                <div style="font-size: 12px; color: #1976d2;">
                    <strong>Correction Factor Applied:</strong> ${correctionFactor} cm (${correctionInches.toFixed(2)}")
                </div>
            </div>
        `;
    }
    
    if (table.tankType === 'vertical') {
        // Vertical tank - linear relationship with correction factor
        const maxHeight = table.data.maxHeight;
        const maxVolume = table.data.maxVolume;
        const galPerInch = maxVolume / maxHeight;
        
        content += `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 14px; font-weight: bold; color: #333;">Linear Tank Strapping (Vertical)</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    ${maxHeight}" height × ${maxVolume} gallons | Rate: ${galPerInch.toFixed(2)} gal/inch
                </div>
            </div>
            
            <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; max-height: 400px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #ddd; border-radius: 4px;">
                    <div style="text-align: center;">Sensor Reading (in)</div>
                    <div style="text-align: center;">Tank Volume (gal)</div>
                </div>
        `;
        
        // Generate inch-by-inch readings from 0 to max height
        for (let inch = 0; inch <= maxHeight; inch++) {
            // Apply correction factor: corrected reading = actual reading + correction
            const correctedVolume = maxVolume - ((inch - correctionInches) * galPerInch);
            // Ensure volume doesn't go negative or exceed max
            const finalVolume = Math.max(0, Math.min(maxVolume, correctedVolume));
            
            // Color coding based on percentage full
            const percentFull = (finalVolume / maxVolume) * 100;
            let bgColor = '#fff';
            let textColor = '#333';
            
            if (percentFull >= 75) {
                bgColor = '#e8f5e8';
                textColor = '#2e7d32';
            } else if (percentFull >= 25) {
                bgColor = '#fff3e0';
                textColor = '#f57c00';
            } else {
                bgColor = '#ffebee';
                textColor = '#c62828';
            }
            
            content += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 4px;">
                    <div style="text-align: center; padding: 6px; background: #f0f0f0; border-radius: 4px;">
                        ${inch}"
                    </div>
                    <div style="text-align: center; padding: 6px; background: ${bgColor}; color: ${textColor}; border-radius: 4px; font-weight: 500;">
                        ${finalVolume.toFixed(1)} GAL
                    </div>
                </div>
            `;
        }
        
        content += `
                </div>
                <div style="text-align: center; margin-top: 15px; font-size: 11px; color: #666;">
                    Formula: Volume = ${maxVolume} - ((Reading - ${correctionInches.toFixed(2)}") × ${galPerInch.toFixed(2)})
                </div>
        `;
        
    } else {
        // Horizontal tank - non-linear relationship with cubic interpolation
        const maxHeight = table.data.maxHeight;
        const maxVolume = table.data.maxVolume;
        const measurements = table.data.measurements;
        
        content += `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 14px; font-weight: bold; color: #333;">Cubic Tank Strapping (Horizontal)</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    ${maxHeight}" height × ${maxVolume} gallons | Non-linear curve
                </div>
            </div>
            
            <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; max-height: 400px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-weight: bold; margin-bottom: 10px; padding: 8px; background: #ddd; border-radius: 4px;">
                    <div style="text-align: center;">Sensor Reading (in)</div>
                    <div style="text-align: center;">Tank Volume (gal)</div>
                </div>
        `;
        
        // Create interpolation points from measurement data
        const dataPoints = [];
        if (measurements) {
            // Add 0% (empty) point
            dataPoints.push({ height: maxHeight, volume: 0 });
            // Add measurement points
            [20, 40, 60, 80, 100].forEach(percent => {
                if (measurements[percent]) {
                    dataPoints.push({ 
                        height: maxHeight - measurements[percent].height, 
                        volume: measurements[percent].volume 
                    });
                }
            });
            // Sort by height
            dataPoints.sort((a, b) => a.height - b.height);
        }
        
        // Generate inch-by-inch readings using interpolation
        for (let inch = 0; inch <= maxHeight; inch++) {
            let volume = 0;
            
            if (dataPoints.length >= 2) {
                // Simple linear interpolation between nearest points
                let lowerPoint = dataPoints[0];
                let upperPoint = dataPoints[dataPoints.length - 1];
                
                for (let i = 0; i < dataPoints.length - 1; i++) {
                    if (inch >= dataPoints[i].height && inch <= dataPoints[i + 1].height) {
                        lowerPoint = dataPoints[i];
                        upperPoint = dataPoints[i + 1];
                        break;
                    }
                }
                
                // Linear interpolation
                const heightDiff = upperPoint.height - lowerPoint.height;
                const volumeDiff = upperPoint.volume - lowerPoint.volume;
                const ratio = heightDiff === 0 ? 0 : (inch - lowerPoint.height) / heightDiff;
                volume = lowerPoint.volume + (ratio * volumeDiff);
            }
            
            // Apply correction factor
            const correctedInch = inch - correctionInches;
            if (correctedInch >= 0 && correctedInch <= maxHeight) {
                // Recalculate volume for corrected reading
                let correctedVolume = 0;
                if (dataPoints.length >= 2) {
                    let lowerPoint = dataPoints[0];
                    let upperPoint = dataPoints[dataPoints.length - 1];
                    
                    for (let i = 0; i < dataPoints.length - 1; i++) {
                        if (correctedInch >= dataPoints[i].height && correctedInch <= dataPoints[i + 1].height) {
                            lowerPoint = dataPoints[i];
                            upperPoint = dataPoints[i + 1];
                            break;
                        }
                    }
                    
                    const heightDiff = upperPoint.height - lowerPoint.height;
                    const volumeDiff = upperPoint.volume - lowerPoint.volume;
                    const ratio = heightDiff === 0 ? 0 : (correctedInch - lowerPoint.height) / heightDiff;
                    correctedVolume = lowerPoint.volume + (ratio * volumeDiff);
                }
                volume = Math.max(0, Math.min(maxVolume, correctedVolume));
            } else {
                volume = correctedInch < 0 ? maxVolume : 0;
            }
            
            // Color coding based on percentage full
            const percentFull = (volume / maxVolume) * 100;
            let bgColor = '#fff';
            let textColor = '#333';
            
            if (percentFull >= 75) {
                bgColor = '#e8f5e8';
                textColor = '#2e7d32';
            } else if (percentFull >= 25) {
                bgColor = '#fff3e0';
                textColor = '#f57c00';
            } else {
                bgColor = '#ffebee';
                textColor = '#c62828';
            }
            
            content += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 4px;">
                    <div style="text-align: center; padding: 6px; background: #f0f0f0; border-radius: 4px;">
                        ${inch}"
                    </div>
                    <div style="text-align: center; padding: 6px; background: ${bgColor}; color: ${textColor}; border-radius: 4px; font-weight: 500;">
                        ${volume.toFixed(1)} GAL
                    </div>
                </div>
            `;
        }
        
        content += `
                </div>
                <div style="text-align: center; margin-top: 15px; font-size: 11px; color: #666;">
                    Cubic interpolation between strapping points with correction factor applied
                </div>
        `;
    }
    
    content += `
            </div>
        </div>
    `;
    
    return content;
}

// Helper function to get current device data
function getCurrentDevice() {
    const currentDeviceId = document.querySelector('.tlm-list .active')?.getAttribute('data-device-id');
    return currentDeviceId ? tlmDevices[currentDeviceId] : null;
}

// Draw regression curve for horizontal tanks
function drawRegressionCurve(tableData) {
    const canvas = document.getElementById('regressionCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Extract data points and convert to deadspace measurements
    const dataPoints = [];
    const percentages = [20, 40, 60, 80, 100];
    const maxTankHeight = parseFloat(tableData.maxHeight);
    
    percentages.forEach(percentage => {
        if (tableData.measurements[percentage]) {
            const volume = parseFloat(tableData.measurements[percentage].volume);
            const heightVal = parseFloat(tableData.measurements[percentage].height);
            if (!isNaN(volume) && !isNaN(heightVal) && volume > 0) {
                // Convert height to deadspace (distance from top)
                const deadspace = maxTankHeight - heightVal;
                dataPoints.push({ x: volume, y: deadspace });
            }
        }
    });
    
    if (dataPoints.length < 3) {
        // Not enough data points for cubic regression
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Insufficient data points for regression analysis', width/2, height/2);
        return;
    }
    
    // Sort data points by volume (x)
    dataPoints.sort((a, b) => a.x - b.x);
    
    // Find min/max for scaling
    const minX = Math.min(...dataPoints.map(p => p.x));
    const maxX = Math.max(...dataPoints.map(p => p.x));
    const minY = Math.min(...dataPoints.map(p => p.y));
    const maxY = Math.max(...dataPoints.map(p => p.y));
    
    // Add padding
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const xPadding = xRange * 0.1;
    const yPadding = yRange * 0.1;
    
    const plotMinX = minX - xPadding;
    const plotMaxX = maxX + xPadding;
    const plotMinY = minY - yPadding;
    const plotMaxY = maxY + yPadding;
    
    // Calculate cubic regression coefficients
    const coefficients = calculateCubicRegression(dataPoints);
    
    // Set up coordinate transformation
    const margin = 40;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    
    function scaleX(x) {
        return margin + (x - plotMinX) / (plotMaxX - plotMinX) * plotWidth;
    }
    
    function scaleY(y) {
        return height - margin - (y - plotMinY) / (plotMaxY - plotMinY) * plotHeight;
    }
    
    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.stroke();
    
    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines
    for (let i = 1; i < 5; i++) {
        const x = margin + (i / 5) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, height - margin);
        ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 1; i < 5; i++) {
        const y = margin + (i / 5) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
    }
    
    // Draw regression curve
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let firstPoint = true;
    for (let x = plotMinX; x <= plotMaxX; x += (plotMaxX - plotMinX) / 200) {
        const y = evaluateCubic(coefficients, x);
        const screenX = scaleX(x);
        const screenY = scaleY(y);
        
        if (firstPoint) {
            ctx.moveTo(screenX, screenY);
            firstPoint = false;
        } else {
            ctx.lineTo(screenX, screenY);
        }
    }
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#FF5722';
    dataPoints.forEach(point => {
        const screenX = scaleX(point.x);
        const screenY = scaleY(point.y);
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Add labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis label
    ctx.fillText('Volume (Gallons)', width / 2, height - 10);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Deadspace from Top (Inches)', 0, 0);
    ctx.restore();
    
    // Add scale labels
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    
    // X-axis scale
    for (let i = 0; i <= 4; i++) {
        const x = plotMinX + (i / 4) * (plotMaxX - plotMinX);
        const screenX = scaleX(x);
        ctx.fillText(Math.round(x), screenX, height - margin + 15);
    }
    
    // Y-axis scale
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = plotMinY + (i / 4) * (plotMaxY - plotMinY);
        const screenY = scaleY(y);
        ctx.fillText(Math.round(y * 10) / 10, margin - 5, screenY + 3);
    }
    
    // Display equation
    const a = coefficients.a.toExponential(3);
    const b = coefficients.b.toFixed(6);
    const c = coefficients.c.toFixed(3);
    const d = coefficients.d.toFixed(1);
    
    const equation = `y = ${a}x³ + ${b}x² + ${c}x + ${d}`;
    const equationText = document.getElementById('equationText');
    if (equationText) {
        equationText.textContent = equation;
    }
}

// Calculate cubic regression coefficients
function calculateCubicRegression(dataPoints) {
    const n = dataPoints.length;
    
    // For cubic regression y = ax³ + bx² + cx + d
    // We need to solve the normal equations using matrix operations
    
    // Create matrices for normal equations
    let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0, sumX5 = 0, sumX6 = 0;
    let sumY = 0, sumXY = 0, sumX2Y = 0, sumX3Y = 0;
    
    dataPoints.forEach(point => {
        const x = point.x;
        const y = point.y;
        const x2 = x * x;
        const x3 = x2 * x;
        const x4 = x3 * x;
        const x5 = x4 * x;
        const x6 = x5 * x;
        
        sumX += x;
        sumX2 += x2;
        sumX3 += x3;
        sumX4 += x4;
        sumX5 += x5;
        sumX6 += x6;
        sumY += y;
        sumXY += x * y;
        sumX2Y += x2 * y;
        sumX3Y += x3 * y;
    });
    
    // Matrix A (coefficient matrix)
    const A = [
        [n, sumX, sumX2, sumX3],
        [sumX, sumX2, sumX3, sumX4],
        [sumX2, sumX3, sumX4, sumX5],
        [sumX3, sumX4, sumX5, sumX6]
    ];
    
    // Vector b (constants)
    const b = [sumY, sumXY, sumX2Y, sumX3Y];
    
    // Solve Ax = b using Gaussian elimination
    const coefficients = solveLinearSystem(A, b);
    
    return {
        d: coefficients[0],
        c: coefficients[1],
        b: coefficients[2],
        a: coefficients[3]
    };
}

// Solve linear system using Gaussian elimination
function solveLinearSystem(A, b) {
    const n = A.length;
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
                maxRow = k;
            }
        }
        
        // Swap rows
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [b[i], b[maxRow]] = [b[maxRow], b[i]];
        
        // Make all rows below this one 0 in current column
        for (let k = i + 1; k < n; k++) {
            if (A[i][i] === 0) continue; // Avoid division by zero
            const c = A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
                if (i === j) {
                    A[k][j] = 0;
                } else {
                    A[k][j] -= c * A[i][j];
                }
            }
            b[k] -= c * b[i];
        }
    }
    
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = b[i];
        for (let j = i + 1; j < n; j++) {
            x[i] -= A[i][j] * x[j];
        }
        if (A[i][i] !== 0) {
            x[i] /= A[i][i];
        }
    }
    
    return x;
}

// Evaluate cubic function
function evaluateCubic(coefficients, x) {
    return coefficients.a * x * x * x + 
           coefficients.b * x * x + 
           coefficients.c * x + 
           coefficients.d;
}

// Show sync status
function showSyncStatus(type, message) {
    const syncStatus = document.getElementById('syncStatus');
    const syncMessage = document.getElementById('syncMessage');
    
    syncStatus.className = `sync-status active ${type}`;
    syncMessage.textContent = message;
    
    setTimeout(() => {
        syncStatus.classList.remove('active');
    }, 3000);
}

// Show tooltip
function showTooltip(element, message) {
    const tooltip = document.getElementById('tooltip');
    const rect = element.getBoundingClientRect();
    
    tooltip.textContent = message;
    tooltip.style.left = rect.left + rect.width / 2 + 'px';
    tooltip.style.top = rect.top - 40 + 'px';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.classList.add('active');
    
    setTimeout(() => {
        tooltip.classList.remove('active');
    }, 3000);
}

// Utility function to capitalize first letter
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Handle offline mode
window.addEventListener('online', async () => {
    tlmState.isOffline = false;
    
    // Sync cached data
    if (tlmState.localCache.length > 0) {
        showSyncStatus('', 'Syncing offline data...');
        
        for (const cache of tlmState.localCache) {
            await syncToAMP();
        }
        
        tlmState.localCache = [];
        showSyncStatus('success', '✅ Offline data synced');
    }
});

window.addEventListener('offline', () => {
    tlmState.isOffline = true;
    showSyncStatus('warning', '⚠️ Offline mode - data will sync when connected');
});

// TLM Overview Photo Handling
function handleTLMPhoto(event, type) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById(`tlm-preview-${type}`);
        preview.innerHTML = `<img src="${e.target.result}" alt="${type} image">`;
        
        // Store in TLM state
        if (!tlmState.photos) {
            tlmState.photos = {};
        }
        tlmState.photos[type] = {
            file: file,
            dataUrl: e.target.result,
            uploadedAt: new Date().toISOString()
        };
        
        // Show feedback
        const text = preview.parentElement.querySelector('.tlm-pic-text');
        const originalText = text.textContent;
        text.textContent = 'Uploaded ✓';
        text.style.color = '#4CAF50';
        
        setTimeout(() => {
            text.textContent = originalText;
            text.style.color = 'rgba(255, 255, 255, 0.9)';
        }, 2000);
    };
    reader.readAsDataURL(file);
}

// TLM Configuration (placeholder for future implementation)
function openTLMConfig() {
    // This could open a more detailed TLM configuration modal
    // For now, we'll show a simple alert
    alert('TLM Configuration panel would open here.\n\nThis will allow you to:\n• Set provider and device ID\n• Configure communication settings\n• Test connection\n• View diagnostics');
}