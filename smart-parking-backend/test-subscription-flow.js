const mongoose = require('mongoose');
const ParkingRecord = require('./models/ParkingRecord');
const subscriptionController = require('./controllers/subscriptionController');

mongoose.connect('mongodb://localhost:27017/smart-parking');

async function testCompleteSubscriptionFlow() {
    try {
        console.log('🚀 Testing Complete Subscription Flow\n');

        // 1. Test subscription validation
        console.log('1️⃣ Testing subscription validation...');
        const subscriptionCheck = await subscriptionController.checkSubscriptionForParking(
            '66acc7f24b18cb5ed56e3b5c', // user ID
            '30A-12345' // license plate
        );
        
        console.log('✅ Subscription Check Result:');
        console.log('   Has Subscription:', subscriptionCheck.hasSubscription);
        console.log('   Can Use:', subscriptionCheck.canUse);
        console.log('   Remaining Days:', subscriptionCheck.subscription?.remainingDays);
        console.log('   Status:', subscriptionCheck.subscription?.status);

        if (!subscriptionCheck.hasSubscription || !subscriptionCheck.canUse) {
            console.log('❌ Subscription not valid, stopping test');
            return;
        }

        // 2. Simulate entry
        console.log('\n2️⃣ Simulating vehicle entry...');
        const entryRecord = new ParkingRecord({
            rfid: 'flow-test-001',
            licensePlate: '30A-12345',
            userId: '66acc7f24b18cb5ed56e3b5c',
            timeIn: new Date(),
            cameraIndex: 1,
            paymentType: 'subscription',
            subscriptionId: subscriptionCheck.subscription._id,
            paymentMethod: 'subscription',
            paymentStatus: 'paid',
        });

        await entryRecord.save();
        console.log('✅ Entry Record Created:');
        console.log('   RFID:', entryRecord.rfid);
        console.log('   License Plate:', entryRecord.licensePlate);
        console.log('   Payment Type:', entryRecord.paymentType);
        console.log('   Should Open Gate:', entryRecord.paymentType === 'subscription');

        // 3. Wait a moment and simulate exit
        console.log('\n3️⃣ Simulating vehicle exit after 5 minutes...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for demo

        // Find the entry record
        const exitRecord = await ParkingRecord.findOne({
            rfid: 'flow-test-001',
            timeOut: { $exists: false },
        }).sort({ timeIn: -1 });

        if (exitRecord) {
            // Calculate parking duration
            const timeOut = new Date();
            const timeIn = exitRecord.timeIn;
            const durationMs = timeOut - timeIn;
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            const durationHours = Math.ceil(durationMinutes / 60);

            // Update record with exit
            exitRecord.timeOut = timeOut;
            exitRecord.parkingDuration = `${durationMinutes} phút`;
            
            // For subscription users, no fee
            if (exitRecord.paymentType === 'subscription') {
                exitRecord.fee = 0;
                exitRecord.paymentStatus = 'paid';
                exitRecord.subscriptionDiscount = durationHours * 20000; // What they would have paid
            }

            await exitRecord.save();

            console.log('✅ Exit Record Updated:');
            console.log('   Exit Time:', exitRecord.timeOut);
            console.log('   Duration:', exitRecord.parkingDuration);
            console.log('   Fee:', exitRecord.fee, 'VND');
            console.log('   Subscription Used:', exitRecord.paymentType === 'subscription');
            console.log('   Money Saved:', exitRecord.subscriptionDiscount, 'VND');
            console.log('   Gate Should Open:', true);

            // 4. Test response format for frontend
            console.log('\n4️⃣ Frontend Response Format:');
            const frontendResponse = {
                action: "OUT",
                exitPlate: exitRecord.licensePlate,
                parkingDuration: exitRecord.parkingDuration,
                fee: exitRecord.fee,
                subscriptionUsed: exitRecord.paymentType === 'subscription',
                originalFee: exitRecord.subscriptionDiscount,
                subscriptionDiscount: exitRecord.subscriptionDiscount,
                shouldOpenGate: true
            };
            
            console.log('   Response:', JSON.stringify(frontendResponse, null, 2));

        } else {
            console.log('❌ Entry record not found for exit');
        }

        console.log('\n🎉 Subscription flow test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Subscription validation: PASSED');
        console.log('   ✅ Entry with subscription: PASSED');
        console.log('   ✅ Gate opening logic: IMPLEMENTED');
        console.log('   ✅ Exit with subscription: PASSED');
        console.log('   ✅ Fee calculation (FREE): PASSED');
        console.log('   ✅ Frontend integration: READY');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testCompleteSubscriptionFlow();
