# How to Deploy as a Google Apps Script Web App (livspace.com)

You can deploy this dashboard directly inside your Livspace Google Workspace to get a native URL like:
`https://script.google.com/a/macros/livspace.com/s/AKfycby.../exec`

---

## 3-Step Setup (Takes 1 Minute)

### Step 1: Open Apps Script from Google Sheets
1. Open your master pricing sheet:  
   👉 [1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno](https://docs.google.com/spreadsheets/d/1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno)
2. In the top menu, click **Extensions** > **Apps Script**.

---

### Step 2: Add the Two Files
1. In the left sidebar under **Files**:
   - In `Code.gs`, delete whatever is there, open [`apps_script/Code.gs`](./Code.gs), and paste all its contents.
2. Click the **+** icon next to Files > Select **HTML**:
   - Name it `Index` (so it creates `Index.html`).
   - Open [`apps_script/Index.html`](./Index.html) and paste all its contents.
3. Click the **Save project** (disk) icon.

---

### Step 3: Deploy as Web App
1. In the top right, click the blue **Deploy** button > **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" > choose **Web app**.
3. Set the fields:
   - **Description**: `PID Supply Governance & Allocation`
   - **Execute as**: `Me (ankur.kumar@livspace.com)`
   - **Who has access**: `Anyone within Livspace` (or `Anyone`)
4. Click **Deploy**.
5. Grant permissions if prompted (select your Livspace Google account).
6. Copy your live Web App URL:  
   `https://script.google.com/a/macros/livspace.com/s/.../exec`

---

## Features
- **Zero Vercel/Node dependencies**: Runs directly on Google's infrastructure.
- **Livspace Google SSO**: Authenticates anyone inside Livspace automatically.
- **Direct Real-Time Data**: Queries `Inhouse_Clean_Staging` on the fly.
- **Discrete Price Buckets**: Shows `<25K`, `25-50K`, `50K-1L`, `1-2L`, `2-3L`, `3-4L`, `4-5L`, `5L+`.
- **SKU Consolidation**: Automatically clubs identical items across multiple rooms/elevations into single lines with blended unit rates.
- **Export to CSV**: Download the sourcing BoQ for contractors with 1 click.
