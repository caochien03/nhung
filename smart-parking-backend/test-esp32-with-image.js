const axios = require('axios');

// Sample base64 image (1x1 pixel red image)
const sampleBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

async function testESP32WithImage() {
    const baseURL = 'http://localhost:8080';
    
    console.log('🎯 Testing ESP32 with Image Upload to Cloudinary...\n');

    try {
        // Test 1: RFID scan triggers auto capture
        console.log('1. Testing RFID scan (receiveUID)...');
        const rfidResponse = await axios.post(`${baseURL}/api/esp32/uid`, {
            uid: 'TEST123ABC',
            cameraIndex: 1
        });
        console.log('✅ RFID Response:', rfidResponse.data);
        console.log('');

        // Test 2: Auto capture with image (entry)
        console.log('2. Testing auto capture with image (entry)...');
        const entryResponse = await axios.post(`${baseURL}/api/esp32/auto-capture`, {
            uid: 'TEST123ABC',
            cameraIndex: 1,
            imageData: sampleBase64Image
        });
        console.log('✅ Entry Response:', entryResponse.data);
        console.log('');

        // Wait a bit before exit
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 3: Auto capture with image (exit)
        console.log('3. Testing auto capture with image (exit)...');
        const exitResponse = await axios.post(`${baseURL}/api/esp32/auto-capture`, {
            uid: 'TEST123ABC',
            cameraIndex: 2,
            imageData: sampleBase64Image
        });
        console.log('✅ Exit Response:', exitResponse.data);
        console.log('');

        // Test 4: Check if images are saved in database
        console.log('4. Checking if images are saved in database...');
        
        // We'll need to get the record ID from the entry response
        const recordCheck = await axios.get(`${baseURL}/api/parking/records?licensePlate=Không nhận diện được&limit=1`);
        
        if (recordCheck.data.data && recordCheck.data.data.length > 0) {
            const record = recordCheck.data.data[0];
            console.log('📋 Latest parking record:');
            console.log('   - ID:', record._id);
            console.log('   - License Plate:', record.licensePlate);
            console.log('   - Entry Image:', record.entryImage ? '✅ YES' : '❌ NO');
            console.log('   - Exit Image:', record.exitImage ? '✅ YES' : '❌ NO');
            
            if (record.entryImage) {
                console.log('   - Entry Image URL:', record.entryImage.url);
            }
            if (record.exitImage) {
                console.log('   - Exit Image URL:', record.exitImage.url);
            }
        } else {
            console.log('❌ No parking records found');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testESP32WithImage();
