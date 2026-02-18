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
    localCache: [],
    photos: {},
    comments: ''
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

// Dummy Strapping Table for Correction Factor Calculator
// 100cm max height, 200 gallons max volume
// Higher gallons = lower cm reading (TLM measures distance from top to liquid surface)
// Example: 200 gal (full) = 0cm from top, 0 gal (empty) = 100cm from top
const DUMMY_STRAPPING = {
    maxHeight: 100,  // cm
    maxVolume: 200   // gallons
};

// Convert gallons to cm using the dummy strapping table
function gallonsToCm(gallons) {
    // Linear relationship:
    // Full tank (200 gal) = 0cm (sensor at top, liquid at top)
    // Empty tank (0 gal) = 100cm (sensor at top, liquid at bottom)
    const heightPercentage = gallons / DUMMY_STRAPPING.maxVolume;
    const liquidHeight = heightPercentage * DUMMY_STRAPPING.maxHeight; // Height of liquid from bottom
    const cmFromTop = DUMMY_STRAPPING.maxHeight - liquidHeight; // Distance from sensor to liquid surface
    return cmFromTop;
}

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
            
            ${tlmState.provider ? `
            <div class="tlm-photos-section">
                <div class="tlm-section-subtitle">Photos</div>
                <div class="tlm-photo-grid">
                    <div class="tlm-photo-item">
                        <div class="tlm-photo-display" onclick="viewPhoto(1)">
                            ${tlmState.photos[1] ? 
                                `<img src="${tlmState.photos[1].dataUrl}" alt="Photo 1" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer;">` :
                                `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80px; border: 2px dashed #dee2e6; border-radius: 6px; cursor: pointer;">
                                    <svg class="camera-icon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #6c757d;">
                                        <path d="M12 2C11.1 2 10.3 2.6 9.8 3.4L9.2 4.5H6C4.9 4.5 4 5.4 4 6.5V18.5C4 19.6 4.9 20.5 6 20.5H18C19.1 20.5 20 19.6 20 18.5V6.5C20 5.4 19.1 4.5 18 4.5H14.8L14.2 3.4C13.7 2.6 12.9 2 12 2ZM12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7ZM12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z"/>
                                    </svg>
                                    <div style="font-size: 10px; color: #6c757d; text-align: center; margin-top: 4px;">No Photo</div>
                                </div>`
                            }
                        </div>
                        <div style="font-size: 10px; color: #6c757d; text-align: center; margin-top: 4px;">Photo 1</div>
                    </div>
                    <div class="tlm-photo-item">
                        <div class="tlm-photo-display" onclick="viewPhoto(2)">
                            ${tlmState.photos[2] ? 
                                `<img src="${tlmState.photos[2].dataUrl}" alt="Photo 2" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer;">` :
                                `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80px; border: 2px dashed #dee2e6; border-radius: 6px; cursor: pointer;">
                                    <svg class="camera-icon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #6c757d;">
                                        <path d="M12 2C11.1 2 10.3 2.6 9.8 3.4L9.2 4.5H6C4.9 4.5 4 5.4 4 6.5V18.5C4 19.6 4.9 20.5 6 20.5H18C19.1 20.5 20 19.6 20 18.5V6.5C20 5.4 19.1 4.5 18 4.5H14.8L14.2 3.4C13.7 2.6 12.9 2 12 2ZM12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7ZM12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z"/>
                                    </svg>
                                    <div style="font-size: 10px; color: #6c757d; text-align: center; margin-top: 4px;">No Photo</div>
                                </div>`
                            }
                        </div>
                        <div style="font-size: 10px; color: #6c757d; text-align: center; margin-top: 4px;">Photo 2</div>
                    </div>
                    <div class="tlm-photo-item">
                        <div class="tlm-photo-display" onclick="viewPhoto(3)">
                            ${tlmState.photos[3] ? 
                                `<img src="${tlmState.photos[3].dataUrl}" alt="Photo 3" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer;">` :
                                `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80px; border: 2px dashed #dee2e6; border-radius: 6px; cursor: pointer;">
                                    <svg class="camera-icon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #6c757d;">
                                        <path d="M12 2C11.1 2 10.3 2.6 9.8 3.4L9.2 4.5H6C4.9 4.5 4 5.4 4 6.5V18.5C4 19.6 4.9 20.5 6 20.5H18C19.1 20.5 20 19.6 20 18.5V6.5C20 5.4 19.1 4.5 18 4.5H14.8L14.2 3.4C13.7 2.6 12.9 2 12 2ZM12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7ZM12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z"/>
                                    </svg>
                                    <div style="font-size: 10px; color: #6c757d; text-align: center; margin-top: 4px;">No Photo</div>
                                </div>`
                            }
                        </div>
                        <div style="font-size: 10px; color: #6c757d; text-align: center; margin-top: 4px;">Photo 3</div>
                    </div>
                </div>
                
                <div class="tlm-comment-section">
                    <div class="tlm-section-subtitle">Latest Comment</div>
                    <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6; color: #495057; font-size: 14px; min-height: 60px;">
                        ${tlmState.comments ? tlmState.comments : 'No comments'}
                    </div>
                </div>
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
                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <button class="test-btn" onclick="testDevice()">Test Device</button>
                    ${isEdit ? '<button class="test-btn" style="background: #F44336;" onclick="removeTLM()">Remove Device</button>' : ''}
                </div>
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
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <input type="number" 
                               id="tlm-correction-factor" 
                               class="number-input" 
                               placeholder="0" 
                               value="${tlmState.correctionFactor || 0}"
                               step="0.1" 
                               max="0"
                               onchange="validateCorrectionFactor()"
                               style="flex: 1;">
                        <button type="button" class="new-btn" id="check-corr-factor-btn" onclick="openCorrectionFactorModal()" style="display: none;">
                            Check Corr Factor
                        </button>
                    </div>
                    <div class="correction-info">
                        Correction Factor: If the measured level doesn't match the strapping table reading, you can adjust the correction factor by cm. This shifts the entire strapping table up or down so the displayed gallons align more closely with the actual level.
                    </div>
                    <div class="validation-error" id="correction-factor-error" style="display: none;">Only negative values or 0 allowed</div>
                </div>
            </div>
            
            <!-- TLM Photos Section for Edit Mode (shown for all providers) -->
            <div class="form-group">
                <label>TLM Photos</label>
                <div class="tlm-photo-grid">
                    <div class="tlm-photo-item">
                        <label for="tlm-edit-photo-1" class="tlm-photo-upload">
                            <input type="file" id="tlm-edit-photo-1" accept="image/*" onchange="handleTLMPhoto(event, 1)">
                            <div class="tlm-photo-preview" id="tlm-edit-photo-preview-1">
                                <svg class="camera-icon" viewBox="0 0 24 24">
                                    <path d="M12 2C11.1 2 10.3 2.6 9.8 3.4L9.2 4.5H6C4.9 4.5 4 5.4 4 6.5V18.5C4 19.6 4.9 20.5 6 20.5H18C19.1 20.5 20 19.6 20 18.5V6.5C20 5.4 19.1 4.5 18 4.5H14.8L14.2 3.4C13.7 2.6 12.9 2 12 2ZM12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7ZM12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z"/>
                                </svg>
                                <div class="photo-text">Photo 1</div>
                            </div>
                        </label>
                    </div>
                    <div class="tlm-photo-item">
                        <label for="tlm-edit-photo-2" class="tlm-photo-upload">
                            <input type="file" id="tlm-edit-photo-2" accept="image/*" onchange="handleTLMPhoto(event, 2)">
                            <div class="tlm-photo-preview" id="tlm-edit-photo-preview-2">
                                <svg class="camera-icon" viewBox="0 0 24 24">
                                    <path d="M12 2C11.1 2 10.3 2.6 9.8 3.4L9.2 4.5H6C4.9 4.5 4 5.4 4 6.5V18.5C4 19.6 4.9 20.5 6 20.5H18C19.1 20.5 20 19.6 20 18.5V6.5C20 5.4 19.1 4.5 18 4.5H14.8L14.2 3.4C13.7 2.6 12.9 2 12 2ZM12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7ZM12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z"/>
                                </svg>
                                <div class="photo-text">Photo 2</div>
                            </div>
                        </label>
                    </div>
                    <div class="tlm-photo-item">
                        <label for="tlm-edit-photo-3" class="tlm-photo-upload">
                            <input type="file" id="tlm-edit-photo-3" accept="image/*" onchange="handleTLMPhoto(event, 3)">
                            <div class="tlm-photo-preview" id="tlm-edit-photo-preview-3">
                                <svg class="camera-icon" viewBox="0 0 24 24">
                                    <path d="M12 2C11.1 2 10.3 2.6 9.8 3.4L9.2 4.5H6C4.9 4.5 4 5.4 4 6.5V18.5C4 19.6 4.9 20.5 6 20.5H18C19.1 20.5 20 19.6 20 18.5V6.5C20 5.4 19.1 4.5 18 4.5H14.8L14.2 3.4C13.7 2.6 12.9 2 12 2ZM12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7ZM12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z"/>
                                </svg>
                                <div class="photo-text">Photo 3</div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <!-- TLM Comments Section for Edit Mode (shown for all providers) -->
            <div class="form-group">
                <label for="tlm-edit-comments">TLM Comments</label>
                <textarea id="tlm-edit-comments" class="tlm-comment-textarea" placeholder="Enter any comments about the TLM installation, issues, or observations..." rows="3"></textarea>
            </div>
        </div>
        
        <div class="tlm-actions" style="grid-template-columns: 1fr 1fr;">
            <button class="tlm-action-btn" onclick="cancelOperation()">Cancel</button>
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
    
    // Populate existing photos in edit mode
    if (currentMode === 'edit') {
        // Populate comment field
        const commentField = document.getElementById('tlm-edit-comments');
        if (commentField) {
            commentField.value = ''; // Always show blank comment box in edit mode
        }
        
        // Populate existing photos with delete button
        for (let i = 1; i <= 3; i++) {
            const photoPreview = document.getElementById(`tlm-edit-photo-preview-${i}`);
            if (photoPreview && tlmState.photos[i]) {
                photoPreview.style.position = 'relative';
                photoPreview.innerHTML = `
                    <img src="${tlmState.photos[i].dataUrl}" alt="TLM Photo ${i}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">
                    <button type="button" class="photo-delete-btn" onclick="event.preventDefault(); event.stopPropagation(); deleteTLMPhoto(${i});" style="
                        position: absolute;
                        top: 4px;
                        right: 4px;
                        width: 22px;
                        height: 22px;
                        border-radius: 50%;
                        background: rgba(244, 67, 54, 0.9);
                        border: none;
                        color: white;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 0;
                        line-height: 1;
                        z-index: 10;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">&times;</button>
                `;
            }
        }
        
        // Add comment change listener
        const commentInput = document.getElementById('tlm-edit-comments');
        if (commentInput) {
            commentInput.addEventListener('change', function() {
                // Don't auto-save in edit mode - wait for Save button
            });
        }
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

        // Show/hide Check Corr Factor button for specific providers
        const corrFactorBtn = document.getElementById('check-corr-factor-btn');
        if (corrFactorBtn) {
            if (['tekelek', 'tekelek-api', 'chevron-multitech'].includes(selectedProvider)) {
                corrFactorBtn.style.display = 'block';
            } else {
                corrFactorBtn.style.display = 'none';
            }
        }
    } else {
        providerFields.classList.remove('active');
        barcodeBtn.style.display = 'none';
        
        // Hide Check Corr Factor button when no provider selected
        const corrFactorBtn = document.getElementById('check-corr-factor-btn');
        if (corrFactorBtn) {
            corrFactorBtn.style.display = 'none';
        }
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
    
    // Save comments if in edit mode
    const commentField = document.getElementById('tlm-edit-comments');
    if (commentField && commentField.value.trim()) {
        tlmState.comments = commentField.value.trim();
        showSyncStatus('success', '💬 Comments saved');
    }
    
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
    if (confirm('Are you sure you want to remove this TLM? This will remove the configuration.')) {
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
    console.log('Opening strapping modal with tank type:', tankType);

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
    document.getElementById('table-name-display').textContent = 'Enter tank parameters to generate name...';
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
    console.log('calculateHeights called with maxHeight:', maxHeight);
    const percentages = [100, 80, 60, 40, 20];

    percentages.forEach(percentage => {
        const height = (maxHeight * percentage / 100).toFixed(1);
        const heightElement = document.getElementById(`height-${percentage}`);
        if (heightElement) {
            heightElement.textContent = height;
        }
    });

    generateTableName();
    validateStrappingForm();
}

// Update max volume
function updateMaxVolume() {
    const maxVolume = parseFloat(document.getElementById('max-volume').value) || 0;
    console.log('updateMaxVolume called with maxVolume:', maxVolume);
    const volume100Element = document.getElementById('volume-100');
    if (volume100Element) {
        volume100Element.textContent = maxVolume.toFixed(1);
    }

    generateTableName();
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
    
    generateTableName();
    return isValid;
}

// Generate automatic table name
function generateTableName() {
    const tankType = document.getElementById('tlm-tank-type').value;
    const maxHeight = parseFloat(document.getElementById('max-height').value) || 0;
    const maxVolume = parseFloat(document.getElementById('max-volume').value) || 0;
    
    const tableNameDisplay = document.getElementById('table-name-display');
    const tableNameInput = document.getElementById('table-name');
    
    if (!tankType || !maxHeight || !maxVolume) {
        tableNameDisplay.textContent = 'Enter tank parameters to generate name...';
        tableNameInput.value = '';
        return;
    }
    
    let tableName = '';
    
    if (tankType === 'vertical') {
        // Vertical naming: Vertical_Vol_{maxVolume}Gal_Height_{maxHeight}In_GPI_{calculated}
        const gpi = (maxVolume / maxHeight).toFixed(2);
        tableName = `Vertical_Vol_${maxVolume}Gal_Height_${maxHeight}In_GPI_${gpi}`;
    } else if (tankType === 'horizontal') {
        // Horizontal naming: Hor_Vol_{maxVolume}Gal_Height_{maxHeight}In_Vol80_{vol80}Gal_Vol60_{vol60}Gal_Vol40_{vol40}Gal_Vol20_{vol20}Gal
        const volume80 = parseFloat(document.getElementById('volume-80').value) || 0;
        const volume60 = parseFloat(document.getElementById('volume-60').value) || 0;
        const volume40 = parseFloat(document.getElementById('volume-40').value) || 0;
        const volume20 = parseFloat(document.getElementById('volume-20').value) || 0;
        
        tableName = `Hor_Vol_${maxVolume}Gal_Height_${maxHeight}In`;
        
        if (volume80 > 0) tableName += `_Vol80_${volume80}Gal`;
        if (volume60 > 0) tableName += `_Vol60_${volume60}Gal`;
        if (volume40 > 0) tableName += `_Vol40_${volume40}Gal`;
        if (volume20 > 0) tableName += `_Vol20_${volume20}Gal`;
    }
    
    tableNameDisplay.textContent = tableName;
    tableNameInput.value = tableName;
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

    console.log('Validating strapping form:', {
        tankType,
        tableName,
        maxHeight,
        maxVolume,
        maxHeightInput,
        maxVolumeInput
    });

    let isValid = true;

    // Table name is auto-generated, so no need to validate it manually

    // Check tank type is selected
    if (!tankType) {
        console.log('Validation failed: no tank type');
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
    console.log('Final validation result:', { isValid, tankType, maxHeight, maxVolume });
    if (saveBtn) {
        saveBtn.disabled = !isValid;
        // Make sure button has correct styling
        if (isValid) {
            saveBtn.style.background = '#4CAF50';
            saveBtn.style.cursor = 'pointer';
            console.log('Save button ENABLED');
        } else {
            saveBtn.style.background = '#cccccc';
            saveBtn.style.cursor = 'not-allowed';
            console.log('Save button DISABLED');
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
        // Add Measurement Points section first (moved from below)
        if (table.tankType === 'horizontal' && table.data.measurements) {
            // Horizontal tank - show all 5 measurement points
            content += `
                <div class="form-group" style="margin-top: 15px;">
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
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${measurement.height}
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
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
        } else if (table.tankType === 'vertical') {
            // Vertical tank - show all measurement points (calculated from linear relationship)
            const maxH = parseFloat(table.data.maxHeight);
            const maxV = parseFloat(table.data.maxVolume);

            content += `
                <div class="form-group" style="margin-top: 15px;">
                    <label>Measurement Points</label>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 15px;">
                        <div class="table-header">
                            <div>Fill Level</div>
                            <div>Height (in)</div>
                            <div>Volume (gal)</div>
                        </div>
                        <div class="table-row">
                            <div class="percentage-label">100%</div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${maxH.toFixed(1)}
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${maxV.toFixed(1)}
                            </div>
                        </div>
                        <div class="table-row">
                            <div class="percentage-label">80%</div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxH * 0.8).toFixed(1)}
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxV * 0.8).toFixed(1)}
                            </div>
                        </div>
                        <div class="table-row">
                            <div class="percentage-label">60%</div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxH * 0.6).toFixed(1)}
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxV * 0.6).toFixed(1)}
                            </div>
                        </div>
                        <div class="table-row">
                            <div class="percentage-label">40%</div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxH * 0.4).toFixed(1)}
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxV * 0.4).toFixed(1)}
                            </div>
                        </div>
                        <div class="table-row">
                            <div class="percentage-label">20%</div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxH * 0.2).toFixed(1)}
                            </div>
                            <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
                                ${(maxV * 0.2).toFixed(1)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Add visual curve display (Strapping Curve with Correction Factor)
        content += generateCurveDisplay(table);

        // Add Volume vs Height Curve visualization
        if (table.tankType === 'horizontal' && table.data.measurements) {
            // Horizontal - Cubic Regression
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
            // Vertical - Linear Relationship
            const galPerInch = (table.data.maxVolume / table.data.maxHeight).toFixed(2);
            content += `
                <div class="form-group" style="margin-top: 20px;">
                    <label>Volume vs Height Curve (Linear)</label>
                    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px;">
                        <canvas id="linearCanvas" width="400" height="250" style="width: 100%; max-width: 400px; height: auto; border: 1px solid #f0f0f0; border-radius: 8px;"></canvas>
                        <div style="margin-top: 10px; font-size: 12px; color: #666; text-align: center;">
                            <div>Linear Relationship: Constant rate of ${galPerInch} gallons per inch</div>
                            <div>Linear Function: y = b - mx (inverse relationship)</div>
                            <div id="linearEquationText" style="margin-top: 5px; font-family: monospace; color: #1976d2; font-weight: 500;">
                                Volume = ${table.data.maxVolume} - (${galPerInch} × Height)
                            </div>
                        </div>
                    </div>
                </div>
            `;
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
    
    // Draw the curves based on tank type
    if (table.data) {
        if (table.tankType === 'horizontal' && table.data.measurements) {
            setTimeout(() => drawRegressionCurve(table.data), 100);
        } else if (table.tankType === 'vertical') {
            setTimeout(() => drawLinearCurve(table.data), 100);
        }
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
        
        // Generate inch-by-inch readings from max height to 0 (descending display)
        // Debug logging
        console.log('Vertical Tank - Max Height:', maxHeight, 'Max Volume:', maxVolume, 'Gal/Inch:', galPerInch);
        
        for (let inch = maxHeight; inch >= 0; inch--) {
            // For descending display, calculate volume that corresponds to this height
            // When inch is high (maxHeight), volume should be high (maxVolume)
            // When inch is low (0), volume should be low (0)
            const correctedInch = inch + correctionInches;
            const finalVolume = Math.max(0, Math.min(maxVolume, (correctedInch * galPerInch)));
            
            // Debug first few rows
            if (inch >= maxHeight - 3) {
                console.log(`Row: Inch=${inch}" Volume=${finalVolume.toFixed(1)} gal`);
            }
            
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
        
        // Generate inch-by-inch readings using interpolation (descending display)
        for (let inch = maxHeight; inch >= 0; inch--) {
            let volume = 0;
            
            // For descending display visualization, we want to show both columns descending
            // So we calculate the volume for the DISPLAY height (maxHeight - inch gives us ascending order)
            const displayHeight = maxHeight - inch;
            
            if (dataPoints.length >= 2) {
                // Simple linear interpolation between nearest points
                let lowerPoint = dataPoints[0];
                let upperPoint = dataPoints[dataPoints.length - 1];
                
                for (let i = 0; i < dataPoints.length - 1; i++) {
                    if (displayHeight >= dataPoints[i].height && displayHeight <= dataPoints[i + 1].height) {
                        lowerPoint = dataPoints[i];
                        upperPoint = dataPoints[i + 1];
                        break;
                    }
                }
                
                // Linear interpolation
                const heightDiff = upperPoint.height - lowerPoint.height;
                const volumeDiff = upperPoint.volume - lowerPoint.volume;
                const ratio = heightDiff === 0 ? 0 : (displayHeight - lowerPoint.height) / heightDiff;
                volume = lowerPoint.volume + (ratio * volumeDiff);
            }
            
            // Apply correction factor
            const correctedHeight = displayHeight + correctionInches;
            if (correctedHeight >= 0 && correctedHeight <= maxHeight) {
                // Recalculate volume for corrected reading
                let correctedVolume = 0;
                if (dataPoints.length >= 2) {
                    let lowerPoint = dataPoints[0];
                    let upperPoint = dataPoints[dataPoints.length - 1];
                    
                    for (let i = 0; i < dataPoints.length - 1; i++) {
                        if (correctedHeight >= dataPoints[i].height && correctedHeight <= dataPoints[i + 1].height) {
                            lowerPoint = dataPoints[i];
                            upperPoint = dataPoints[i + 1];
                            break;
                        }
                    }
                    
                    const heightDiff = upperPoint.height - lowerPoint.height;
                    const volumeDiff = upperPoint.volume - lowerPoint.volume;
                    const ratio = heightDiff === 0 ? 0 : (correctedHeight - lowerPoint.height) / heightDiff;
                    correctedVolume = lowerPoint.volume + (ratio * volumeDiff);
                }
                volume = Math.max(0, Math.min(maxVolume, correctedVolume));
            } else {
                volume = correctedHeight < 0 ? 0 : maxVolume;
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

// Draw linear curve for vertical tanks
function drawLinearCurve(tableData) {
    const canvas = document.getElementById('linearCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const maxHeight = parseFloat(tableData.maxHeight);
    const maxVolume = parseFloat(tableData.maxVolume);

    if (isNaN(maxHeight) || isNaN(maxVolume) || maxHeight <= 0 || maxVolume <= 0) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Invalid tank dimensions', width / 2, height / 2);
        return;
    }

    // Data points: (0, maxVolume) at top-left of line, (maxHeight, 0) at bottom-right
    // When height reading is 0 (full tank), volume is max
    // When height reading is max (empty tank), volume is 0
    const dataPoints = [
        { x: 0, y: maxVolume },
        { x: maxHeight, y: 0 }
    ];

    // Set up margins and plot area
    const margin = 40;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;

    // Scaling - axes start at 0 with some padding on the max end
    const xPadding = maxHeight * 0.1;
    const yPadding = maxVolume * 0.1;
    const plotMinX = 0;
    const plotMaxX = maxHeight + xPadding;
    const plotMinY = 0;
    const plotMaxY = maxVolume + yPadding;

    function scaleX(x) {
        return margin + (x - plotMinX) / (plotMaxX - plotMinX) * plotWidth;
    }

    function scaleY(y) {
        return height - margin - (y - plotMinY) / (plotMaxY - plotMinY) * plotHeight;
    }

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // X-axis (at y=0)
    ctx.beginPath();
    ctx.moveTo(margin, scaleY(0));
    ctx.lineTo(width - margin, scaleY(0));
    ctx.stroke();

    // Y-axis (at x=0)
    ctx.beginPath();
    ctx.moveTo(scaleX(0), margin);
    ctx.lineTo(scaleX(0), height - margin);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Vertical grid lines
    for (let i = 1; i <= 4; i++) {
        const x = (i / 4) * maxHeight;
        const screenX = scaleX(x);
        ctx.beginPath();
        ctx.moveTo(screenX, margin);
        ctx.lineTo(screenX, height - margin);
        ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 1; i <= 4; i++) {
        const y = (i / 4) * maxVolume;
        const screenY = scaleY(y);
        ctx.beginPath();
        ctx.moveTo(margin, screenY);
        ctx.lineTo(width - margin, screenY);
        ctx.stroke();
    }

    // Draw linear line (descending: from maxVolume at 0 height to 0 at maxHeight)
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(maxVolume));
    ctx.lineTo(scaleX(maxHeight), scaleY(0));
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#FF5722';
    dataPoints.forEach(point => {
        const screenX = scaleX(point.x);
        const screenY = scaleY(point.y);
        ctx.beginPath();
        ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Add labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    // X-axis label
    ctx.fillText('Height / Deadspace (Inches)', width / 2, height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Volume (Gallons)', 0, 0);
    ctx.restore();

    // Add scale labels
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';

    // X-axis scale (starting at 0)
    for (let i = 0; i <= 4; i++) {
        const x = (i / 4) * maxHeight;
        const screenX = scaleX(x);
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(x), screenX, height - margin + 15);
    }

    // Y-axis scale
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * maxVolume;
        const screenY = scaleY(y);
        ctx.fillText(Math.round(y), margin - 5, screenY + 3);
    }

    // Add point labels
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';

    // Label for (0, maxVolume) - Full tank
    ctx.textAlign = 'left';
    ctx.fillText(`100%, ${maxVolume} gal`, scaleX(0) + 8, scaleY(maxVolume) + 15);

    // Label for (maxHeight, 0) - Empty tank
    ctx.textAlign = 'right';
    ctx.fillText('0%, 0 gal', scaleX(maxHeight) - 8, scaleY(0) - 5);
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

// Handle TLM Photo uploads
function handleTLMPhoto(event, photoNumber) {
    console.log('handleTLMPhoto called with photoNumber:', photoNumber);
    console.log('Event:', event);

    const file = event.target.files[0];
    console.log('File selected:', file);

    if (!file) {
        console.log('No file selected');
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }

    // Check if there's already a photo in this slot
    if (tlmState.photos[photoNumber]) {
        if (!confirm('Are you sure you want to replace the photo?')) {
            // User cancelled, reset the file input
            event.target.value = '';
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('FileReader onload triggered');

        // Check if we're in edit mode and update the edit preview
        const editPreview = document.getElementById(`tlm-edit-photo-preview-${photoNumber}`);
        console.log('Looking for preview element:', `tlm-edit-photo-preview-${photoNumber}`);
        console.log('Found preview element:', editPreview);

        if (editPreview) {
            editPreview.innerHTML = `
                <img src="${e.target.result}" alt="TLM Photo ${photoNumber}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">
                <button type="button" class="photo-delete-btn" onclick="event.preventDefault(); event.stopPropagation(); deleteTLMPhoto(${photoNumber});" style="
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: rgba(244, 67, 54, 0.9);
                    border: none;
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    line-height: 1;
                    z-index: 10;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">&times;</button>
            `;
            editPreview.style.position = 'relative';
            console.log('Image inserted into preview');
        } else {
            console.log('Preview element not found!');
        }

        // Store in TLM state
        tlmState.photos[photoNumber] = {
            file: file,
            dataUrl: e.target.result,
            uploadedAt: new Date().toISOString()
        };

        console.log(`TLM Photo ${photoNumber} uploaded:`, tlmState.photos[photoNumber]);

        // Show success notification
        showSyncStatus('success', `📷 Photo ${photoNumber} uploaded successfully`);
    };

    reader.onerror = function(e) {
        console.error('FileReader error:', e);
    };

    reader.readAsDataURL(file);
}

// Make handleTLMPhoto globally available
window.handleTLMPhoto = handleTLMPhoto;

// Delete TLM Photo with confirmation
function deleteTLMPhoto(photoNumber) {
    if (confirm('Are you sure you want to delete the photo?')) {
        // Remove from state
        delete tlmState.photos[photoNumber];

        // Reset the preview back to the camera icon
        const editPreview = document.getElementById(`tlm-edit-photo-preview-${photoNumber}`);
        if (editPreview) {
            editPreview.style.position = '';
            editPreview.innerHTML = `
                <svg class="camera-icon" viewBox="0 0 24 24">
                    <path d="M12 2C11.1 2 10.3 2.6 9.8 3.4L9.2 4.5H6C4.9 4.5 4 5.4 4 6.5V18.5C4 19.6 4.9 20.5 6 20.5H18C19.1 20.5 20 19.6 20 18.5V6.5C20 5.4 19.1 4.5 18 4.5H14.8L14.2 3.4C13.7 2.6 12.9 2 12 2ZM12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7ZM12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z"/>
                </svg>
                <div class="photo-text">Photo ${photoNumber}</div>
            `;
        }

        // Reset the file input so the same file can be selected again
        const fileInput = document.getElementById(`tlm-edit-photo-${photoNumber}`);
        if (fileInput) {
            fileInput.value = '';
        }

        // Show notification
        showSyncStatus('success', `🗑️ Photo ${photoNumber} deleted`);

        console.log(`TLM Photo ${photoNumber} deleted`);
    }
}

// Make deleteTLMPhoto globally available
window.deleteTLMPhoto = deleteTLMPhoto;

// View photo in larger format
function viewPhoto(photoNumber) {
    if (!tlmState.photos[photoNumber]) {
        return;
    }
    
    // Create a modal to show the image
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = tlmState.photos[photoNumber].dataUrl;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    // Close on click
    modal.onclick = () => {
        document.body.removeChild(modal);
    };
}

// Save TLM Comments
function saveTLMComments(comments) {
    tlmState.comments = comments;
    console.log('TLM Comments saved:', comments);
    
    // Show save notification if there's content
    if (comments.trim()) {
        showSyncStatus('success', '💬 Comments saved');
    }
}

// Note: handleTLMPhoto is defined above (around line 2121) - removed duplicate

// TLM Configuration (placeholder for future implementation)
function openTLMConfig() {
    // This could open a more detailed TLM configuration modal
    // For now, we'll show a simple alert
    alert('TLM Configuration panel would open here.\n\nThis will allow you to:\n• Set provider and device ID\n• Configure communication settings\n• Test connection\n• View diagnostics');
}

// Correction Factor Calculator Variables
let correctionCalculatorData = {
    tlmReading: null,
    tlmReadingTime: null,
    tlmCm: undefined,
    manualReading: null,
    manualReadingTime: null,
    manualCm: undefined,
    calculatedFactor: null
};

// Open Correction Factor Modal
function openCorrectionFactorModal() {
    document.getElementById('correctionFactorModal').classList.add('active');
    
    // Reset data
    correctionCalculatorData = {
        tlmReading: null,
        tlmReadingTime: null,
        tlmCm: undefined,
        manualReading: null,
        manualReadingTime: null,
        manualCm: undefined,
        calculatedFactor: null
    };

    // Load initial readings
    checkTLMReading();
    checkManualReading();
    updateCalculationUI();
}

// Close Correction Factor Modal
function closeCorrectionFactorModal() {
    document.getElementById('correctionFactorModal').classList.remove('active');
}

// Check TLM Reading
function checkTLMReading() {
    // Simulate getting TLM reading from database
    const statusElement = document.getElementById('tlm-reading-status');
    const valueElement = document.getElementById('tlm-reading-value');
    const cmElement = document.getElementById('tlm-reading-cm');
    const timeElement = document.getElementById('tlm-reading-time');

    statusElement.textContent = 'Checking...';
    statusElement.style.background = '#6c757d';

    // Simulate API call delay
    setTimeout(() => {
        // Generate mock TLM reading data
        const now = new Date();
        const readingTime = new Date(now.getTime() - (Math.random() * 45 * 60 * 1000)); // Random time within last 45 minutes
        const isCurrentReading = (now - readingTime) <= (30 * 60 * 1000); // Within 30 minutes

        const reading = (180 + Math.random() * 20).toFixed(2); // Random reading between 180-200 gallons

        correctionCalculatorData.tlmReading = parseFloat(reading);
        correctionCalculatorData.tlmReadingTime = readingTime;

        // Calculate and store cm value from strapping table
        const cmValue = gallonsToCm(parseFloat(reading));
        correctionCalculatorData.tlmCm = cmValue;

        valueElement.textContent = `${reading} GAL`;
        cmElement.textContent = `${cmValue.toFixed(2)} cm (from strapping table)`;
        timeElement.textContent = `Last reading: ${readingTime.toLocaleString()}`;

        if (isCurrentReading) {
            statusElement.textContent = 'Current';
            statusElement.style.background = '#28a745';
        } else {
            statusElement.textContent = 'Outdated';
            statusElement.style.background = '#dc3545';
        }

        updateCalculationUI();
    }, 1000);
}

// Check Manual Reading
function checkManualReading() {
    // Simulate getting manual reading from database
    const statusElement = document.getElementById('manual-reading-status');
    const valueElement = document.getElementById('manual-reading-value');
    const cmElement = document.getElementById('manual-reading-cm');
    const timeElement = document.getElementById('manual-reading-time');

    statusElement.textContent = 'Checking...';
    statusElement.style.background = '#6c757d';

    // Simulate API call delay
    setTimeout(() => {
        // Generate mock manual reading data
        const now = new Date();
        const readingTime = new Date(now.getTime() - (Math.random() * 45 * 60 * 1000)); // Random time within last 45 minutes
        const isCurrentReading = (now - readingTime) <= (30 * 60 * 1000); // Within 30 minutes

        const reading = (175 + Math.random() * 25).toFixed(2); // Random reading between 175-200 gallons

        correctionCalculatorData.manualReading = parseFloat(reading);
        correctionCalculatorData.manualReadingTime = readingTime;

        // Calculate and store cm value from strapping table
        const cmValue = gallonsToCm(parseFloat(reading));
        correctionCalculatorData.manualCm = cmValue;

        valueElement.textContent = `${reading} GAL`;
        cmElement.textContent = `${cmValue.toFixed(2)} cm (from strapping table)`;
        timeElement.textContent = `Last reading: ${readingTime.toLocaleString()}`;

        if (isCurrentReading) {
            statusElement.textContent = 'Current';
            statusElement.style.background = '#28a745';
        } else {
            statusElement.textContent = 'Outdated';
            statusElement.style.background = '#dc3545';
        }

        updateCalculationUI();
    }, 1200);
}

// Enter New Manual Reading
function enterNewManualReading() {
    document.getElementById('manualReadingModal').classList.add('active');
    document.getElementById('manual-reading-input').value = '';
    document.getElementById('manual-reading-input').focus();
}

// Close Manual Reading Modal
function closeManualReadingModal() {
    document.getElementById('manualReadingModal').classList.remove('active');
}

// Save Manual Reading
function saveManualReading() {
    const input = document.getElementById('manual-reading-input');
    const value = parseFloat(input.value);

    if (!value || value <= 0) {
        alert('Please enter a valid reading value');
        return;
    }

    // Update manual reading data
    correctionCalculatorData.manualReading = value;
    correctionCalculatorData.manualReadingTime = new Date();

    // Calculate and store cm value from strapping table
    const cmValue = gallonsToCm(value);
    correctionCalculatorData.manualCm = cmValue;

    // Update UI
    document.getElementById('manual-reading-value').textContent = `${value.toFixed(2)} GAL`;
    document.getElementById('manual-reading-cm').textContent = `${cmValue.toFixed(2)} cm (from strapping table)`;
    document.getElementById('manual-reading-time').textContent = `Last reading: ${new Date().toLocaleString()}`;
    document.getElementById('manual-reading-status').textContent = 'Current';
    document.getElementById('manual-reading-status').style.background = '#28a745';

    closeManualReadingModal();
    updateCalculationUI();
}

// Update Calculation UI
function updateCalculationUI() {
    const previewElement = document.getElementById('calculation-preview');
    const calculateBtn = document.getElementById('calculate-btn');
    const applyBtn = document.getElementById('apply-btn');

    const tlmStatus = document.getElementById('tlm-reading-status').textContent;
    const manualStatus = document.getElementById('manual-reading-status').textContent;

    // Check if both readings are current (green)
    const bothCurrent = tlmStatus === 'Current' && manualStatus === 'Current';

    if (correctionCalculatorData.tlmCm !== undefined && correctionCalculatorData.manualCm !== undefined) {
        if (bothCurrent) {
            // Only show calculation when both readings are current
            const tlmCm = correctionCalculatorData.tlmCm;
            const manualCm = correctionCalculatorData.manualCm;
            const offset = manualCm - tlmCm;

            previewElement.textContent = `${manualCm.toFixed(2)} cm (Manual) - ${tlmCm.toFixed(2)} cm (TLM) = ${offset.toFixed(2)} cm offset`;
            calculateBtn.disabled = false;
            calculateBtn.textContent = 'Calculate Correction Factor';
        } else {
            // Don't show calculation if either reading is outdated
            previewElement.textContent = 'Both readings must be current to calculate';
            calculateBtn.disabled = true;
            calculateBtn.textContent = 'Calculate Correction Factor';
        }
    } else {
        previewElement.textContent = 'Loading readings...';
        calculateBtn.disabled = true;
        calculateBtn.textContent = 'Calculate Correction Factor';
    }

    // Disable apply button until calculation is done
    applyBtn.disabled = correctionCalculatorData.calculatedFactor === null;
}

// Calculate Correction Factor
function calculateCorrectionFactor() {
    const tlmCm = correctionCalculatorData.tlmCm;
    const manualCm = correctionCalculatorData.manualCm;

    if (tlmCm === undefined || manualCm === undefined) {
        alert('Both readings must be available to calculate');
        return;
    }

    // Check if both readings are current
    const tlmStatus = document.getElementById('tlm-reading-status').textContent;
    const manualStatus = document.getElementById('manual-reading-status').textContent;

    if (tlmStatus !== 'Current' || manualStatus !== 'Current') {
        alert('Both readings must be current to calculate the correction factor');
        return;
    }

    // Calculate correction factor: Manual cm - TLM cm = Offset
    // Manual volume is always MORE, so Manual cm is always LESS
    // This gives a NEGATIVE offset (correction factor should always be negative or zero)
    // Example: TLM reads 180 gal (10 cm), Manual is 200 gal (0 cm)
    // Offset = 0 - 10 = -10 cm
    const offset = manualCm - tlmCm;
    correctionCalculatorData.calculatedFactor = offset;

    // Update UI
    const previewElement = document.getElementById('calculation-preview');
    previewElement.innerHTML = `
        <div style="color: #28a745; font-weight: 600;">
            Calculated Correction Factor: ${offset.toFixed(2)} cm
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">
            ${manualCm.toFixed(2)} cm (Manual) - ${tlmCm.toFixed(2)} cm (TLM) = ${offset.toFixed(2)} cm offset
        </div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">
            TLM: ${correctionCalculatorData.tlmReading.toFixed(2)} GAL | Manual: ${correctionCalculatorData.manualReading.toFixed(2)} GAL
        </div>
    `;

    document.getElementById('apply-btn').disabled = false;

    showSyncStatus('success', `✅ Correction factor calculated: ${offset.toFixed(2)} cm`);
}

// Apply Correction Factor
function applyCorrectionFactor() {
    if (correctionCalculatorData.calculatedFactor === null) {
        alert('Please calculate the correction factor first');
        return;
    }
    
    const factor = correctionCalculatorData.calculatedFactor;
    
    // Update the correction factor input
    const correctionInput = document.getElementById('tlm-correction-factor');
    if (correctionInput) {
        correctionInput.value = factor.toFixed(2);
        
        // Trigger validation
        validateCorrectionFactor();
        
        // Update TLM state
        tlmState.correctionFactor = factor;
    }
    
    closeCorrectionFactorModal();
    showSyncStatus('success', `🎯 Correction factor applied: ${factor.toFixed(2)} cm`);
}