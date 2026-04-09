const axios = require('axios');
const fs = require('fs');

const run = async () => {
    const layout = process.argv[2] || 'Products';
    try {
        const response = await axios.post('http://localhost:3001/api/findRecords', {
            layout: layout,
            query: [{}],
            limit: 10
        });
        const filename = `${layout.toLowerCase()}_sample.json`;
        fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
        console.log(`${layout} sample written to ${filename}`);
    } catch (error) {
        console.error(`Error fetching ${layout}:`, error.message);
    }
};

run();
