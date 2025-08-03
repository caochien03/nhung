import React, { useState, useEffect } from 'react';
import { Card, Button, Statistic, Row, Col, Table, Modal, InputNumber, message, Popconfirm, Typography, Tag } from 'antd';
import { DeleteOutlined, InfoCircleOutlined, CleaningServicesOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title, Text } = Typography;

const StorageManagement = () => {
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleanupModal, setCleanupModal] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(3);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Lấy thống kê lưu trữ
  const fetchStorageStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cleanup/stats');
      if (response.data.success) {
        setStorageStats(response.data.data);
      }
    } catch (error) {
      message.error('Lỗi khi tải thống kê lưu trữ');
      console.error('Error fetching storage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chạy cleanup thủ công
  const runManualCleanup = async () => {
    try {
      setCleanupLoading(true);
      const response = await api.post('/cleanup/manual', { days: cleanupDays });
      
      if (response.data.success) {
        message.success(`Đã xóa thành công ${response.data.data.deletedRecords} bản ghi và ${response.data.data.deletedImages} hình ảnh`);
        setCleanupModal(false);
        fetchStorageStats(); // Reload stats
      }
    } catch (error) {
      message.error('Lỗi khi thực hiện cleanup');
      console.error('Error running cleanup:', error);
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageStats();
  }, []);

  // Columns cho bảng thống kê theo khoảng thời gian
  const periodColumns = [
    {
      title: 'Khoảng thời gian',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Ngày',
      key: 'dateRange',
      render: (record) => {
        if (record.period === 'Today' || record.period === 'Yesterday') {
          return record.dateRange.start;
        }
        return `${record.dateRange.start} đến ${record.dateRange.end}`;
      }
    },
    {
      title: 'Tổng bản ghi',
      dataIndex: ['records', 'total'],
      key: 'total',
      render: (value) => value.toLocaleString('vi-VN'),
    },
    {
      title: 'Có ảnh vào',
      dataIndex: ['records', 'withEntryImage'],
      key: 'withEntryImage',
      render: (value) => value.toLocaleString('vi-VN'),
    },
    {
      title: 'Có ảnh ra',
      dataIndex: ['records', 'withExitImage'],
      key: 'withExitImage',
      render: (value) => value.toLocaleString('vi-VN'),
    },
    {
      title: 'Có cả 2 ảnh',
      dataIndex: ['records', 'withBothImages'],
      key: 'withBothImages',
      render: (value) => value.toLocaleString('vi-VN'),
    },
    {
      title: 'Không có ảnh',
      dataIndex: ['records', 'withoutImages'],
      key: 'withoutImages',
      render: (value) => value.toLocaleString('vi-VN'),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <Title level={3}>
          <CleaningServicesOutlined /> Quản lý lưu trữ hình ảnh
        </Title>

        {/* Thống kê tổng quan */}
        {storageStats && (
          <>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Tổng bản ghi"
                    value={storageStats.summary.totalRecords}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Bản ghi có hình ảnh"
                    value={storageStats.summary.totalWithImages}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Bản ghi cũ (>3 ngày)"
                    value={storageStats.summary.oldRecords}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Sẽ bị xóa lần sau"
                    value={storageStats.summary.nextCleanupWillDelete}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Nút hành động */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col>
                <Button
                  type="primary"
                  icon={<DeleteOutlined />}
                  onClick={() => setCleanupModal(true)}
                  danger
                >
                  Chạy cleanup thủ công
                </Button>
              </Col>
              <Col>
                <Button
                  icon={<InfoCircleOutlined />}
                  onClick={fetchStorageStats}
                  loading={loading}
                >
                  Làm mới thống kê
                </Button>
              </Col>
            </Row>

            {/* Bảng thống kê theo khoảng thời gian */}
            <Card title="Thống kê theo khoảng thời gian" style={{ marginTop: 20 }}>
              <Table
                columns={periodColumns}
                dataSource={storageStats.periodStats}
                rowKey="period"
                pagination={false}
                size="small"
              />
            </Card>

            {/* Thông tin hệ thống */}
            <Card title="Thông tin hệ thống" style={{ marginTop: 20 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Chu kỳ cleanup tự động:</Text>
                  <br />
                  <Tag color="blue">Hàng ngày lúc 2:00 AM (GMT+7)</Tag>
                  <br /><br />
                  <Text strong>Thời gian lưu trữ:</Text>
                  <br />
                  <Tag color="green">Tối đa 3 ngày</Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Báo cáo lưu trữ:</Text>
                  <br />
                  <Tag color="purple">Hàng tuần vào Chủ nhật 1:00 AM</Tag>
                  <br /><br />
                  <Text strong>Lưu trữ hình ảnh:</Text>
                  <br />
                  <Tag color="orange">Cloudinary Cloud Storage</Tag>
                </Col>
              </Row>
            </Card>
          </>
        )}

        {/* Modal cleanup thủ công */}
        <Modal
          title="Chạy cleanup thủ công"
          visible={cleanupModal}
          onCancel={() => setCleanupModal(false)}
          footer={[
            <Button key="cancel" onClick={() => setCleanupModal(false)}>
              Hủy
            </Button>,
            <Popconfirm
              key="confirm"
              title={`Bạn có chắc chắn muốn xóa dữ liệu cũ hơn ${cleanupDays} ngày?`}
              description="Thao tác này không thể hoàn tác!"
              onConfirm={runManualCleanup}
              okText="Xóa"
              cancelText="Hủy"
              okType="danger"
            >
              <Button
                type="primary"
                danger
                loading={cleanupLoading}
              >
                Xóa dữ liệu
              </Button>
            </Popconfirm>
          ]}
        >
          <div>
            <Text>
              Chọn số ngày để xóa dữ liệu cũ hơn thời gian này:
            </Text>
            <br /><br />
            <InputNumber
              min={1}
              max={30}
              value={cleanupDays}
              onChange={setCleanupDays}
              style={{ width: '100%' }}
              addonAfter="ngày"
            />
            <br /><br />
            <Text type="warning">
              ⚠️ Thao tác này sẽ xóa vĩnh viễn:
            </Text>
            <ul>
              <li>Tất cả bản ghi đỗ xe cũ hơn {cleanupDays} ngày</li>
              <li>Tất cả hình ảnh liên quan trên Cloudinary</li>
            </ul>
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default StorageManagement;
