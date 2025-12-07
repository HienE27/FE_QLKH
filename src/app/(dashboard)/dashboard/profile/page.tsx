'use client';

import Sidebar from '@/components/layout/Sidebar';
import { useUser } from '@/hooks/useUser';
import { getProfile, updateProfile, deleteAccount, type UserProfile, type UpdateProfileRequest } from '@/services/auth.service';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import Link from 'next/link';

export default function ProfilePage() {
    const { user: jwtUser, loading: jwtLoading } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();

    const [formData, setFormData] = useState<UpdateProfileRequest>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        province: '',
        district: '',
        ward: '',
        country: '',
        avatar: '',
    });

    useEffect(() => {
        if (!jwtLoading && jwtUser) {
            loadProfile();
        } else if (!jwtLoading && !jwtUser) {
            setLoading(false);
        }
    }, [jwtLoading, jwtUser]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getProfile();
            console.log('Profile loaded from server:', data);
            
            // Cập nhật profile state
            setProfile(data);
            
            // Cập nhật formData với dữ liệu mới từ server
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || '',
                province: data.province || '',
                district: data.district || '',
                ward: data.ward || '',
                country: data.country || 'Việt Nam',
                avatar: data.avatar || '',
            });
        } catch (err: any) {
            console.error('Failed to load profile:', err);
            setError(err.message || 'Không thể tải thông tin hồ sơ');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            
            // Gọi API update
            const updated = await updateProfile(formData);
            console.log('Profile updated successfully:', updated);
            
            // Đóng chế độ edit
            setEditing(false);
            
            // Đợi một chút để đảm bảo database đã commit
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Reload lại dữ liệu từ server để đảm bảo đồng bộ 100%
            await loadProfile();
            
            // Hiển thị thông báo thành công
            setSuccess('Cập nhật thông tin thành công!');
            
            // Ẩn thông báo sau 3 giây
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Failed to update profile:', err);
            setError(err.message || 'Không thể cập nhật thông tin');
            setEditing(true); // Giữ lại chế độ edit nếu có lỗi
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc chắn muốn vô hiệu hóa tài khoản này? Hành động này không thể hoàn tác.')) {
            return;
        }

        try {
            setDeleting(true);
            setError(null);
            await deleteAccount();
            clearToken();
            router.push('/login');
        } catch (err: any) {
            console.error('Failed to delete account:', err);
            setError(err.message || 'Không thể vô hiệu hóa tài khoản');
            setDeleting(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            setFormData({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                email: profile.email || '',
                phone: profile.phone || '',
                address: profile.address || '',
                province: profile.province || '',
                district: profile.district || '',
                ward: profile.ward || '',
                country: profile.country || 'Việt Nam',
                avatar: profile.avatar || '',
            });
        }
        setEditing(false);
        setError(null);
    };

    const initials = (profile?.fullName || profile?.username || jwtUser?.username || 'U')
        .split(' ')
        .filter(Boolean)
        .map(part => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2);

    const displayName = profile?.fullName || profile?.username || jwtUser?.username || '—';

    if (jwtLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar />
                <main className="xl:ml-[304px] overflow-y-auto">
                    <div className="px-6 py-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl">
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
                                    <div key={k} className="h-10 bg-gray-100 animate-pulse rounded-md" />
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!jwtUser) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar />
                <main className="xl:ml-[304px] overflow-y-auto">
                    <div className="px-6 py-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
                            <div className="text-sm text-gray-600 space-y-3">
                                <p>Chưa đăng nhập hoặc không có thông tin người dùng.</p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center px-4 py-2 bg-[#0099FF] text-white rounded-md text-sm font-semibold hover:bg-[#0088e0]"
                                >
                                    Đăng nhập
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const infoFields = [
        { label: 'Họ và tên', key: 'fullName', editable: true, type: 'text' },
        { label: 'Họ', key: 'firstName', editable: true, type: 'text' },
        { label: 'Tên', key: 'lastName', editable: true, type: 'text' },
        { label: 'Username', key: 'username', editable: false, type: 'text' },
        { label: 'Email', key: 'email', editable: true, type: 'email' },
        { label: 'Số điện thoại', key: 'phone', editable: true, type: 'tel' },
        { label: 'Địa chỉ', key: 'address', editable: true, type: 'text' },
        { label: 'Tỉnh/Thành phố', key: 'province', editable: true, type: 'text' },
        { label: 'Quận/Huyện', key: 'district', editable: true, type: 'text' },
        { label: 'Phường/Xã', key: 'ward', editable: true, type: 'text' },
        { label: 'Quốc gia', key: 'country', editable: true, type: 'text' },
        { label: 'Vai trò', key: 'roles', editable: false, type: 'text' },
        { label: 'Trạng thái', key: 'active', editable: false, type: 'text' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />

            <main className="xl:ml-[304px] overflow-y-auto">
                <div className="px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Hồ sơ người dùng</h1>
                            <p className="text-sm text-gray-500">Thông tin tài khoản hiện tại</p>
                        </div>
                        {!editing && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditing(true)}
                                    className="px-4 py-2 bg-[#0099FF] text-white rounded-md text-sm font-semibold hover:bg-[#0088e0] transition-colors"
                                >
                                    Chỉnh sửa
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleting ? 'Đang xử lý...' : 'Vô hiệu hóa tài khoản'}
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center justify-between">
                            <span>{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-500 hover:text-red-700 ml-4"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center justify-between">
                            <span>{success}</span>
                            <button
                                onClick={() => setSuccess(null)}
                                className="text-green-500 hover:text-green-700 ml-4"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-5xl">
                        {/* Header avatar */}
                        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0099FF] to-[#0088e0] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                    {profile?.avatar ? (
                                        <img src={profile.avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                {profile?.active === false && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <span className="text-white text-xs">✕</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {displayName}
                                    </h2>
                                    {profile?.active !== false && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                            Hoạt động
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    {profile?.email && (
                                        <div className="flex items-center gap-2">
                                            <span>📧</span>
                                            <span>{profile.email}</span>
                                        </div>
                                    )}
                                    {profile?.phone && (
                                        <div className="flex items-center gap-2">
                                            <span>📞</span>
                                            <span>{profile.phone}</span>
                                        </div>
                                    )}
                                    {profile?.address && (
                                        <div className="flex items-center gap-2">
                                            <span>📍</span>
                                            <span>
                                                {[profile.address, profile.ward, profile.district, profile.province]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                                {profile.country && `, ${profile.country}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {infoFields
                                .filter(field => field.key !== 'fullName' && field.key !== 'active') // Bỏ fullName và active vì đã hiển thị ở header
                                .map((field) => {
                                    const value = field.key === 'roles'
                                        ? profile?.roles?.join(', ') || '—'
                                        : (profile as any)?.[field.key] || '—';

                                    if (editing && field.editable) {
                                        const formKey = field.key as keyof UpdateProfileRequest;
                                        return (
                                            <div key={field.key} className="space-y-1">
                                                <label className="block text-sm font-semibold text-gray-700">
                                                    {field.label}
                                                </label>
                                                <input
                                                    type={field.type}
                                                    value={formData[formKey] || ''}
                                                    onChange={(e) => setFormData({ ...formData, [formKey]: e.target.value })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-transparent transition-all"
                                                    placeholder={`Nhập ${field.label.toLowerCase()}`}
                                                />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={field.key} className="space-y-1">
                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                {field.label}
                                            </div>
                                            <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-800 min-h-[42px] flex items-center">
                                                {value === '—' ? <span className="text-gray-400 italic">Chưa cập nhật</span> : value}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {editing && (
                            <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end gap-3">
                                <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-[#0099FF] text-white rounded-lg text-sm font-semibold hover:bg-[#0088e0] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                    {saving ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin">⏳</span>
                                            Đang lưu...
                                        </span>
                                    ) : (
                                        '💾 Lưu thay đổi'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
