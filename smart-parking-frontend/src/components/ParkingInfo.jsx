import React from "react";

function ParkingInfo({
    vehicleCount,
    lastIn,
    lastOut,
    parkingDuration,
    totalMoney,
    cameraInPlate,
    cameraOutPlate,
    exitStatus,
    exitDetails,
    currentParkingDuration,
    currentFee,
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

            {/* Hiển thị thông tin camera real-time */}
            <div
                style={{
                    marginTop: 12,
                    borderTop: "1px solid #eee",
                    paddingTop: 8,
                }}
            >
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        marginBottom: 4,
                    }}
                >
                    CAMERA VÀO:
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: "#333",
                        whiteSpace: "pre-line",
                        background: "#f8f9fa",
                        padding: "4px 8px",
                        borderRadius: 4,
                        minHeight: 20,
                    }}
                >
                    {cameraInPlate || "[Chưa có dữ liệu]"}
                </div>

                <div
                    style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        marginTop: 8,
                        marginBottom: 4,
                    }}
                >
                    CAMERA RA:
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: "#333",
                        background: "#f8f9fa",
                        padding: "4px 8px",
                        borderRadius: 4,
                        minHeight: 20,
                    }}
                >
                    {cameraOutPlate || "[Chưa có dữ liệu]"}
                </div>

                {/* Dòng trạng thái mới */}
                {exitStatus && (
                    <>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: "bold",
                                marginTop: 8,
                                marginBottom: 4,
                            }}
                        >
                            TRẠNG THÁI:
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: exitStatus.includes("🚨")
                                    ? "#dc3545"
                                    : exitStatus.includes("✅")
                                    ? "#28a745"
                                    : "#333",
                                background: exitStatus.includes("🚨")
                                    ? "#f8d7da"
                                    : exitStatus.includes("✅")
                                    ? "#d4edda"
                                    : "#f8f9fa",
                                padding: "4px 8px",
                                borderRadius: 4,
                                minHeight: 20,
                            }}
                        >
                            {exitStatus}
                            {exitDetails && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        marginTop: 2,
                                        opacity: 0.8,
                                    }}
                                >
                                    {exitDetails}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <div>
                TỔNG:{" "}
                <span style={{ color: "#28a745" }}>
                    {currentParkingDuration || parkingDuration || ""}
                </span>
            </div>
            <div>
                TIỀN:{" "}
                <span style={{ color: "#ffc107", fontWeight: "bold" }}>
                    {currentFee ||
                        (totalMoney
                            ? `${totalMoney.toLocaleString()} VNĐ`
                            : "0 VNĐ")}
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
