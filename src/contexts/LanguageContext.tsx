
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'id' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations = {
  id: {
    // Auth
    'auth.signIn': 'Masuk',
    'auth.signUp': 'Daftar',
    'auth.email': 'Email',
    'auth.password': 'Kata Sandi',
    'auth.name': 'Nama',
    'auth.confirmPassword': 'Konfirmasi Kata Sandi',
    'auth.forgotPassword': 'Lupa Kata Sandi?',
    'auth.alreadyHaveAccount': 'Sudah punya akun?',
    'auth.dontHaveAccount': 'Belum punya akun?',
    'auth.signOut': 'Keluar',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Selamat datang kembali',
    'dashboard.checkInToday': 'Absen Hari Ini',
    'dashboard.currentTime': 'Waktu saat ini',
    'dashboard.alreadyCheckedIn': 'Sudah Absen',
    'dashboard.time': 'Waktu',
    'dashboard.checkInNow': 'Absen Sekarang',
    'dashboard.checkingLocation': 'Memeriksa lokasi...',
    'dashboard.makeValidLocation': 'Pastikan Anda berada di lokasi yang valid',
    'dashboard.validLocations': 'Lokasi Valid',
    'dashboard.radius': 'Radius',
    'dashboard.missedAttendance': 'Terlewat Absen?',
    'dashboard.requestMakeup': 'Ajukan permintaan makeup untuk absen yang terlewat',
    'dashboard.thisMonth': 'Bulan Ini',
    'dashboard.totalDays': 'Total Hari',
    'dashboard.present': 'Hadir',
    'dashboard.late': 'Terlambat',
    'dashboard.absent': 'Tidak Hadir',
    
    // Status
    'status.HADIR': 'HADIR',
    'status.TERLAMBAT': 'TERLAMBAT',
    'status.MAKE_UP': 'MAKE UP',
    
    // General
    'general.success': 'Berhasil',
    'general.error': 'Error',
    'general.loading': 'Memuat...',
    'general.save': 'Simpan',
    'general.cancel': 'Batal',
    'general.delete': 'Hapus',
    'general.edit': 'Edit',
    'general.add': 'Tambah',
    'general.view': 'Lihat',
    'general.actions': 'Aksi',
    'general.name': 'Nama',
    'general.created': 'Dibuat',
    'general.role': 'Peran',
    
    // Admin
    'admin.userManagement': 'Manajemen User',
    'admin.manageUsers': 'Kelola akun user dan peran',
    'admin.admin': 'Admin',
    'admin.user': 'User',
    
    // Attendance
    'attendance.history': 'Riwayat Absensi',
    'attendance.status': 'Status',
    'attendance.method': 'Metode',
    'attendance.location': 'Lokasi',
    'attendance.reason': 'Alasan',
    'attendance.noRecords': 'Tidak ada data absensi',
    
    // Notifications
    'notification.locationError': 'Error Lokasi',
    'notification.notValidLocation': 'Anda tidak berada di lokasi yang valid untuk absen',
    'notification.attendanceSuccess': 'Absen berhasil! Status',
    'notification.roleUpdated': 'Peran user berhasil diperbarui!',
    
    // Language
    'language.indonesian': 'Bahasa Indonesia',
    'language.english': 'English'
  },
  en: {
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.signOut': 'Sign Out',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.checkInToday': 'Check In Today',
    'dashboard.currentTime': 'Current time',
    'dashboard.alreadyCheckedIn': 'Already Checked In',
    'dashboard.time': 'Time',
    'dashboard.checkInNow': 'Check In Now',
    'dashboard.checkingLocation': 'Checking location...',
    'dashboard.makeValidLocation': 'Make sure you\'re at a valid location',
    'dashboard.validLocations': 'Valid Locations',
    'dashboard.radius': 'Radius',
    'dashboard.missedAttendance': 'Missed Attendance?',
    'dashboard.requestMakeup': 'Request make-up time for missed check-ins',
    'dashboard.thisMonth': 'This Month',
    'dashboard.totalDays': 'Total Days',
    'dashboard.present': 'Present',
    'dashboard.late': 'Late',
    'dashboard.absent': 'Absent',
    
    // Status
    'status.HADIR': 'PRESENT',
    'status.TERLAMBAT': 'LATE',
    'status.MAKE_UP': 'MAKE UP',
    
    // General
    'general.success': 'Success',
    'general.error': 'Error',
    'general.loading': 'Loading...',
    'general.save': 'Save',
    'general.cancel': 'Cancel',
    'general.delete': 'Delete',
    'general.edit': 'Edit',
    'general.add': 'Add',
    'general.view': 'View',
    'general.actions': 'Actions',
    'general.name': 'Name',
    'general.created': 'Created',
    'general.role': 'Role',
    
    // Admin
    'admin.userManagement': 'User Management',
    'admin.manageUsers': 'Manage user accounts and roles',
    'admin.admin': 'Admin',
    'admin.user': 'User',
    
    // Attendance
    'attendance.history': 'Attendance History',
    'attendance.status': 'Status',
    'attendance.method': 'Method',
    'attendance.location': 'Location',
    'attendance.reason': 'Reason',
    'attendance.noRecords': 'No attendance records found',
    
    // Notifications
    'notification.locationError': 'Location Error',
    'notification.notValidLocation': 'You are not at a valid location for attendance',
    'notification.attendanceSuccess': 'Attendance successful! Status',
    'notification.roleUpdated': 'User role updated successfully!',
    
    // Language
    'language.indonesian': 'Bahasa Indonesia',
    'language.english': 'English'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'id';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
