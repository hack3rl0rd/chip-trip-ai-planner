

# Overhaul Planning Flow + Result Page UX

This is a large redesign touching the Planning page (5 steps → 4 optimized steps), the Result page (collapsible days, floating actions, hover interactions), and adding a mascot system. Below is the implementation plan organized by priority.

## Overview

```text
Current Flow (5 steps):
  Destination → Dates → Budget → Travelers → Styles

New Flow (4 steps, ~30s target):
  Destination → Dates + Time Slots → Travelers + Styles → Budget
```

Merging "Travelers" and "Styles" into one step, and adding time slot selection to the Dates step. Budget becomes the final step with both slider and direct input.

---

## Part A: Planning Page Redesign (`src/pages/Planning.tsx`)

### Step 0 — Destination (keep as-is, minor polish)
No major changes. Already fast with search + region chips.

### Step 1 — Dates + Time Slots (merged)
- Keep existing date pickers (start/end)
- Add **departure time** and **return time** quick-select chips below each date:
  - `Sáng (6h-10h)` / `Trưa (10h-14h)` / `Chiều (14h-18h)` / `Tối (18h-22h)`
- Store as `departureTime` and `returnTime` state values
- Pass to edge function for more precise scheduling

### Step 2 — Travelers + Travel Styles (merged into one step)
- Top section: traveler count (keep current +/- and quick preset buttons)
- Bottom section: expanded travel styles grid
- **New styles** (total 12):

| ID | Label | Emoji |
|---|---|---|
| healing | Nghỉ dưỡng | 🧘 |
| food | Food Tour | 🍜 |
| photo | Check-in sống ảo | 📸 |
| adventure | Mạo hiểm | 🏔️ |
| resort | Resort & Chill | 🏖️ |
| family | Gia đình | 👨‍👩‍👧‍👦 |
| couple | Couple / Hẹn hò | 💑 |
| nightlife | Nightlife | 🌙 |
| culture | Văn hóa & Lịch sử | 🏛️ |
| local | Trải nghiệm local | 🎎 |
| luxury | Sang chảnh | ✨ |
| group | Bạn bè / Nhóm | 🎉 |

- Each card: emoji + label + short description (1 line)
- Hover: scale(1.03) + orange border + shadow
- Selected: orange border + orange bg/10 + checkmark
- Add "Phổ biến" badge on top 3-4 styles
- Grid: 3 columns on desktop, 2 on mobile

### Step 3 — Budget (final step)
- Keep slider (updated range: 7 levels from <500K to 12M+)
- Add **direct input field** above slider: text input with "VNĐ" suffix, formatted with commas
- Add **3 quick-select chips**: `Tiết kiệm (<2M)` / `Trung bình (3-5M)` / `Thoải mái (8M+)`
- Slider and input stay in sync (changing one updates the other)
- CTA button "Tạo lịch trình siêu tốc" at bottom of this step

### Progress bar update
- Change from 5 dots to 4 dots

### Edge function update (`supabase/functions/generate-trip/index.ts`)
- Accept new fields: `departureTime`, `returnTime`
- Add new style labels to `styleLabels` map
- Include time info in the AI prompt for more precise scheduling

---

## Part B: Result Page UX Improvements (`src/pages/Result.tsx`)

### 1. Collapsible Days (trips > 3 days)
- If trip has > 3 days: collapse days 4+ by default
- Each day header becomes a clickable toggle (chevron icon)
- Add "Nhóm ngày" summary: "Ngày 1-3" expanded, "Ngày 4-6" collapsed
- Add "Xem tất cả / Thu gọn" toggle button at top

### 2. Hover Actions on Items (non-edit mode)
- On hover, show action overlay on the right side of each card:
  - Swap (RefreshCw icon)
  - Delete (Trash2 icon)  
  - Move up/down (arrow icons)
- Remove the need to enter "edit mode" for basic actions
- Keep edit mode for drag-reorder if needed

### 3. Floating Action Bar
- Fixed bottom bar on mobile (and sticky on desktop):
  - Save / Share / Export / Clone buttons
  - Semi-transparent backdrop blur background
- Remove duplicate action buttons from the header card

### 4. Mascot Tips (🐤 Con gà Chip)
- Create `ChipMascot` component
- Shows a small chicken mascot with speech bubble
- Triggers:
  - On result load: "Lịch trình xịn quá! Lưu lại để không mất nha 🐤"
  - After 10s idle: "Thêm bạn bè vào nhóm để chia tiền dễ hơn!"
  - On budget step (planning): "Thêm ngân sách để plan xịn hơn nha!"
- Dismissible, appears bottom-right corner
- Animated entrance (slide up + bounce)

---

## Part C: New Files

| File | Purpose |
|---|---|
| `src/components/ChipMascot.tsx` | Mascot component with speech bubble + auto-dismiss |

## Files Modified

| File | Changes |
|---|---|
| `src/pages/Planning.tsx` | Merge steps, add time slots, expand styles, budget input |
| `src/pages/Result.tsx` | Collapsible days, hover actions, floating bar |
| `supabase/functions/generate-trip/index.ts` | Accept time + new styles |

---

## Technical Notes

- All new state fields (`departureTime`, `returnTime`, `budgetAmount`) added to Planning component
- Budget input uses controlled input with number formatting (e.g., "3,500,000")
- Collapsible days use local state `expandedDays: Set<number>` with Framer Motion for animation
- Mascot uses `setTimeout` for delayed appearance, stored in localStorage to avoid repeat
- Floating action bar uses `fixed bottom-0` with `backdrop-blur-lg`
- No database changes needed — all data passes through existing `generate-trip` edge function body

