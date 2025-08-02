const cron = require('node-cron');
const subscriptionController = require('../controllers/subscriptionController');

// Run every hour to update expired subscriptions
const updateExpiredSubscriptionsJob = cron.schedule('0 * * * *', async () => {
  try {
    console.log('🔄 Running expired subscriptions update job...');
    const updated = await subscriptionController.updateExpiredSubscriptions();
    console.log(`✅ Updated ${updated} expired subscriptions`);
  } catch (error) {
    console.error('❌ Error in expired subscriptions job:', error);
  }
}, {
  scheduled: false // Start manually
});

// Run daily at 9 AM to send renewal notifications
const renewalNotificationJob = cron.schedule('0 9 * * *', async () => {
  try {
    console.log('🔔 Running renewal notification job...');
    const notified = await subscriptionController.sendRenewalNotifications();
    console.log(`✅ Sent ${notified} renewal notifications`);
  } catch (error) {
    console.error('❌ Error in renewal notification job:', error);
  }
}, {
  scheduled: false // Start manually
});

// Start all jobs
const startSubscriptionJobs = () => {
  console.log('🚀 Starting subscription background jobs...');
  updateExpiredSubscriptionsJob.start();
  renewalNotificationJob.start();
  console.log('✅ Subscription jobs started successfully');
};

// Stop all jobs
const stopSubscriptionJobs = () => {
  console.log('🛑 Stopping subscription background jobs...');
  updateExpiredSubscriptionsJob.stop();
  renewalNotificationJob.stop();
  console.log('✅ Subscription jobs stopped successfully');
};

module.exports = {
  startSubscriptionJobs,
  stopSubscriptionJobs,
  updateExpiredSubscriptionsJob,
  renewalNotificationJob
};
