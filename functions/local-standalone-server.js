const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Mock Data
let warehouses = [
    { recordId: "1", fieldData: { WarehouseID: "WH01", Location: "North" } },
    { recordId: "2", fieldData: { WarehouseID: "WH02", Location: "South" } }
];

let employees = [
    { 
        recordId: "99", 
        fieldData: { 
            PrimaryKey: "EMP01",
            FireBaseUserID: "mock-uid-123", 
            SessionKey: "DEV-MOCK|TIME|TAB",
            Active: "1",
            AccessLevelJSON: JSON.stringify({ "PRD": "Edit", "SAL": "Read" })
        } 
    }
];

let productCategories = [
    { recordId: "C1", fieldData: { ProductCategoryID: "CAT01", Description: "Mountain Bikes", Active: "1" } },
    { recordId: "C2", fieldData: { ProductCategoryID: "CAT02", Description: "Road Bikes", Active: "1" } }
];

// Proxy Routes (Simplified)
app.post('/fm/find', (req, res) => {
    const { layout, query } = req.body;
    console.log(`[MOCK] Find on ${layout}`, query);
    
    if (layout === "Employees") return res.json({ success: true, data: employees });
    if (layout === "ProductCategories") return res.json({ success: true, data: productCategories, dataInfo: { foundCount: productCategories.length } });
    
    res.json({ success: true, data: [], dataInfo: { foundCount: 0 } });
});

app.patch('/fm/update', (req, res) => {
    const { layout, recordId, fieldData } = req.body;
    const isSessionClaim = req.headers['x-session-claim'] === 'true';
    const deviceUUID = req.headers['x-device-uuid'];

    console.log(`[MOCK] Update on ${layout} ID ${recordId} (Claim: ${isSessionClaim})`);
    console.log(`[MOCK] Payload:`, fieldData);

    if (layout === "Employees") {
        const emp = employees.find(e => e.recordId === recordId);
        if (emp) {
            // Simulate session key update
            Object.assign(emp.fieldData, fieldData);
            console.log(`[MOCK] Session Restored for ${recordId}`);
            return res.json({ success: true, message: "Restored" });
        }
    }

    if (layout === "ProductCategories") {
        const cat = productCategories.find(c => c.recordId === recordId);
        if (cat) {
            Object.assign(cat.fieldData, fieldData);
            return res.json({ success: true, message: "Updated" });
        }
    }

    res.json({ success: true });
});

app.post('/fm/create', (req, res) => {
    const { layout, fieldData } = req.body;
    console.log(`[MOCK] Create on ${layout}`, fieldData);
    
    if (layout === "ProductCategories") {
        const newCat = { recordId: `C${Date.now()}`, fieldData };
        productCategories.push(newCat);
        return res.json({ success: true, response: { recordId: newCat.recordId } });
    }
    
    res.json({ success: true });
});

app.delete('/fm/delete', (req, res) => {
    const { layout, recordId } = req.body;
    console.log(`[MOCK] Delete from ${layout} ID ${recordId}`);
    
    if (layout === "ProductCategories") {
        productCategories = productCategories.filter(c => c.recordId !== recordId);
    }
    
    res.json({ success: true });
});

app.get('/fm/session-status', (req, res) => {
    res.json({ success: true, data: { active: true, status: '1' } });
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Standalone Mock Server running on http://localhost:${PORT}`));
