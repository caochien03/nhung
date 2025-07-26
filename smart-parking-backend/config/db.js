const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(
            "mongodb+srv://nguyencaochien03:chien2003@cluster0.lsol1da.mongodb.net/parking"
        );
        console.log("MongoDB connected");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

module.exports = connectDB;
