const axios = require('axios');

async function testInventory() {
    try {
        const response = await axios.post('http://localhost:5001/bikesakes/us-central1/api/filemaker/layouts/Inventory/records', {
            limit: 1
        });
        console.log(JSON.stringify(response.data.data[0].fieldData, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testInventory();
