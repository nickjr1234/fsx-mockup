# User Story: Create Vertical Strapping Table

## Story Title
As a tank operator, I want to create a vertical strapping table so that I can accurately convert tank level measurements to volume readings for vertical cylindrical tanks.

## User Story ID
FSX-001

## Priority
High

## Story Points
5

## Acceptance Criteria

### 1. Access Strapping Table Creation
- **Given** I am in the TLM (Tank Level Monitoring) configuration screen
- **And** I have selected "Vertical" as the tank type in the main form
- **When** I click the "+ New" button next to the Strapping Table dropdown
- **Then** A modal dialog should open titled "Create New Vertical Strapping Table"

### 2. Required Fields Validation
- **Given** The strapping table creation modal is open for a vertical tank
- **When** I view the form
- **Then** I should see the following required fields:
  - Table Name (text input with red asterisk)
  - Max Tank Height in inches (number input with red asterisk)
  - Max Tank Volume in gallons (number input with red asterisk)
- **And** The "Save Table" button should be disabled (greyed out) initially

### 3. Field Entry and Validation
- **Given** I am creating a vertical strapping table
- **When** I enter values in the required fields:
  - Table Name: "Vertical Tank 1"
  - Max Tank Height: 120 (inches)
  - Max Tank Volume: 5000 (gallons)
- **Then** The "Save Table" button should become enabled (green background)
- **And** If I clear any required field, the button should disable again
- **And** Appropriate error messages should display under empty required fields

### 4. Save Strapping Table
- **Given** All required fields are filled with valid data
- **When** I click the "Save Table" button
- **Then** The system should:
  - Create a new strapping table with a unique ID
  - Store the table configuration (name, tank type, max height, max volume)
  - Close the modal automatically
  - Display a success message: "✅ Strapping table '[Table Name]' created"
  - Select the newly created table in the parent form's dropdown
  - Update the TLM state to reference this strapping table

### 5. Cancel Operation
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
    tankType: 'vertical',         // Tank type
    data: {
        tankType: 'vertical',
        maxHeight: 120,          // in inches
        maxVolume: 5000,         // in gallons
        measurements: {}         // Empty for vertical tanks
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

3. **Max Tank Volume**:
   - Required field  
   - Must be a positive number (> 0)
   - Accepts decimal values (step 0.1)
   - Unit: gallons

### UI Components
- Modal dialog with semi-transparent overlay
- Form with labeled input fields
- Required field indicators (red asterisks)
- Inline validation error messages
- Two action buttons: Cancel (grey) and Save Table (green when enabled)
- Success notification toast

### Integration Points
1. **Parent Form Integration**:
   - Tank type inherited from parent TLM form
   - New table auto-selected in parent dropdown after creation
   - Parent form's strapping table dropdown updated with new option

2. **State Management**:
   - Update `tlmState.strappingTable` with new table ID
   - Update `tlmState.strappingTableName` with display name
   - Persist to `strappingTables` array in application state

## Business Rules
1. Vertical tanks use a linear conversion model (direct height-to-volume ratio)
2. No percentage-based volume entries required (unlike horizontal tanks)
3. Each strapping table must have a unique identifier
4. Table names should be user-friendly and descriptive
5. Once created, the table becomes immediately available for selection

## Edge Cases
1. **No Tank Type Selected**: If tank type isn't selected in parent form, show generic modal title
2. **Duplicate Names**: Allow duplicate table names (differentiated by unique IDs)
3. **Maximum Values**: No upper limit validation on height/volume values
4. **Decimal Precision**: Support up to 1 decimal place for measurements

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] Form validation works correctly
- [ ] Save operation creates valid strapping table object
- [ ] Modal properly opens and closes
- [ ] Success message displays after save
- [ ] New table is selectable in parent form
- [ ] Code follows project conventions
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive design verified
- [ ] Accessibility standards met (WCAG 2.1 AA)

## Dependencies
- TLM configuration form must be loaded
- Tank type must be selectable in parent form
- Strapping table storage mechanism must be implemented

## Notes for Developers
- The modal should be reusable for both vertical and horizontal tank types
- Vertical tanks have a simpler configuration (no percentage table needed)
- Use existing validation patterns from the codebase
- Ensure proper cleanup when modal is closed
- Consider adding a "View" link to see created tables later
- The conversion calculation (height to volume) will use: `volume = (height / maxHeight) * maxVolume`

## Test Scenarios
1. Create a vertical strapping table with valid data
2. Try to save with empty required fields
3. Try to save with negative or zero values
4. Create multiple tables and verify unique IDs
5. Cancel operation and verify no changes
6. Verify table selection in parent form after creation
7. Test with very large numbers (edge case)
8. Test with decimal values
9. Verify success message appears and disappears
10. Test keyboard navigation (Tab, Enter, Escape)

## Future Enhancements
- Edit existing strapping tables
- Delete strapping tables
- Import/Export strapping table configurations
- Bulk creation from CSV
- Visual preview of height-to-volume curve
- Copy/duplicate existing tables
- Table templates for common tank sizes