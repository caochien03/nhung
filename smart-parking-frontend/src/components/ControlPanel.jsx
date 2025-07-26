import React, { useState } from "react";

function ControlPanel({ onModeChange, onVehicleAction, onExit }) {
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualPlate, setManualPlate] = useState("");

    const handleManualMode = () => {
        setIsManualMode(true);
        onModeChange("manual");
    };

    const handleAutoMode = () => {
        setIsManualMode(false);
        setManualPlate("");
        onModeChange("auto");
    };

    const handleIn = () => {
        if (isManualMode && !manualPlate.trim()) {
            alert("Vui lòng nhập biển số xe!");
            return;
        }
        onVehicleAction("in", manualPlate);
        setManualPlate("");
    };

    const handleOut = () => {
        if (isManualMode && !manualPlate.trim()) {
            alert("Vui lòng nhập biển số xe!");
            return;
        }
        onVehicleAction("out", manualPlate);
        setManualPlate("");
    };

    const handleExit = () => {
        if (window.confirm("Bạn có chắc muốn thoát?")) {
            onExit();
        }
    };

    return (
        <div
            style={{
                border: "1px solid #ccc",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            <div style={{ display: "flex", gap: 8 }}>
                <button
                    onClick={handleManualMode}
                    style={{
                        flex: 1,
                        background: isManualMode ? "#ffd700" : "#ccc",
                        color: "#222",
                        fontWeight: "bold",
                        border: "none",
                        padding: 8,
                        borderRadius: 4,
                        cursor: "pointer",
                    }}
                >
                    THỦ CÔNG
                </button>
                <button
                    onClick={handleAutoMode}
                    style={{
                        flex: 1,
                        background: !isManualMode ? "#2196f3" : "#ccc",
                        color: "#fff",
                        fontWeight: "bold",
                        border: "none",
                        padding: 8,
                        borderRadius: 4,
                        cursor: "pointer",
                    }}
                >
                    TỰ ĐỘNG
                </button>
            </div>

            {isManualMode && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Nhập biển số xe"
                        value={manualPlate}
                        onChange={(e) =>
                            setManualPlate(e.target.value.toUpperCase())
                        }
                        style={{
                            flex: 1,
                            padding: 8,
                            border: "1px solid #ccc",
                            borderRadius: 4,
                            fontSize: 14,
                        }}
                    />
                </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
                <button
                    onClick={handleIn}
                    style={{
                        flex: 1,
                        background: "#ff4444",
                        color: "#fff",
                        fontWeight: "bold",
                        border: "none",
                        padding: 8,
                        borderRadius: 4,
                        cursor: "pointer",
                    }}
                >
                    VÀO
                </button>
                <button
                    onClick={handleOut}
                    style={{
                        flex: 1,
                        background: "#ff4444",
                        color: "#fff",
                        fontWeight: "bold",
                        border: "none",
                        padding: 8,
                        borderRadius: 4,
                        cursor: "pointer",
                    }}
                >
                    RA
                </button>
            </div>
            <button
                onClick={handleExit}
                style={{
                    background: "#ff2222",
                    color: "#fff",
                    fontWeight: "bold",
                    border: "none",
                    padding: 8,
                    borderRadius: 4,
                    cursor: "pointer",
                }}
            >
                THOÁT
            </button>
        </div>
    );
}

export default ControlPanel;
