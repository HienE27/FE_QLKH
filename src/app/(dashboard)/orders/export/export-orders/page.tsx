'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { getExportOrders, type ExportOrder, type ExportStatus } from '@/services/inventory.service';

const statusConfig = {
    PENDING: { label: 'Chờ duyệt', color: 'bg-[#fcbd17]' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-[#1ea849]' },
    REJECTED: { label: 'Từ chối', color: 'bg-[#ee4b3d]' },
    EXPORTED: { label: 'Đã xuất', color: 'bg-[#3573eb]' },
    IMPORTED: { label: 'Đã nhập', color: 'bg-[#3573eb]' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-gray-500' },
    RETURNED: { label: 'Hoàn hàng', color: 'bg-[#b84ebb]' },
};

export default function ExportOrdersPage() {
    const router = useRouter();
    const [data, setData] = useState<ExportOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<'totalValue' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const { currentData, currentPage, totalPages, paginationInfo, goToPage } = usePagination(data, 10);

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterStatus, setFilterStatus] = useState<ExportStatus | 'ALL'>('ALL');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await getExportOrders();
            console.log('Export orders data:', result);
            // ⭐ Debug: Kiểm tra supplierName của từng record
            result.forEach((record, index) => {
                console.log(`Record ${index + 1}:`, {
                    code: record.code,
                    supplierId: record.supplierId,
                    supplierName: record.supplierName,
                });
            });
            setData(result);
        } catch (error) {
            console.error('Lỗi khi tải danh sách lệnh xuất:', error);
            // Không hiển thị alert để tránh làm phiền user khi API chưa sẵn sàng
            setData([]); // Set empty array để hiển thị "Không có dữ liệu"
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: 'totalValue') => {
        const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(newDirection);

        const sorted = [...data].sort((a, b) => {
            return newDirection === 'asc' ? a.totalValue - b.totalValue : b.totalValue - a.totalValue;
        });

        setData(sorted);
    };

    function formatCurrency(value: number | null | undefined) {
        const n = Number(value ?? 0);
        return new Intl.NumberFormat('vi-VN').format(n);
    }

    const handleSearch = async () => {
        try {
            setLoading(true);
            const result = await getExportOrders({
                status: filterStatus,
                code: filterCode || undefined,
                fromDate: filterFromDate || undefined,
                toDate: filterToDate || undefined,
            });
            setData(result);
            goToPage(1);
        } catch (error) {
            console.error('Lỗi khi tìm kiếm:', error);
            setData([]); // Set empty array
            // alert('Không thể tìm kiếm lệnh xuất');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                {/* Filter Section */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="grid grid-cols-5 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã lệnh</label>
                            <input
                                type="text"
                                value={filterCode}
                                onChange={(e) => setFilterCode(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập mã lệnh"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nguồn xuất</label>
                            <div className="relative">
                                <select className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option>Tất cả</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tình trạng</label>
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as ExportStatus | 'ALL')}
                                    className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ALL">Tất cả</option>
                                    <option value="PENDING">Chờ duyệt</option>
                                    <option value="APPROVED">Đã duyệt</option>
                                    <option value="REJECTED">Từ chối</option>
                                    <option value="EXPORTED">Đã xuất</option>
                                    <option value="CANCELLED">Đã hủy</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                            <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                            <input
                                type="date"
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-6 py-2 bg-[#97a2ff] hover:bg-[#8591ff] text-black rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
                                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Tìm kiếm
                        </button>
                        <button
                            onClick={() => router.push('/orders/export/create-export-order')}
                            className="px-6 py-2 bg-[#0046ff] hover:bg-[#0039cc] text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Tạo lệnh xuất kho
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <colgroup>
                                <col className="w-[80px]" />
                                <col className="w-[180px]" />
                                <col className="w-[250px]" />
                                <col className="w-[180px]" />
                                <col className="w-[150px]" />
                                <col className="w-[150px]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-[#0046ff] text-white h-[48px]">
                                    <th className="px-4 text-center font-bold text-sm">STT</th>
                                    <th className="px-4 text-center font-bold text-sm">Mã lệnh</th>
                                    <th className="px-4 text-center font-bold text-sm">Nguồn xuất</th>
                                    <th className="px-4 text-center font-bold text-sm">
                                        <button
                                            onClick={() => handleSort('totalValue')}
                                            className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                        >
                                            Giá trị
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'totalValue' && sortDirection === 'asc' ? 1 : 0.4} />
                                                <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'totalValue' && sortDirection === 'desc' ? 1 : 0.4} />
                                            </svg>
                                        </button>
                                    </th>
                                    <th className="px-4 text-center font-bold text-sm">Tình trạng</th>
                                    <th className="px-4 text-center font-bold text-sm">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((record, index) => (
                                        <tr key={`${record.id}-${index}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]">
                                            <td className="px-4 text-center text-sm">{(currentPage - 1) * paginationInfo.itemsPerPage + index + 1}</td>
                                            <td className="px-4 text-center text-sm">{record.code}</td>
                                            <td className="px-4 text-center text-sm">
                                                {record.supplierName || record.supplierCode || (record.supplierId ? `Supplier #${record.supplierId}` : 'N/A')}
                                            </td>
                                            <td className="px-4 text-center text-sm">{formatCurrency(record.totalValue)}</td>
                                            <td className="px-4 text-center">
                                                <span className={`inline-block px-4 py-1 rounded-md text-sm font-medium text-black ${statusConfig[record.status]?.color || 'bg-gray-300'}`}>
                                                    {statusConfig[record.status]?.label || record.status}
                                                </span>
                                            </td>
                                            <td className="px-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => router.push(`/orders/export/view-export-order/${record.id}`)}
                                                        className="hover:scale-110 transition-transform"
                                                        title="Xem chi tiết"
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                            <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" stroke="#0046ff" strokeWidth="2" />
                                                            <circle cx="12" cy="12.5" r="3" stroke="#0046ff" strokeWidth="2" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (
                                                                record.status !== 'APPROVED' &&
                                                                record.status !== 'CANCELLED'
                                                            ) {
                                                                router.push(`/orders/export/edit-export-order/${record.id}`);
                                                            }
                                                        }}
                                                        disabled={
                                                            record.status === 'APPROVED' ||
                                                            record.status === 'CANCELLED'
                                                        }
                                                        className={`transition-transform ${record.status === 'APPROVED' ||
                                                            record.status === 'CANCELLED'
                                                            ? 'opacity-40 cursor-not-allowed'
                                                            : 'hover:scale-110 cursor-pointer'
                                                            }`}
                                                        title={
                                                            record.status === 'APPROVED' ||
                                                                record.status === 'CANCELLED'
                                                                ? 'Không thể chỉnh sửa'
                                                                : 'Chỉnh sửa'
                                                        }
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                            <path
                                                                d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                                                                stroke={
                                                                    record.status === 'APPROVED' ||
                                                                        record.status === 'CANCELLED'
                                                                        ? '#9ca3af'
                                                                        : '#0046ff'
                                                                }
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                            />
                                                            <path
                                                                d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                                                stroke={
                                                                    record.status === 'APPROVED' ||
                                                                        record.status === 'CANCELLED'
                                                                        ? '#9ca3af'
                                                                        : '#0046ff'
                                                                }
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!loading && data.length > 0 && (
                        <div className="p-4 border-t border-gray-200">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={paginationInfo.totalItems}
                                itemsPerPage={paginationInfo.itemsPerPage}
                                onPageChange={goToPage}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
