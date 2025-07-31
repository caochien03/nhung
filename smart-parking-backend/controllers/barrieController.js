const Barrie = require("../models/Barrie");

// Get all barries
exports.getBarries = async (req, res) => {
  try {
    const barries = await Barrie.find().sort({ name: 1 });
    
    res.json({
      success: true,
      data: barries,
    });
  } catch (error) {
    console.error("Get barries error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get barrie by ID
exports.getBarrieById = async (req, res) => {
  try {
    const barrie = await Barrie.findById(req.params.id);
    
    if (!barrie) {
      return res.status(404).json({
        success: false,
        message: "Barrie not found",
      });
    }

    res.json({
      success: true,
      data: barrie,
    });
  } catch (error) {
    console.error("Get barrie error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Control barrie (open/close)
exports.controlBarrie = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!action || !["open", "close"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'open' or 'close'",
      });
    }

    const barrie = await Barrie.findById(id);
    if (!barrie) {
      return res.status(404).json({
        success: false,
        message: "Barrie not found",
      });
    }

    // Update barrie status
    barrie.status = action === "open" ? "open" : "closed";
    barrie.lastAction = new Date();
    barrie.lastActionBy = req.user._id;
    barrie.lastActionReason = reason || "Manual control";

    await barrie.save();

    // Emit WebSocket event for real-time updates
    if (req.app.get("io")) {
      req.app.get("io").emit("barrie_status", {
        barrieId: barrie._id,
        status: barrie.status,
        action: action,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Barrie ${action}ed successfully`,
      data: barrie,
    });
  } catch (error) {
    console.error("Control barrie error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get barrie status
exports.getBarrieStatus = async (req, res) => {
  try {
    const barries = await Barrie.find().select("name status lastAction lastActionReason");
    
    res.json({
      success: true,
      data: barries,
    });
  } catch (error) {
    console.error("Get barrie status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}; 