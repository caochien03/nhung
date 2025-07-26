import React from "react";

function ParkingInfo({
    vehicleCount,
    lastIn,
    lastOut,
    parkingDuration,
    totalMoney,
}) {
    return (
        <div
            style={{ border: "1px solid #ccc", padding: 12, marginBottom: 16 }}
        >
            <div style={{ marginBottom: 8, fontWeight: "bold", fontSize: 18 }}>
                SỐ XE:{" "}
                <span
                    style={{
                        color: "green",
                        background: "#eaffea",
                        padding: "2px 8px",
                        borderRadius: 4,
                    }}
                >
                    {vehicleCount}
                </span>
            </div>
            <div>
                VÀO: <span style={{ color: "#007bff" }}>{lastIn || ""}</span>
            </div>
            <div>
                RA: <span style={{ color: "#dc3545" }}>{lastOut || ""}</span>
            </div>
            <div>
                TỔNG:{" "}
                <span style={{ color: "#28a745" }}>
                    {parkingDuration || ""}
                </span>
            </div>
            <div>
                TIỀN:{" "}
                <span style={{ color: "#ffc107", fontWeight: "bold" }}>
                    {totalMoney
                        ? `${totalMoney.toLocaleString()} VNĐ`
                        : "0 VNĐ"}
                </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
                {new Date().toLocaleTimeString()} -{" "}
                {new Date().toLocaleDateString()}
            </div>
        </div>
    );
}

export default ParkingInfo;
