# User Story: Create Horizontal Strapping Table

## Story Title
As a tank operator, I want to create a horizontal strapping table so that I can accurately convert tank level measurements to volume readings for horizontal cylindrical tanks with non-linear volume curves.

## User Story ID
FSX-002

## Priority
High

## Story Points
8

## Acceptance Criteria

### 1. Access Strapping Table Creation
- **Given** I am in the TLM (Tank Level Monitoring) configuration screen
- **And** I have selected "Horizontal" as the tank type in the main form
- **When** I click the "+ New" button next to the Strapping Table dropdown
- **Then** A modal dialog should open titled "Create New Horizontal Strapping Table"

### 2. Required Fields and Percentage Table Display
- **Given** The strapping table creation modal is open for a horizontal tank
- **When** I view the form
- **Then** I should see the following required fields:
  - Table Name (text input with red asterisk)
  - Max Tank Height in inches (number input with red asterisk)
  - Max Tank Volume in gallons (number input with red asterisk)
- **And** A percentage table should be displayed with the following rows:
  - 100% (read-only, auto-calculated)
  - 80% (editable volume input)
  - 60% (editable volume input)
  - 40% (editable volume input)
  - 20% (editable volume input)
- **And** Each row shows: Fill Level | Height (in) | Volume (gal)
- **And** The "Save Table" button should be disabled (greyed out) initially

### 3. Dynamic Height Calculation
- **Given** I am creating a horizontal strapping table
- **When** I enter a Max Tank Height value (e.g., 48 inches)
- **Then** The height column should auto-calculate for each percentage:
  - 100%: 48.0 inches (matches max height)
  - 80%: 38.4 inches (80% of max height)
  - 60%: 28.8 inches (60% of max height)
  - 40%: 19.2 inches (40% of max height)
  - 20%: 9.6 inches (20% of max height)

### 4. Volume Field Behavior
- **Given** The percentage table is displayed
- **When** I enter the Max Tank Volume (e.g., 8000 gallons)
- **Then** The 100% volume should auto-populate with the max volume value
- **And** The 80%, 60%, 40%, and 20% volume fields should remain editable
- **And** These volume fields are optional (can be left empty)
- **And** If entered, volumes must be in descending order (each tier less than the one above)

### 5. Volume Order Validation
- **Given** I have entered volume values in the percentage fields
- **When** I enter a volume that is greater than or equal to a higher percentage volume
- **Then** The invalid field should be highlighted in red
- **And** An error message should appear: "Each tier must be less than the one above"
- **And** The "Save Table" button should remain disabled until the error is corrected

### 6. Save Button Enablement
- **Given** I am creating a horizontal strapping table
- **When** I have filled in all required fields:
  - Table Name: "Horizontal Tank A"
  - Max Tank Height: 48
  - Max Tank Volume: 8000
- **Then** The "Save Table" button should become enabled (green background)
- **And** Volume percentage fields are optional - button enables regardless of whether they're filled
- **But** If volume percentages are entered, they must pass validation

### 7. Save Strapping Table
- **Given** All required fields are filled and validation passes
- **When** I click the "Save Table" button
- **Then** The system should:
  - Create a new strapping table with a unique ID
  - Store the table configuration including all percentage measurements
  - Close the modal automatically
  - Display a success message: "✅ Strapping table '[Table Name]' created"
  - Select the newly created table in the parent form's dropdown
  - Update the TLM state to reference this strapping table

### 8. Cancel Operation
- **Given** The strapping table creation modal is open
- **When** I click the "Cancel" button
- **Then** The modal should close without saving
- **And** All entered data should be discarded
- **And** The parent form should remain unchanged

## Technical Requirements

### Data Model
```javascript
strappingTable = {
    value: 'table_[timestamp]',  // Unique identifier
    name: 'User Entered Name',   // Display name
    tankType: 'horizontal',      // Tank type
    data: {
        tankType: 'horizontal',
        maxHeight: 48,           // in inches
        maxVolume: 8000,         // in gallons
        measurements: {
            100: { height: 48.0, volume: 8000 },
            80: { height: 38.4, volume: 6400 },  // Optional
            60: { height: 28.8, volume: 4800 },  // Optional
            40: { height: 19.2, volume: 3200 },  // Optional
            20: { height: 9.6, volume: 1600 }    // Optional
        }
    }
}
```

### Validation Rules
1. **Table Name**: 
   - Required field
   - Must not be empty
   - Trimmed of whitespace

2. **Max Tank Height**:
   - Required field
   - Must be a positive number (> 0)
   - Accepts decimal values (step 0.1)
   - Unit: inches
   - Triggers height recalculation for all percentages

3. **Max Tank Volume**:
   - Required field  
   - Must be a positive number (> 0)
   - Accepts decimal values (step 0.1)
   - Unit: gallons
   - Auto-populates 100% volume field

4. **Percentage Volumes (80%, 60%, 40%, 20%)**:
   - Optional fields
   - If entered, must be positive numbers
   - Must be in descending order (each < previous tier)
   - 80% volume < 100% volume
   - 60% volume < 80% volume (if 80% is entered)
   - And so on...

### Height Calculation Logic
```javascript
function calculateHeights() {
    const maxHeight = parseFloat(maxHeightInput) || 0;
    const percentages = [100, 80, 60, 40, 20];
    
    percentages.forEach(percentage => {
        const height = (maxHeight * percentage / 100).toFixed(1);
        document.getElementById(`height-${percentage}`).textContent = height;
    });
}
```

### Volume Validation Logic
```javascript
function validateVolumeOrder() {
    const volumes = {
        100: maxVolume,
        80: parseFloat(volume80Input) || 0,
        60: parseFloat(volume60Input) || 0,
        40: parseFloat(volume40Input) || 0,
        20: parseFloat(volume20Input) || 0
    };
    
    // Check descending order only for entered values
    const percentages = [100, 80, 60, 40, 20];
    for (let i = 1; i < percentages.length; i++) {
        const current = volumes[percentages[i]];
        const previous = volumes[percentages[i-1]];
        
        if (current > 0 && previous > 0 && current >= previous) {
            return false; // Invalid order
        }
    }
    return true;
}
```

### UI Components
- Modal dialog with semi-transparent overlay
- Form with labeled input fields
- Dynamic percentage table with calculated heights
- Editable volume inputs with real-time validation
- Visual error indicators (red borders, error messages)
- Required field indicators (red asterisks)
- Two action buttons: Cancel (grey) and Save Table (green when enabled)
- Success notification toast

## Business Rules
1. Horizontal tanks have non-linear volume curves due to cylindrical geometry
2. Volume at different fill levels must be measured or estimated for accuracy
3. Percentage volume entries are optional but recommended for precision
4. If percentage volumes are provided, they must be in strict descending order
5. The 100% volume is always equal to the maximum tank volume
6. Height calculations are linear (percentage of max height)
7. Each strapping table must have a unique identifier

## Edge Cases
1. **Empty Percentage Volumes**: Save button enables even if percentage volumes are not entered
2. **Partial Volume Data**: User can enter some percentages and leave others empty
3. **Equal Volume Values**: System rejects equal values between adjacent percentages
4. **Very Large Numbers**: Support for industrial-sized tanks with large volumes
5. **Decimal Precision**: Heights calculated to 1 decimal place, volumes support decimals
6. **Tank Type Change**: If user changes tank type in parent form, modal should reflect new type

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Percentage table displays correctly for horizontal tanks
- [ ] Height auto-calculation works for all percentages
- [ ] Volume order validation prevents invalid entries
- [ ] Save operation creates valid strapping table with measurements
- [ ] Optional percentage volumes handled correctly
- [ ] Modal properly opens and closes
- [ ] Success message displays after save
- [ ] New table is selectable in parent form
- [ ] Real-time validation provides immediate feedback
- [ ] Code follows project conventions
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive design verified
- [ ] Accessibility standards met (WCAG 2.1 AA)

## User Experience Flow
1. **Open Modal**: Select "Horizontal" tank type, click "+ New"
2. **Fill Basic Info**: Enter table name, max height, max volume
3. **Review Calculated Heights**: Observe auto-calculated heights for each percentage
4. **Enter Volume Data (Optional)**: Add volume measurements for 80%, 60%, 40%, 20% levels
5. **Validate Order**: System ensures volumes are in descending order
6. **Save**: Click Save Table button (enabled when required fields complete)
7. **Confirmation**: See success message and new table selected

## Dependencies
- TLM configuration form must be loaded
- Tank type must be selectable in parent form
- Percentage table rendering capability
- Real-time validation system
- Height calculation engine

## Notes for Developers
- Horizontal tanks require more complex validation than vertical tanks
- The percentage table should only show for horizontal tank type
- Height calculations should update immediately when max height changes
- Volume validation should trigger on every input change
- Consider debouncing validation calls for better performance
- The non-linear volume curve is approximated by user-provided percentage points
- Future enhancement could include cubic interpolation between points

## Test Scenarios

### Happy Path
1. Create horizontal strapping table with all percentage volumes
2. Create horizontal strapping table with only some percentage volumes
3. Create horizontal strapping table with no percentage volumes
4. Verify height auto-calculation with various max height values
5. Test save operation and verify data structure

### Validation Testing
6. Try to save with empty required fields
7. Enter volumes in ascending order (should fail)
8. Enter equal volumes for adjacent percentages (should fail)
9. Enter negative or zero values in volume fields
10. Test with decimal values in all fields

### Edge Cases
11. Enter very large numbers (10,000+ gallons)
12. Test with very small height values (< 1 inch)
13. Cancel operation and verify no changes
14. Change max height and verify all heights recalculate
15. Change max volume and verify 100% volume updates

### User Experience
16. Verify percentage table appears only for horizontal tanks
17. Test keyboard navigation through percentage inputs
18. Verify error messages appear and disappear correctly
19. Test responsive design on mobile devices
20. Verify accessibility with screen readers

## Future Enhancements
- Cubic interpolation algorithm for smoother volume curves
- Visual graph showing height-to-volume relationship
- Import percentage data from CSV files
- Tank calibration wizard with measurement guidance
- Different horizontal tank shapes (oval, rectangular)
- API integration with tank measurement services
- Bulk percentage data entry
- Copy percentage data from similar tanks
- Export strapping table reports
- Integration with CAD systems for automatic calculations