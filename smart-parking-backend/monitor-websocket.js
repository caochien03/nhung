const WebSocket = require('ws');

function monitorWebSocket() {
    console.log('🔍 Monitoring WebSocket messages from backend...\n');
    
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected to backend');
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('📡 WebSocket message received:');
        console.log('   Type:', message.type);
        console.log('   UID:', message.uid);
        console.log('   Camera:', message.cameraIndex);
        console.log('   Timestamp:', message.timestamp);
        console.log('   Full message:', message);
        console.log('');
    });
    
    ws.on('close', () => {
        console.log('❌ WebSocket disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
}

console.log('🎯 Starting WebSocket monitor...');
console.log('📝 Now test your ESP32 RFID scans and watch for messages\n');

monitorWebSocket();
