# Fixes & Enhancements Plan

## 1. Dashboard UI Polish

- [ ] **Header Title**: Change "Dashboard Engine" to "Dashboard".
- [ ] **Header Visibility**: Ensure text is Black (visible against white/light background).
- [ ] **Clean Layout**: Remove the "Update Data" file uploader from the bottom if data is already loaded.

## 2. Smart Plotting Logic

- [ ] **Algorithm Update**: Modify `analysis-engine.ts` to strictly ignore non-numeric columns for plotting (Bar/Line/Scatter).
- [ ] **Heuristics**: Ensure text columns are only used for Labels, never for values.

## 3. Real-Time Filtering & Customization

- [ ] **Chart Editor**: Implement a mechanism (Dropdown/Modal) for users to swap X/Y axes on existing charts.
- [ ] **View Switching**: "Centered dropdown menu" to switch between views (Simple/ML/PowerBI) if not already present, or refine the existing selector.

## 4. Advanced Analytics

- [ ] **Stats Section**: Display detailed statistics (Mean, Median, StdDev, Null counts) *below* the Data Preview.
- [ ] **Placement**: Ensure it feels integrated with the preview.

## 5. Navigation

- [ ] **Organization Visibility**: Add a clear "Organizations" link or ensure the Organization Switcher is prominent/functioning to allow easy switching.

## 6. Build Issue

- [ ] **Fix EPERM**: Resolve file locking issue during build (caused by running dev server).
