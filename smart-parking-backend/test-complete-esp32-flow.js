const axios = require('axios');
const WebSocket = require('ws');

async function simulateCompleteESP32Flow() {
    const baseURL = 'http://localhost:8080';
    
    console.log('🎯 Simulating Complete ESP32 Flow...\n');

    try {
        // Step 1: Connect WebSocket to monitor messages
        console.log('1. Connecting to WebSocket...');
        const ws = new WebSocket('ws://localhost:8080');
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected');
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('📡 WebSocket message received:', message);
            
            // If auto_capture message, simulate camera capture
            if (message.type === 'auto_capture') {
                console.log(`📸 Auto capture triggered for UID: ${message.uid}, Camera: ${message.cameraIndex}`);
                simulateCameraCapture(message.uid, message.cameraIndex);
            }
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for WS connection

        // Step 2: Simulate RFID scan (entry)
        console.log('2. Simulating RFID scan (entry)...');
        const rfidResponse = await axios.post(`${baseURL}/api/esp32/uid`, {
            uid: 'REAL_TEST_001',
            cameraIndex: 1
        });
        console.log('✅ RFID Entry Response:', rfidResponse.data);

        // Wait for auto capture
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 3: Simulate RFID scan (exit)
        console.log('3. Simulating RFID scan (exit)...');
        const rfidExitResponse = await axios.post(`${baseURL}/api/esp32/uid`, {
            uid: 'REAL_TEST_001',
            cameraIndex: 2
        });
        console.log('✅ RFID Exit Response:', rfidExitResponse.data);

        // Wait for auto capture
        await new Promise(resolve => setTimeout(resolve, 3000));

        ws.close();

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

async function simulateCameraCapture(uid, cameraIndex) {
    const baseURL = 'http://localhost:8080';
    
    // Real image base64 (small 1x1 pixel)
    const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    try {
        console.log(`📷 Simulating camera ${cameraIndex} capture for UID: ${uid}`);
        
        const captureResponse = await axios.post(`${baseURL}/api/esp32/auto-capture`, {
            uid: uid,
            cameraIndex: cameraIndex,
            imageData: sampleImage
        });
        
        console.log(`✅ Camera ${cameraIndex} capture response:`, captureResponse.data);
        
        if (captureResponse.data.action === 'IN') {
            console.log(`🚗 Vehicle entered: ${captureResponse.data.licensePlate}`);
        } else if (captureResponse.data.action === 'OUT_PAYMENT_REQUIRED') {
            console.log(`🚗 Vehicle exited: ${captureResponse.data.licensePlate}, Fee: ${captureResponse.data.fee}`);
        }
        
    } catch (error) {
        console.error(`❌ Camera ${cameraIndex} capture failed:`, error.response?.data || error.message);
    }
}

simulateCompleteESP32Flow();
