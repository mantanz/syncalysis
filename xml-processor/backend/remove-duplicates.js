/**
 * Remove Duplicate Entries from Updated Pricebook
 * Removes entries from updated_pricebook.csv that are already present in pricebook.csv
 */

const fs = require('fs').promises;
const path = require('path');

async function removeDuplicates() {
  try {
    console.log('🔄 Removing duplicate entries from updated_pricebook.csv...\n');

    // Read both CSV files
    const pricebookPath = path.join(__dirname, '../../output/promotions_program_details_rows.csv');
    const updatedPricebookPath = path.join(__dirname, '../../output/promotions_program_details.csv');
    
    console.log('Reading pricebook.csv...');
    const pricebookContent = await fs.readFile(pricebookPath, 'utf-8');
    const pricebookLines = pricebookContent.split('\n').filter(line => line.trim());
    
    console.log('Reading updated_pricebook.csv...');
    const updatedPricebookContent = await fs.readFile(updatedPricebookPath, 'utf-8');
    const updatedPricebookLines = updatedPricebookContent.split('\n').filter(line => line.trim());

    // Extract UPC IDs from pricebook.csv (skip header)
    const existingUpcIds = new Set();
    for (let i = 1; i < pricebookLines.length; i++) {
      const line = pricebookLines[i];
      const upcId = line.split(',')[0];
      if (upcId && upcId.trim()) {
        existingUpcIds.add(upcId.trim());
      }
    }

    console.log(`Found ${existingUpcIds.size} existing UPC IDs in pricebook.csv`);

    // Filter updated_pricebook.csv to remove duplicates
    const header = updatedPricebookLines[0];
    const filteredLines = [header]; // Keep header
    let removedCount = 0;
    let keptCount = 0;

    for (let i = 1; i < updatedPricebookLines.length; i++) {
      const line = updatedPricebookLines[i];
      const upcId = line.split(',')[0];
      
      if (upcId && upcId.trim() && existingUpcIds.has(upcId.trim())) {
        removedCount++;
        console.log(`Removing duplicate: ${upcId.trim()}`);
      } else {
        filteredLines.push(line);
        keptCount++;
      }
    }

    // Write the filtered content back to updated_pricebook.csv
    const filteredContent = filteredLines.join('\n');
    await fs.writeFile(updatedPricebookPath, filteredContent, 'utf-8');

    console.log('\n✅ Duplicate removal completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Original entries in updated_pricebook.csv: ${updatedPricebookLines.length - 1}`);
    console.log(`   - Duplicates removed: ${removedCount}`);
    console.log(`   - Entries kept: ${keptCount}`);
    console.log(`   - Final entries in updated_pricebook.csv: ${filteredLines.length - 1}`);

    // Show some examples of removed duplicates
    if (removedCount > 0) {
      console.log('\n📋 Examples of removed duplicates:');
      let exampleCount = 0;
      for (let i = 1; i < updatedPricebookLines.length && exampleCount < 5; i++) {
        const line = updatedPricebookLines[i];
        const upcId = line.split(',')[0];
        if (upcId && upcId.trim() && existingUpcIds.has(upcId.trim())) {
          console.log(`   - ${upcId.trim()}: ${line.split(',')[2]}`);
          exampleCount++;
        }
      }
      if (removedCount > 5) {
        console.log(`   ... and ${removedCount - 5} more`);
      }
    }

    // Show some examples of kept entries
    if (keptCount > 0) {
      console.log('\n📋 Examples of kept entries:');
      let exampleCount = 0;
      for (let i = 1; i < filteredLines.length && exampleCount < 5; i++) {
        const line = filteredLines[i];
        const upcId = line.split(',')[0];
        console.log(`   - ${upcId.trim()}: ${line.split(',')[2]}`);
        exampleCount++;
      }
      if (keptCount > 5) {
        console.log(`   ... and ${keptCount - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error removing duplicates:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  removeDuplicates();
}

module.exports = { removeDuplicates }; 