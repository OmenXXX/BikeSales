const fs = require('fs');
const path = require('path');
const filePath = 'd:\\\\BikeSalesErp\\\\frontend\\\\src\\\\pages\\\\modules\\\\StorageView.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const summaryMarker = '{/* Spacious Summary Block - Elevated White Design */}';
const targetDiv = '<div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xl shadow-slate-200/60 relative overflow-hidden group">';

if (content.includes(summaryMarker)) {
    const lines = content.split('\\n');
    let targetLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(summaryMarker)) {
            targetLineIdx = i;
            break;
        }
    }

    if (targetLineIdx !== -1) {
        const indent = lines[targetLineIdx].match(/^\\s*/)[0];
        const newBlock = `
${indent}</div> {/* Closing top items container */}

${indent}{/* Dynamic Spacer to anchor summary to bottom */}
${indent}<div className="flex-1 min-h-[0.5rem]" />

${indent}${summaryMarker}
${indent}<div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xl shadow-slate-200/60 relative overflow-hidden group shrink-0">`;

        let found = false;
        for (let j = targetLineIdx; j < targetLineIdx + 5; j++) {
            if (lines[j] && lines[j].includes(targetDiv)) {
                const before = lines.slice(0, targetLineIdx).join('\\n');
                const after = lines.slice(j + 1).join('\\n');
                fs.writeFileSync(filePath, before + newBlock + '\\n' + after);
                found = true;
                break;
            }
        }
        if (found) console.log('Fixed successfully');
        else console.log('Summary target div not found near marker');
    }
} else {
    console.log('Marker not found');
}
