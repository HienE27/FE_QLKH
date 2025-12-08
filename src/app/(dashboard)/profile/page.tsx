'use client';

import { useState, useEffect } from 'react';
import { getProfile, updateProfile, type UserProfile, type UpdateProfileRequest } from '@/services/auth.service';
import { formatDateTime } from '@/lib/utils';

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form state
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
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile();
            setProfile(data);
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || '',
                province: data.province || '',
                district: data.district || '',
                ward: data.ward || '',
                country: data.country || '',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tải thông tin hồ sơ');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            const updated = await updateProfile(formData);
            setProfile(updated);
            setSuccess('Cập nhật hồ sơ thành công!');
            setIsEditing(false);
            // Update cache
            sessionStorage.setItem('userProfile', JSON.stringify(updated));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#0099FF] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-blue-gray-600">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Không thể tải thông tin hồ sơ</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Hồ sơ người dùng</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý thông tin cá nhân</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-6">
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Username (read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Tên đăng nhập
                            </label>
                            <input
                                type="text"
                                value={profile.username}
                                disabled
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg text-blue-gray-600 cursor-not-allowed"
                            />
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Họ và tên
                            </label>
                            {isEditing ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        placeholder="Họ"
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                    />
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        placeholder="Tên"
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                    />
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || '-'}
                                    disabled
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg text-blue-gray-600 cursor-not-allowed"
                                />
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Email
                            </label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={profile.email || '-'}
                                    disabled
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg text-blue-gray-600 cursor-not-allowed"
                                />
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Số điện thoại
                            </label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={profile.phone || '-'}
                                    disabled
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg text-blue-gray-600 cursor-not-allowed"
                                />
                            )}
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Địa chỉ
                            </label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={profile.address || '-'}
                                    disabled
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg text-blue-gray-600 cursor-not-allowed"
                                />
                            )}
                        </div>

                        {/* Roles (read-only) */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                Vai trò
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {profile.roles && profile.roles.length > 0 ? (
                                    profile.roles.map((role, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-[#0099FF]/10 text-[#0099FF] rounded-lg text-sm font-medium"
                                        >
                                            {role}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-blue-gray-400">-</span>
                                )}
                            </div>
                        </div>

                        {/* Created At */}
                        {profile.createdAt && (
                            <div>
                                <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                    Ngày tạo
                                </label>
                                <input
                                    type="text"
                                    value={formatDateTime(profile.createdAt)}
                                    disabled
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg text-blue-gray-600 cursor-not-allowed"
                                />
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            firstName: profile.firstName || '',
                                            lastName: profile.lastName || '',
                                            email: profile.email || '',
                                            phone: profile.phone || '',
                                            address: profile.address || '',
                                            province: profile.province || '',
                                            district: profile.district || '',
                                            ward: profile.ward || '',
                                            country: profile.country || '',
                                        });
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    className="px-6 py-2 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                Chỉnh sửa
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}
